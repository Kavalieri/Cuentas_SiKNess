/**
 * Helper temporal para transición "objetivo" → "presupuesto"
 *
 * Durante la migración (v3.0.1 - v3.1.0), el código debe leer de ambas columnas:
 * - Primero intenta leer monthly_budget (nuevo)
 * - Si no existe, fallback a monthly_contribution_goal (viejo)
 *
 * Este archivo será eliminado en v3.2.0 una vez completada la transición.
 *
 * Issue: #25
 * Fecha: 2025-11-06
 */

import type { Numeric } from '@/types/database.generated';

/**
 * Lee el presupuesto mensual con fallback automático a columna legacy
 *
 * @param row - Fila de household_settings con ambas columnas
 * @returns Presupuesto como number (0 si no hay valor)
 *
 * @example
 * ```typescript
 * const row = await query('SELECT monthly_budget, monthly_contribution_goal FROM household_settings WHERE household_id = $1', [id]);
 * const budget = getMonthlyBudget(row.rows[0]);
 * ```
 */
export function getMonthlyBudget(
  row: {
    monthly_budget?: Numeric | null;
    monthly_contribution_goal?: Numeric | null;
  }
): number {
  // Priorizar nueva columna
  if (row.monthly_budget !== undefined && row.monthly_budget !== null) {
    return typeof row.monthly_budget === 'number'
      ? row.monthly_budget
      : parseFloat(String(row.monthly_budget));
  }

  // Fallback a columna vieja
  if (row.monthly_contribution_goal !== undefined && row.monthly_contribution_goal !== null) {
    return typeof row.monthly_contribution_goal === 'number'
      ? row.monthly_contribution_goal
      : parseFloat(String(row.monthly_contribution_goal));
  }

  return 0;
}

/**
 * Lee el snapshot de presupuesto con fallback automático a columna legacy
 *
 * @param row - Fila de monthly_periods con ambas columnas
 * @returns Snapshot como number o null si período en preparing
 *
 * @example
 * ```typescript
 * const row = await query('SELECT snapshot_budget, snapshot_contribution_goal FROM monthly_periods WHERE id = $1', [id]);
 * const snapshotBudget = getSnapshotBudget(row.rows[0]);
 * // null = período en preparing (usa valor actual de household_settings)
 * // number = período bloqueado (usa este valor histórico)
 * ```
 */
export function getSnapshotBudget(
  row: {
    snapshot_budget?: Numeric | null;
    snapshot_contribution_goal?: Numeric | null;
  }
): number | null {
  // Priorizar nueva columna
  if (row.snapshot_budget !== undefined && row.snapshot_budget !== null) {
    return typeof row.snapshot_budget === 'number'
      ? row.snapshot_budget
      : parseFloat(String(row.snapshot_budget));
  }

  // Fallback a columna vieja
  if (row.snapshot_contribution_goal !== undefined && row.snapshot_contribution_goal !== null) {
    return typeof row.snapshot_contribution_goal === 'number'
      ? row.snapshot_contribution_goal
      : parseFloat(String(row.snapshot_contribution_goal));
  }

  return null;
}

/**
 * Escribe presupuesto mensual en AMBAS columnas (durante transición)
 *
 * Uso en queries de UPDATE/INSERT para mantener compatibilidad backwards.
 *
 * @param paramIndex - Índice del parámetro en la query ($1, $2, etc.)
 * @returns Fragment SQL para SET clause
 *
 * @example
 * ```typescript
 * const query = `
 *   UPDATE household_settings
 *   SET ${getWriteBudgetQuery(1)},
 *       updated_at = NOW()
 *   WHERE household_id = $2
 * `;
 * await pool.query(query, [1500.00, householdId]);
 * ```
 */
export function getWriteBudgetQuery(paramIndex: number = 1): string {
  return `monthly_budget = $${paramIndex}, monthly_contribution_goal = $${paramIndex}`;
}

/**
 * Escribe snapshot en AMBAS columnas (durante transición)
 *
 * Uso al bloquear períodos para mantener compatibilidad backwards.
 *
 * @param paramIndex - Índice del parámetro en la query ($1, $2, etc.)
 * @returns Fragment SQL para SET clause
 *
 * @example
 * ```typescript
 * const query = `
 *   UPDATE monthly_periods
 *   SET ${getWriteSnapshotQuery(1)},
 *       phase = 'active',
 *       locked_at = NOW()
 *   WHERE id = $2
 * `;
 * await pool.query(query, [1500.00, periodId]);
 * ```
 */
export function getWriteSnapshotQuery(paramIndex: number = 1): string {
  return `snapshot_budget = $${paramIndex}, snapshot_contribution_goal = $${paramIndex}`;
}

/**
 * Query SQL que lee AMBAS columnas con COALESCE automático
 *
 * Uso en SELECT queries para obtener presupuesto con fallback.
 *
 * @param tableAlias - Alias de la tabla household_settings (ej: 'hs')
 * @returns Fragment SQL para SELECT clause
 *
 * @example
 * ```typescript
 * const query = `
 *   SELECT
 *     ${getReadBudgetQuery('hs')} as monthly_budget,
 *     hs.household_id
 *   FROM household_settings hs
 *   WHERE hs.household_id = $1
 * `;
 * ```
 */
export function getReadBudgetQuery(tableAlias: string = 'hs'): string {
  return `COALESCE(${tableAlias}.monthly_budget, ${tableAlias}.monthly_contribution_goal, 0)`;
}

/**
 * Query SQL que lee AMBAS columnas de snapshot con COALESCE automático
 *
 * Uso en SELECT queries para obtener snapshot de presupuesto con fallback.
 *
 * @param tableAlias - Alias de la tabla monthly_periods (ej: 'mp')
 * @returns Fragment SQL para SELECT clause
 *
 * @example
 * ```typescript
 * const query = `
 *   SELECT
 *     ${getReadSnapshotQuery('mp')} as snapshot_budget,
 *     mp.id
 *   FROM monthly_periods mp
 *   WHERE mp.id = $1
 * `;
 * ```
 */
export function getReadSnapshotQuery(tableAlias: string = 'mp'): string {
  return `COALESCE(${tableAlias}.snapshot_budget, ${tableAlias}.snapshot_contribution_goal)`;
}
