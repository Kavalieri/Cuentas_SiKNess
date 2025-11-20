'use server';

import { getCurrentUser, getUserHouseholdId, isHouseholdOwner } from '@/lib/auth';
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
 * Porcentaje máximo del saldo del hogar que se puede prestar
 * Para no dejar la cuenta común vacía
 */
const MAX_LOANABLE_PERCENTAGE = 0.8; // 80%

/**
 * Calcular el saldo disponible del hogar para préstamos
 *
 * @returns Objeto con balance total y máximo prestable
 */
export async function getHouseholdAvailableBalance(): Promise<
  Result<{
    total_balance: number;
    max_loanable: number;
    pending_loan_requests: number;
  }>
> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No se pudo obtener el hogar del usuario');
    }

    // Calcular balance total del hogar (ingresos - gastos comunes)
    const balanceRes = await query<{ balance: number }>(
      `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as balance
      FROM transactions
      WHERE household_id = $1
        AND flow_type = 'common'
    `,
      [householdId],
    );

    const totalBalance = balanceRes.rows[0]?.balance || 0;

    // Obtener monto total de solicitudes pendientes
    const pendingRes = await query<{ pending: number }>(
      `
      SELECT COALESCE(SUM(amount), 0) as pending
      FROM loan_requests
      WHERE household_id = $1
        AND status = 'pending'
    `,
      [householdId],
    );

    const pendingRequests = pendingRes.rows[0]?.pending || 0;

    // Máximo prestable = 80% del balance - préstamos pendientes
    const maxLoanable = Math.max(0, totalBalance * MAX_LOANABLE_PERCENTAGE - pendingRequests);

    return ok({
      total_balance: totalBalance,
      max_loanable: maxLoanable,
      pending_loan_requests: pendingRequests,
    });
  } catch (error) {
    console.error('Error al obtener balance disponible:', error);
    return fail('Error al calcular el balance disponible del hogar');
  }
}

/**
 * Crear una solicitud de préstamo del hogar hacia un miembro
 *
 * El préstamo queda pendiente de aprobación por el owner del hogar.
 * Una vez aprobado, se creará una transacción de gasto común.
 *
 * @param amount - Monto solicitado
 * @param description - Descripción opcional del préstamo
 */
export async function requestHouseholdLoan(
  amount: number,
  description?: string,
): Promise<Result<{ request_id: string }>> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No se pudo obtener el hogar del usuario');
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return fail('No se pudo obtener el usuario actual');
    }

    // Validaciones
    if (amount <= 0) {
      return fail('El monto debe ser mayor a 0');
    }

    // Verificar saldo disponible
    const balanceResult = await getHouseholdAvailableBalance();
    if (!balanceResult.ok) {
      return fail('No se pudo verificar el balance del hogar');
    }

    if (amount > balanceResult.data!.max_loanable) {
      return fail(
        `El monto solicitado (€${amount.toFixed(
          2,
        )}) excede el disponible para préstamos (€${balanceResult.data!.max_loanable.toFixed(2)})`,
      );
    }

    // Crear solicitud de préstamo
    const result = await query<{ id: string }>(
      `
      INSERT INTO loan_requests (
        household_id,
        profile_id,
        amount,
        description,
        status
      ) VALUES ($1, $2, $3, $4, 'pending')
      RETURNING id
    `,
      [householdId, currentUser.profile_id, amount, description || 'Préstamo del hogar'],
    );

    const requestId = result.rows[0]?.id;
    if (!requestId) {
      return fail('Error al crear la solicitud');
    }

    revalidatePath('/sickness/credito-deuda');
    return ok({
      request_id: requestId,
      message: 'Solicitud de préstamo creada. Pendiente de aprobación del administrador.',
    });
  } catch (error) {
    console.error('Error al solicitar préstamo:', error);
    return fail('Error al crear la solicitud de préstamo');
  }
}

/**
 * Obtener solicitudes de préstamo pendientes (solo para owner)
 */
export async function getPendingLoanRequests(): Promise<
  Result<
    Array<{
      id: string;
      profile_id: string;
      display_name: string;
      amount: number;
      description: string | null;
      requested_at: string;
    }>
  >
> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No se pudo obtener el hogar del usuario');
    }

    const result = await query<{
      id: string;
      profile_id: string;
      display_name: string;
      amount: number;
      description: string | null;
      requested_at: Date;
    }>(
      `
      SELECT
        lr.id,
        lr.profile_id,
        p.display_name,
        lr.amount,
        lr.description,
        lr.requested_at
      FROM loan_requests lr
      INNER JOIN profiles p ON p.id = lr.profile_id
      WHERE lr.household_id = $1
        AND lr.status = 'pending'
      ORDER BY lr.requested_at ASC
    `,
      [householdId],
    );

    // Convertir Date a string para serialización JSON
    const requests = result.rows.map((row) => ({
      ...row,
      requested_at: row.requested_at.toISOString(),
    }));

    return ok(requests);
  } catch (error) {
    console.error('Error al obtener solicitudes pendientes:', error);
    return fail('Error al obtener las solicitudes de préstamo');
  }
}

/**
 * Aprobar una solicitud de préstamo (solo owner)
 *
 * Crea una transacción de gasto común que reduce el balance del hogar
 * y aumenta la deuda del miembro solicitante.
 */
export async function approveLoanRequest(requestId: string): Promise<Result> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No se pudo obtener el hogar del usuario');
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return fail('No se pudo obtener el usuario actual');
    }

    // Verificar que el usuario es owner del hogar
    const isOwner = await isHouseholdOwner();
    if (!isOwner) {
      return fail('Solo el propietario del hogar puede aprobar préstamos');
    }

    // Obtener detalles de la solicitud
    const requestRes = await query<{
      profile_id: string;
      amount: number;
      description: string | null;
      status: string;
    }>(
      `
      SELECT profile_id, amount, description, status
      FROM loan_requests
      WHERE id = $1 AND household_id = $2
    `,
      [requestId, householdId],
    );

    if (!requestRes.rows[0]) {
      return fail('Solicitud de préstamo no encontrada');
    }

    const request = requestRes.rows[0];

    if (request.status !== 'pending') {
      return fail('La solicitud ya fue procesada');
    }

    // Obtener nombre del solicitante
    const profileRes = await query<{ display_name: string }>(
      `SELECT display_name FROM profiles WHERE id = $1`,
      [request.profile_id],
    );

    const memberName = profileRes.rows[0]?.display_name || 'Miembro';

    // Crear transacción de gasto común (préstamo del hogar)
    const transactionRes = await query<{ id: string }>(
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
      ) VALUES ($1, $2, $2, $3, $4, 'expense', 'common', $5, NOW())
      RETURNING id
    `,
      [
        householdId,
        request.profile_id, // El solicitante es quien "ejecuta" el gasto del hogar
        LOAN_CATEGORIES.REQUEST, // "Préstamo Personal"
        request.amount,
        request.description || `Préstamo del hogar a ${memberName}`,
      ],
    );

    const transactionId = transactionRes.rows[0]?.id;
    if (!transactionId) {
      return fail('Error al crear la transacción');
    }

    // Actualizar solicitud como aprobada
    await query(
      `
      UPDATE loan_requests
      SET
        status = 'approved',
        reviewed_by_profile_id = $1,
        reviewed_at = NOW(),
        transaction_id = $2,
        updated_at = NOW()
      WHERE id = $3
    `,
      [currentUser.profile_id, transactionId, requestId],
    );

    revalidatePath('/sickness/credito-deuda');
    return ok({ message: 'Préstamo aprobado y registrado exitosamente' });
  } catch (error) {
    console.error('Error al aprobar préstamo:', error);
    return fail('Error al aprobar la solicitud de préstamo');
  }
}

/**
 * Rechazar una solicitud de préstamo (solo owner)
 */
export async function rejectLoanRequest(requestId: string, reason?: string): Promise<Result> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No se pudo obtener el hogar del usuario');
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return fail('No se pudo obtener el usuario actual');
    }

    // Verificar que el usuario es owner del hogar
    const isOwner = await isHouseholdOwner();
    if (!isOwner) {
      return fail('Solo el propietario del hogar puede rechazar préstamos');
    }

    await query(
      `
      UPDATE loan_requests
      SET
        status = 'rejected',
        reviewed_by_profile_id = $1,
        reviewed_at = NOW(),
        rejection_reason = $2,
        updated_at = NOW()
      WHERE id = $3 AND household_id = $4 AND status = 'pending'
    `,
      [currentUser.profile_id, reason, requestId, householdId],
    );

    revalidatePath('/sickness/credito-deuda');
    return ok({ message: 'Solicitud de préstamo rechazada' });
  } catch (error) {
    console.error('Error al rechazar préstamo:', error);
    return fail('Error al rechazar la solicitud de préstamo');
  }
}

/**
 * Devolver préstamo al hogar
 *
 * Crea una transacción de ingreso común que aumenta el balance del hogar
 * y reduce la deuda del miembro.
 *
 * @param amount - Monto a devolver
 */
export async function repayHouseholdLoan(amount: number): Promise<Result> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No se pudo obtener el hogar del usuario');
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return fail('No se pudo obtener el usuario actual');
    }

    // Validaciones
    if (amount <= 0) {
      return fail('El monto debe ser mayor a 0');
    }

    // Obtener nombre del usuario
    const profileRes = await query<{ display_name: string }>(
      `SELECT display_name FROM profiles WHERE id = $1`,
      [currentUser.profile_id],
    );

    const memberName = profileRes.rows[0]?.display_name || 'Miembro';

    // Crear transacción de ingreso común (devolución de préstamo)
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
      ) VALUES ($1, $2, $2, $3, $4, 'income', 'common', $5, NOW())
    `,
      [
        householdId,
        currentUser.profile_id,
        LOAN_CATEGORIES.REPAYMENT, // "Pago Préstamo"
        amount,
        `Devolución de préstamo de ${memberName} al hogar`,
      ],
    );

    revalidatePath('/sickness/credito-deuda');
    return ok({ message: 'Pago de préstamo registrado exitosamente' });
  } catch (error) {
    console.error('Error al realizar pago:', error);
    return fail('Error al registrar el pago del préstamo');
  }
}

