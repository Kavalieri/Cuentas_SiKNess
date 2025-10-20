'use server';

import { query } from '@/lib/db';
import { getUserHouseholdId, getCurrentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';
import { revalidatePath } from 'next/cache';

/**
 * Obtiene el estado de balance (crédito/deuda) del miembro actual
 */
export async function getMemberBalanceStatus(): Promise<
  Result<{
    balance: number;
    credit: number;
    total_debt: number;
    status: 'credit' | 'debt' | 'settled';
    breakdown: {
      contribution_balance: number;
      active_loans: {
        amount: number;
        count: number;
      };
    };
    summary: string;
  }>
> {
    const user = await getCurrentUser();
    if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  try {
    const result = await query(
      `SELECT get_member_balance_status($1, $2) as status`,
        [householdId, user.profile_id],
    );

    const status = result.rows[0]?.status || {
      balance: 0,
      credit: 0,
      total_debt: 0,
      status: 'settled',
      breakdown: {
        contribution_balance: 0,
        active_loans: { amount: 0, count: 0 },
      },
      summary: 'Saldado',
    };

    return ok(status);
  } catch (error) {
    console.error('Error getting member balance status:', error);
    return fail('Error al obtener estado de balance');
  }
}

/**
 * Obtiene overview de balances de todos los miembros (solo owner)
 */
export async function getHouseholdBalancesOverview(): Promise<
  Result<{
    household_id: string;
    members: Array<{
      profile_id: string;
      email: string;
      display_name: string;
      balance: number;
      status: any;
    }>;
    totals: {
      credits_owed: number;
      debts_owed: number;
      net_balance: number;
    };
    pending_loans: number;
  }>
> {
    const user = await getCurrentUser();
    if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  // Verificar que es owner
  const roleResult = await query(
    `SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2`,
      [householdId, user.profile_id],
  );

  if (roleResult.rows[0]?.role !== 'owner') {
    return fail('Solo el owner puede ver este resumen');
  }

  try {
    const result = await query(
      `SELECT get_household_balances_overview($1) as overview`,
      [householdId],
    );

    return ok(result.rows[0]?.overview || {});
  } catch (error) {
    console.error('Error getting household balances overview:', error);
    return fail('Error al obtener resumen de balances');
  }
}

/**
 * Solicita un préstamo personal al hogar
 */
export async function requestPersonalLoan(
  amount: number,
  notes: string,
): Promise<Result<{ loanId: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  if (amount <= 0) {
    return fail('El monto debe ser mayor a 0');
  }

  if (!notes || notes.trim().length === 0) {
    return fail('Debes proporcionar una descripción del préstamo');
  }

  try {
    const result = await query(
      `INSERT INTO personal_loans (
        household_id, profile_id, amount, notes, requested_by, status
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id`,
      [householdId, user.profile_id, amount, notes.trim(), user.profile_id],
    );

      if (!result.rows[0]) {
        return fail('Error al crear préstamo');
      }

    revalidatePath('/sickness/credito-deuda');
    return ok({ loanId: result.rows[0].id });
  } catch (error) {
    console.error('Error requesting personal loan:', error);
    return fail('Error al solicitar préstamo');
  }
}

/**
 * Aprueba un préstamo personal (solo owner)
 * Crea transacción de gasto y actualiza balance del miembro
 */
export async function approvePersonalLoan(
  loanId: string,
): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  // Verificar que es owner
  const roleResult = await query(
    `SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2`,
    [householdId, user.profile_id],
  );

  if (roleResult.rows[0]?.role !== 'owner') {
    return fail('Solo el owner puede aprobar préstamos');
  }

  try {
    // Obtener préstamo
    const loanResult = await query(
      `SELECT * FROM personal_loans WHERE id = $1 AND household_id = $2`,
      [loanId, householdId],
    );

    const loan = loanResult.rows[0];
    if (!loan) {
      return fail('Préstamo no encontrado');
    }

    if (loan.status !== 'pending') {
      return fail(`El préstamo ya fue ${loan.status === 'approved' ? 'aprobado' : 'rechazado'}`);
    }

    // Crear transacción de gasto (retiro del hogar)
    const txResult = await query(
      `INSERT INTO transactions (
        household_id, profile_id, type, amount, description,
        occurred_at, performed_at, flow_type, 
        created_by_profile_id, performed_by_email
      ) VALUES ($1, $2, 'expense', $3, $4, NOW(), NOW(), 'common', $5, $6)
      RETURNING id`,
      [
        loan.household_id,
        loan.profile_id,
        loan.amount,
        `Préstamo personal: ${loan.notes}`,
          user.profile_id,
          user.email,
      ],
    );

      if (!txResult.rows[0]) {
        return fail('Error al crear transacción');
      }

    const txId = txResult.rows[0].id;

    // Actualizar préstamo
    await query(
      `UPDATE personal_loans 
       SET status = 'approved', 
           approved_by = $1, 
           approved_at = NOW(),
           withdrawal_transaction_id = $2
       WHERE id = $3`,
        [user.profile_id, txId, loanId],
    );

    // Actualizar balance del miembro (aumentar deuda)
    await query(
      `SELECT update_member_balance($1, $2, $3, $4)`,
      [
        loan.household_id,
        loan.profile_id,
        -loan.amount, // negativo = deuda
        `Personal loan approved: ${loan.amount}€`,
      ],
    );

    revalidatePath('/sickness/credito-deuda');
    revalidatePath('/sickness/balance');
    return ok();
  } catch (error) {
    console.error('Error approving personal loan:', error);
    return fail('Error al aprobar préstamo');
  }
}

