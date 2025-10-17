'use server';

import { getCurrentUser, getUserHouseholdId } from '@/lib/auth';
import { query } from '@/lib/db';
import type { Result } from '@/lib/result';
import { fail, ok } from '@/lib/result';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

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

    // Revalidar páginas relacionadas
    revalidatePath('/sickness');
    revalidatePath('/sickness/periodo');

    return ok({ periodId: closedId });
  } catch (error) {
    console.error('[closePeriod] Error:', error);
    return fail('Error en operación');
  }
}

/**
 * Pasa el período a fase 'validation' (bloquea cálculo de contribuciones)
 */
export async function lockPeriod(periodId: string): Promise<Result<{ periodId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail('No autenticado');

    const householdId = await getUserHouseholdId();
    if (!householdId) return fail('No tienes un hogar activo');

    const result = await query<{ id: string }>(
      'SELECT public.lock_contributions_period($1, $2, $3) AS id',
      [householdId, periodId, user.profile_id],
    );

    const id = result.rows[0]?.id;
    if (!id) return fail('No se pudo bloquear el período para validación');

    revalidatePath('/sickness');
    revalidatePath('/sickness/periodo');
    return ok({ periodId: id });
  } catch (error) {
    console.error('[lockPeriod] Error:', error);
    return fail('Error en operación');
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
    return fail('Error en operación');
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
    return fail('Error en operación');
  }
}

// =========================
// Wrappers para formularios
// =========================

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
