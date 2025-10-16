import { toNumber } from '@/lib/format';
import { query } from '@/lib/pgServer';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { householdId, periodId } = await req.json();

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
        AND type = 'expense'
        AND period_id = $2
    `,
      [householdId, periodId],
    );

    // Obtener contribuciones pendientes del periodo
    const pendingContributionsResult = await query(
      `
      SELECT COALESCE(SUM(expected_amount - paid_amount), 0) as total
      FROM contributions
      WHERE household_id = $1
        AND EXTRACT(YEAR FROM created_at) = (SELECT year FROM monthly_periods WHERE id = $2)
        AND EXTRACT(MONTH FROM created_at) = (SELECT month FROM monthly_periods WHERE id = $2)
        AND (expected_amount - paid_amount) > 0
    `,
      [householdId, periodId],
    );

    const balance = {
      opening: toNumber(period?.opening_balance),
      closing: toNumber(period?.closing_balance),
      income: toNumber(period?.total_income),
      expenses: toNumber(period?.total_expenses),
      directExpenses: toNumber(directExpensesResult.rows[0]?.total),
      pendingContributions: toNumber(pendingContributionsResult.rows[0]?.total),
    };

    return NextResponse.json({ balance });
  } catch (error) {
    console.error('[API /api/sickness/balance] Error:', error);
    return NextResponse.json({ error: 'Error al obtener el balance' }, { status: 500 });
  }
}