/**
 * Rechaza un préstamo personal (solo owner)
 */
export async function rejectPersonalLoan(
  loanId: string,
): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  // Verificar que es owner
  const roleResult = await query(
    `SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2`,
    [householdId, user.profile_id],
  );

  if (roleResult.rows[0]?.role !== 'owner') {
    return fail('Solo el owner puede rechazar préstamos');
  }

  try {
    const result = await query(
      `UPDATE personal_loans 
       SET status = 'rejected'
       WHERE id = $1 AND household_id = $2 AND status = 'pending'
       RETURNING id`,
      [loanId, householdId],
    );

    if (result.rowCount === 0) {
      return fail('Préstamo no encontrado o ya procesado');
    }

    revalidatePath('/sickness/credito-deuda');
    return ok();
  } catch (error) {
    console.error('Error rejecting personal loan:', error);
    return fail('Error al rechazar préstamo');
  }
}

/**
 * Obtiene lista de préstamos pendientes de aprobación (solo owner)
 */
export async function getPendingLoans(): Promise<
  Result<
    Array<{
      id: string;
      profile_id: string;
      email: string;
      display_name: string;
      amount: number;
      notes: string;
      requested_at: string;
    }>
  >
> {
    const user = await getCurrentUser();
    if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  // Verificar que es owner
  const roleResult = await query(
    `SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2`,
      [householdId, user.profile_id],
  );

  if (roleResult.rows[0]?.role !== 'owner') {
    return fail('Solo el owner puede ver préstamos pendientes');
  }

  try {
    const result = await query(
      `SELECT 
        pl.id,
        pl.profile_id,
        p.email,
        p.display_name,
        pl.amount,
        pl.notes,
        pl.requested_at
      FROM personal_loans pl
      INNER JOIN profiles p ON p.id = pl.profile_id
      WHERE pl.household_id = $1
        AND pl.status = 'pending'
      ORDER BY pl.requested_at ASC`,
      [householdId],
    );

      return ok(result.rows as Array<{
        id: string;
        profile_id: string;
        email: string;
        display_name: string;
        amount: number;
        notes: string;
        requested_at: string;
      }>);
  } catch (error) {
    console.error('Error getting pending loans:', error);
    return fail('Error al obtener préstamos pendientes');
  }
}
