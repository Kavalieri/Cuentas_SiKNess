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

    // Query principal: obtener la jerarquía completa de 3 niveles con montos agregados
    // Nivel 1: category_parents (ej: "Hogar", "Transporte")
    // Nivel 2: categories (ej: "Alimentación", "Mantenimiento")
    // Nivel 3: subcategories (ej: "Supermercado", "Restaurantes")
    // IMPORTANTE: Solo las subcategorías (nivel 3) tienen valores. Los niveles superiores son contenedores.
    const result = await query(
      `
      WITH subcategory_totals AS (
        -- Nivel 3: Subcategorías con sus montos (SOLO HOJAS CON VALORES)
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
      ),
      category_level AS (
        -- Nivel 2: Categorías con sus subcategorías como hijos (SIN VALOR PROPIO)
        SELECT
          parent_id,
          parent_name,
          parent_icon,
          category_id,
          category_name,
          category_icon,
          json_agg(
            json_build_object(
              'name', subcategory_name,
              'value', total_amount,
              'icon', subcategory_icon
            ) ORDER BY total_amount DESC
          ) as subcategories
        FROM subcategory_totals
        GROUP BY parent_id, parent_name, parent_icon, category_id, category_name, category_icon
      )
      -- Nivel 1: Padres con categorías (SIN VALOR PROPIO)
      SELECT
        parent_id,
        parent_name,
        parent_icon,
        json_agg(
          json_build_object(
            'name', category_name,
            'icon', category_icon,
            'children', subcategories
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
