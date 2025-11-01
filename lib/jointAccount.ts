import { query } from '@/lib/db';
import type { Result } from '@/lib/result';
import { fail, ok } from '@/lib/result';

/**
 * Nombre visual de la Cuenta Común del sistema.
 */
export const JOINT_ACCOUNT_DISPLAY_NAME = 'Cuenta Común' as const;

/**
 * Obtiene el UUID de la Cuenta Común de un hogar.
 *
 * Cada hogar tiene exactamente una Cuenta Común (virtual member).
 * Este UUID se usa en transactions.paid_by para gastos comunes.
 *
 * @param householdId - UUID del hogar
 * @returns Result con UUID de la Cuenta Común o error
 *
 * @example
 * ```typescript
 * const result = await getJointAccountId(householdId);
 * if (result.ok) {
 *   const jointAccountUuid = result.data;
 *   // Usar en paid_by para gastos comunes
 * }
 * ```
 */
export async function getJointAccountId(householdId: string): Promise<Result<string>> {
  try {
    const result = await query<{ id: string }>(
      `SELECT id FROM joint_accounts WHERE household_id = $1`,
      [householdId]
    );

    if (result.rows.length === 0) {
      return fail('Cuenta Común no encontrada para este hogar');
    }

    return ok(result.rows[0]!.id);
  } catch (error) {
    console.error('Error obteniendo Cuenta Común:', error);
    return fail('Error al obtener Cuenta Común');
  }
}

/**
 * Verifica si un UUID corresponde a una Cuenta Común.
 *
 * Útil para lógica de display (mostrar "Cuenta Común" vs nombre de miembro).
 *
 * @param uuid - UUID a verificar
 * @returns true si el UUID es de una Cuenta Común, false en caso contrario
 *
 * @example
 * ```typescript
 * if (await isJointAccountId(transaction.paid_by)) {
 *   console.log('Gastado por: Cuenta Común');
 * } else {
 *   console.log('Gastado por:', memberName);
 * }
 * ```
 */
export async function isJointAccountId(uuid: string): Promise<boolean> {
  try {
    const result = await query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM joint_accounts WHERE id = $1) as exists`,
      [uuid]
    );
    return result.rows[0]?.exists ?? false;
  } catch {
    return false;
  }
}

/**
 * Obtiene información completa de la Cuenta Común de un hogar.
 *
 * @param householdId - UUID del hogar
 * @returns Result con datos de la Cuenta Común
 */
export async function getJointAccountInfo(householdId: string): Promise<Result<{
  id: string;
  household_id: string;
  display_name: string;
  created_at: string;
}>> {
  try {
    const result = await query<{
      id: string;
      household_id: string;
      display_name: string;
      created_at: string;
    }>(
      `SELECT id, household_id, display_name, created_at
       FROM joint_accounts
       WHERE household_id = $1`,
      [householdId]
    );

    if (result.rows.length === 0) {
      return fail('Cuenta Común no encontrada para este hogar');
    }

    return ok(result.rows[0]!);
  } catch (error) {
    console.error('Error obteniendo info de Cuenta Común:', error);
    return fail('Error al obtener información de Cuenta Común');
  }
}
