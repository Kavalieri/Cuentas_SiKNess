/**
 * Función compartida para cálculo de contribuciones
 *
 * IMPORTANTE: Esta función contiene la lógica COMPLETA de cálculo de contribuciones
 * originalmente en app/api/periods/contributions/route.ts (commit d8e0480).
 *
 * NO simplificar esta lógica. Incluye:
 * - Phase-based rules para cuando contar gastos como pagados
 * - Income-proportional vs equal distribution
 * - Direct expense tracking por miembro
 * - Common contribution tracking por miembro
 * - Budget snapshot fallback logic
 * - Transaction filtering por period con date range fallback
 * - Category exclusions (ej: "Pago Préstamo")
 *
 * Cualquier cambio debe ser testeado contra valores conocidos:
 * - Kava: +0.75 (overpaid)
 * - Sarini: 0.00 (settled)
 *
 * Issue #61 - Refactor: Compartir lógica entre API route y Server Action
 */

import { query } from '@/lib/db';

export interface ContributionMember {
  profile_id: string;
  email: string;
  display_name: string | null;
  income: number;
  share_percent: number;
  base_expected: number;
  direct_expenses: number;
  common_contributions: number;
  expected_amount: number;
  expected_after_direct: number;
  paid_amount: number;
  pending_amount: number;
  overpaid_amount: number;
  status: string;
  calculation_method: string;
}

export interface ContributionsData {
  period: {
    id: string;
    year: number;
    month: number;
    phase: string;
    calculationType: string;
    monthlyBudget: number;
  };
  contributions: ContributionMember[];
}

export interface GetContributionsParams {
  periodId?: string;
  year?: number;
  month?: number;
}

/**
 * Obtiene datos de contribuciones para un período específico o el más reciente
 *
 * @param householdId - ID del hogar
 * @param params - Parámetros opcionales para seleccionar período
 * @returns Datos completos de contribuciones con cálculos
 */
