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
      opening: Number(period?.opening_balance) || 0,
      closing: Number(period?.closing_balance) || 0,
      income: Number(period?.total_income) || 0,
      expenses: Number(period?.total_expenses) || 0,
      directExpenses: Number(directExpensesResult.rows[0]?.total) || 0,
      pendingContributions: Number(pendingContributionsResult.rows[0]?.total) || 0,
    };

    return NextResponse.json({ balance });
  } catch (error) {
    console.error('[API /api/sickness/balance] Error:', error);
    return NextResponse.json({ error: 'Error al obtener el balance' }, { status: 500 });
  }
}
