import { query } from '@/lib/pgServer';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ParetoDataPoint {
  name: string;
  amount: number;
  cumulative: number;
  percentage: number;
  icon?: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');
    const type = searchParams.get('type') || 'expense';
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!householdId) {
      return NextResponse.json({ error: 'householdId es requerido' }, { status: 400 });
    }

    // Construir condiciones de filtro
    const conditions = ['t.household_id = $1', `t.type = $2`];
    const params: unknown[] = [householdId, type];
    let paramIndex = 3;

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

    // Query para análisis de Pareto por subcategorías
    // Calcula porcentajes sobre el TOTAL de todas las transacciones, no solo el TOP N
    const result = await query(
      `
      WITH all_totals AS (
        -- Total general de todas las transacciones (sin límite)
        SELECT SUM(t.amount) as grand_total
        FROM transactions t
        ${whereClause}
      ),
      category_totals AS (
        -- Montos agregados POR CATEGORÍA (no subcategoría)
        -- Sumamos todas las transacciones de cada categoría, tengan o no subcategoría
        SELECT
          c.name as category_name,
          c.icon as category_icon,
          SUM(t.amount) as total_amount
        FROM transactions t
        -- Primero intentamos obtener categoría desde subcategoría
        LEFT JOIN subcategories sc ON sc.id = t.subcategory_id
        LEFT JOIN categories c ON c.id = COALESCE(sc.category_id, t.category_id)
        ${whereClause}
        GROUP BY c.id, c.name, c.icon
        HAVING SUM(t.amount) > 0
        ORDER BY total_amount DESC
        LIMIT $${paramIndex}
      )
      SELECT
        ct.category_name,
        ct.category_icon,
        ct.total_amount,
        ROUND((ct.total_amount / at.grand_total * 100)::numeric, 2) as percentage,
        ROUND(
          (SUM(ct.total_amount) OVER (ORDER BY ct.total_amount DESC) / at.grand_total * 100)::numeric,
          2
        ) as cumulative_percentage
      FROM category_totals ct
      CROSS JOIN all_totals at
      ORDER BY ct.total_amount DESC
    `,
      [...params, limit],
    );

    // Transformar los datos al formato esperado por el componente
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paretoData: ParetoDataPoint[] = result.rows.map((row: any) => ({
      name: row.category_name || 'Sin categoría',
      amount: parseFloat(row.total_amount) || 0,
      percentage: parseFloat(row.percentage) || 0,
      cumulative: parseFloat(row.cumulative_percentage) || 0,
      icon: row.category_icon || '',
    }));

    return NextResponse.json({
      success: true,
      data: paretoData,
    });
  } catch (error) {
    console.error('Error en /api/sickness/statistics/pareto:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener datos del Pareto',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
