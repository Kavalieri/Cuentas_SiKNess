/**
 * Queries para sistema de Balance Global (Créditos/Deudas)
 *
 * Este sistema es INDEPENDIENTE de las contribuciones mensuales.
 * - member_balances: Balance global acumulado (créditos/deudas persistentes)
 * - contributions: Contribuciones mensuales por período (página /periodo)
 *
 * El balance global se actualiza mediante:
 * - Préstamos personales entre miembros
 * - Devoluciones de préstamos
 * - Ajustes manuales por el owner
 */

import { query } from '@/lib/db';

export interface MemberBalance {
  profile_id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  role: 'owner' | 'member';
  current_balance: number;
  last_updated_at: string;
}

/**
 * Obtiene balances globales de todos los miembros del hogar
 *
 * @param householdId - ID del hogar
 * @returns Array de balances por miembro
 */
/**
 * Query para obtener balance global de cada miembro
 *
 * IMPORTANTE: El balance global se calcula como la SUMA de:
 * (overpaid_amount - pending_amount) de TODOS los períodos CERRADOS o ACTIVOS
 *
 * Esto representa el crédito/deuda acumulado real de cada miembro.
 */
export async function getMemberBalances(householdId: string) {
  // Obtener lista de miembros
  const membersResult = await query<{
    profile_id: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
    role: string;
  }>(
    `
      SELECT
        hm.profile_id,
        p.display_name,
        p.email,
        p.avatar_url,
        hm.role
      FROM household_members hm
      JOIN profiles p ON p.id = hm.profile_id
      WHERE hm.household_id = $1
      ORDER BY p.email
    `,
    [householdId],
  );

  const members = membersResult.rows;
  if (members.length === 0) return [];

  // Obtener todos los períodos cerrados o activos
  const periodsResult = await query<{
    id: string;
    year: number;
    month: number;
    phase: string | null;
  }>(
    `
      SELECT id, year, month, phase
      FROM monthly_periods
      WHERE household_id = $1
        AND phase IN ('active', 'closing', 'closed')
      ORDER BY year, month
    `,
    [householdId],
  );

  const periods = periodsResult.rows;

  // Balance INDIVIDUAL de cada miembro con el hogar
  // Balance = SUM(overpaid - pending) de todos los períodos
  // - overpaid > 0 → Miembro tiene crédito a favor (pagó de más)
  // - pending > 0 → Miembro tiene deuda con el hogar (falta pagar)
  const balances = new Map<string, number>();

  for (const period of periods) {
    const { getContributionsData } = await import('@/lib/contributions/getContributionsData');
    const data = await getContributionsData(householdId, {
      year: period.year,
      month: period.month,
    });

    // Acumular balance individual de cada miembro
    for (const contrib of data.contributions) {
      const current = balances.get(contrib.profile_id) ?? 0;
      const periodBalance = contrib.overpaid_amount - contrib.pending_amount;
      balances.set(contrib.profile_id, current + periodBalance);
    }
  }

  // Obtener última fecha de transacción por miembro
  const lastTransactionRes = await query<{ profile_id: string; last_transaction: string }>(
    `
      SELECT performed_by_profile_id as profile_id, MAX(occurred_at) as last_transaction
      FROM transactions
      WHERE household_id = $1
      GROUP BY performed_by_profile_id
    `,
    [householdId],
  );
  const lastTransactionMap = new Map(
    lastTransactionRes.rows.map((r) => [r.profile_id, r.last_transaction]),
  );

  // Ensamblar respuesta con balance acumulado
  return members.map((m) => ({
    profile_id: m.profile_id,
    display_name: m.display_name ?? m.email,
    email: m.email,
    avatar_url: m.avatar_url,
    role: (m.role === 'owner' ? 'owner' : 'member') as 'owner' | 'member',
    current_balance: balances.get(m.profile_id) ?? 0,
    last_updated_at: lastTransactionMap.get(m.profile_id) || new Date().toISOString(),
  }));
}

/**
 * Calcula el total de balance del hogar (suma de todos los balances)
 *
 * Regla: La suma total SIEMPRE debe ser 0 (balance cerrado)
 * - Si Kava tiene +10€, alguien más debe tener -10€
 *
 * @param balances - Array de balances de miembros
 * @returns Total (debería ser 0 en sistema balanceado)
 */
export function calculateHouseholdTotal(balances: MemberBalance[]): number {
  return balances.reduce((sum, member) => sum + member.current_balance, 0);
}

/**
 * Calcula estadísticas del hogar
 *
 * @param balances - Array de balances de miembros
 */
export function calculateHouseholdStats(balances: MemberBalance[]) {
  const EPSILON = 0.01; // Tolerancia para redondeo (±1 céntimo)
  
  const totalCredit = balances
    .filter((m) => m.current_balance > EPSILON)
    .reduce((sum, m) => sum + m.current_balance, 0);

  const totalDebt = Math.abs(
    balances.filter((m) => m.current_balance < -EPSILON).reduce((sum, m) => sum + m.current_balance, 0),
  );

  return {
    total_credit: totalCredit,
    total_debt: totalDebt,
    balance_difference: Math.abs(totalCredit - totalDebt),
    members_with_credit: balances.filter((m) => m.current_balance > EPSILON).length,
    members_with_debt: balances.filter((m) => m.current_balance < -EPSILON).length,
    members_settled: balances.filter((m) => Math.abs(m.current_balance) <= EPSILON).length,
  };
}
