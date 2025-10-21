/**
 * Acciones para el Sistema de Reembolsos Activos y Declarados
 *
 * Dos modos de reembolso:
 * 1. ACTIVO: Usuario crea un gasto directo de reembolso
 *    → Se crea automáticamente el par income_direct
 *    → Se descuenta del balance pendiente inmediatamente
 *
 * 2. DECLARADO: Usuario vincula un reembolso a un gasto directo existente
 *    → Owner debe aprobar antes de contar hacia el balance
 *    → Permite auditoría: verificar que el gasto realmente incluye reembolso
 */

'use server';

import { getCurrentUser, getUserHouseholdId } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import type { Result } from '@/lib/result';
import { fail, ok } from '@/lib/result';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ============================================================
// VALIDACIÓN
// ============================================================

const CreateActiveRefundSchema = z.object({
  amount: z.number().positive('El importe debe ser mayor que 0'),
  categoryId: z.string().uuid('Categoría inválida'),
  description: z.string().optional().default(''),
});

const DeclareRefundSchema = z.object({
  expenseTransactionId: z.string().uuid('ID de gasto inválido'),
  refundAmount: z.number().positive('El importe debe ser mayor que 0'),
  reason: z.string().optional().default(''),
});

const ApproveRefundClaimSchema = z.object({
  claimId: z.string().uuid('ID de reclamación inválido'),
});

// ============================================================
// MODO 1: REEMBOLSO ACTIVO
// ============================================================

/**
 * Crea un reembolso activo (gasto directo de reembolso)
 *
 * Crea automáticamente:
 * - Transacción expense_direct de reembolso
 * - Transacción income_direct de compensación (vinculada vía transaction_pair_id)
 *
 * El balance se actualiza inmediatamente porque ya incluye ambas transacciones.
 *
 * @param amount - Monto a reembolsar
 * @param categoryId - Categoría del gasto (ej: Reembolso, Varios, etc.)
 * @param description - Descripción opcional (ej: "Reembolso vivienda")
 */
export async function createActiveRefund(
  amount: number,
  categoryId: string,
  description?: string,
): Promise<Result<{ expenseId: string; incomeId: string; pairId: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  // Validación
  const validation = CreateActiveRefundSchema.safeParse({ amount, categoryId, description });
  if (!validation.success) {
    return fail('Datos inválidos', validation.error.flatten().fieldErrors as Record<string, string[]>);
  }

  try {
    return await transaction(async (client) => {
      // 1. Verificar que la categoría existe y pertenece al hogar
      const catRes = await client.query(
        `SELECT id FROM categories WHERE id = $1 AND household_id = $2`,
        [categoryId, householdId],
      );
      if (!catRes.rows[0]) throw new Error('Categoría no encontrada');

      // 2. Generar UUID para vincular el par
      const pairId = await client.query(`SELECT gen_random_uuid() as id`);
      const pair_id = (pairId.rows[0].id as string);

      // 3. Crear gasto directo (expense_direct)
      const expenseRes = await client.query(
        `INSERT INTO transactions (
          household_id, category_id, type, amount, currency, description,
          occurred_at, performed_at, flow_type, transaction_pair_id,
          profile_id, real_payer_id,
          created_by_profile_id, performed_by_email, created_by_email
        ) VALUES ($1, $2, 'expense_direct', $3, 'EUR', $4, 
                  NOW()::date, NOW(), 'direct', $5,
                  $6, $6, 
                  $6, $7, $8)
        RETURNING id`,
        [
          householdId,
          categoryId,
          amount,
          description?.trim() || `Reembolso ${new Date().toLocaleDateString('es-ES')}`,
          pair_id,
          user.profile_id,
          user.email,
          user.email,
        ],
      );
      const expenseId = (expenseRes.rows[0].id as string);

      // 4. Crear ingreso directo automático (income_direct)
      const incomeRes = await client.query(
        `INSERT INTO transactions (
          household_id, type, amount, currency, description,
          occurred_at, performed_at, flow_type, transaction_pair_id,
          profile_id,
          created_by_profile_id, performed_by_email, created_by_email
        ) VALUES ($1, 'income_direct', $2, 'EUR', $3,
                  NOW()::date, NOW(), 'direct', $4,
                  $5,
                  $6, $7, $8)
        RETURNING id`,
        [
          householdId,
          amount,
          `Ingreso automático por reembolso: ${description?.trim() || 'Reembolso'}`,
          pair_id,
          user.profile_id,
          user.profile_id,
          user.email,
          user.email,
        ],
      );
      const incomeId = (incomeRes.rows[0].id as string);

      return ok({ expenseId, incomeId, pairId: pair_id });
    });
  } catch (error) {
    console.error('Error creating active refund:', error);
    return fail(error instanceof Error ? error.message : 'Error al crear reembolso activo');
  } finally {
    revalidatePath('/sickness/credito-deuda');
    revalidatePath('/sickness/balance');
  }
}

