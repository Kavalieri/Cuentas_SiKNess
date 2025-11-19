'use server';

import { getCurrentUser, getUserHouseholdId } from '@/lib/auth';
import { query } from '@/lib/db';
import type { Result } from '@/lib/result';
import { fail, ok } from '@/lib/result';
import { revalidatePath } from 'next/cache';

/**
 * IDs de las categorías del sistema para préstamos
 * Estas categorías ya existen en la base de datos
 */
const LOAN_CATEGORIES = {
  REQUEST: 'a79198f0-81c0-4269-91b7-796c9f8dacbf', // "Préstamo Personal" (expense)
  REPAYMENT: 'c705db2a-e013-401b-a876-bc9c1d48072b', // "Pago Préstamo" (income)
} as const;

/**
 * Solicitar un préstamo a otro miembro del hogar
 *
 * Crea una transacción de tipo expense con la categoría "Préstamo Personal"
 * - El prestamista (lender) registra un gasto, lo que aumenta su crédito
 * - El prestatario (borrower) recibe el préstamo, lo que reduce su deuda
 *
 * @param lenderId - UUID del miembro que presta el dinero
 * @param amount - Monto del préstamo
 * @param description - Descripción opcional del préstamo
 */
export async function requestLoan(
  lenderId: string,
  amount: number,
  description?: string,
): Promise<Result> {
  try {
    // Obtener usuario actual y su hogar
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No se pudo obtener el hogar del usuario');
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return fail('No se pudo obtener el usuario actual');
    }

    const borrowerId = currentUser.profile_id;

    // Validaciones
    if (amount <= 0) {
      return fail('El monto debe ser mayor a 0');
    }

    if (!lenderId) {
      return fail('Debe seleccionar un prestamista');
    }

    // No permitir préstamos a uno mismo
    if (lenderId === borrowerId) {
      return fail('No puedes solicitar un préstamo a ti mismo');
    }

    // Obtener nombre del prestamista
    const lenderRes = await query<{ display_name: string }>(
      `SELECT display_name FROM profiles WHERE id = $1`,
      [lenderId],
    );

    const lenderName = lenderRes.rows[0]?.display_name || 'Miembro';

    // Obtener nombre del prestatario
    const borrowerRes = await query<{ display_name: string }>(
      `SELECT display_name FROM profiles WHERE id = $1`,
      [borrowerId],
    );

    const borrowerName = borrowerRes.rows[0]?.display_name || 'Miembro';

    // Crear transacción de préstamo
    // El prestamista "realiza el gasto" (performed_by) del préstamo
    const finalDescription = description || `Préstamo de ${lenderName} a ${borrowerName}`;

    await query(
      `
      INSERT INTO transactions (
        household_id,
        performed_by_profile_id,
        profile_id,
        category_id,
        amount,
        type,
        flow_type,
        description,
        occurred_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `,
      [
        householdId,
        lenderId, // El prestamista es quien "ejecuta" el gasto
        lenderId, // También es quien lo registra
        LOAN_CATEGORIES.REQUEST, // "Préstamo Personal"
        amount,
        'expense',
        'direct',
        finalDescription,
      ],
    );

    revalidatePath('/sickness/credito-deuda');
    return ok({ message: 'Préstamo registrado exitosamente' });
  } catch (error) {
    console.error('Error al solicitar préstamo:', error);
    return fail('Error al registrar el préstamo');
  }
}

/**
 * Realizar un pago de préstamo a otro miembro
 *
 * Crea una transacción de tipo income con la categoría "Pago Préstamo"
 * - El deudor (debtor) registra un ingreso, lo que reduce su deuda
 * - El acreedor (creditor) recibe el pago, lo que reduce su crédito
 *
 * @param creditorId - UUID del miembro al que se le paga
 * @param amount - Monto del pago
 */
export async function repayLoan(creditorId: string, amount: number): Promise<Result> {
  try {
    // Obtener usuario actual y su hogar
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No se pudo obtener el hogar del usuario');
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return fail('No se pudo obtener el usuario actual');
    }

    const debtorId = currentUser.profile_id;

    // Validaciones
    if (amount <= 0) {
      return fail('El monto debe ser mayor a 0');
    }

    if (!creditorId) {
      return fail('Debe seleccionar un acreedor');
    }

    // No permitir pagos a uno mismo
    if (creditorId === debtorId) {
      return fail('No puedes realizar un pago a ti mismo');
    }

    // Obtener nombre del acreedor
    const creditorRes = await query<{ display_name: string }>(
      `SELECT display_name FROM profiles WHERE id = $1`,
      [creditorId],
    );

    const creditorName = creditorRes.rows[0]?.display_name || 'Miembro';

    // Obtener nombre del deudor
    const debtorRes = await query<{ display_name: string }>(
      `SELECT display_name FROM profiles WHERE id = $1`,
      [debtorId],
    );

    const debtorName = debtorRes.rows[0]?.display_name || 'Miembro';

    // Crear transacción de pago
    // El deudor "realiza el ingreso" (performed_by) del pago
    const description = `Pago de préstamo de ${debtorName} a ${creditorName}`;

    await query(
      `
      INSERT INTO transactions (
        household_id,
        performed_by_profile_id,
        profile_id,
        category_id,
        amount,
        type,
        flow_type,
        description,
        occurred_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `,
      [
        householdId,
        debtorId, // El deudor es quien "ejecuta" el ingreso
        debtorId, // También es quien lo registra
        LOAN_CATEGORIES.REPAYMENT, // "Pago Préstamo"
        amount,
        'income',
        'direct',
        description,
      ],
    );

    revalidatePath('/sickness/credito-deuda');
    return ok({ message: 'Pago registrado exitosamente' });
  } catch (error) {
    console.error('Error al realizar pago:', error);
    return fail('Error al registrar el pago');
  }
}

/**
 * Obtener los miembros del hogar con sus balances actuales
 * Para mostrar contexto al solicitar préstamos o realizar pagos
 */
export async function getHouseholdMembersWithBalance(): Promise<
  Result<
    Array<{
      profile_id: string;
      display_name: string;
      balance: number;
    }>
  >
> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No se pudo obtener el hogar del usuario');
    }

    // Obtener miembros y sus balances desde la vista materializada
    const res = await query<{
      profile_id: string;
      display_name: string;
      balance: number;
    }>(
      `
      SELECT
        p.id as profile_id,
        p.display_name,
        COALESCE(
          mv.actual_contributions - mv.expected_contribution + mv.direct_expenses_current_month,
          0
        ) as balance
      FROM profiles p
      INNER JOIN household_members hm ON hm.profile_id = p.id
      LEFT JOIN mv_member_pending_contributions mv
        ON mv.profile_id = p.id AND mv.household_id = hm.household_id
      WHERE hm.household_id = $1
      ORDER BY p.display_name
    `,
      [householdId],
    );

    return ok(res.rows);
  } catch (error) {
    console.error('Error al obtener miembros:', error);
    return fail('Error al obtener los miembros del hogar');
  }
}
