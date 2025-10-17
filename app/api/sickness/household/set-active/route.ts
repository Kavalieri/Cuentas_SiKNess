import { getCurrentUser } from '@/lib/auth';
import { toNumber } from '@/lib/format';
import { normalizePeriodPhase } from '@/lib/periods';
import { query } from '@/lib/pgServer';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { householdId } = await req.json();

    if (!householdId) {
      return NextResponse.json({ error: 'householdId requerido' }, { status: 400 });
    }

    // Verificar que el usuario pertenece al hogar
    const memberCheck = await query(
      `
      SELECT 1 FROM household_members
      WHERE household_id = $1 AND profile_id = $2
    `,
      [householdId, user.profile_id],
    );

    if (memberCheck.rows.length === 0) {
      return NextResponse.json({ error: 'No tienes acceso a este hogar' }, { status: 403 });
    }

    // Obtener información del hogar
    const householdResult = await query(
      `
      SELECT
        h.id,
        h.name,
        hs.currency,
        hs.monthly_contribution_goal as goal,
        hs.calculation_type
      FROM households h
      LEFT JOIN household_settings hs ON hs.household_id = h.id
      WHERE h.id = $1
    `,
      [householdId],
    );

    if (householdResult.rows.length === 0) {
      return NextResponse.json({ error: 'Hogar no encontrado' }, { status: 404 });
    }

    const household = householdResult.rows[0];

    // Fecha actual para heurística de periodo "actual"
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Listar períodos (últimos 15 ordenados desc)
    const periodsRes = await query(
      `
      SELECT
        id,
        year,
        month,
        status,
        opening_balance,
        closing_balance,
        total_income,
        total_expenses,
        created_at
      FROM monthly_periods
      WHERE household_id = $1
      ORDER BY year DESC, month DESC
      LIMIT 15
    `,
      [householdId],
    );

    const periods = periodsRes.rows.map((row) => {
      const { phase } = normalizePeriodPhase(undefined, row.status);
      return {
        id: row.id as string,
        year: Number(row.year),
        month: Number(row.month),
        status: (row.status as string) ?? 'open',
        phase,
        openingBalance: toNumber(row.opening_balance),
        closingBalance: toNumber(row.closing_balance),
        isCurrent: phase === 'active' || (Number(row.year) === currentYear && Number(row.month) === currentMonth),
        // Extras para currentPeriod (no usados por el listado, pero útiles luego)
        totalIncome: toNumber(row.total_income),
        totalExpenses: toNumber(row.total_expenses),
      };
    });

    // Elegir currentPeriod: prioridad por isCurrent → mes actual → más reciente
    const currentPeriodCandidate =
      periods.find((p) => p.isCurrent) ||
      periods.find((p) => p.year === currentYear && p.month === currentMonth) ||
      periods[0] ||
      null;

    const currentPeriod = currentPeriodCandidate
      ? {
          id: currentPeriodCandidate.id,
          year: currentPeriodCandidate.year,
          month: currentPeriodCandidate.month,
          day: 1,
          phase: currentPeriodCandidate.phase,
          status: currentPeriodCandidate.status,
          openingBalance: currentPeriodCandidate.openingBalance,
          closingBalance: currentPeriodCandidate.closingBalance,
          totalIncome: currentPeriodCandidate.totalIncome,
          totalExpenses: currentPeriodCandidate.totalExpenses,
        }
      : null;

    // Actualizar preferencia de usuario
    await query(
      `
      INSERT INTO user_active_household (profile_id, household_id)
      VALUES ($1, $2)
      ON CONFLICT (profile_id)
      DO UPDATE SET household_id = $2, updated_at = NOW()
    `,
      [user.profile_id, householdId],
    );

    return NextResponse.json({
      household: household
        ? {
            id: household.id,
            name: household.name,
            currency: household.currency || 'EUR',
            goal: Number(household.goal) || 0,
            calculationMethod: household.calculation_type || 'equal',
          }
        : null,
      periods: periods.map(({ totalIncome, totalExpenses, ...rest }) => rest),
      currentPeriod,
    });
  } catch (error) {
    console.error('[API /api/sickness/household/set-active] Error:', error);
    return NextResponse.json({ error: 'Error al cambiar de hogar' }, { status: 500 });
  }
}
