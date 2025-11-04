import { query } from '@/lib/pgServer';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface BalanceDataPoint {
  time: string;
  value: number;
}

type Timeframe = 'hourly' | 'daily' | 'weekly' | 'monthly';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');
    const timeframe = (searchParams.get('timeframe') || 'daily') as Timeframe;
    const periodId = searchParams.get('periodId');

    if (!householdId) {
      return NextResponse.json({ error: 'householdId es requerido' }, { status: 400 });
    }

    let result;
    let periodFilter = '';
    const params: (string | number)[] = [householdId];

    // Si hay periodo específico, filtrar por fechas
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
      const endDateObj = new Date(periodInfo.year, periodInfo.month, 0);
      const endDate = endDateObj.toISOString().split('T')[0] || '';

      periodFilter = `AND DATE(t.occurred_at) >= $2::date AND DATE(t.occurred_at) <= $3::date`;
      params.push(startDate);
      params.push(endDate);
    }

    // Calcular balance acumulado según timeframe
    if (timeframe === 'hourly') {
      const hourlyLimit = periodId ? '' : `AND t.occurred_at >= NOW() - INTERVAL '48 hours'`;

      result = await query(
        `
        WITH hourly_impacts AS (
          SELECT
            DATE_TRUNC('hour', t.occurred_at) as hour_bucket,
            SUM(
              CASE
                WHEN t.type IN ('income', 'income_direct') THEN t.amount
                WHEN t.type IN ('expense', 'expense_direct') THEN -t.amount
                ELSE 0
              END
            ) as net_impact
          FROM transactions t
          WHERE t.household_id = $1
            ${periodFilter}
            ${hourlyLimit}
          GROUP BY DATE_TRUNC('hour', t.occurred_at)
          ORDER BY hour_bucket ASC
        )
        SELECT
          TO_CHAR(hour_bucket, 'YYYY-MM-DD HH24:00:00') as time,
          SUM(net_impact) OVER (ORDER BY hour_bucket) as value
        FROM hourly_impacts
        ORDER BY hour_bucket ASC
        `,
        params,
      );
    } else if (timeframe === 'daily') {
      result = await query(
        `
        WITH daily_impacts AS (
          SELECT
            DATE(t.occurred_at) as day_bucket,
            SUM(
              CASE
                WHEN t.type IN ('income', 'income_direct') THEN t.amount
                WHEN t.type IN ('expense', 'expense_direct') THEN -t.amount
                ELSE 0
              END
            ) as net_impact
          FROM transactions t
          WHERE t.household_id = $1
            ${periodFilter}
          GROUP BY DATE(t.occurred_at)
          ORDER BY day_bucket ASC
        )
        SELECT
          TO_CHAR(day_bucket, 'YYYY-MM-DD') as time,
          SUM(net_impact) OVER (ORDER BY day_bucket) as value
        FROM daily_impacts
        ORDER BY day_bucket ASC
        `,
        params,
      );
    } else if (timeframe === 'weekly') {
      result = await query(
        `
        WITH weekly_impacts AS (
          SELECT
            DATE_TRUNC('week', t.occurred_at) as week_bucket,
            SUM(
              CASE
                WHEN t.type IN ('income', 'income_direct') THEN t.amount
                WHEN t.type IN ('expense', 'expense_direct') THEN -t.amount
                ELSE 0
              END
            ) as net_impact
          FROM transactions t
          WHERE t.household_id = $1
            ${periodFilter}
          GROUP BY DATE_TRUNC('week', t.occurred_at)
          ORDER BY week_bucket ASC
        )
        SELECT
          TO_CHAR(week_bucket, 'YYYY-MM-DD') as time,
          SUM(net_impact) OVER (ORDER BY week_bucket) as value
        FROM weekly_impacts
        ORDER BY week_bucket ASC
        `,
        params,
      );
    } else {
      // monthly
      result = await query(
        `
        WITH monthly_impacts AS (
          SELECT
            DATE_TRUNC('month', t.occurred_at) as month_bucket,
            SUM(
              CASE
                WHEN t.type IN ('income', 'income_direct') THEN t.amount
                WHEN t.type IN ('expense', 'expense_direct') THEN -t.amount
                ELSE 0
              END
            ) as net_impact
          FROM transactions t
          WHERE t.household_id = $1
            ${periodFilter}
          GROUP BY DATE_TRUNC('month', t.occurred_at)
          ORDER BY month_bucket ASC
        )
        SELECT
          TO_CHAR(month_bucket, 'YYYY-MM-DD') as time,
          SUM(net_impact) OVER (ORDER BY month_bucket) as value
        FROM monthly_impacts
        ORDER BY month_bucket ASC
        `,
        params,
      );
    }

    const data: BalanceDataPoint[] = result.rows.map((row: { time?: string; value?: string | number }) => ({
      time: row.time || '',
      value: parseFloat(String(row.value || 0)),
    }));

    // Calcular balance final
    const finalBalance = data.length > 0 ? data[data.length - 1]?.value || 0 : 0;

    return NextResponse.json({
      success: true,
      data,
      finalBalance,
      dataPoints: data.length,
    });
  } catch (error) {
    console.error('Error al obtener evolución de balance:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos de balance' },
      { status: 500 },
    );
  }
}
