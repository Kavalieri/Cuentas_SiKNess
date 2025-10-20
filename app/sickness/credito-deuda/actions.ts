'use server';

import { getCurrentUser, getUserHouseholdId } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import type { Result } from '@/lib/result';
import { fail, ok } from '@/lib/result';
import { revalidatePath } from 'next/cache';

/**
 * Obtiene el estado de balance (crédito/deuda) del miembro actual
 * Incluye balance reconciliado (member_balances) + balance pendiente del periodo seleccionado
 *
 * @param selectedYear - Año del periodo seleccionado (opcional, por defecto usa periodo activo del hogar)
 * @param selectedMonth - Mes del periodo seleccionado (opcional, por defecto usa periodo activo del hogar)
 */
export async function getMemberBalanceStatus(
  selectedYear: number,
  selectedMonth: number,
): Promise<
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
      pending_period_balance?: number;
    };
    summary: string;
  }>
> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  try {
    // Obtener balance reconciliado (de member_balances)
    const statusRes = await query(
      `SELECT get_member_balance_status($1, $2) as status`,
      [householdId, user.profile_id],
    );

    const reconciledStatus = statusRes.rows[0]?.status || {
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

    // Calcular balance pendiente del periodo seleccionado (no reconciliado aún)
    // ALINEADO CON /api/periods/contributions:
    // - Usa el periodo seleccionado por el usuario (selectedYear/selectedMonth)
    // - Si no se proporciona, usa el periodo activo del hogar
    // - Suma ingresos comunes + gastos directos como aportación implícita
    let pendingBalance = 0;
    {
      // 1) Obtener período seleccionado (SIEMPRE el seleccionado explícitamente)
      const periodQuery = `
        SELECT id, year, month, status, phase
        FROM monthly_periods
        WHERE household_id = $1
          AND year = $2
          AND month = $3
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const periodParams: [string, number, number] = [householdId, selectedYear, selectedMonth];

      const periodRes = await query<{ id: string; year: number; month: number; status: string; phase?: string }>(
        periodQuery,
        periodParams,
      );

      const period = periodRes.rows[0];
      if (!period) {
        return fail(`No existe el periodo seleccionado (${selectedYear}-${selectedMonth}) para este hogar.`);
      }

      if (period) {
        const startDate = `${period.year}-${String(period.month).padStart(2, '0')}-01`;
        const endDate =
          period.month === 12
            ? `${period.year + 1}-01-01`
            : `${period.year}-${String(period.month + 1).padStart(2, '0')}-01`;

        // 2) Cargar expected del miembro para ese período, si existe
        const contribRes = await query<{ expected_amount: number | null; paid_amount: number | null }>(
          `SELECT expected_amount, paid_amount
           FROM contributions
           WHERE household_id = $1 AND profile_id = $2 AND year = $3 AND month = $4
           LIMIT 1`,
          [householdId, user.profile_id, period.year, period.month],
        );

  // 3) Si no hay fila, calcular expected en base a settings + método del hogar
  let expected = Number(contribRes.rows[0]?.expected_amount ?? 0);
        if (!contribRes.rows[0]) {
          // Meta y método del hogar
          const settingsRes = await query<{ monthly_contribution_goal: string | null; calculation_type: string | null }>(
            `SELECT monthly_contribution_goal, calculation_type
             FROM household_settings
             WHERE household_id = $1`,
            [householdId],
          );
          const monthlyGoal = Number(settingsRes.rows[0]?.monthly_contribution_goal ?? 0) || 0;
          const calculationType = settingsRes.rows[0]?.calculation_type || 'equal';

          // Miembros del hogar y sus ingresos vigentes
          const membersRes = await query<{ profile_id: string }>(
            `SELECT profile_id
             FROM household_members
             WHERE household_id = $1`,
            [householdId],
          );
          const memberCount = membersRes.rows.length;

          const incomesRes = await query<{ profile_id: string; monthly_income: string | number | null }>(
            `SELECT DISTINCT ON (profile_id) profile_id, monthly_income
             FROM member_incomes
             WHERE household_id = $1
             ORDER BY profile_id, effective_from DESC, created_at DESC NULLS LAST`,
            [householdId],
          );
          const incomeMap = new Map<string, number>(
            incomesRes.rows.map((r) => [r.profile_id, Number(r.monthly_income ?? 0)]),
          );
          const membersWithIncome = membersRes.rows.filter((m) => (incomeMap.get(m.profile_id) ?? 0) > 0);
          const totalIncome = membersWithIncome.reduce((sum, m) => sum + (incomeMap.get(m.profile_id) ?? 0), 0);

          const sharePercent = calculationType === 'proportional'
            ? (totalIncome > 0 ? (incomeMap.get(user.profile_id) ?? 0) / totalIncome : 0)
            : (memberCount > 0 ? 1 / memberCount : 0);
          expected = monthlyGoal * sharePercent;
        }

        // 4) Sumar ingresos comunes realizados por el miembro en el período (excluye 'Pago Préstamo')
        const commonIncomesRes = await query<{ sum_paid: string | null }>(
          `SELECT COALESCE(SUM(t.amount), 0) AS sum_paid
           FROM transactions t
           LEFT JOIN categories c ON c.id = t.category_id
           WHERE t.household_id = $1
             AND t.type = 'income'
             AND t.flow_type = 'common'
             AND (c.name IS NULL OR c.name <> 'Pago Préstamo')
             AND (
               t.period_id = $3
               OR (t.period_id IS NULL AND t.occurred_at >= $4 AND t.occurred_at < $5)
             )
             AND (t.paid_by = $2 OR (t.paid_by IS NULL AND t.profile_id = $2))`,
          [householdId, user.profile_id, period.id, startDate, endDate],
        );
  const paidCommon = Number(commonIncomesRes.rows[0]?.sum_paid ?? 0);

        // 5) Sumar gastos directos del miembro en el período (aportación implícita)
        // ALINEADO CON /api/periods/contributions:
        // Los gastos directos cuentan como "aportación" porque el miembro ya gastó de su bolsillo
        // y el sistema automáticamente registró un ingreso equivalente a su nombre
        const directExpensesRes = await query<{ sum_direct: string | null }>(
          `SELECT COALESCE(SUM(amount), 0) AS sum_direct
           FROM transactions
           WHERE household_id = $1
             AND type IN ('expense', 'expense_direct')
             AND flow_type = 'direct'
             AND real_payer_id = $2
             AND (
               period_id = $3
               OR (period_id IS NULL AND occurred_at >= $4 AND occurred_at < $5)
             )`,
          [householdId, user.profile_id, period.id, startDate, endDate],
        );
  const paidDirect = Number(directExpensesRes.rows[0]?.sum_direct ?? 0);

        // 6) Determinar si contar gastos directos según fase del periodo
        // En fases 'validation' o 'active', los gastos directos ya se consideran aportación
        const shouldCountDirectAsPaid = ['validation', 'active'].includes(period.phase || period.status);
        const effectivePaidDirect = shouldCountDirectAsPaid ? paidDirect : 0;

        // Total pagado = ingresos comunes + gastos directos (si aplica según fase)
        const paid = paidCommon + effectivePaidDirect;

        const pendingRaw = paid - expected;
        const pendingCents = Math.round(pendingRaw * 100);
        pendingBalance = pendingCents / 100;

        // DEBUG: Log detallado de cálculo de periodo (variables en scope)
        console.log('[getMemberBalanceStatus] DEBUG - Periodo:', {
          period: { year: period.year, month: period.month, status: period.status },
          expected,
          paidCommon,
          paidDirect,
          effectivePaidDirect,
          shouldCountDirectAsPaid,
          paid,
          pendingBalance,
        });
      }
    }

    // Sumar balance reconciliado + balance pendiente
    const totalBalance = Number(reconciledStatus.balance) + pendingBalance;
    const totalCredit = Math.max(totalBalance, 0);
    const contributionDebt = Math.abs(Math.min(totalBalance, 0));
    const loanDebt = Number(reconciledStatus.breakdown.active_loans.amount);
    const totalDebt = contributionDebt + loanDebt;

    let status: 'credit' | 'debt' | 'settled' = 'settled';
    let summary = 'Saldado';
    if (totalDebt > 0) {
      status = 'debt';
      summary = `Debes al hogar ${totalDebt.toFixed(2)}€`;
    } else if (totalCredit > 0) {
      status = 'credit';
      summary = `El hogar te debe ${totalCredit.toFixed(2)}€`;
    }

    // DEBUG: Log final de balance calculado
    console.log('[getMemberBalanceStatus] DEBUG - Balance Final:', {
      pendingBalance,
      reconciledBalance: reconciledStatus.balance,
      totalBalance,
      totalCredit,
      contributionDebt,
      loanDebt,
      totalDebt,
      status,
    });

    return ok({
      balance: totalBalance,
      credit: totalCredit,
      total_debt: totalDebt,
      status,
      breakdown: {
        contribution_balance: Number(reconciledStatus.balance),
        active_loans: reconciledStatus.breakdown.active_loans,
        pending_period_balance: pendingBalance,
      },
      summary,
    });
  } catch (error) {
    console.error('Error getting member balance status:', error);
    return fail('Error al obtener estado de balance');
  }
}

/**
 * Obtiene overview de balances de todos los miembros (solo owner)
 * Incluye balance reconciliado + balance pendiente del periodo activo por miembro
 */
export async function getHouseholdBalancesOverview(
  selectedYear: number,
  selectedMonth: number,
): Promise<
  Result<{
    household_id: string;
    members: Array<{
      profile_id: string;
      email: string;
      display_name: string;
      balance: number;
      status: unknown;
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
    // Obtener todos los miembros del hogar
    const membersRes = await query<{ profile_id: string; email: string; display_name: string | null }>(
      `SELECT hm.profile_id, p.email, p.display_name
       FROM household_members hm
       JOIN profiles p ON p.id = hm.profile_id
       WHERE hm.household_id = $1`,
      [householdId],
    );

    // Para cada miembro, obtener su balance usando get_member_balance_status()
    // (que ya calcula correctamente reconciliado + pendiente)
    const membersWithBalances = await Promise.all(
      membersRes.rows.map(async (m) => {
        // Temporalmente cambiar el contexto de usuario para calcular su balance
        const memberBalanceRes = await query(
          `SELECT get_member_balance_status($1, $2) as status`,
          [householdId, m.profile_id],
        );
        const memberStatus = memberBalanceRes.rows[0]?.status || { balance: 0 };

        const periodRes = await query<{ id: string; year: number; month: number }>(
          `SELECT id, year, month
           FROM monthly_periods
           WHERE household_id = $1
             AND year = $2
             AND month = $3
           ORDER BY created_at DESC
           LIMIT 1`,
          [householdId, selectedYear, selectedMonth],
        );

        let pendingBalance = 0;
        const period = periodRes.rows[0];
        if (period) {
          // Obtener expected y paid igual que en getMemberBalanceStatus()
          const settingsRes = await query<{ monthly_contribution_goal: number; calculation_type: string }>(
            `SELECT monthly_contribution_goal, calculation_type FROM household_settings WHERE household_id = $1`,
            [householdId],
          );
          const monthlyGoal = Number(settingsRes.rows[0]?.monthly_contribution_goal ?? 0);
          const calculationType = settingsRes.rows[0]?.calculation_type || 'equal';

          let expected = 0;
          if (monthlyGoal > 0) {
            const allMembersRes = await query<{ profile_id: string }>(
              `SELECT profile_id FROM household_members WHERE household_id = $1`,
              [householdId],
            );
            const memberCount = allMembersRes.rows.length;

            const incomesRes = await query<{ profile_id: string; monthly_income: string | number | null }>(
              `SELECT DISTINCT ON (profile_id) profile_id, monthly_income
               FROM member_incomes
               WHERE household_id = $1
               ORDER BY profile_id, effective_from DESC, created_at DESC NULLS LAST`,
              [householdId],
            );
            const incomeMap = new Map<string, number>(
              incomesRes.rows.map((r) => [r.profile_id, Number(r.monthly_income ?? 0)]),
            );
            const membersWithIncome = allMembersRes.rows.filter((m2) => (incomeMap.get(m2.profile_id) ?? 0) > 0);
            const totalIncome = membersWithIncome.reduce((sum, m2) => sum + (incomeMap.get(m2.profile_id) ?? 0), 0);

            const sharePercent =
              calculationType === 'proportional'
                ? totalIncome > 0
                  ? (incomeMap.get(m.profile_id) ?? 0) / totalIncome
                  : 0
                : memberCount > 0
                  ? 1 / memberCount
                  : 0;
            expected = monthlyGoal * sharePercent;
          }

          // Sumar paid de transacciones
          const txPaidRes = await query<{ sum_paid: string | null }>(
            `SELECT COALESCE(SUM(t.amount), 0) AS sum_paid
             FROM transactions t
             LEFT JOIN categories c ON c.id = t.category_id
             WHERE t.household_id = $1
               AND t.type = 'income'
               AND t.flow_type = 'common'
               AND (c.name IS NULL OR c.name <> 'Pago Préstamo')
               AND (
                 t.period_id = $3
                 OR (t.period_id IS NULL AND t.occurred_at >= $4 AND t.occurred_at < $5)
               )
               AND (t.paid_by = $2 OR (t.paid_by IS NULL AND t.profile_id = $2))`,
            [
              householdId,
              m.profile_id,
              period.id,
              `${period.year}-${String(period.month).padStart(2, '0')}-01`,
              period.month === 12
                ? `${period.year + 1}-01-01`
                : `${period.year}-${String(period.month + 1).padStart(2, '0')}-01`,
            ],
          );
          const paid = Number(txPaidRes.rows[0]?.sum_paid ?? 0);
          const pendingRaw = paid - expected;
          const pendingCents = Math.round(pendingRaw * 100);
          pendingBalance = pendingCents / 100;
        }

        const reconciledBalance = Number(memberStatus.balance ?? 0);
        const totalBalance = reconciledBalance + pendingBalance;

        return {
          profile_id: m.profile_id,
          email: m.email,
          display_name: m.display_name || 'Sin nombre',
          balance: totalBalance,
          status:
            totalBalance === 0 ? 'settled' : totalBalance > 0 ? 'credit' : 'debt',
        };
      }),
    );

    // Calcular totales
    const creditsOwed = membersWithBalances.reduce((acc, m) => acc + Math.max(m.balance, 0), 0);
    const debtsOwed = membersWithBalances.reduce((acc, m) => acc + Math.abs(Math.min(m.balance, 0)), 0);
    const netBalance = creditsOwed - debtsOwed;

    return ok({
      household_id: householdId,
      members: membersWithBalances,
      totals: {
        credits_owed: creditsOwed,
        debts_owed: debtsOwed,
        net_balance: netBalance,
      },
      pending_loans: 0, // TODO: calcular préstamos pendientes
    });
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

// ============================================================
// REEMBOLSOS DE SALDO A FAVOR (similar a préstamos, pero inverso)
// ============================================================

/**
 * Solicita un reembolso del saldo a favor
 */
export async function requestCreditRefund(
  amount: number,
  notes?: string,
): Promise<Result<{ requestId: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  if (!amount || amount <= 0) return fail('El importe debe ser mayor que 0');

  try {
    // Verificar crédito disponible
    const balRes = await query(
      `SELECT COALESCE(current_balance, 0) AS current_balance
       FROM member_balances
       WHERE household_id = $1 AND profile_id = $2`,
      [householdId, user.profile_id],
    );

    const current = Number(balRes.rows[0]?.current_balance ?? 0);
    const credit = Math.max(current, 0);
    if (credit <= 0) return fail('No tienes saldo a favor');
    if (amount > credit) return fail('El importe excede tu saldo a favor');

    const result = await query(
      `INSERT INTO credit_refund_requests (
        household_id, profile_id, amount, notes, requested_by, status
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id`,
      [householdId, user.profile_id, amount, (notes || '').trim() || null, user.profile_id],
    );

    if (!result.rows[0]) return fail('Error al registrar la solicitud');

    revalidatePath('/sickness/credito-deuda');
    return ok({ requestId: result.rows[0].id });
  } catch (error) {
    console.error('Error requesting credit refund:', error);
    return fail('Error al solicitar reembolso');
  }
}

/**
 * Lista de reembolsos pendientes (solo owner)
 */
export async function getPendingRefunds(): Promise<
  Result<
    Array<{
      id: string;
      profile_id: string;
      email: string;
      display_name: string | null;
      amount: number;
      notes: string | null;
      requested_at: string;
    }>
  >
> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  const roleResult = await query(
    `SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2`,
    [householdId, user.profile_id],
  );
  if (roleResult.rows[0]?.role !== 'owner') {
    return fail('Solo el owner puede ver reembolsos pendientes');
  }

  try {
    const res = await query<{
      id: string;
      profile_id: string;
      email: string;
      display_name: string | null;
      amount: string | number;
      notes: string | null;
      requested_at: string;
    }>(
      `SELECT r.id, r.profile_id, p.email, p.display_name, r.amount, r.notes, r.requested_at
       FROM credit_refund_requests r
       JOIN profiles p ON p.id = r.profile_id
       WHERE r.household_id = $1 AND r.status = 'pending'
       ORDER BY r.requested_at ASC`,
      [householdId],
    );

    const rows = res.rows.map((r) => ({
      id: r.id,
      profile_id: r.profile_id,
      email: r.email,
      display_name: r.display_name,
      amount: Number(r.amount),
      notes: r.notes,
      requested_at: r.requested_at,
    }));
    return ok(rows);
  } catch (error) {
    console.error('Error getting pending refunds:', error);
    return fail('Error al obtener reembolsos pendientes');
  }
}

/**
 * Asegura la categoría de gasto "Reembolso Saldo a Favor" y retorna su id
 */
async function ensureRefundCategory(householdId: string): Promise<string> {
  // Buscar categoría existente
  const existing = await query<{ id: string }>(
    `SELECT id FROM categories
     WHERE household_id = $1 AND name = 'Reembolso Saldo a Favor' AND (type = 'expense' OR type IS NULL)
     LIMIT 1`,
    [householdId],
  );
  if (existing.rows[0]?.id) return existing.rows[0].id;

  // Crear si no existe
  const created = await query<{ id: string }>(
    `INSERT INTO categories (household_id, name, icon, type, created_at)
     VALUES ($1, 'Reembolso Saldo a Favor', '↩️', 'expense', NOW())
     RETURNING id`,
    [householdId],
  );
  if (!created.rows[0]?.id) throw new Error('No se pudo crear la categoría de reembolso');
  return created.rows[0].id;
}

/**
 * Aprueba una solicitud de reembolso (solo owner)
 * - Crea una transacción de gasto en categoría "Reembolso Saldo a Favor"
 * - Reduce el balance del miembro en el importe aprobado
 */
export async function approveCreditRefund(requestId: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  const roleResult = await query(
    `SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2`,
    [householdId, user.profile_id],
  );
  if (roleResult.rows[0]?.role !== 'owner') return fail('Solo el owner puede aprobar reembolsos');

  try {
    await transaction(async (client) => {
      // Obtener solicitud
      const rRes = await client.query(
        `SELECT * FROM credit_refund_requests WHERE id = $1 AND household_id = $2 FOR UPDATE`,
        [requestId, householdId],
      );
      const request = rRes.rows[0];
      if (!request) throw new Error('Solicitud no encontrada');
      if (request.status !== 'pending') throw new Error('La solicitud ya fue procesada');

      // Verificar crédito actual
      const balRes = await client.query(
        `SELECT COALESCE(current_balance, 0) AS current_balance
         FROM member_balances WHERE household_id = $1 AND profile_id = $2 FOR UPDATE`,
        [householdId, request.profile_id],
      );
      const current = Number(balRes.rows[0]?.current_balance ?? 0);
      const credit = Math.max(current, 0);
      if (credit < request.amount) throw new Error('Saldo a favor insuficiente en este momento');

      // Asegurar categoría
      const refundCategoryId = await ensureRefundCategory(householdId);

      // Crear transacción de gasto
      const txRes = await client.query(
        `INSERT INTO transactions (
          household_id, category_id, profile_id, type, amount, currency, description,
          occurred_at, performed_at, flow_type, created_by_profile_id, performed_by_email
        ) VALUES ($1, $2, $3, 'expense', $4, 'EUR', $5, NOW(), NOW(), 'common', $6, $7)
        RETURNING id`,
        [
          householdId,
          refundCategoryId,
          request.profile_id,
          request.amount,
          `Reembolso saldo a favor${request.notes ? `: ${request.notes}` : ''}`,
          user.profile_id,
          user.email,
        ],
      );
      if (!txRes.rows[0]?.id) throw new Error('No se pudo crear la transacción de reembolso');
      const txId = txRes.rows[0].id as string;

      // Reducir balance del miembro
      await client.query(
        `SELECT update_member_balance($1, $2, $3, $4)`,
        [householdId, request.profile_id, -Number(request.amount), 'Aprobado reembolso de saldo a favor'],
      );

      // Marcar solicitud aprobada
      await client.query(
        `UPDATE credit_refund_requests
         SET status = 'approved', approved_by = $1, approved_at = NOW(), refund_transaction_id = $2
         WHERE id = $3`,
        [user.profile_id, txId, requestId],
      );
    });

    revalidatePath('/sickness/credito-deuda');
    revalidatePath('/sickness/balance');
    return ok();
  } catch (error) {
    console.error('Error approving credit refund:', error);
    return fail(error instanceof Error ? error.message : 'Error al aprobar reembolso');
  }
}

/**
 * Rechaza una solicitud de reembolso (solo owner)
 */
export async function rejectCreditRefund(requestId: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  const roleResult = await query(
    `SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2`,
    [householdId, user.profile_id],
  );
  if (roleResult.rows[0]?.role !== 'owner') return fail('Solo el owner puede rechazar reembolsos');

  try {
    const res = await query(
      `UPDATE credit_refund_requests
       SET status = 'rejected'
       WHERE id = $1 AND household_id = $2 AND status = 'pending'
       RETURNING id`,
      [requestId, householdId],
    );
    if (res.rowCount === 0) return fail('Solicitud no encontrada o ya procesada');

    revalidatePath('/sickness/credito-deuda');
    return ok();
  } catch (error) {
    console.error('Error rejecting credit refund:', error);
    return fail('Error al rechazar reembolso');
  }
}

// ============================================================
// GESTIÓN DE PRÉSTAMOS ACTIVOS
// ============================================================

/**
 * Lista préstamos activos (aprobados y no liquidados) del miembro o de todo el hogar (owner)
 */
export async function getActiveLoans(): Promise<
  Result<
    Array<{
      id: string;
      profile_id: string;
      email: string;
      display_name: string | null;
      amount: number;
      approved_at: string;
      notes: string | null;
    }>
  >
> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  const roleResult = await query(
    `SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2`,
    [householdId, user.profile_id],
  );
  const isOwner = roleResult.rows[0]?.role === 'owner';

  try {
    const whereClauses = ['l.household_id = $1', 'l.status = \'approved\'', 'l.settled_at IS NULL'];
    const params: unknown[] = [householdId];

    if (!isOwner) {
      whereClauses.push('l.profile_id = $2');
      params.push(user.profile_id);
    }

    const res = await query<{
      id: string;
      profile_id: string;
      email: string;
      display_name: string | null;
      amount: string | number;
      approved_at: string;
      notes: string | null;
    }>(
      `SELECT l.id, l.profile_id, p.email, p.display_name, l.amount, l.approved_at, l.notes
       FROM personal_loans l
       JOIN profiles p ON p.id = l.profile_id
       WHERE ${whereClauses.join(' AND ')}
       ORDER BY l.approved_at DESC`,
      params,
    );

    const rows = res.rows.map((r) => ({
      id: r.id,
      profile_id: r.profile_id,
      email: r.email,
      display_name: r.display_name,
      amount: Number(r.amount),
      approved_at: r.approved_at,
      notes: r.notes,
    }));
    return ok(rows);
  } catch (error) {
    console.error('Error getting active loans:', error);
    return fail('Error al obtener préstamos activos');
  }
}

/**
 * Asegura la categoría de ingreso "Pago Préstamo" y retorna su id
 */
async function ensureLoanPaymentCategory(householdId: string): Promise<string> {
  // Buscar categoría existente
  const existing = await query<{ id: string }>(
    `SELECT id FROM categories
     WHERE household_id = $1 AND name = 'Pago Préstamo' AND (type = 'income' OR type IS NULL)
     LIMIT 1`,
    [householdId],
  );
  if (existing.rows[0]?.id) return existing.rows[0].id;

  // Crear si no existe
  const created = await query<{ id: string }>(
    `INSERT INTO categories (household_id, name, icon, type, created_at)
     VALUES ($1, 'Pago Préstamo', '💳', 'income', NOW())
     RETURNING id`,
    [householdId],
  );
  if (!created.rows[0]?.id) throw new Error('No se pudo crear la categoría de pago de préstamo');
  return created.rows[0].id;
}

/**
 * Salda un préstamo (total o parcialmente)
 * - Crea una transacción de ingreso en categoría "Pago Préstamo"
 * - Reduce el balance del miembro (aumenta su crédito/reduce su deuda)
 * - Si el pago cubre el total, marca el préstamo como settled
 */
export async function repayLoan(
  loanId: string,
  amount: number,
  notes?: string,
): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  if (!amount || amount <= 0) return fail('El importe debe ser mayor que 0');

  try {
    await transaction(async (client) => {
      // Obtener préstamo
      const lRes = await client.query(
        `SELECT * FROM personal_loans WHERE id = $1 AND household_id = $2 FOR UPDATE`,
        [loanId, householdId],
      );
      const loan = lRes.rows[0];
      if (!loan) throw new Error('Préstamo no encontrado');
      if (loan.status !== 'approved') throw new Error('El préstamo no está aprobado');
      if (loan.settled_at) throw new Error('El préstamo ya está liquidado');

      const loanAmount = Number(loan.amount);
      if (amount > loanAmount) throw new Error('El importe excede el total del préstamo');

      // Asegurar categoría
      const paymentCategoryId = await ensureLoanPaymentCategory(householdId);

      // Crear transacción de ingreso
      const txRes = await client.query(
        `INSERT INTO transactions (
          household_id, category_id, profile_id, type, amount, currency, description,
          occurred_at, performed_at, flow_type, created_by_profile_id, performed_by_email
        ) VALUES ($1, $2, $3, 'income', $4, 'EUR', $5, NOW(), NOW(), 'common', $6, $7)
        RETURNING id`,
        [
          householdId,
          paymentCategoryId,
          loan.profile_id,
          amount,
          `Pago préstamo${notes ? `: ${notes}` : ''}`,
          user.profile_id,
          user.email,
        ],
      );
      if (!txRes.rows[0]?.id) throw new Error('No se pudo crear la transacción de pago');
      const txId = txRes.rows[0].id as string;

      // Reducir balance del miembro (delta positivo: más crédito/menos deuda)
      await client.query(
        `SELECT update_member_balance($1, $2, $3, $4)`,
        [householdId, loan.profile_id, Number(amount), `Pago de préstamo${notes ? `: ${notes}` : ''}`],
      );

      // Si el pago cubre el total, marcar como settled
      if (amount >= loanAmount) {
        await client.query(
          `UPDATE personal_loans
           SET status = 'settled', settled_at = NOW(), settled_by = $1, settlement_transaction_id = $2
           WHERE id = $3`,
          [user.profile_id, txId, loanId],
        );
      }
    });

    revalidatePath('/sickness/credito-deuda');
    revalidatePath('/sickness/balance');
    return ok();
  } catch (error) {
    console.error('Error repaying loan:', error);
    return fail(error instanceof Error ? error.message : 'Error al saldar préstamo');
  }
}
