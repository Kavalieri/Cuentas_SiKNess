'use server';

import { getCurrentUser, getUserHouseholdId } from '@/lib/auth';
import { query } from '@/lib/db';
import type { Result } from '@/lib/result';
import { fail, ok } from '@/lib/result';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Helper para formatear errores de Postgres con detalles útiles sin filtrar SQL
function formatPgError(error: unknown): string {
  const err = error as { message?: string; detail?: string; hint?: string; code?: string } | undefined;
  const parts: string[] = [];
  if (err?.message) parts.push(err.message);
  if (err?.detail) parts.push(err.detail);
  if (err?.hint) parts.push(err.hint);
  // Evitar mensajes vacíos
  return parts.filter(Boolean).join(' - ') || 'Error en operación';
}

/**
 * Cierra un período mensual ejecutando la función SQL close_monthly_period
 * y revalida las rutas afectadas.
 */
export async function closePeriod(periodId: string, notes?: string): Promise<Result<{ periodId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('No autenticado');
    }

    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No tienes un hogar activo');
    }

    // Ejecutar RPC nativa en PostgreSQL
    const result = await query<{ id: string }>(
      'SELECT public.close_monthly_period($1, $2, $3, $4) AS id',
      [householdId, periodId, user.profile_id, notes ?? null],
    );

    const closedId = result.rows[0]?.id;
    if (!closedId) {
      return fail('No se pudo cerrar el período');
    }
    revalidatePath('/sickness/periodo');
    return ok({ periodId: closedId });
  } catch (error) {
    console.error('[closePeriod] Error:', error);
    return fail(formatPgError(error));
  }
}

/**
 * Pasa el período a fase 'validation' (bloquea cálculo de contribuciones)
 * La función SQL requiere 3 parámetros: (household_id, period_id, locked_by)
 */
export async function lockPeriod(
  periodId: string,
  contributionDisabled = false,
): Promise<Result<{ periodId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('No autenticado');
    }

    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No tienes un hogar activo');
    }

    // Pre-chequeo de fase para evitar excepciones de la función SQL
    const phaseRes = await query<{ phase: string }>(
      `SELECT phase::text AS phase
       FROM monthly_periods
       WHERE id = $1 AND household_id = $2
       LIMIT 1`,
      [periodId, householdId],
    );

    const currentPhase = phaseRes.rows[0]?.phase ?? null;
    if (!currentPhase) {
      return fail('Período no encontrado en tu hogar');
    }
    if (currentPhase !== 'preparing' && currentPhase !== 'validation') {
      return fail(`Fase actual no permite bloqueo: ${currentPhase}`);
    }

    // Si se ignora el sistema de contribuciones, actualizar el campo y saltar validaciones
    if (contributionDisabled) {
      await query(
        `UPDATE monthly_periods
         SET contribution_disabled = TRUE,
             phase = 'validation',
             snapshot_budget = NULL,
             snapshot_contribution_goal = NULL,
             updated_at = NOW()
         WHERE id = $1 AND household_id = $2`,
        [periodId, householdId],
      );

      // Crear contribuciones automáticamente a 0€ para todos los miembros
      await query(
        `INSERT INTO contributions (household_id, profile_id, year, month, expected_amount, paid_amount, status)
         SELECT $1, hm.profile_id, mp.year, mp.month, 0, 0, 'paid'
         FROM monthly_periods mp
         CROSS JOIN household_members hm
         WHERE mp.id = $2
           AND mp.household_id = $1
           AND hm.household_id = $1
         ON CONFLICT (household_id, profile_id, year, month)
         DO UPDATE SET
           expected_amount = 0,
           paid_amount = 0,
           status = 'paid',
           updated_at = NOW()`,
        [householdId, periodId],
      );

      revalidatePath('/sickness');
      revalidatePath('/sickness/periodo');
      revalidatePath('/sickness/credito-deuda');
      return ok({ periodId });
    }

    // Flujo normal: validación completa de contribuciones
    // Primero obtener el presupuesto actual para guardarlo como snapshot
    // Lee de AMBAS columnas con fallback automático (transición objetivo→presupuesto)
    const settingsRes = await query<{ monthly_budget: string | null }>(
      `SELECT COALESCE(monthly_budget, monthly_contribution_goal) as monthly_budget FROM household_settings WHERE household_id = $1`,
      [householdId],
    );

    const snapshotBudget = Number(settingsRes.rows[0]?.monthly_budget ?? 0);
    if (snapshotBudget <= 0) {
      return fail('Configura primero el presupuesto mensual en Configuración > Hogar');
    }

    // Guardar snapshot ANTES de bloquear el período
    // Escribe en AMBAS columnas para compatibilidad durante transición
    await query(
      `UPDATE monthly_periods
       SET snapshot_budget = $1, snapshot_contribution_goal = $1, updated_at = NOW()
       WHERE id = $2 AND household_id = $3`,
      [snapshotBudget, periodId, householdId],
    );

    // Llamar función SQL con los 3 parámetros requeridos
    const { rows } = await query(
      `SELECT lock_contributions_period($1, $2, $3) AS locked`,
      [householdId, periodId, user.profile_id],
    );
    if (rows[0]?.locked) {
      // Reconciliar automáticamente balances de contribución (crédito/deuda global)
      try {
        const contribs = await query<{ id: string }>(
          `SELECT c.id
           FROM contributions c
           INNER JOIN monthly_periods mp ON mp.household_id = c.household_id
           WHERE c.household_id = $1
             AND mp.id = $2
             AND c.year = mp.year
             AND c.month = mp.month`,
          [householdId, periodId],
        );

        for (const row of contribs.rows) {
          // No nos importa el retorno; la función actualiza member_balances
          await query('SELECT reconcile_contribution_balance($1)', [row.id]);
        }
      } catch (reconError) {
        console.error('[lockPeriod] Reconciliation error:', reconError);
        // No fallamos la operación de lock por errores de reconciliación; se puede reintentar manualmente
      }

      revalidatePath('/sickness');
      revalidatePath('/sickness/periodo');
      revalidatePath('/sickness/credito-deuda');
      return ok({ periodId });
    }
    return fail('No se pudo bloquear el período');
  } catch (error) {
    const err = error as { message?: string; detail?: string; hint?: string } | undefined;
    const message = err?.message || String(error);
    console.error('[lockPeriod] Error:', message);
    // Intentar extraer detalle de Postgres (ej. RAISE EXCEPTION ...)
    const pgHint = err?.detail || err?.hint || undefined;
    return fail(pgHint ? `${message} - ${pgHint}` : message);
  }
}

