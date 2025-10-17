'use server';

import { getCurrentUser, getUserHouseholdId } from '@/lib/auth';
import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

type Checklist = {
  householdId: string;
  periodId: string | null;
  year: number | null;
  month: number | null;
  status: string | null;
  phase: string | null;
  hasHouseholdGoal: boolean;
  calculationType: string | null;
  membersWithIncome: number;
  totalMembers: number;
};

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const householdId = await getUserHouseholdId();
    if (!householdId)
      return NextResponse.json({ error: 'No tienes un hogar activo' }, { status: 400 });

    const periodRes = await query<{
      id: string;
      year: number;
      month: number;
      status: string | null;
      phase: string | null;
    }>(
      `
      SELECT id, year, month, status, phase
      FROM monthly_periods
      WHERE household_id = $1
      ORDER BY year DESC, month DESC
      LIMIT 1
    `,
      [householdId],
    );

    const period = periodRes.rows[0];

    const settingsRes = await query<{
      monthly_contribution_goal: string | null;
      calculation_type: string | null;
    }>(
      `SELECT monthly_contribution_goal, calculation_type
       FROM household_settings
       WHERE household_id = $1`,
      [householdId],
    );
    const hasHouseholdGoal = Boolean(settingsRes.rows[0]?.monthly_contribution_goal);
    const calculationType = settingsRes.rows[0]?.calculation_type ?? 'equal';

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
      status: period?.status ?? null,
      phase: period?.phase ?? null,
      hasHouseholdGoal,
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
