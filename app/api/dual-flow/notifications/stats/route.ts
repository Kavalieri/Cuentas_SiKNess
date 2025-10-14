import { getUserHouseholdId } from '@/lib/auth';
import { query } from '@/lib/db';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * API para obtener estadísticas del hogar para notificaciones en vivo
 * GET /api/dual-flow/notifications/stats
 */
export async function GET(_request: NextRequest) {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return NextResponse.json(
        { ok: false, message: 'No tienes un hogar activo' },
        { status: 400 },
      );
    }

    const metadataResult = await query<{
      has_household_member_status: boolean;
      has_monthly_period_is_current: boolean;
    }>(
      `
        SELECT
          EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'household_members'
              AND column_name = 'status'
          ) AS has_household_member_status,
          EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'monthly_periods'
              AND column_name = 'is_current'
          ) AS has_monthly_period_is_current
      `,
    );

    const hasMemberStatusColumn = Boolean(metadataResult.rows?.[0]?.has_household_member_status);
    const hasMonthlyPeriodIsCurrentColumn = Boolean(
      metadataResult.rows?.[0]?.has_monthly_period_is_current,
    );

    const membersQuery = await query(
      hasMemberStatusColumn
        ? `
            SELECT COUNT(*)::int AS active_members
            FROM household_members
            WHERE household_id = $1 AND status = 'active'
          `
        : `
            SELECT COUNT(*)::int AS active_members
            FROM household_members
            WHERE household_id = $1
          `,
      [householdId],
    );

    // Obtener última actividad (última transacción)
    const lastActivityQuery = await query(
      `SELECT MAX(occurred_at) as last_activity
       FROM transactions
       WHERE household_id = $1`,
      [householdId],
    );

    // Obtener transacciones recientes (últimas 24h)
    const recentTransactionsQuery = await query(
      `SELECT COUNT(*) as recent_count
       FROM transactions
       WHERE household_id = $1 AND occurred_at >= NOW() - INTERVAL '24 hours'`,
      [householdId],
    );

    // Obtener balance del período actual
    const currentPeriodQuery = await query(
      hasMonthlyPeriodIsCurrentColumn
        ? `
            SELECT closing_balance, status
            FROM monthly_periods
            WHERE household_id = $1 AND is_current = true
            ORDER BY year DESC, month DESC
            LIMIT 1
          `
        : `
            SELECT closing_balance, status
            FROM monthly_periods
            WHERE household_id = $1
            ORDER BY year DESC, month DESC
            LIMIT 1
          `,
      [householdId],
    );

    const activeMembers = parseInt(membersQuery.rows[0]?.active_members ?? '0', 10);
    const lastActivity = lastActivityQuery.rows[0]?.last_activity;
    const recentTransactions = parseInt(recentTransactionsQuery.rows[0]?.recent_count || '0');
    const currentPeriod = currentPeriodQuery.rows[0];

    // Calcular tiempo desde última actividad
    let lastActivityText = 'Nunca';
    if (lastActivity) {
      const now = new Date();
      const lastActivityDate = new Date(lastActivity);
      const diffHours = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60));

      if (diffHours < 1) {
        lastActivityText = 'Hace menos de 1h';
      } else if (diffHours < 24) {
        lastActivityText = `Hace ${diffHours}h`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        lastActivityText = `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        activeMembers,
        lastActivity: lastActivityText,
        recentTransactions,
        currentPeriodBalance: currentPeriod?.closing_balance || 0,
        currentPeriodStatus: currentPeriod?.status || 'active',
        systemHealth: '100%', // Siempre operativo por ahora
      },
    });
  } catch (error) {
    console.error('Error in notifications/stats API:', error);
    return NextResponse.json({ ok: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}