/**
 * Abre el período (pasa de 'validation' a 'active')
 */
export async function openPeriod(periodId: string): Promise<Result<{ periodId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail('No autenticado');

    const householdId = await getUserHouseholdId();
    if (!householdId) return fail('No tienes un hogar activo');

    const result = await query<{ id: string }>(
      'SELECT public.open_monthly_period($1, $2, $3) AS id',
      [householdId, periodId, user.profile_id],
    );

    const id = result.rows[0]?.id;
    if (!id) return fail('No se pudo abrir el período');

    revalidatePath('/sickness');
    revalidatePath('/sickness/periodo');
    return ok({ periodId: id });
  } catch (error) {
    console.error('[openPeriod] Error:', error);
    return fail(formatPgError(error));
  }
}

/**
 * Inicia el cierre del período (pasa de 'active' a 'closing')
 */
export async function startClosing(periodId: string, reason?: string): Promise<Result<{ periodId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail('No autenticado');

    const householdId = await getUserHouseholdId();
    if (!householdId) return fail('No tienes un hogar activo');

    const result = await query<{ id: string }>(
      'SELECT public.start_monthly_closing($1, $2, $3, $4) AS id',
      [householdId, periodId, user.profile_id, reason ?? null],
    );

    const id = result.rows[0]?.id;
    if (!id) return fail('No se pudo iniciar el cierre del período');

    revalidatePath('/sickness');
    revalidatePath('/sickness/periodo');
    return ok({ periodId: id });
  } catch (error) {
    console.error('[startClosing] Error:', error);
    return fail(formatPgError(error));
  }
}

/**
 * Revierte la fase del período a la fase anterior permitida
 * (validation->preparing, active->validation, closing->active, closed->closing)
 */
export async function reopenPeriod(periodId: string, reason?: string): Promise<Result<{ periodId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail('No autenticado');

    const householdId = await getUserHouseholdId();
    if (!householdId) return fail('No tienes un hogar activo');

    const result = await query<{ id: string }>(
      'SELECT public.reopen_monthly_period($1, $2, $3, $4) AS id',
      [householdId, periodId, user.profile_id, reason ?? null],
    );

    const id = result.rows[0]?.id;
    if (!id) return fail('No se pudo revertir la fase');

    revalidatePath('/sickness');
    revalidatePath('/sickness/periodo');
    return ok({ periodId: id });
  } catch (error) {
    console.error('[reopenPeriod] Error:', error);
    return fail(formatPgError(error));
  }
}

/**
 * Elimina un período mensual completo del sistema
 *
 * ADVERTENCIA: Esta operación elimina:
 * - El registro del período (monthly_periods)
 * - Todas las contribuciones asociadas (contributions)
 * - Todas las transacciones del período (transactions)
 * - Ajustes de contribución (contribution_adjustments, si existen)
 *
 * NO elimina:
 * - Logs de auditoría
 * - Historial de journals (si aplica)
 * - Registros de debug/control
 *
 * Requiere confirmación explícita del usuario.
 */
