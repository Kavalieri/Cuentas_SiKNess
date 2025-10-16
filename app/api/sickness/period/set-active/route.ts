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

    const { periodId } = await req.json();

    if (!periodId) {
      return NextResponse.json({ error: 'periodId requerido' }, { status: 400 });
    }

    // Obtener información del periodo
    const periodResult = await query(
      `
      SELECT
        id,
        household_id,
        year,
        month,
        status,
        opening_balance,
        closing_balance,
        total_income,
        total_expenses
      FROM monthly_periods
      WHERE id = $1
    `,
      [periodId],
    );

    if (periodResult.rows.length === 0) {
      return NextResponse.json({ error: 'Periodo no encontrado' }, { status: 404 });
    }

    const p = periodResult.rows[0];

    // Verificar que el usuario tiene acceso al hogar del periodo
    const memberCheck = await query(
      `
      SELECT 1 FROM household_members
      WHERE household_id = $1 AND profile_id = $2
    `,
      [p?.household_id, user.profile_id],
    );

    if (memberCheck.rows.length === 0) {
      return NextResponse.json({ error: 'No tienes acceso a este periodo' }, { status: 403 });
    }

    const period = p
      ? {
          id: p.id,
          householdId: p.household_id,
          year: p.year,
          month: p.month,
          day: 1,
          phase: 1 as const, // TODO: calcular fase real
          status: p.status || 'active',
          openingBalance: toNumber(p.opening_balance),
          closingBalance: toNumber(p.closing_balance),
          totalIncome: toNumber(p.total_income),
          totalExpenses: toNumber(p.total_expenses),
        }
      : null;

    return NextResponse.json({ period });
  } catch (error) {
    console.error('[API /api/sickness/period/set-active] Error:', error);
    return NextResponse.json({ error: 'Error al cambiar de periodo' }, { status: 500 });
  }
}
