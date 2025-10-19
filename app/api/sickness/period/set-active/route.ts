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

    // Detectar compatibilidad de esquema: ¿existe columna phase?
    const hasPhaseResult = await query(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'monthly_periods'
            AND column_name = 'phase'
        ) AS has_phase
      `,
    );

    const hasPhase: boolean = Boolean(hasPhaseResult.rows?.[0]?.has_phase);

    // Obtener información del periodo (incluyendo phase si existe)
    const periodResult = await query(
      hasPhase
        ? `
          SELECT
            id,
            household_id,
            year,
            month,
            phase,
            opening_balance,
            closing_balance,
            total_income,
            total_expenses
          FROM monthly_periods
          WHERE id = $1
        `
        : `
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

    // Mapear status legacy → phase cuando phase no exista aún en el esquema
    const legacyStatusToPhase = (status?: string | null): string => {
      switch ((status || '').toLowerCase()) {
        case 'open':
          return 'active';
        case 'pending_close':
          return 'closing';
        case 'closed':
          return 'closed';
        case 'setup':
        case 'preparing':
          return 'preparing';
        case 'locked':
        case 'validation':
          return 'validation';
        default:
          return 'preparing';
      }
    };

    const period = p
      ? {
          id: p.id,
          householdId: p.household_id,
          year: p.year,
          month: p.month,
          day: 1,
          phase: hasPhase ? (p.phase ?? 'preparing') : legacyStatusToPhase(p.status),
          openingBalance: toNumber(p.opening_balance),
          closingBalance: toNumber(p.closing_balance),
          totalIncome: toNumber(p.total_income),
          totalExpenses: toNumber(p.total_expenses),
        }
      : null;

    return NextResponse.json({ period });
  } catch (error) {
    const err = error as { message?: string; detail?: string; hint?: string } | undefined;
    const parts = [err?.message, err?.detail, err?.hint].filter(Boolean);
    const message = parts.length > 0 ? parts.join(' - ') : 'Error al cambiar de periodo';
    console.error('[API /api/sickness/period/set-active] Error:', message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
