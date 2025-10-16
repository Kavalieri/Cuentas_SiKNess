import { getCurrentUser } from '@/lib/auth';
import { toNumber } from '@/lib/format';
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

    // Obtener o crear el periodo actual
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const periodResult = await query(
      `
      SELECT
        id,
        year,
        month,
        status,
        opening_balance,
        closing_balance,
        total_income,
        total_expenses
      FROM monthly_periods
      WHERE household_id = $1
        AND year = $2
        AND month = $3
      LIMIT 1
    `,
      [householdId, currentYear, currentMonth],
    );

    let currentPeriod = null;
    if (periodResult.rows.length > 0) {
      const p = periodResult.rows[0];
      if (p) {
        currentPeriod = {
          id: p.id,
          year: p.year,
          month: p.month,
          day: 1, // Por defecto día 1
          phase: 1 as const, // TODO: calcular fase real
          status: p.status || 'active',
          openingBalance: toNumber(p.opening_balance),
          closingBalance: toNumber(p.closing_balance),
          totalIncome: toNumber(p.total_income),
          totalExpenses: toNumber(p.total_expenses),
        };
      }
    }

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
      currentPeriod,
    });
  } catch (error) {
    console.error('[API /api/sickness/household/set-active] Error:', error);
    return NextResponse.json({ error: 'Error al cambiar de hogar' }, { status: 500 });
  }
}
