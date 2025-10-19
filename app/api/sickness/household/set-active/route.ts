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

    // Fecha actual para heurística de periodo "actual"
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Compatibilidad de esquema: ¿existe columna phase?
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

    // Listar períodos (últimos 15 ordenados desc), incluyendo phase si existe
    const periodsRes = await query(
      hasPhase
        ? `
          SELECT
            id,
            year,
            month,
            phase,
            opening_balance,
            closing_balance,
            total_income,
            total_expenses,
            created_at
          FROM monthly_periods
          WHERE household_id = $1
          ORDER BY year DESC, month DESC
          LIMIT 15
        `
        : `
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

    // Tipado flexible de la fila devuelta por PG
    type PeriodRow = {
      id: unknown;
      year: unknown;
      month: unknown;
      opening_balance: unknown;
      closing_balance: unknown;
      total_income: unknown;
      total_expenses: unknown;
      created_at: unknown;
      phase?: unknown;
      status?: unknown;
    };

    const periods = periodsRes.rows.map((r) => {
      const row = r as PeriodRow;
      const phaseValue: string = hasPhase
        ? (row.phase as string | null | undefined) ?? 'preparing'
        : legacyStatusToPhase(row.status as string | null | undefined);
      return {
        id: String(row.id),
        year: Number(row.year),
        month: Number(row.month),
        phase: phaseValue ?? 'unknown',
        openingBalance: toNumber(row.opening_balance as number | string | null | undefined),
        closingBalance: toNumber(row.closing_balance as number | string | null | undefined),
        isCurrent: (phaseValue === 'active') || (Number(row.year) === currentYear && Number(row.month) === currentMonth),
        // Extras para currentPeriod (no usados por el listado, pero útiles luego)
        totalIncome: toNumber(row.total_income as number | string | null | undefined),
        totalExpenses: toNumber(row.total_expenses as number | string | null | undefined),
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
      periods: periods.map(({ totalIncome: _totalIncome, totalExpenses: _totalExpenses, ...rest }) => rest),
      currentPeriod,
    });
  } catch (error) {
    console.error('[API /api/sickness/household/set-active] Error:', error);
    return NextResponse.json({ error: 'Error al cambiar de hogar' }, { status: 500 });
  }
}
