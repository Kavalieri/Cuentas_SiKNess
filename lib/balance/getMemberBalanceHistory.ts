/**
 * Obtener Historial de Balance por Miembro
 *
 * Calcula el balance acumulado período por período para mostrar
 * cómo se generó el crédito/deuda actual.
 */

import { query } from '@/lib/db';
import { getUserHouseholdId } from '@/lib/auth';
import { getContributionsData } from '@/lib/contributions/getContributionsData';
import type { Result } from '@/lib/result';
import { ok, fail } from '@/lib/result';

/**
 * Entrada de historial por período
 */
export interface BalanceHistoryEntry {
  period: {
    id: string;
    year: number;
    month: number;
    phase: string;
    contribution_disabled: boolean;
  };
  contribution: {
    expected_amount: number;
    paid_amount: number;
    overpaid_amount: number;
    pending_amount: number;
    direct_expenses: number;
    common_contributions: number;
    status: string;
    calculation_method: string;
  };
  period_balance: number; // overpaid - pending
  running_balance: number; // acumulado hasta este período
}

export interface MemberBalanceHistory {
  member: {
    profile_id: string;
    display_name: string;
    email: string;
    avatar_url: string | null;
    role: 'owner' | 'member';
  };
  current_balance: number;
  history: BalanceHistoryEntry[];
}

/**
 * Obtener historial de balance de un miembro
 */
export async function getMemberBalanceHistory(
  profileId: string,
): Promise<Result<MemberBalanceHistory>> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No se pudo obtener el ID del hogar');
    }

    // 1. Obtener información del miembro
    const memberRes = await query<{
      profile_id: string;
      display_name: string;
      email: string;
      avatar_url: string | null;
      role: 'owner' | 'member';
    }>(
      `
        SELECT
          hm.profile_id,
          p.display_name,
          p.email,
          p.avatar_url,
          hm.role
        FROM household_members hm
        INNER JOIN profiles p ON p.id = hm.profile_id
        WHERE hm.household_id = $1 AND hm.profile_id = $2
      `,
      [householdId, profileId],
    );

    if (memberRes.rows.length === 0) {
      return fail('Miembro no encontrado');
    }

    const member = memberRes.rows[0]!; // Non-null assertion: verificado arriba

    // 2. Obtener todos los períodos (ordenados cronológicamente)
    const periodsRes = await query<{
      id: string;
      year: number;
      month: number;
      phase: string;
      contribution_disabled: boolean;
    }>(
      `
        SELECT id, year, month, phase, contribution_disabled
        FROM monthly_periods
        WHERE household_id = $1
        ORDER BY year ASC, month ASC
      `,
      [householdId],
    );

    // 3. Calcular balance período por período
    const history: BalanceHistoryEntry[] = [];
    let runningBalance = 0;

    for (const period of periodsRes.rows) {
      // Obtener contribuciones del período (incluye lógica contribution_disabled)
      const data = await getContributionsData(householdId, {
        year: period.year,
        month: period.month,
      });

      // Buscar contribución del miembro específico
      const contrib = data.contributions.find((c) => c.profile_id === profileId);

      if (!contrib) {
        // Miembro no existía en este período (puede pasar si se unió después)
        continue;
      }

      // Balance del período (puede ser positivo, negativo o 0)
      const periodBalance = contrib.overpaid_amount - contrib.pending_amount;
      runningBalance += periodBalance;

      history.push({
        period: {
          id: period.id,
          year: period.year,
          month: period.month,
          phase: period.phase,
          contribution_disabled: period.contribution_disabled,
        },
        contribution: {
          expected_amount: contrib.expected_amount,
          paid_amount: contrib.paid_amount,
          overpaid_amount: contrib.overpaid_amount,
          pending_amount: contrib.pending_amount,
          direct_expenses: contrib.direct_expenses,
          common_contributions: contrib.common_contributions,
          status: contrib.status,
          calculation_method: contrib.calculation_method,
        },
        period_balance: periodBalance,
        running_balance: runningBalance,
      });
    }

    return ok({
      member: {
        profile_id: member.profile_id,
        display_name: member.display_name,
        email: member.email,
        avatar_url: member.avatar_url,
        role: member.role,
      },
      current_balance: runningBalance,
      history,
    });
  } catch (error) {
    console.error('[getMemberBalanceHistory] Error:', error);
    return fail('Error al obtener el historial de balance');
  }
}
