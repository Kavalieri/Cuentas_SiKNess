import { query } from '@/lib/pgServer';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface TreemapNode {
  name: string;
  value: number;
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
    const result = await query(
      `
      WITH subcategory_totals AS (
        -- Nivel 3: Subcategorías con sus montos
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
      ),
      category_level AS (
        -- Nivel 2: Categorías con sus subcategorías como hijos
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
              'icon', subcategory_icon,
              'parentName', category_name
            ) ORDER BY total_amount DESC
          ) as subcategories,
          SUM(total_amount) as category_total
        FROM subcategory_totals
        GROUP BY parent_id, parent_name, parent_icon, category_id, category_name, category_icon
      )
      -- Nivel 1: Padres con categorías (que contienen subcategorías)
      SELECT
        parent_id,
        parent_name,
        parent_icon,
        json_agg(
          json_build_object(
            'name', category_name,
            'value', category_total,
            'icon', category_icon,
            'parentName', parent_name,
            'children', subcategories
          ) ORDER BY category_total DESC
        ) as categories
      FROM category_level
      GROUP BY parent_id, parent_name, parent_icon
      ORDER BY parent_name
    `,
      params,
    );

    // Transformar los datos al formato de Nivo TreeMap
    const treemapData: TreemapData = {
      name: type === 'expense' ? 'Gastos' : type === 'income' ? 'Ingresos' : 'Transacciones',
      children: [],
    };

    if (result.rows.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      treemapData.children = result.rows.map((row: any) => ({
        name: row.parent_name,
        icon: row.parent_icon,
        value: 0, // Se calculará sumando los hijos
        children: row.categories,
      }));

      // Calcular el valor total de cada padre sumando sus hijos
      treemapData.children.forEach((parent) => {
        if (parent.children) {
          parent.value = parent.children.reduce((sum, child) => sum + (child.value || 0), 0);
        }
      });
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
