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

    // Query para obtener los montos mensuales de períodos cerrados
    // Si no hay suficientes períodos cerrados, complementa con el mes actual
    const result = await query(
      `
      WITH closed_periods AS (
        -- Obtener períodos cerrados del hogar
        SELECT
          mp.id,
          TO_CHAR(mp.start_date, 'YYYY-MM') as month_key,
          TO_CHAR(mp.start_date, 'Mon YYYY') as month_display,
          mp.start_date,
          mp.end_date
        FROM monthly_periods mp
        WHERE mp.household_id = $1
          AND mp.phase = 'closed'
        ORDER BY mp.start_date DESC
        LIMIT $3
      ),
      period_amounts AS (
        -- Sumar transacciones por período
        SELECT
          cp.month_key,
          cp.month_display,
          cp.start_date,
          COALESCE(SUM(t.amount), 0) as total_amount
        FROM closed_periods cp
        LEFT JOIN transactions t ON
          t.household_id = $1
          AND t.type = $2
          AND t.occurred_at >= cp.start_date
          AND t.occurred_at <= cp.end_date
        GROUP BY cp.month_key, cp.month_display, cp.start_date
        ORDER BY cp.start_date ASC
      )
      SELECT
        month_display as date,
        total_amount as amount
      FROM period_amounts
      WHERE total_amount > 0 OR 1=1  -- Incluir meses con 0 también
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
