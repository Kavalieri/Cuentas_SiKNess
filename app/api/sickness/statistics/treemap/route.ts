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

    // Query principal: obtener la jerarquía con montos agregados
    // subcategory_id -> subcategories.category_id -> categories.parent_id -> category_parents
    const result = await query(
      `
      WITH transaction_amounts AS (
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
        LEFT JOIN subcategories sc ON sc.id = t.subcategory_id
        LEFT JOIN categories c ON c.id = sc.category_id
        LEFT JOIN category_parents cp ON cp.id = c.parent_id
        ${whereClause}
        GROUP BY cp.id, cp.name, cp.icon, c.id, c.name, c.icon, sc.id, sc.name, sc.icon
      )
      SELECT
        parent_id,
        parent_name,
        parent_icon,
        json_agg(
          json_build_object(
            'name', COALESCE(subcategory_name, category_name, 'Sin categoría'),
            'value', total_amount,
            'icon', COALESCE(subcategory_icon, category_icon, '📦'),
            'parentName', parent_name
          ) ORDER BY total_amount DESC
        ) as categories
      FROM transaction_amounts
      WHERE parent_name IS NOT NULL
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