// ============================================================
// MODO 2: REEMBOLSO DECLARADO
// ============================================================

/**
 * Declara un reembolso vinculado a un gasto directo existente
 *
 * Crea un reclamo (refund_claim) que el owner debe aprobar.
 * El balance NO se actualiza hasta que el owner apruebe.
 *
 * @param expenseTransactionId - ID del gasto directo que incluye reembolso
 * @param refundAmount - Monto del reembolso dentro del gasto
 * @param reason - Razón del reembolso (ej: "Pagué más de lo acordado")
 */
export async function declareRefund(
  expenseTransactionId: string,
  refundAmount: number,
  reason?: string,
): Promise<Result<{ claimId: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  // Validación
  const validation = DeclareRefundSchema.safeParse({
    expenseTransactionId,
    refundAmount,
    reason,
  });
  if (!validation.success) {
    return fail('Datos inválidos', validation.error.flatten().fieldErrors as Record<string, string[]>);
  }

  try {
    return await transaction(async (client) => {
      // 1. Verificar que el gasto existe y pertenece a este hogar
      const txRes = await client.query(
        `SELECT id, type, flow_type, amount, profile_id 
         FROM transactions 
         WHERE id = $1 AND household_id = $2`,
        [expenseTransactionId, householdId],
      );
      const tx = txRes.rows[0];
      if (!tx) throw new Error('Gasto no encontrado');

      // 2. Validar que es un gasto directo (expense_direct + direct)
      if (tx.type !== 'expense_direct' || tx.flow_type !== 'direct') {
        throw new Error('Solo se puede reembolsar gastos directos (expense_direct)');
      }

      // 3. Validar que el reembolso no excede el gasto
      if (refundAmount > Number(tx.amount)) {
        throw new Error('El reembolso no puede exceder el monto del gasto');
      }

      // 4. Validar que el usuario es quien hizo el gasto
      if (tx.profile_id !== user.profile_id) {
        throw new Error('Solo puedes declarar reembolsos en tus propios gastos');
      }

      // 5. Crear reclamo de reembolso
      const claimRes = await client.query(
        `INSERT INTO refund_claims (
          household_id, expense_transaction_id, profile_id, refund_amount, reason,
          created_by_profile_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING id`,
        [
          householdId,
          expenseTransactionId,
          user.profile_id,
          refundAmount,
          reason?.trim() || null,
          user.profile_id,
        ],
      );

      if (!claimRes.rows[0]) throw new Error('No se pudo crear el reclamo');

      return ok({ claimId: claimRes.rows[0].id as string });
    });
  } catch (error) {
    console.error('Error declaring refund:', error);
    return fail(error instanceof Error ? error.message : 'Error al declarar reembolso');
  } finally {
    revalidatePath('/sickness/credito-deuda');
  }
}

// ============================================================
// GESTIÓN DE REEMBOLSOS DECLARADOS (OWNER ONLY)
// ============================================================

/**
 * Obtiene lista de reembolsos pendientes de aprobación (solo owner)
 */
export async function getPendingRefundClaims(): Promise<
  Result<
    Array<{
      id: string;
      profile_id: string;
      email: string;
      display_name: string | null;
      refund_amount: number;
      expense_amount: number;
      expense_category: string | null;
      category_icon: string | null;
      expense_description: string;
      expense_date: string;
      reason: string | null;
      claimed_at: string;
    }>
  >
> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  // Verificar que es owner
  const roleRes = await query(
    `SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2`,
    [householdId, user.profile_id],
  );
  if (roleRes.rows[0]?.role !== 'owner') {
    return fail('Solo el owner puede ver reclamaciones pendientes');
  }

  try {
    const res = await query<{
      id: string;
      profile_id: string;
      email: string;
      display_name: string | null;
      refund_amount: string | number;
      expense_amount: string | number;
      expense_category: string | null;
      category_icon: string | null;
      expense_description: string;
      expense_date: string;
      reason: string | null;
      claimed_at: string;
    }>(
      `SELECT 
        rc.id, rc.profile_id, p.email, p.display_name,
        rc.refund_amount, t_expense.amount as expense_amount,
        c.name as expense_category, c.icon as category_icon,
        t_expense.description as expense_description,
        t_expense.occurred_at::text as expense_date,
        rc.reason, rc.created_at::text as claimed_at
       FROM public.refund_claims rc
       JOIN public.profiles p ON p.id = rc.profile_id
       JOIN public.transactions t_expense ON t_expense.id = rc.expense_transaction_id
       LEFT JOIN public.categories c ON c.id = t_expense.category_id
       WHERE rc.household_id = $1 AND rc.status = 'pending'
       ORDER BY rc.created_at ASC`,
      [householdId],
    );

    const rows = res.rows.map((r) => ({
      id: r.id,
      profile_id: r.profile_id,
      email: r.email,
      display_name: r.display_name,
      refund_amount: Number(r.refund_amount),
      expense_amount: Number(r.expense_amount),
      expense_category: r.expense_category,
      category_icon: r.category_icon,
      expense_description: r.expense_description,
      expense_date: r.expense_date,
      reason: r.reason,
      claimed_at: r.claimed_at,
    }));

    return ok(rows);
  } catch (error) {
    console.error('Error getting pending refund claims:', error);
    return fail('Error al obtener reclamaciones de reembolso');
  }
}

