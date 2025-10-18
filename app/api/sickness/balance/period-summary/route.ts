import { toNumber } from '@/lib/format';
import { query } from '@/lib/pgServer';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/sickness/balance/period-summary
 * Retorna el resumen de ingresos/gastos de un periodo específico (para las tarjetas)
 * Query params: householdId, periodId
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');
    const periodId = searchParams.get('periodId');

    if (!householdId || !periodId) {
      return NextResponse.json({ error: 'householdId y periodId requeridos' }, { status: 400 });
    }

    // Obtener información del periodo (saldos)
    const periodResult = await query(
      `
      SELECT
        opening_balance,
        closing_balance
      FROM monthly_periods
      WHERE id = $1 AND household_id = $2
    `,
      [periodId, householdId],
    );

    if (periodResult.rows.length === 0) {
      return NextResponse.json({ error: 'Periodo no encontrado' }, { status: 404 });
    }

    const period = periodResult.rows[0];

    // Calcular ingresos y gastos del período desde transacciones (incluye flujo común y directo)
    const incomeResult = await query(
      `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM transactions
      WHERE household_id = $1
        AND period_id = $2
        AND type IN ('income', 'income_direct')
    `,
      [householdId, periodId],
    );

    const expenseResult = await query(
      `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM transactions
      WHERE household_id = $1
        AND period_id = $2
        AND type IN ('expense', 'expense_direct')
    `,
      [householdId, periodId],
    );

    return NextResponse.json({
      // Estructura alineada con la UI (page.tsx)
      opening_balance: toNumber(period?.opening_balance ?? 0),
      closing_balance: toNumber(period?.closing_balance ?? 0),
      total_income: toNumber(incomeResult.rows[0]?.total ?? 0),
      total_expenses: toNumber(expenseResult.rows[0]?.total ?? 0),
    });
  } catch (error) {
    console.error('[API] Error fetching period summary:', error);
    return NextResponse.json({ error: 'Error al obtener resumen del periodo' }, { status: 500 });
  }
}
