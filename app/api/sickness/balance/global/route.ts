import { toNumber } from '@/lib/format';
import { query } from '@/lib/pgServer';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/sickness/balance/global
 * Retorna el balance GLOBAL del hogar (sin filtro de periodo)
 * Query params: householdId
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');

    if (!householdId) {
      return NextResponse.json({ error: 'householdId requerido' }, { status: 400 });
    }

    // Obtener balance global calculado desde transacciones
    const balanceResult = await query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN type IN ('income', 'income_direct') THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type IN ('expense', 'expense_direct') THEN amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN type IN ('income', 'income_direct') THEN amount ELSE -amount END), 0) as current_balance
      FROM transactions
      WHERE household_id = $1
    `,
      [householdId],
    );

    const balance = balanceResult.rows[0] || { total_income: 0, total_expenses: 0, current_balance: 0 };

    // Obtener gastos directos globales
    const directExpensesResult = await query(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE household_id = $1
        AND flow_type = 'direct'
        AND type IN ('expense', 'expense_direct')
    `,
      [householdId],
    );

    // Obtener contribuciones pendientes globales (de todos los periodos activos)
    const pendingContributionsResult = await query(
      `
      SELECT COALESCE(SUM(expected_amount - paid_amount), 0) as total
      FROM contributions
      WHERE household_id = $1
        AND status != 'paid'
    `,
      [householdId],
    );

    const directExpenses = directExpensesResult.rows[0] || { total: 0 };
    const pendingContributions = pendingContributionsResult.rows[0] || { total: 0 };

    return NextResponse.json({
      balance: {
        opening: 0, // El balance global no tiene apertura/cierre
        closing: toNumber(balance.current_balance),
        income: toNumber(balance.total_income),
        expenses: toNumber(balance.total_expenses),
        directExpenses: toNumber(directExpenses.total),
        pendingContributions: toNumber(pendingContributions.total),
      },
    });
  } catch (error) {
    console.error('[API] Error fetching global balance:', error);
    return NextResponse.json({ error: 'Error al obtener balance global' }, { status: 500 });
  }
}
