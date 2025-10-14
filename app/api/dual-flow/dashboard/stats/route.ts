import { getUserHouseholdId } from '@/lib/auth';
import { query } from '@/lib/db';
import { formatPeriodMonth, getCurrentMonth, getMonthDateRange } from '@/lib/periods';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
    }

    const currentPeriodResult = await query(
      `
        SELECT id, year, month, status, total_income, total_expenses, closing_balance
        FROM monthly_periods
        WHERE household_id = $1
        ORDER BY year DESC, month DESC
        LIMIT 1
      `,
      [householdId],
    );

    const currentMonthInfo = getCurrentMonth();
    const periodRow = currentPeriodResult.rows[0];

    const periodYear = periodRow?.year ?? currentMonthInfo.year;
    const periodMonth = periodRow?.month ?? currentMonthInfo.month;
    const { start, end } = getMonthDateRange(periodYear, periodMonth);

    const startDate = new Date(`${start}T00:00:00Z`);
    const endDate = new Date(`${end}T23:59:59Z`);

    const normalizeStatus = (status: string | null | undefined): string => {
      if (!status) return 'open';
      const value = status.toLowerCase();
      if (value === 'active') return 'open';
      if (['open', 'pending_close', 'closed'].includes(value)) {
        return value;
      }
      return 'open';
    };

    // Estadísticas de miembros (por ahora todos los miembros se consideran activos)
    const membersResult = await query(
      `
        SELECT COUNT(*) AS total
        FROM household_members
        WHERE household_id = $1
      `,
      [householdId],
    );

    const totalMembers = Number(membersResult.rows[0]?.total ?? 0);

    // Totales del período actual + conteo de transacciones
    const totalsResult = await query(
      `
        SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS balance,
          COUNT(*) AS transaction_count
        FROM transactions
        WHERE household_id = $1
          AND occurred_at BETWEEN $2::date AND $3::date
      `,
      [householdId, start, end],
    );

    const totalsRow = totalsResult.rows[0] ?? {
      income: 0,
      expenses: 0,
      balance: 0,
      transaction_count: 0,
    };

    // Promedios
    const millisecondsInDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / millisecondsInDay) + 1,
    );
    const averages = {
      perMember: totalMembers > 0 ? Number(totalsRow.balance) / totalMembers : 0,
      perDay: totalDays > 0 ? Number(totalsRow.balance) / totalDays : 0,
    };

    // Estado de contribuciones (utiliza year/month porque no hay period_id en la tabla actual)
    const contributionsResult = await query(
      `
        SELECT
          COUNT(*) FILTER (WHERE status IN ('paid', 'settled', 'completed')) AS completed,
          COUNT(*) FILTER (WHERE status IN ('pending', 'due', 'draft')) AS pending
        FROM contributions
        WHERE household_id = $1
          AND year = $2
          AND month = $3
      `,
      [householdId, periodYear, periodMonth],
    );

    const contributionsRow = contributionsResult.rows[0] ?? { completed: 0, pending: 0 };

    // Estado de créditos
    const creditsResult = await query(
      `
        SELECT
          COALESCE(SUM(CASE WHEN status IN ('available', 'reserved', 'active') THEN amount ELSE 0 END), 0) AS available,
          COALESCE(SUM(CASE WHEN status IN ('used', 'applied', 'transferred') THEN amount ELSE 0 END), 0) AS used
        FROM member_credits
        WHERE household_id = $1
      `,
      [householdId],
    );

    const creditsRow = creditsResult.rows[0] ?? { available: 0, used: 0 };

    // Estado de ahorros
    const savingsResult = await query(
      `
        SELECT current_balance, goal_amount, currency
        FROM household_savings
        WHERE household_id = $1
        LIMIT 1
      `,
      [householdId],
    );

    const savingsRow = savingsResult.rows[0];

    const periodProgress = (() => {
      const now = new Date();
      if (now <= startDate) return 0;
      if (now >= endDate) return 100;
      const elapsed = now.getTime() - startDate.getTime();
      const total = endDate.getTime() - startDate.getTime();
      return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
    })();

    const stats = {
      members: {
        active: totalMembers,
        total: totalMembers,
      },
      period: {
        id: periodRow?.id ?? null,
        label: formatPeriodMonth(periodYear, periodMonth),
        year: periodYear,
        month: periodMonth,
        startDate: start,
        endDate: end,
        status: normalizeStatus(periodRow?.status),
        rawStatus: periodRow?.status ?? 'active',
        progress: periodProgress,
        closingBalance: Number(periodRow?.closing_balance ?? 0),
      },
      totals: {
        income: Number(totalsRow.income ?? 0),
        expenses: Number(totalsRow.expenses ?? 0),
        balance: Number(totalsRow.balance ?? 0),
        transactionCount: Number(totalsRow.transaction_count ?? 0),
        currency: savingsRow?.currency ?? 'EUR',
      },
      averages,
      contributions: {
        completed: Number(contributionsRow.completed ?? 0),
        pending: Number(contributionsRow.pending ?? 0),
      },
      credits: {
        available: Number(creditsRow.available ?? 0),
        used: Number(creditsRow.used ?? 0),
      },
      savings: {
        currentBalance: Number(savingsRow?.current_balance ?? 0),
        goalAmount: Number(savingsRow?.goal_amount ?? 0),
      },
      meta: {
        computedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
