import { query } from '@/lib/pgServer';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface TrendDataPoint {
  date: string;
  amount: number;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');
    const type = searchParams.get('type') || 'expense';
    const months = parseInt(searchParams.get('months') || '6', 10);

    if (!householdId) {
      return NextResponse.json({ error: 'householdId es requerido' }, { status: 400 });
    }

    // Query para obtener los montos mensuales
    const result = await query(
      `
      WITH monthly_amounts AS (
        SELECT
          TO_CHAR(t.occurred_at, 'YYYY-MM') as month_key,
          TO_CHAR(t.occurred_at, 'Mon YYYY') as month_display,
          SUM(t.amount) as total_amount
        FROM transactions t
        WHERE t.household_id = $1
          AND t.type = $2
          AND t.occurred_at >= CURRENT_DATE - INTERVAL '1 month' * $3
        GROUP BY month_key, month_display
        ORDER BY month_key DESC
      )
      SELECT
        month_display as date,
        total_amount as amount
      FROM monthly_amounts
      ORDER BY month_key ASC
    `,
      [householdId, type, months],
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trendData: TrendDataPoint[] = result.rows.map((row: any) => ({
      date: row.date,
      amount: parseFloat(row.amount) || 0,
    }));

    // Calcular promedio
    const average = trendData.length > 0
      ? trendData.reduce((sum, d) => sum + d.amount, 0) / trendData.length
      : 0;

    // Calcular tendencia (comparar primera mitad vs segunda mitad)
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (trendData.length >= 4) {
      const midpoint = Math.floor(trendData.length / 2);
      const firstHalf = trendData.slice(0, midpoint);
      const secondHalf = trendData.slice(midpoint);

      const avgFirst = firstHalf.reduce((sum, d) => sum + d.amount, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((sum, d) => sum + d.amount, 0) / secondHalf.length;

      const percentChange = ((avgSecond - avgFirst) / avgFirst) * 100;

      if (percentChange > 10) {
        trend = 'up';
      } else if (percentChange < -10) {
        trend = 'down';
      }
    }

    return NextResponse.json({
      success: true,
      data: trendData,
      average: Math.round(average * 100) / 100,
      trend,
    });
  } catch (error) {
    console.error('Error en /api/sickness/statistics/trend:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener datos de tendencia',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
