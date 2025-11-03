import { query } from '@/lib/pgServer';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

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

    // Query para obtener los montos mensuales de períodos cerrados desde los snapshots guardados
    const result = await query(
      `
      SELECT
        TO_CHAR(DATE(mp.year || '-' || LPAD(mp.month::text, 2, '0') || '-01'), 'Mon YYYY') as date,
        CASE 
          WHEN $2 = 'expense' THEN COALESCE(mp.total_expenses, 0)
          WHEN $2 = 'income' THEN COALESCE(mp.total_income, 0)
          ELSE 0
        END as amount
      FROM monthly_periods mp
      WHERE mp.household_id = $1
        AND mp.phase = 'closed'
      ORDER BY mp.year ASC, mp.month ASC
      LIMIT $3
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
