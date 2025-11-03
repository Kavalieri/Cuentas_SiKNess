import { query } from '@/lib/pgServer';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface TreemapNode {
  name: string;
  value?: number; // Opcional: solo las hojas (subcategorías) tienen valor
  children?: TreemapNode[];
  color?: string;
  icon?: string;
  parentName?: string;
}

interface TreemapData {
  name: string;
  children: TreemapNode[];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');
    const type = searchParams.get('type') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!householdId) {
      return NextResponse.json({ error: 'householdId es requerido' }, { status: 400 });
    }

    // Construir condiciones de filtro
    const conditions = ['t.household_id = $1'];
    const params: unknown[] = [householdId];
    let paramIndex = 2;

    if (type) {
      conditions.push(`t.type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`t.occurred_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`t.occurred_at <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Query principal: obtener la jerarquía completa con montos agregados
    // Nivel 1: category_parents (ej: "Hogar", "Transporte")
    // Nivel 2: categories (ej: "Alimentación", "Mantenimiento")
    // Nivel 3: subcategories (ej: "Supermercado", "Restaurantes")
    // IMPORTANTE: Las hojas tienen valores. Si una categoría no tiene subcategorías, ella misma es hoja.
    const result = await query(
      `
      WITH transaction_leaf_nodes AS (
        -- CASO 1: Transacciones con subcategoría (nivel 3 - hoja)
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
          SUM(t.amount) as total_amount
        FROM transactions t
        INNER JOIN subcategories sc ON sc.id = t.subcategory_id
        INNER JOIN categories c ON c.id = sc.category_id
        INNER JOIN category_parents cp ON cp.id = c.parent_id
        ${whereClause}
        GROUP BY cp.id, cp.name, cp.icon, c.id, c.name, c.icon, sc.id, sc.name, sc.icon
        HAVING SUM(t.amount) > 0

        UNION ALL

        -- CASO 2: Transacciones sin subcategoría (categoría directa - hoja)
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
          SUM(t.amount) as total_amount
        FROM transactions t
        INNER JOIN categories c ON c.id = t.category_id
        INNER JOIN category_parents cp ON cp.id = c.parent_id
        WHERE t.subcategory_id IS NULL
          ${whereClause.replace('WHERE', 'AND')}
        GROUP BY cp.id, cp.name, cp.icon, c.id, c.name, c.icon
        HAVING SUM(t.amount) > 0
      ),
      category_level AS (
        -- Agrupar por categoría: si tiene subcategorías, son hijos; si no, la categoría ES la hoja
        SELECT
          parent_id,
          parent_name,
          parent_icon,
          category_id,
          category_name,
          category_icon,
          CASE
            WHEN COUNT(subcategory_id) > 0 THEN
              -- Categoría con subcategorías: crear array de hijos
              json_agg(
                json_build_object(
                  'name', subcategory_name,
                  'value', total_amount,
                  'icon', subcategory_icon
                ) ORDER BY total_amount DESC
              )
            ELSE
              -- Categoría sin subcategorías: NULL (la categoría misma será hoja)
              NULL
          END as subcategories,
          -- Si no hay subcategorías, la categoría tiene valor directo
          CASE
            WHEN COUNT(subcategory_id) = 0 THEN MAX(total_amount)
            ELSE NULL
          END as category_direct_value
        FROM transaction_leaf_nodes
        GROUP BY parent_id, parent_name, parent_icon, category_id, category_name, category_icon
      )
      -- Nivel 1: Padres con categorías
      SELECT
        parent_id,
        parent_name,
        parent_icon,
        json_agg(
          json_build_object(
            'name', category_name,
            'icon', category_icon,
            'children', subcategories,
            'value', category_direct_value
          ) ORDER BY category_name
        ) as categories
      FROM category_level
      GROUP BY parent_id, parent_name, parent_icon
      ORDER BY parent_name
    `,
      params,
    );

    // Transformar los datos al formato de Nivo TreeMap
    // IMPORTANTE: Solo las hojas (subcategorías) tienen 'value'.
    // Los contenedores (parents y categories) NO deben tener 'value',
    // Nivo TreeMap calcula automáticamente sumando sus hijos.
    const treemapData: TreemapData = {
      name: type === 'expense' ? 'Gastos' : type === 'income' ? 'Ingresos' : 'Transacciones',
      children: [],
    };

    if (result.rows.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      treemapData.children = result.rows.map((row: any) => ({
        name: row.parent_name,
        icon: row.parent_icon,
        children: row.categories,
      }));
    }

    return NextResponse.json({
      success: true,
      data: treemapData,
    });
  } catch (error) {
    console.error('Error en /api/sickness/statistics/treemap:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener datos del treemap',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
