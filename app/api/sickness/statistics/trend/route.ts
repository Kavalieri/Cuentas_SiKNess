import { query } from '@/lib/pgServer';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface TrendDataPoint {
  date: string;
  amount: number;
}

type Timeframe = 'daily' | 'weekly' | 'monthly';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');
    const type = searchParams.get('type') || 'expense';
    const timeframe = (searchParams.get('timeframe') || 'monthly') as Timeframe;
    const periodId = searchParams.get('periodId'); // Para periodo específico (opcional)

    if (!householdId) {
      return NextResponse.json({ error: 'householdId es requerido' }, { status: 400 });
    }

    let result;

    // Si hay periodId, mostrar solo ese periodo con granularidad diaria
    if (periodId) {
      result = await query(
        `
        WITH period_dates AS (
          SELECT
            DATE(mp.year || '-' || LPAD(mp.month::text, 2, '0') || '-01') as start_date,
            (DATE(mp.year || '-' || LPAD(mp.month::text, 2, '0') || '-01') + INTERVAL '1 month' - INTERVAL '1 day')::date as end_date
          FROM monthly_periods mp
          WHERE mp.id = $1
        )
        SELECT
          TO_CHAR(DATE(t.occurred_at), 'YYYY-MM-DD') as date,
          SUM(t.amount) as amount
        FROM transactions t, period_dates pd
        WHERE t.household_id = $2
          AND t.type = $3
          AND DATE(t.occurred_at) >= pd.start_date
          AND DATE(t.occurred_at) <= pd.end_date
        GROUP BY DATE(t.occurred_at)
        ORDER BY date ASC
      `,
        [periodId, householdId, type],
      );
    } else {
      // Vista global: histórico cerrado + mes activo
      if (timeframe === 'monthly') {
        // Periodos cerrados (snapshots) + mes activo agregado
        result = await query(
          `
          -- Periodos cerrados (snapshots)
          SELECT
            TO_CHAR(DATE(mp.year || '-' || LPAD(mp.month::text, 2, '0') || '-01'), 'YYYY-MM-DD') as date,
            CASE
              WHEN $2 = 'expense' THEN COALESCE(mp.total_expenses, 0)
              WHEN $2 = 'income' THEN COALESCE(mp.total_income, 0)
              ELSE 0
            END as amount
          FROM monthly_periods mp
          WHERE mp.household_id = $1
            AND mp.phase = 'closed'

          UNION ALL

          -- Mes activo (transacciones agregadas)
          SELECT
            TO_CHAR(DATE_TRUNC('month', CURRENT_DATE), 'YYYY-MM-DD') as date,
            COALESCE(SUM(t.amount), 0) as amount
          FROM transactions t
          WHERE t.household_id = $1
            AND t.type = $2
            AND t.occurred_at >= DATE_TRUNC('month', CURRENT_DATE)

          ORDER BY date ASC
        `,
          [householdId, type],
        );
      } else if (timeframe === 'weekly') {
        // Últimas 12 semanas
        result = await query(
          `
          SELECT
            TO_CHAR(DATE_TRUNC('week', t.occurred_at), 'YYYY-MM-DD') as date,
            SUM(t.amount) as amount
          FROM transactions t
          WHERE t.household_id = $1
            AND t.type = $2
            AND t.occurred_at >= CURRENT_DATE - INTERVAL '12 weeks'
          GROUP BY DATE_TRUNC('week', t.occurred_at)
          ORDER BY date ASC
        `,
          [householdId, type],
        );
      } else {
        // daily: Últimos 30 días
        result = await query(
          `
          SELECT
            TO_CHAR(DATE(t.occurred_at), 'YYYY-MM-DD') as date,
            SUM(t.amount) as amount
          FROM transactions t
          WHERE t.household_id = $1
            AND t.type = $2
            AND t.occurred_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY DATE(t.occurred_at)
          ORDER BY date ASC
        `,
          [householdId, type],
        );
      }
    }

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