export async function deletePeriod(
  periodId: string,
  confirmationText: string,
): Promise<Result<{ deletedPeriodInfo: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('No autenticado');
    }

    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No tienes un hogar activo');
    }

    // 1. Obtener información del período ANTES de eliminarlo
    const periodRes = await query<{
      id: string;
      year: number;
      month: number;
      phase: string;
      household_id: string;
    }>(
      `SELECT id, year, month, phase::text, household_id
       FROM monthly_periods
       WHERE id = $1 AND household_id = $2
       LIMIT 1`,
      [periodId, householdId],
    );

    const period = periodRes.rows[0];
    if (!period) {
      return fail('Período no encontrado en tu hogar');
    }    // 2. Validar confirmación: formato "YYYY-MM" (ej: "2025-09")
    const expectedConfirmation = `${period.year}-${String(period.month).padStart(2, '0')}`;
    if (confirmationText !== expectedConfirmation) {
      return fail(
        `Confirmación incorrecta. Debes escribir exactamente: ${expectedConfirmation}`,
      );
    }

    // 3. Verificar si es el período activo (no se puede eliminar)
    // Consideramos "activo" si está en fase 'active'
    if (period.phase === 'active') {
      return fail(
        'No puedes eliminar el período activo. Cierra el período primero o crea uno nuevo.',
      );
    }

    // 4. Eliminar en orden inverso de dependencias

    // 4.1. Ajustes de contribución (si existen)
    await query(
      `DELETE FROM contribution_adjustments ca
       WHERE ca.contribution_id IN (
         SELECT c.id FROM contributions c
         WHERE c.household_id = $1
           AND c.year = $2
           AND c.month = $3
       )`,
      [householdId, period.year, period.month],
    );

    // 4.2. Transacciones del período
    const txDeleteResult = await query(
      `DELETE FROM transactions
       WHERE household_id = $1
         AND period_id = $2
       RETURNING id`,
      [householdId, periodId],
    );
    const deletedTxCount = txDeleteResult.rows.length;

    // 4.3. Contribuciones
    const contribDeleteResult = await query(
      `DELETE FROM contributions
       WHERE household_id = $1
         AND year = $2
         AND month = $3
       RETURNING id`,
      [householdId, period.year, period.month],
    );
    const deletedContribCount = contribDeleteResult.rows.length;

    // 4.4. Período en sí
    await query(
      `DELETE FROM monthly_periods
       WHERE id = $1 AND household_id = $2`,
      [periodId, householdId],
    );

    // 5. Log de auditoría (informativo)
    console.log(
      `[deletePeriod] Usuario ${user.profile_id} eliminó período ${period.year}-${period.month} ` +
        `(${deletedTxCount} transacciones, ${deletedContribCount} contribuciones)`,
    );

    // 6. Revalidar rutas afectadas
    revalidatePath('/sickness');
    revalidatePath('/sickness/periodo');
    revalidatePath('/sickness/transacciones');
    revalidatePath('/sickness/balance');
    revalidatePath('/sickness/credito-deuda');

    return ok({
      deletedPeriodInfo: `${period.year}-${String(period.month).padStart(2, '0')} (${deletedTxCount} transacciones, ${deletedContribCount} contribuciones)`,
    });
  } catch (error) {
    console.error('[deletePeriod] Error:', error);
    return fail(formatPgError(error));
  }
}

// =====================================================
// FORM ACTIONS (validación Zod + llamada a función)
// =====================================================

const PeriodIdSchema = z.object({ periodId: z.string().uuid() });

export async function lockPeriodAction(formData: FormData): Promise<Result> {
  'use server';
  const parsed = PeriodIdSchema.safeParse({ periodId: String(formData.get('periodId') || '') });
  if (!parsed.success) return fail('Datos inválidos');
  return lockPeriod(parsed.data.periodId);
}

export async function openPeriodAction(formData: FormData): Promise<Result> {
  'use server';
  const parsed = PeriodIdSchema.safeParse({ periodId: String(formData.get('periodId') || '') });
  if (!parsed.success) return fail('Datos inválidos');
  return openPeriod(parsed.data.periodId);
}

export async function startClosingAction(formData: FormData): Promise<Result> {
  'use server';
  const schema = PeriodIdSchema.extend({ reason: z.string().optional() });
  const parsed = schema.safeParse({
    periodId: String(formData.get('periodId') || ''),
    reason: formData.get('reason') ? String(formData.get('reason')) : undefined,
  });
  if (!parsed.success) return fail('Datos inválidos');
  return startClosing(parsed.data.periodId, parsed.data.reason);
}

export async function closePeriodAction(formData: FormData): Promise<Result> {
  'use server';
  const schema = PeriodIdSchema.extend({ notes: z.string().optional() });
  const parsed = schema.safeParse({
    periodId: String(formData.get('periodId') || ''),
    notes: formData.get('notes') ? String(formData.get('notes')) : undefined,
  });
  if (!parsed.success) return fail('Datos inválidos');
  return closePeriod(parsed.data.periodId, parsed.data.notes);
}

export async function reopenPeriodAction(formData: FormData): Promise<Result> {
  'use server';
  const schema = PeriodIdSchema.extend({ reason: z.string().optional() });
  const parsed = schema.safeParse({
    periodId: String(formData.get('periodId') || ''),
    reason: formData.get('reason') ? String(formData.get('reason')) : undefined,
  });
  if (!parsed.success) return fail('Datos inválidos');
  return reopenPeriod(parsed.data.periodId, parsed.data.reason);
}
