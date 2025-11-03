import { query } from '@/lib/pgServer';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface TrendDataPoint {
  time: string; // Timestamp en formato ISO o YYYY-MM-DD
  value: number;
}

type Timeframe = 'hourly' | 'daily' | 'weekly' | 'monthly';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');
    const type = searchParams.get('type') || 'expense';
    const timeframe = (searchParams.get('timeframe') || 'daily') as Timeframe;
    const periodId = searchParams.get('periodId'); // Para periodo específico (opcional)

    if (!householdId) {
      return NextResponse.json({ error: 'householdId es requerido' }, { status: 400 });
    }

    let result;

    // Si hay periodId, filtrar solo transacciones de ese periodo
    if (periodId) {
      const periodInfoResult = await query(
        `SELECT year, month FROM monthly_periods WHERE id = $1`,
        [periodId],
      );

      if (periodInfoResult.rows.length === 0) {
        return NextResponse.json({ error: 'Periodo no encontrado' }, { status: 404 });
      }

      const periodInfo = periodInfoResult.rows[0] as { year: number; month: number };
      const startDate = `${periodInfo.year}-${String(periodInfo.month).padStart(2, '0')}-01`;
      const endDate = new Date(periodInfo.year, periodInfo.month, 0).toISOString().split('T')[0]; // Último día del mes

      // Consultar TODAS las transacciones del periodo según timeframe
      if (timeframe === 'hourly') {
        result = await query(
          `
          SELECT
            TO_CHAR(DATE_TRUNC('hour', t.occurred_at), 'YYYY-MM-DD HH24:00:00') as time,
            SUM(t.amount) as value
          FROM transactions t
          WHERE t.household_id = $1
            AND t.type = $2
            AND DATE(t.occurred_at) >= $3::date
            AND DATE(t.occurred_at) <= $4::date
          GROUP BY DATE_TRUNC('hour', t.occurred_at)
          ORDER BY time ASC
        `,
          [householdId, type, startDate, endDate],
        );
      } else if (timeframe === 'daily') {
        result = await query(
          `
          SELECT
            TO_CHAR(DATE(t.occurred_at), 'YYYY-MM-DD') as time,
            SUM(t.amount) as value
          FROM transactions t
          WHERE t.household_id = $1
            AND t.type = $2
            AND DATE(t.occurred_at) >= $3::date
            AND DATE(t.occurred_at) <= $4::date
          GROUP BY DATE(t.occurred_at)
          ORDER BY time ASC
        `,
          [householdId, type, startDate, endDate],
        );
      } else if (timeframe === 'weekly') {
        result = await query(
          `
          SELECT
            TO_CHAR(DATE_TRUNC('week', t.occurred_at), 'YYYY-MM-DD') as time,
            SUM(t.amount) as value
          FROM transactions t
          WHERE t.household_id = $1
            AND t.type = $2
            AND DATE(t.occurred_at) >= $3::date
            AND DATE(t.occurred_at) <= $4::date
          GROUP BY DATE_TRUNC('week', t.occurred_at)
          ORDER BY time ASC
        `,
          [householdId, type, startDate, endDate],
        );
      } else {
        // monthly
        result = await query(
          `
          SELECT
            TO_CHAR(DATE_TRUNC('month', t.occurred_at), 'YYYY-MM-DD') as time,
            SUM(t.amount) as value
          FROM transactions t
          WHERE t.household_id = $1
            AND t.type = $2
            AND DATE(t.occurred_at) >= $3::date
            AND DATE(t.occurred_at) <= $4::date
          GROUP BY DATE_TRUNC('month', t.occurred_at)
          ORDER BY time ASC
        `,
          [householdId, type, startDate, endDate],
        );
      }
    } else {
      // Vista global: TODAS las transacciones históricas
      if (timeframe === 'hourly') {
        // Últimas 48 horas
        result = await query(
          `
          SELECT
            TO_CHAR(DATE_TRUNC('hour', t.occurred_at), 'YYYY-MM-DD HH24:00:00') as time,
            SUM(t.amount) as value
          FROM transactions t
          WHERE t.household_id = $1
            AND t.type = $2
            AND t.occurred_at >= NOW() - INTERVAL '48 hours'
          GROUP BY DATE_TRUNC('hour', t.occurred_at)
          ORDER BY time ASC
        `,
          [householdId, type],
        );
      } else if (timeframe === 'daily') {
        // TODAS las transacciones agrupadas por día
        result = await query(
          `
          SELECT
            TO_CHAR(DATE(t.occurred_at), 'YYYY-MM-DD') as time,
            SUM(t.amount) as value
          FROM transactions t
          WHERE t.household_id = $1
            AND t.type = $2
          GROUP BY DATE(t.occurred_at)
          ORDER BY time ASC
        `,
          [householdId, type],
        );
      } else if (timeframe === 'weekly') {
        // TODAS las transacciones agrupadas por semana
        result = await query(
          `
          SELECT
            TO_CHAR(DATE_TRUNC('week', t.occurred_at), 'YYYY-MM-DD') as time,
            SUM(t.amount) as value
          FROM transactions t
          WHERE t.household_id = $1
            AND t.type = $2
          GROUP BY DATE_TRUNC('week', t.occurred_at)
          ORDER BY time ASC
        `,
          [householdId, type],
        );
      } else {
        // monthly: TODAS las transacciones agrupadas por mes
        result = await query(
          `
          SELECT
            TO_CHAR(DATE_TRUNC('month', t.occurred_at), 'YYYY-MM-DD') as time,
            SUM(t.amount) as value
          FROM transactions t
          WHERE t.household_id = $1
            AND t.type = $2
          GROUP BY DATE_TRUNC('month', t.occurred_at)
          ORDER BY time ASC
        `,
          [householdId, type],
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trendData: TrendDataPoint[] = result.rows.map((row: any) => ({
      time: row.time,
      value: parseFloat(row.value) || 0,
    }));

    // Calcular promedio
    const average = trendData.length > 0
      ? trendData.reduce((sum, d) => sum + d.value, 0) / trendData.length
      : 0;

    // Calcular tendencia (comparar primera mitad vs segunda mitad)
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (trendData.length >= 4) {
      const midpoint = Math.floor(trendData.length / 2);
      const firstHalf = trendData.slice(0, midpoint);
      const secondHalf = trendData.slice(midpoint);

      const avgFirst = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;

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
