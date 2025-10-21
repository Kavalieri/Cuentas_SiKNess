'use server';

import { getPool } from '@/lib/db';

export interface ExpenseByCategory {
  category: string;
  amount: number;
  icon: string;
}

export interface IncomeVsExpense {
  month: string;
  income: number;
  expense: number;
}

export interface PeriodOption {
  id: string;
  year: number;
  month: number;
  status: string;
  phase: string;
  openingBalance: number;
  closingBalance: number;
  isCurrent: boolean;
}

/**
 * Obtiene gastos por categoría para un período específico
 * Si no se proporciona período, devuelve datos globales
 * NOTA: Los gastos directos se incluyen (flow_type = 'direct', type = 'expense')
 */
export async function getExpensesByCategory(
  householdId: string,
  year?: number,
  month?: number,
): Promise<ExpenseByCategory[]> {
  try {
    let sql = `
      SELECT
        c.name as category,
        c.icon,
        COALESCE(SUM(t.amount), 0) as amount
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.household_id = $1
        AND t.type = 'expense'
        AND (t.flow_type = 'common' OR (t.flow_type = 'direct' AND t.type = 'expense'))
    `;

    const params: (string | number)[] = [householdId];

    if (year && month) {
      sql += ` AND EXTRACT(YEAR FROM t.occurred_at) = $${params.length + 1}
               AND EXTRACT(MONTH FROM t.occurred_at) = $${params.length + 2}`;
      params.push(year, month);
    }

    sql += `
      GROUP BY c.id, c.name, c.icon
      ORDER BY amount DESC
    `;

    const result = await getPool().query(sql, params);

    return result.rows.map((row: Record<string, unknown>) => ({
      category: (row.category as string) || 'Sin categoría',
      amount: parseFloat(row.amount as string) || 0,
      icon: (row.icon as string) || '➕',
    }));
  } catch (error) {
    console.error('Error fetching expenses by category:', error);
    return [];
  }
}

/**
 * Obtiene ingresos vs gastos por mes
 * Si no se proporciona período, devuelve últimos 6 meses
 * NOTA: Incluye ingresos directos (compensatorios) en los ingresos totales
 * Los ingresos directos son automáticos y compensan los gastos de bolsillo
 */
export async function getIncomeVsExpenses(
  householdId: string,
  year?: number,
  month?: number,
): Promise<IncomeVsExpense[]> {
  try {
    let sql = `
      SELECT
        TO_CHAR(t.occurred_at, 'YYYY-MM') as period,
        EXTRACT(MONTH FROM t.occurred_at)::int as month_num,
        EXTRACT(YEAR FROM t.occurred_at)::int as year_num,
        COALESCE(SUM(CASE WHEN (t.type = 'income' OR t.type = 'income_direct') THEN t.amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as expense
      FROM transactions t
      WHERE t.household_id = $1
    `;

    const params: (string | number)[] = [householdId];

    if (year && month) {
      // Si es un período específico, mostrar ese mes
      sql += ` AND EXTRACT(YEAR FROM t.occurred_at) = $${params.length + 1}
               AND EXTRACT(MONTH FROM t.occurred_at) = $${params.length + 2}`;
      params.push(year, month);
    } else {
      // Si no, mostrar últimos 6 meses
      sql += ` AND t.occurred_at >= CURRENT_DATE - INTERVAL '6 months'`;
    }

    sql += `
      GROUP BY period, month_num, year_num
      ORDER BY year_num, month_num
    `;

    const result = await getPool().query(sql, params);

    const months = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
    ];

    return result.rows.map((row: Record<string, unknown>) => ({
      month: `${months[(row.month_num as number) - 1]} ${row.year_num}`,
      income: parseFloat(row.income as string) || 0,
      expense: parseFloat(row.expense as string) || 0,
    }));
  } catch (error) {
    console.error('Error fetching income vs expenses:', error);
    return [];
  }
}