export async function getContributionsData(
  householdId: string,
  params: GetContributionsParams = {},
): Promise<ContributionsData> {
  const { periodId, year, month } = params;

  // ========================================
  // 1. OBTENER PERÍODO
  // ========================================
  const periodRes = await query<{
    id: string;
    year: number;
    month: number;
    phase: string | null;
    contribution_disabled: boolean;
  }>(
    periodId
      ? `
          SELECT id, year, month, phase, contribution_disabled
          FROM monthly_periods
          WHERE household_id = $1 AND id = $2
          LIMIT 1
        `
      : year && month
      ? `
            SELECT id, year, month, phase, contribution_disabled
            FROM monthly_periods
            WHERE household_id = $1 AND year = $2 AND month = $3
            LIMIT 1
          `
      : `
            SELECT id, year, month, phase, contribution_disabled
            FROM monthly_periods
            WHERE household_id = $1
            ORDER BY year DESC, month DESC
            LIMIT 1
          `,
    periodId ? [householdId, periodId] : year && month ? [householdId, year, month] : [householdId],
  );

  const period = periodRes.rows[0];
  if (!period) {
    // Sin período, retornar estructura vacía
    return {
      period: {
        id: '',
        year: 0,
        month: 0,
        phase: 'unknown',
        calculationType: 'equal',
        monthlyBudget: 0,
      },
      contributions: [],
    };
  }

  // ========================================
  // VALIDACIÓN: Período sin contribución calculada
  // ========================================
  // Períodos con contribution_disabled=true (Abril-Septiembre 2025):
  // - Usaban método "sin contribución" (gastos directos + ingreso compensatorio)
  // - Cada gasto directo tiene su ingreso compensatorio
  // - Balance neto = 0 (no genera crédito ni deuda)
  // Solo períodos con contribution_disabled=false (Octubre+ 2025) generan balance
  if (period.contribution_disabled) {
    // Obtener miembros para retornar estructura correcta con balance=0
    const membersRes = await query<{
      profile_id: string;
      email: string;
      display_name: string | null;
    }>(
      `
        SELECT hm.profile_id, p.email, p.display_name
        FROM household_members hm
        JOIN profiles p ON p.id = hm.profile_id
        WHERE hm.household_id = $1
        ORDER BY p.email
      `,
      [householdId],
    );

    return {
      period: {
        id: period.id,
        year: period.year,
        month: period.month,
        phase: period.phase || 'unknown',
        calculationType: 'equal',
        monthlyBudget: 0,
      },
      contributions: membersRes.rows.map((m) => ({
        profile_id: m.profile_id,
        email: m.email,
        display_name: m.display_name,
        income: 0,
        share_percent: 0,
        base_expected: 0,
        direct_expenses: 0,
        common_contributions: 0,
        expected_amount: 0,
        expected_after_direct: 0,
        paid_amount: 0,
        pending_amount: 0,
        overpaid_amount: 0, // ⭐ CLAVE: balance neto = 0
        status: 'settled',
        calculation_method: 'disabled',
      })),
    };
  }

  // ========================================
  // 2. OBTENER PRESUPUESTO Y MÉTODO DE CÁLCULO
  // ========================================
  const budgetRes = await query<{ monthly_budget: string | null; calculation_type: string | null }>(
    `
      SELECT
        COALESCE(mp.snapshot_budget, mp.snapshot_contribution_goal, hs.monthly_budget, hs.monthly_contribution_goal) as monthly_budget,
        hs.calculation_type
      FROM monthly_periods mp
      LEFT JOIN household_settings hs ON hs.household_id = mp.household_id
      WHERE mp.id = $1
    `,
    [period.id],
  );
  const monthlyBudget = Number(budgetRes.rows[0]?.monthly_budget ?? 0) || 0;
  const calculationType = budgetRes.rows[0]?.calculation_type || 'equal';

  // ========================================
  // 3. OBTENER MIEMBROS DEL HOGAR
  // ========================================
  const membersRes = await query<{
    profile_id: string;
    email: string;
    display_name: string | null;
  }>(
    `
      SELECT hm.profile_id, p.email, p.display_name
      FROM household_members hm
      JOIN profiles p ON p.id = hm.profile_id
      WHERE hm.household_id = $1
      ORDER BY p.email
    `,
    [householdId],
  );
  const members = membersRes.rows;

  // ========================================
  // 4. OBTENER INGRESOS DE MIEMBROS
  // ========================================
  const incomesRes = await query<{ profile_id: string; monthly_income: string | number | null }>(
    `
      SELECT DISTINCT ON (profile_id) profile_id, monthly_income
      FROM member_incomes
      WHERE household_id = $1
      ORDER BY profile_id, effective_from DESC, created_at DESC NULLS LAST
    `,
    [householdId],
  );
  const incomeMap = new Map<string, number>(
    incomesRes.rows.map((r) => [r.profile_id, Number(r.monthly_income ?? 0)]),
  );

  // ========================================
  // 5. OBTENER GASTOS DIRECTOS POR MIEMBRO
  // ========================================
  const startDate = `${period.year}-${String(period.month).padStart(2, '0')}-01`;
  const endDate =
    period.month === 12
      ? `${period.year + 1}-01-01`
      : `${period.year}-${String(period.month + 1).padStart(2, '0')}-01`;

  const directRes = await query<{ performed_by_profile_id: string | null; total: string }>(
    `
      SELECT performed_by_profile_id, SUM(amount)::numeric::text AS total
      FROM transactions
      WHERE household_id = $1
        AND flow_type = 'direct'
        AND (type = 'expense' OR type = 'expense_direct')
        AND (
          period_id = $2
          OR (period_id IS NULL AND occurred_at >= $3 AND occurred_at < $4)
        )
      GROUP BY performed_by_profile_id
    `,
    [householdId, period.id, startDate, endDate],
  );
  const directMap = new Map<string, number>();
  for (const r of directRes.rows) {
    if (r.performed_by_profile_id) directMap.set(r.performed_by_profile_id, Number(r.total));
  }

  // ========================================
  // 6. OBTENER CONTRIBUCIONES GUARDADAS
  // ========================================
  const contributionsRes = await query<{
    profile_id: string;
    email: string;
    expected_amount: number | null;
    paid_amount: number | null;
    status: string | null;
    calculation_method: string | null;
  }>(
    `
      SELECT
        c.profile_id,
        p.email,
        c.expected_amount,
        c.paid_amount,
        c.status,
        c.calculation_method
      FROM contributions c
      INNER JOIN profiles p ON p.id = c.profile_id
      WHERE c.household_id = $1
        AND c.year = $2
        AND c.month = $3
      ORDER BY p.email
    `,
    [householdId, period.year, period.month],
  );
  const contribMap = new Map(contributionsRes.rows.map((c) => [c.profile_id, c]));

  // ========================================
  // 7. CALCULAR PORCENTAJES SEGÚN MÉTODO
  // ========================================
  const membersWithIncome = members.filter((m) => (incomeMap.get(m.profile_id) ?? 0) > 0);
  const totalIncome = membersWithIncome.reduce(
    (sum, m) => sum + (incomeMap.get(m.profile_id) ?? 0),
    0,
  );
  const equalShare = members.length > 0 ? 1 / members.length : 0;

  // ========================================
  // 8. DETERMINAR FASE Y REGLAS DE CONTEO
  // ========================================
  const currentPhase = period.phase ?? 'unknown';
  // REGLA CRÍTICA: Contar gastos directos y aportaciones comunes en todas las fases excepto 'preparing'
  const shouldCountDirectAsPaid = currentPhase !== 'preparing';

  // ========================================
  // 9. OBTENER APORTACIONES A CUENTA COMÚN
  // ========================================
  const commonIncomesAgg = await query<{ profile_id: string | null; total: string }>(
    `
      SELECT t.performed_by_profile_id as profile_id, SUM(t.amount)::numeric::text AS total
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.household_id = $1
        AND t.type = 'income'
        AND t.flow_type = 'common'
        AND (c.name IS NULL OR c.name <> 'Pago Préstamo')
        AND (
          t.period_id = $2
          OR (t.period_id IS NULL AND t.occurred_at >= $3 AND t.occurred_at < $4)
        )
      GROUP BY t.performed_by_profile_id
    `,
    [householdId, period.id, startDate, endDate],
  );
  const commonIncomesMap = new Map<string, number>();
  for (const r of commonIncomesAgg.rows) {
    if (r.profile_id) commonIncomesMap.set(r.profile_id, Number(r.total));
  }

  // ========================================
  // 10. ENSAMBLAR RESPUESTA POR MIEMBRO
  // ========================================
  const contributions: ContributionMember[] = members.map((m) => {
    const income = incomeMap.get(m.profile_id) ?? 0;
    const sharePercent =
      calculationType === 'proportional'
        ? totalIncome > 0
          ? income / totalIncome
          : 0
        : equalShare;
    const baseExpected = monthlyBudget * sharePercent;
    const directExpenses = directMap.get(m.profile_id) ?? 0;
    const expectedAfterDirect = Math.max(0, baseExpected - directExpenses);
    const existing = contribMap.get(m.profile_id);

    // CÁLCULO DE PAID SEGÚN FASE
    const paidDirect = shouldCountDirectAsPaid ? directExpenses : 0;
    const paidCommon = shouldCountDirectAsPaid ? commonIncomesMap.get(m.profile_id) ?? 0 : 0;
    const paid = paidDirect + paidCommon;

    // CÁLCULO DE PENDING Y OVERPAID
    const finalExpected = existing?.expected_amount ?? baseExpected;
    const pending = Math.max(0, (finalExpected ?? 0) - paid);
    const overpaid = Math.max(0, paid - (finalExpected ?? 0));

    return {
      profile_id: m.profile_id,
      email: m.email,
      display_name: m.display_name,
      income,
      share_percent: sharePercent,
      base_expected: baseExpected,
      direct_expenses: directExpenses,
      common_contributions: paidCommon,
      expected_amount: finalExpected,
      expected_after_direct: expectedAfterDirect,
      paid_amount: paid,
      pending_amount: pending,
      overpaid_amount: overpaid,
      status: existing?.status ?? 'pending',
      calculation_method: existing?.calculation_method ?? calculationType,
    };
  });

  return {
    period: {
      id: period.id,
      year: period.year,
      month: period.month,
      phase: currentPhase,
      calculationType,
      monthlyBudget,
    },
    contributions,
  };
}
