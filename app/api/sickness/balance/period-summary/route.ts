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

    // Obtener información del periodo
    const periodResult = await query(
      `
      SELECT
        opening_balance,
        closing_balance,
        total_income,
        total_expenses
      FROM monthly_periods
      WHERE id = $1 AND household_id = $2
    `,
      [periodId, householdId],
    );

    if (periodResult.rows.length === 0) {
      return NextResponse.json({ error: 'Periodo no encontrado' }, { status: 404 });
    }

    const period = periodResult.rows[0];

    // Obtener gastos directos del periodo
    const directExpensesResult = await query(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE household_id = $1
        AND flow_type = 'direct'
        AND type IN ('expense', 'expense_direct')
        AND period_id = $2
    `,
      [householdId, periodId],
    );

    const directExpenses = directExpensesResult.rows[0] || { total: 0 };

    return NextResponse.json({
      periodSummary: {
        opening: toNumber(period?.opening_balance ?? 0),
        closing: toNumber(period?.closing_balance ?? 0),
        income: toNumber(period?.total_income ?? 0),
        expenses: toNumber(period?.total_expenses ?? 0),
        directExpenses: toNumber(directExpenses.total),
      },
    });
  } catch (error) {
    console.error('[API] Error fetching period summary:', error);
    return NextResponse.json({ error: 'Error al obtener resumen del periodo' }, { status: 500 });
  }
}
