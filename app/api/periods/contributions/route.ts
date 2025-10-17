'use server';

import { getCurrentUser, getUserHouseholdId } from '@/lib/auth';
import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const householdId = await getUserHouseholdId();
    if (!householdId)
      return NextResponse.json({ error: 'No tienes un hogar activo' }, { status: 400 });

    // Obtener el periodo más reciente
    const periodRes = await query<{
      id: string;
      year: number;
      month: number;
      status: string | null;
    }>(
      `
      SELECT id, year, month, status
      FROM monthly_periods
      WHERE household_id = $1
      ORDER BY year DESC, month DESC
      LIMIT 1
    `,
      [householdId],
    );

    const period = periodRes.rows[0];
    if (!period) {
      return NextResponse.json({ ok: true, contributions: [] });
    }

    // Obtener contribuciones del periodo
    const contributionsRes = await query<{
      profile_id: string;
      email: string;
      expected_amount: number | null;
      paid_amount: number | null;
      status: string | null;
      calculation_method: string | null;
    }>(
      `
      SELECT
        c.profile_id,
        p.email,
        c.expected_amount,
        c.paid_amount,
        c.status,
        c.calculation_method
      FROM contributions c
      INNER JOIN profiles p ON p.id = c.profile_id
      WHERE c.household_id = $1
        AND c.year = $2
        AND c.month = $3
      ORDER BY p.email
    `,
      [householdId, period.year, period.month],
    );

    return NextResponse.json({
      ok: true,
      contributions: contributionsRes.rows,
      period: {
        year: period.year,
        month: period.month,
        status: period.status
      }
    });
  } catch (error) {
    console.error('[GET /api/periods/contributions] error:', error);
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 });
  }
}
