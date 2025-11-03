'use server';

import { getPool } from '@/lib/db';

export interface ExpenseByCategory {
  category: string;
  amount: number;
  icon: string;
  groupName?: string; // Grupo padre (category_parent) para colores consistentes
  level?: 'group' | 'category' | 'subcategory'; // Nivel jerárquico
  index?: number; // Índice dentro del grupo (para gradientes)
  total?: number; // Total de elementos en el nivel (para gradientes)
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
 * Obtiene gastos por GRUPO (category_parents) para un período específico
 * Si no se proporciona período, devuelve datos globales
 * NOTA: Agrupa por grupos (nivel 1) en lugar de categorías individuales
 * NOTA: Se incluyen TODOS los gastos (comunes + directos + legacy)
 */
export async function getExpensesByCategory(
  householdId: string,
  year?: number,
  month?: number,
): Promise<ExpenseByCategory[]> {
  try {
    let sql = `
      SELECT
        cp.name as category,
        cp.icon,
        cp.name as group_name,
        COALESCE(SUM(t.amount), 0) as amount
      FROM transactions t
      -- Intentar obtener grupo desde subcategoría
      LEFT JOIN subcategories sc ON t.subcategory_id = sc.id
      LEFT JOIN categories c_from_sub ON sc.category_id = c_from_sub.id
      LEFT JOIN category_parents cp_from_sub ON c_from_sub.parent_id = cp_from_sub.id
      -- Intentar obtener grupo desde categoría directa
      LEFT JOIN categories c_direct ON t.category_id = c_direct.id
      LEFT JOIN category_parents cp_direct ON c_direct.parent_id = cp_direct.id
      -- Obtener el grupo disponible (prioridad: subcategoría > categoría directa)
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(cp_from_sub.id, cp_direct.id) as id,
          COALESCE(cp_from_sub.name, cp_direct.name) as name,
          COALESCE(cp_from_sub.icon, cp_direct.icon) as icon
      ) cp ON true
      WHERE t.household_id = $1
        AND t.type IN ('expense', 'expense_direct')
    `;

    const params: (string | number)[] = [householdId];

    if (year && month) {
      sql += ` AND EXTRACT(YEAR FROM t.occurred_at) = $${params.length + 1}
               AND EXTRACT(MONTH FROM t.occurred_at) = $${params.length + 2}`;
      params.push(year, month);
    }

    sql += `
      GROUP BY cp.id, cp.name, cp.icon
      HAVING COALESCE(SUM(t.amount), 0) > 0
      ORDER BY amount DESC
    `;

    const result = await getPool().query(sql, params);

    const total = result.rows.length;

    return result.rows.map((row: Record<string, unknown>, index: number) => ({
      category: (row.category as string) || 'Sin categoría',
      amount: parseFloat(row.amount as string) || 0,
      icon: (row.icon as string) || '❓',
      groupName: (row.group_name as string) || 'otros',
      level: 'group' as const, // Los resultados son grupos (category_parents)
      index, // Índice en el array para gradientes
      total, // Total de grupos para gradientes
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
 * Incluye TODOS los gastos (comunes + directos + legacy)
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
        COALESCE(SUM(CASE WHEN t.type IN ('expense', 'expense_direct') THEN t.amount ELSE 0 END), 0) as expense
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
