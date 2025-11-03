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

export interface HierarchicalExpense {
  id: string;
  label: string;
  value: number;
  icon: string;
  groupName: string;
  children?: HierarchicalExpense[];
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
 * Obtiene gastos en estructura JERÁRQUICA para visualizaciones tipo sunburst/treemap
 * Grupos → Categorías → Subcategorías
 */
export async function getExpensesByHierarchy(
  householdId: string,
  year?: number,
  month?: number,
): Promise<HierarchicalExpense[]> {
  try {
    let sql = `
      WITH transaction_data AS (
        -- Transacciones con subcategoría
        SELECT
          cp.id as parent_id,
          cp.name as parent_name,
          cp.icon as parent_icon,
          c.id as category_id,
          c.name as category_name,
          c.icon as category_icon,
          sc.id as subcategory_id,
          sc.name as subcategory_name,
          sc.icon as subcategory_icon,
          t.amount
        FROM transactions t
        INNER JOIN subcategories sc ON sc.id = t.subcategory_id
        INNER JOIN categories c ON c.id = sc.category_id
        INNER JOIN category_parents cp ON cp.id = c.parent_id
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
        UNION ALL

        -- Transacciones sin subcategoría (categoría directa)
        SELECT
          cp.id as parent_id,
          cp.name as parent_name,
          cp.icon as parent_icon,
          c.id as category_id,
          c.name as category_name,
          c.icon as category_icon,
          NULL as subcategory_id,
          NULL as subcategory_name,
          NULL as subcategory_icon,
          t.amount
        FROM transactions t
        INNER JOIN categories c ON c.id = t.category_id
        INNER JOIN category_parents cp ON cp.id = c.parent_id
        WHERE t.household_id = $1
          AND t.subcategory_id IS NULL
          AND t.type IN ('expense', 'expense_direct')
    `;

    if (year && month) {
      sql += ` AND EXTRACT(YEAR FROM t.occurred_at) = $${params.length - 1}
               AND EXTRACT(MONTH FROM t.occurred_at) = $${params.length}`;
    }

    sql += `
      )
      SELECT
        parent_id,
        parent_name,
        parent_icon,
        category_id,
        category_name,
        category_icon,
        subcategory_id,
        subcategory_name,
        subcategory_icon,
        SUM(amount) as total_amount
      FROM transaction_data
      GROUP BY
        parent_id, parent_name, parent_icon,
        category_id, category_name, category_icon,
        subcategory_id, subcategory_name, subcategory_icon
      HAVING SUM(amount) > 0
      ORDER BY parent_name, category_name, subcategory_name
    `;

    const result = await getPool().query(sql, params);

    // Construir estructura jerárquica
    const groupsMap = new Map<string, HierarchicalExpense>();

    result.rows.forEach((row: any) => {
      const groupId = row.parent_id;
      const groupName = row.parent_name || 'Sin grupo';
      const categoryId = row.category_id;
      const categoryName = row.category_name || 'Sin categoría';
      const subcategoryId = row.subcategory_id;
      const subcategoryName = row.subcategory_name;
      const amount = parseFloat(row.total_amount) || 0;

      // Asegurar que el grupo existe
      if (!groupsMap.has(groupId)) {
        groupsMap.set(groupId, {
          id: groupId,
          label: groupName,
          value: 0,
          icon: row.parent_icon || '📁',
          groupName: groupName,
          children: [],
        });
      }

      const group = groupsMap.get(groupId)!;

      // Buscar o crear categoría
      let category = group.children?.find(c => c.id === categoryId);
      if (!category) {
        category = {
          id: categoryId,
          label: categoryName,
          value: 0,
          icon: row.category_icon || '📄',
          groupName: groupName,
          children: [],
        };
        group.children?.push(category);
      }

      // Si hay subcategoría, agregarla
      if (subcategoryId && subcategoryName) {
        const subcategory: HierarchicalExpense = {
          id: subcategoryId,
          label: subcategoryName,
          value: amount,
          icon: row.subcategory_icon || '📌',
          groupName: groupName,
        };
        category.children?.push(subcategory);
        category.value += amount;
      } else {
        // Si no hay subcategoría, el monto va directo a la categoría
        category.value += amount;
      }

      group.value += amount;
    });

    return Array.from(groupsMap.values());
  } catch (error) {
    console.error('Error fetching hierarchical expenses:', error);
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