/**
 * Obtener el balance de préstamos de un miembro
 * (deuda total con el hogar)
 */
export async function getMemberLoanBalance(): Promise<
  Result<{
    loan_expenses: number; // Préstamos recibidos
    loan_repayments: number; // Pagos realizados
    net_debt: number; // Deuda neta (positivo = debe al hogar)
  }>
> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No se pudo obtener el hogar del usuario');
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return fail('No se pudo obtener el usuario actual');
    }

    // Calcular préstamos recibidos (gastos con categoría "Préstamo Personal")
    const expensesRes = await query<{ total: number }>(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE household_id = $1
        AND performed_by_profile_id = $2
        AND category_id = $3
        AND type = 'expense'
        AND flow_type = 'common'
    `,
      [householdId, currentUser.profile_id, LOAN_CATEGORIES.REQUEST],
    );

    // Calcular devoluciones (ingresos con categoría "Pago Préstamo")
    const repaymentsRes = await query<{ total: number }>(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE household_id = $1
        AND performed_by_profile_id = $2
        AND category_id = $3
        AND type = 'income'
        AND flow_type = 'common'
    `,
      [householdId, currentUser.profile_id, LOAN_CATEGORIES.REPAYMENT],
    );

    const loanExpenses = expensesRes.rows[0]?.total || 0;
    const loanRepayments = repaymentsRes.rows[0]?.total || 0;
    const netDebt = loanExpenses - loanRepayments;

    return ok({
      loan_expenses: loanExpenses,
      loan_repayments: loanRepayments,
      net_debt: netDebt,
    });
  } catch (error) {
    console.error('Error al obtener balance de préstamos:', error);
    return fail('Error al calcular el balance de préstamos');
  }
}

/**
 * Obtener las solicitudes de préstamo del usuario actual
 */
export async function getMyLoanRequests(): Promise<
  Result<
    Array<{
      id: string;
      amount: number;
      description: string | null;
      status: string;
      requested_at: Date;
      reviewed_at: Date | null;
      rejection_reason: string | null;
    }>
  >
> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No se pudo obtener el hogar del usuario');
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return fail('No se pudo obtener el usuario actual');
    }

    const result = await query<{
      id: string;
      amount: number;
      description: string | null;
      status: string;
      requested_at: Date;
      reviewed_at: Date | null;
      rejection_reason: string | null;
    }>(
      `
      SELECT
        id,
        amount,
        description,
        status,
        requested_at,
        reviewed_at,
        rejection_reason
      FROM loan_requests
      WHERE household_id = $1
        AND profile_id = $2
      ORDER BY requested_at DESC
    `,
      [householdId, currentUser.profile_id],
    );

    return ok(result.rows);
  } catch (error) {
    console.error('Error al obtener mis solicitudes:', error);
    return fail('Error al obtener las solicitudes de préstamo');
  }
}
