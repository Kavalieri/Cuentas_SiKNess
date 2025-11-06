'use server';

import { getCurrentUser, getUserHouseholdId } from '@/lib/auth';
import { query } from '@/lib/db';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

type Checklist = {
  householdId: string;
  periodId: string | null;
  year: number | null;
  month: number | null;
  phase: string | null;
  hasHouseholdBudget: boolean;
  monthlyBudget: number | null;
  calculationType: string | null;
  membersWithIncome: number;
  totalMembers: number;
};

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const householdId = await getUserHouseholdId();
    if (!householdId)
      return NextResponse.json({ error: 'No tienes un hogar activo' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const qPeriodId = searchParams.get('periodId');
    const qYear = searchParams.get('year');
    const qMonth = searchParams.get('month');

    const periodRes = await query<{
      id: string;
      year: number;
      month: number;
      phase: string | null;
    }>(
      qPeriodId
        ? `
              SELECT id, year, month, phase
              FROM monthly_periods
              WHERE household_id = $1 AND id = $2
              LIMIT 1
            `
          : qYear && qMonth
            ? `
                SELECT id, year, month, phase
                FROM monthly_periods
                WHERE household_id = $1 AND year = $2 AND month = $3
                LIMIT 1
              `
            : `
                SELECT id, year, month, phase
                FROM monthly_periods
                WHERE household_id = $1
                ORDER BY year DESC, month DESC
                LIMIT 1
              `,
      qPeriodId ? [householdId, qPeriodId] : qYear && qMonth ? [householdId, Number(qYear), Number(qMonth)] : [householdId],
    );

    const period = periodRes.rows[0];

    // Obtener presupuesto: usar snapshot del período si existe, sino valor actual de settings
    // Lee de AMBAS columnas con fallback automático (transición objetivo→presupuesto)
    const goalRes = await query<{
      monthly_budget: string | null;
      calculation_type: string | null;
    }>(
      period?.id
        ? `SELECT
             COALESCE(mp.snapshot_budget, mp.snapshot_contribution_goal, hs.monthly_budget, hs.monthly_contribution_goal) as monthly_budget,
             hs.calculation_type
           FROM monthly_periods mp
           LEFT JOIN household_settings hs ON hs.household_id = mp.household_id
           WHERE mp.id = $1`
        : `SELECT COALESCE(monthly_budget, monthly_contribution_goal) as monthly_budget, calculation_type
           FROM household_settings
           WHERE household_id = $1`,
      period?.id ? [period.id] : [householdId],
    );

    const monthlyBudget = goalRes.rows[0]?.monthly_budget ? Number(goalRes.rows[0]?.monthly_budget) : null;
    const hasHouseholdBudget = Boolean(monthlyBudget);
    const calculationType = goalRes.rows[0]?.calculation_type ?? 'equal';

    const membersRes = await query<{ total: number }>(
      `SELECT COUNT(*)::int as total
       FROM household_members
       WHERE household_id = $1`,
      [householdId],
    );
    const totalMembers = membersRes.rows[0]?.total ?? 0;

    const incomeRes = await query<{ with_income: number }>(
      `SELECT COUNT(DISTINCT profile_id)::int as with_income
       FROM member_incomes
       WHERE household_id = $1`,
      [householdId],
    );
    const membersWithIncome = incomeRes.rows[0]?.with_income ?? 0;

    const data: Checklist = {
      householdId,
      periodId: period?.id ?? null,
      year: period?.year ?? null,
      month: period?.month ?? null,
      phase: period?.phase ?? null,
      hasHouseholdBudget,
      monthlyBudget,
      calculationType,
      membersWithIncome,
      totalMembers,
    };

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('[GET /api/periods/checklist] error:', error);
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 });
  }
}