/**
 * Aprueba un reclamo de reembolso declarado (solo owner)
 *
 * Cuando se aprueba:
 * - El reclamo cambia estado a 'approved'
 * - El reembolso se cuenta automáticamente en el cálculo de balance
 * - Se pueden ver en reportes como reembolsos aprobados
 */
export async function approveRefundClaim(claimId: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  // Verificar que es owner
  const roleRes = await query(
    `SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2`,
    [householdId, user.profile_id],
  );
  if (roleRes.rows[0]?.role !== 'owner') {
    return fail('Solo el owner puede aprobar reclamaciones');
  }

  // Validación
  const validation = ApproveRefundClaimSchema.safeParse({ claimId });
  if (!validation.success) {
    return fail('ID de reclamación inválido');
  }

  try {
    const res = await query(
      `UPDATE refund_claims
       SET status = 'approved', approved_by_profile_id = $1, approved_at = NOW()
       WHERE id = $2 AND household_id = $3 AND status = 'pending'
       RETURNING id`,
      [user.profile_id, claimId, householdId],
    );

    if (res.rowCount === 0) {
      return fail('Reclamación no encontrada o ya procesada');
    }

    revalidatePath('/sickness/credito-deuda');
    revalidatePath('/sickness/balance');
    return ok();
  } catch (error) {
    console.error('Error approving refund claim:', error);
    return fail('Error al aprobar reclamación de reembolso');
  }
}

/**
 * Rechaza un reclamo de reembolso declarado (solo owner)
 *
 * Cuando se rechaza:
 * - El reclamo cambia estado a 'rejected'
 * - El reembolso NO se cuenta en el balance
 * - Se pueden ver en reportes como reembolsos rechazados
 */
export async function rejectRefundClaim(claimId: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  // Verificar que es owner
  const roleRes = await query(
    `SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2`,
    [householdId, user.profile_id],
  );
  if (roleRes.rows[0]?.role !== 'owner') {
    return fail('Solo el owner puede rechazar reclamaciones');
  }

  // Validación
  const validation = ApproveRefundClaimSchema.safeParse({ claimId });
  if (!validation.success) {
    return fail('ID de reclamación inválido');
  }

  try {
    const res = await query(
      `UPDATE refund_claims
       SET status = 'rejected', approved_by_profile_id = $1, approved_at = NOW()
       WHERE id = $2 AND household_id = $3 AND status = 'pending'
       RETURNING id`,
      [user.profile_id, claimId, householdId],
    );

    if (res.rowCount === 0) {
      return fail('Reclamación no encontrada o ya procesada');
    }

    revalidatePath('/sickness/credito-deuda');
    revalidatePath('/sickness/balance');
    return ok();
  } catch (error) {
    console.error('Error rejecting refund claim:', error);
    return fail('Error al rechazar reclamación de reembolso');
  }
}

/**
 * Obtiene lista de gastos directos sin reembolso (para declarar reembolso)
 *
 * Útil para UI que permite al usuario seleccionar qué gasto directo incluye reembolso
 */
export async function getUnreimbursedDirectExpenses(): Promise<
  Result<
    Array<{
      id: string;
      category: string | null;
      icon: string | null;
      description: string;
      amount: number;
      occurred_at: string;
    }>
  >
> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  try {
    const res = await query<{
      id: string;
      category: string | null;
      icon: string | null;
      description: string;
      amount: string | number;
      occurred_at: string;
    }>(
      `SELECT 
        t.id, c.name as category, c.icon, t.description,
        t.amount, t.occurred_at::text
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.household_id = $1 
         AND t.profile_id = $2
         AND t.type = 'expense_direct'
         AND t.flow_type = 'direct'
         AND t.refund_claim_id IS NULL
       ORDER BY t.occurred_at DESC`,
      [householdId, user.profile_id],
    );

    const rows = res.rows.map((r) => ({
      id: r.id,
      category: r.category,
      icon: r.icon,
      description: r.description,
      amount: Number(r.amount),
      occurred_at: r.occurred_at,
    }));

    return ok(rows);
  } catch (error) {
    console.error('Error getting unreimbursed direct expenses:', error);
    return fail('Error al obtener gastos sin reembolso');
  }
}
