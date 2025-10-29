import { toNumber } from '@/lib/format';
import { query } from '@/lib/pgServer';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/sickness/balance/period-summary
 * Retorna el resumen de ingresos/gastos de un periodo específico (para las tarjetas)
 * Query params: householdId, periodId
 *
 * Nota importante:
 * - Aunque la tabla transactions tiene period_id, en la aplicación determinamos el periodo
 *   a partir de occurred_at (derivado por fecha) para evitar inconsistencias.
 * - Por eso, los totales de ingresos/gastos de este endpoint se calculan por año/mes de occurred_at
 *   obtenidos desde monthly_periods(year, month), NO por period_id en transactions.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');
    const periodId = searchParams.get('periodId');

    if (!householdId || !periodId) {
      return NextResponse.json({ error: 'householdId y periodId requeridos' }, { status: 400 });
    }

    // Obtener información del periodo (saldos + year/month)
    const periodResult = await query(
      `
      SELECT
        opening_balance,
        closing_balance,
        year,
        month
      FROM monthly_periods
      WHERE id = $1 AND household_id = $2
    `,
      [periodId, householdId],
    );

    if (periodResult.rows.length === 0) {
      return NextResponse.json({ error: 'Periodo no encontrado' }, { status: 404 });
    }

    const period = periodResult.rows[0];
    // Type guard extra para TypeScript (ya retornamos 404 si no hay periodo)
    if (!period) {
      return NextResponse.json({ error: 'Periodo no encontrado' }, { status: 404 });
    }
    const pYear = Number(period.year);
    const pMonth = Number(period.month);

    // Calcular ingresos y gastos del período desde transacciones por FECHA (occurred_at)
    // Incluye flujo común y directo: type IN ('income','income_direct') / ('expense','expense_direct')
    const incomeResult = await query(
      `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM transactions
      WHERE household_id = $1
        AND occurred_at IS NOT NULL
        AND EXTRACT(YEAR FROM occurred_at) = $2
        AND EXTRACT(MONTH FROM occurred_at) = $3
        AND type IN ('income', 'income_direct')
    `,
      [householdId, pYear, pMonth],
    );

    const expenseResult = await query(
      `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM transactions
      WHERE household_id = $1
        AND occurred_at IS NOT NULL
        AND EXTRACT(YEAR FROM occurred_at) = $2
        AND EXTRACT(MONTH FROM occurred_at) = $3
        AND type IN ('expense', 'expense_direct')
    `,
      [householdId, pYear, pMonth],
    );

    // Calcular balance efectivo dinámicamente (opening + ingresos - gastos)
    const openingBalance = toNumber(period?.opening_balance ?? 0);
    const totalIncome = toNumber(incomeResult.rows[0]?.total ?? 0);
    const totalExpenses = toNumber(expenseResult.rows[0]?.total ?? 0);
    const effectiveBalance = openingBalance + totalIncome - totalExpenses;

    return NextResponse.json({
      // Estructura alineada con la UI (page.tsx)
      opening_balance: openingBalance,
      closing_balance: toNumber(period?.closing_balance ?? 0), // Balance estático (snapshot)
      effective_balance: effectiveBalance, // Balance real calculado dinámicamente
      total_income: totalIncome,
      total_expenses: totalExpenses,
    });
  } catch (error) {
    console.error('[API] Error fetching period summary:', error);
    return NextResponse.json({ error: 'Error al obtener resumen del periodo' }, { status: 500 });
  }
}
