'use server';

import { getUserHouseholdId, isHouseholdOwner } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * Obtiene el contador de solicitudes de préstamo pendientes
 * Solo retorna valor > 0 si el usuario es owner del hogar
 *
 * @returns Número de solicitudes pendientes o 0
 */
export async function getPendingLoansCount(): Promise<number> {
  try {
    // Solo mostrar contador si es owner
    const isOwner = await isHouseholdOwner();
    if (!isOwner) return 0;

    const householdId = await getUserHouseholdId();
    if (!householdId) return 0;

    const result = await query<{ count: string }>(
      `
      SELECT COUNT(*) as count
      FROM loan_requests
      WHERE household_id = $1
        AND status = 'pending'
    `,
      [householdId],
    );

    return parseInt(result.rows[0]?.count || '0', 10);
  } catch (error) {
    console.error('Error al obtener contador de préstamos pendientes:', error);
    return 0;
  }
}
