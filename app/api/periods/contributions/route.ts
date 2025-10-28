'use server';

import { getCurrentUser, getUserHouseholdId } from '@/lib/auth';
import { query } from '@/lib/db';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const householdId = await getUserHouseholdId();
    if (!householdId)
      return NextResponse.json({ error: 'No tienes un hogar activo' }, { status: 400 });

    // Permitir seleccionar periodo vía query (?periodId=... | ?year=YYYY&month=M)
    const { searchParams } = new URL(req.url);
    const qPeriodId = searchParams.get('periodId');
    const qYear = searchParams.get('year');
    const qMonth = searchParams.get('month');

    // Obtener el período solicitado o el más reciente si no se especifica
  const periodRes = await query<{
      id: string;
      year: number;
      month: number;
      phase: string | null;
    }>(
      qPeriodId
        ? `
            SELECT id, year, month, phase
            FROM monthly_periods
            WHERE household_id = $1 AND id = $2
            LIMIT 1
          `
        : qYear && qMonth
          ? `
              SELECT id, year, month, phase
              FROM monthly_periods
              WHERE household_id = $1 AND year = $2 AND month = $3
              LIMIT 1
            `
          : `
              SELECT id, year, month, phase
              FROM monthly_periods
              WHERE household_id = $1
              ORDER BY year DESC, month DESC
              LIMIT 1
            `,
      qPeriodId ? [householdId, qPeriodId] : qYear && qMonth ? [householdId, Number(qYear), Number(qMonth)] : [householdId],
    );

    const period = periodRes.rows[0];
    if (!period) {
      return NextResponse.json({ ok: true, contributions: [] });
    }

    // Cargar objetivo de contribución: usar snapshot del período si existe, sino valor actual
    const goalRes = await query<{ monthly_goal: string | null; calculation_type: string | null }>(
      `
        SELECT
          COALESCE(mp.snapshot_contribution_goal, hs.monthly_contribution_goal) as monthly_goal,
          hs.calculation_type
        FROM monthly_periods mp
        LEFT JOIN household_settings hs ON hs.household_id = mp.household_id
        WHERE mp.id = $1
      `,
      [period.id],
    );
    const monthlyGoal = Number(goalRes.rows[0]?.monthly_goal ?? 0) || 0;
    const calculationType = goalRes.rows[0]?.calculation_type || 'equal';

    // Obtener miembros del hogar (con email y display_name)
    const membersRes = await query<{ profile_id: string; email: string; display_name: string | null }>(
      `
        SELECT hm.profile_id, p.email, p.display_name
        FROM household_members hm
        JOIN profiles p ON p.id = hm.profile_id
        WHERE hm.household_id = $1
        ORDER BY p.email
      `,
      [householdId],
    );

    // Obtener el ingreso vigente por miembro (último effective_from)
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

    // Obtener gastos directos por miembro en el período
    // Usar period_id para capturar transacciones creadas con period_id explícito,
    // y dar soporte legacy con fallback por rango de fechas cuando period_id sea NULL.
    const startDate = `${period.year}-${String(period.month).padStart(2, '0')}-01`;
    const endDate =
      period.month === 12
        ? `${period.year + 1}-01-01`
        : `${period.year}-${String(period.month + 1).padStart(2, '0')}-01`;

    const directRes = await query<{ real_payer_id: string | null; total: string }>(
      `
        SELECT real_payer_id, SUM(amount)::numeric::text AS total
        FROM transactions
        WHERE household_id = $1
          AND flow_type = 'direct'
          AND (type = 'expense' OR type = 'expense_direct')
          AND (
            period_id = $2
            OR (period_id IS NULL AND occurred_at >= $3 AND occurred_at < $4)
          )
        GROUP BY real_payer_id
      `,
      [householdId, period.id, startDate, endDate],
    );
    const directMap = new Map<string, number>();
    for (const r of directRes.rows) {
      if (r.real_payer_id) directMap.set(r.real_payer_id, Number(r.total));
    }

    // Obtener contribuciones guardadas (si existen)
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

    // Calcular porcentajes segun método
    const members = membersRes.rows;
    const membersWithIncome = members.filter((m) => (incomeMap.get(m.profile_id) ?? 0) > 0);
    // Para proporcional usamos solo quienes declararon ingreso (>0) para repartir
    const totalIncome = membersWithIncome.reduce(
      (sum, m) => sum + (incomeMap.get(m.profile_id) ?? 0),
      0,
    );
    // Para 'equal' la cuota es entre TODOS los miembros del hogar
    const equalShare = members.length > 0 ? 1 / members.length : 0;

    // Map de contribuciones existentes
    const contribMap = new Map(
      contributionsRes.rows.map((c) => [c.profile_id, c]),
    );

    // Determinar fase normalizada del periodo (para reglas de gasto directo)
  const currentPhase = period.phase ?? 'unknown'; // 'preparing' | 'validation' | 'active' | 'closing' | 'closed' | 'unknown'
    const shouldCountDirectAsPaid = currentPhase === 'validation' || currentPhase === 'active';

    // Sumar aportaciones a la cuenta común por miembro en el período
    // Regla: contar cualquier ingreso común del miembro, excepto "Pago Préstamo".
    const commonIncomesAgg = await query<{ profile_id: string | null; total: string }>(
      `
        SELECT t.paid_by as profile_id, SUM(t.amount)::numeric::text AS total
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
        GROUP BY t.paid_by
      `,
      [householdId, period.id, startDate, endDate]
    );
    const commonIncomesMap = new Map<string, number>();
    for (const r of commonIncomesAgg.rows) {
      if (r.profile_id) commonIncomesMap.set(r.profile_id, Number(r.total));
    }

    // Ensamblar respuesta enriquecida por miembro (incluir a todos los miembros)
    const enriched = members.map((m) => {
      const income = incomeMap.get(m.profile_id) ?? 0;
      const sharePercent = calculationType === 'proportional'
        ? (totalIncome > 0 ? income / totalIncome : 0)
        : equalShare;
      const baseExpected = monthlyGoal * sharePercent;
      const directExpenses = directMap.get(m.profile_id) ?? 0;
      const expectedAfterDirect = Math.max(0, baseExpected - directExpenses);
      const existing = contribMap.get(m.profile_id);
      // Regla anti doble-conteo:
      // - Usamos baseExpected como expected_amount por defecto
      // - Sumamos directExpenses al "paid" cuando la fase sea 'validation' o 'active'
      // Esto hace que el pendiente (expected - paid) se reduzca por los gastos directos en fase 2+,
      // sin restarlo también desde expected.
      // paid base = lo registrado en contributions
      // Si fase activa/validación: sumar gastos directos como aportación implícita (reduce pendiente)
      // y sumar ingresos realizados por el miembro en el periodo (aportaciones explícitas a la cuenta común)
      const paidDirect = shouldCountDirectAsPaid ? directExpenses : 0;
      const paidCommon = shouldCountDirectAsPaid ? (commonIncomesMap.get(m.profile_id) ?? 0) : 0;
      // Evitamos usar contributions.paid_amount para no cruzar datos ni contar doble.
      const paid = paidDirect + paidCommon;
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

    return NextResponse.json({
      ok: true,
      contributions: enriched,
      period: {
        year: period.year,
        month: period.month,
        calculationType,
        monthlyGoal,
        phase: currentPhase,
      },
    });
  } catch (error) {
    console.error('[GET /api/periods/contributions] error:', error);
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 });
  }
}
