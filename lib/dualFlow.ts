/**
 * Dual-Flow Database Operations
 * Conexión completa con las nuevas tablas PostgreSQL dual-flow
 */

import { query } from '@/lib/supabaseServer';
import type {
  DualFlowBalance,
  DualFlowConfig,
  DualFlowMetrics,
  DualFlowStats,
  DualFlowTransaction,
  DualFlowWorkflow,
  PairingCandidate,
} from '@/types/dualFlow';

// ============================================================================
// OPERACIONES CRUD PARA DUAL_FLOW_TRANSACTIONS
// ============================================================================

/**
 * Crear nueva transacción dual-flow
 */
export async function createDualFlowTransaction(
  transaction: Omit<DualFlowTransaction, 'id' | 'created_at' | 'updated_at'>,
): Promise<DualFlowTransaction> {
  const result = await query(
    `
    INSERT INTO dual_flow_transactions (
      household_id, concepto, categoria, importe, fecha,
      tipo, estado, tipo_flujo, creado_por, pagado_por,
      requiere_aprobacion, umbral_emparejamiento, dias_revision
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `,
    [
      transaction.household_id,
      transaction.concepto,
      transaction.categoria,
      transaction.importe,
      transaction.fecha,
      transaction.tipo,
      transaction.estado,
      transaction.tipo_flujo,
      transaction.creado_por,
      transaction.pagado_por,
      transaction.requiere_aprobacion,
      transaction.umbral_emparejamiento,
      transaction.dias_revision,
    ],
  );

  return result.rows[0] as DualFlowTransaction;
}

/**
 * Obtener transacciones dual-flow por hogar
 */
export async function getDualFlowTransactions(
  householdId: string,
  limit: number = 50,
  estado?: string,
): Promise<DualFlowTransaction[]> {
  let whereClause = 'WHERE household_id = $1';
  const params: (string | number)[] = [householdId];

  if (estado) {
    whereClause += ' AND estado = $2';
    params.push(estado);
  }

  const result = await query(
    `
    SELECT * FROM dual_flow_transactions
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${params.length + 1}
  `,
    [...params, limit],
  );

  return result.rows as DualFlowTransaction[];
}

/**
 * Obtener transacción dual-flow por ID con información de workflow
 */
export async function getDualFlowTransactionWithWorkflow(
  transactionId: string,
): Promise<DualFlowWorkflow> {
  const result = await query(
    `
    SELECT * FROM v_dual_flow_workflow
    WHERE id = $1
  `,
    [transactionId],
  );

  return result.rows[0] as DualFlowWorkflow;
}

/**
 * Aprobar transacción (dispara auto-pairing automático vía trigger)
 */
export async function approveDualFlowTransaction(
  transactionId: string,
  approvedBy: string,
): Promise<DualFlowTransaction> {
  const result = await query(
    `
    UPDATE dual_flow_transactions
    SET
      estado = 'approved',
      approved_at = NOW(),
      approved_by = $2,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `,
    [transactionId, approvedBy],
  );

  return result.rows[0] as any;
}

/**
 * Rechazar transacción
 */
export async function rejectDualFlowTransaction(
  transactionId: string,
  approvedBy: string,
): Promise<DualFlowTransaction> {
  const result = await query(
    `
    UPDATE dual_flow_transactions
    SET
      estado = 'rejected',
      approved_at = NOW(),
      approved_by = $2,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `,
    [transactionId, approvedBy],
  );

  return result.rows[0] as any;
}

// ============================================================================
// AUTO-PAIRING Y STORED PROCEDURES
// ============================================================================

/**
 * Buscar candidatos para emparejamiento usando stored procedure
 */
export async function findPairingCandidates(
  householdId: string,
  transactionId: string,
  umbral: number = 5.0,
): Promise<PairingCandidate[]> {
  const result = await query(
    `
    SELECT * FROM find_pairing_candidates($1, $2, $3)
  `,
    [householdId, transactionId, umbral],
  );

  return result.rows as any[];
}

/**
 * Ejecutar emparejamiento manual entre dos transacciones
 */
export async function executeManualPairing(
  transactionId: string,
  candidateId: string,
): Promise<boolean> {
  const result = await query(
    `
    SELECT execute_auto_pairing($1, $2) as success
  `,
    [transactionId, candidateId],
  );

  return result.rows[0]?.success || false;
}

/**
 * Deshacer emparejamiento
 */
export async function unpairTransactions(transactionId: string): Promise<void> {
  await query(
    `
    UPDATE dual_flow_transactions
    SET
      transaccion_pareja = NULL,
      auto_paired = false,
      estado = 'approved',
      updated_at = NOW()
    WHERE id = $1 OR transaccion_pareja = $1
  `,
    [transactionId],
  );
}

// ============================================================================
// VISTAS Y BALANCE DUAL-FLOW
// ============================================================================

/**
 * Obtener balance dual-flow por hogar usando vista optimizada
 */
export async function getDualFlowBalance(householdId: string): Promise<DualFlowBalance | null> {
  const result = await query(
    `
    SELECT * FROM v_dual_flow_balance
    WHERE household_id = $1
  `,
    [householdId],
  );

  return (result.rows[0] as any) || null;
}

/**
 * Obtener workflow completo con información extendida
 */
export async function getDualFlowWorkflow(
  householdId: string,
  limit: number = 20,
): Promise<DualFlowWorkflow[]> {
  const result = await query(
    `
    SELECT * FROM v_dual_flow_workflow
    WHERE household_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `,
    [householdId, limit],
  );

  return result.rows as any[];
}

/**
 * Obtener métricas del sistema dual-flow
 */
export async function getDualFlowMetrics(): Promise<DualFlowMetrics> {
  const result = await query(`
    SELECT * FROM v_dual_flow_metrics
  `);

  return result.rows[0] as any;
}

// ============================================================================
// CONFIGURACIÓN DUAL-FLOW POR HOGAR
// ============================================================================

/**
 * Obtener configuración dual-flow del hogar
 */
export async function getDualFlowConfig(householdId: string): Promise<DualFlowConfig | null> {
  const result = await query(
    `
    SELECT * FROM dual_flow_config
    WHERE household_id = $1
  `,
    [householdId],
  );

  return (result.rows[0] as any) || null;
}

/**
 * Crear o actualizar configuración dual-flow
 */
export async function upsertDualFlowConfig(
  householdId: string,
  config: Partial<DualFlowConfig>,
): Promise<DualFlowConfig> {
  const result = await query(
    `
    INSERT INTO dual_flow_config (
      household_id,
      emparejamiento_automatico,
      umbral_emparejamiento_default,
      tiempo_revision_default,
      limite_gasto_personal,
      requiere_aprobacion_default,
      liquidacion_automatica,
      dias_liquidacion,
      notificaciones_activas,
      notificar_nuevos_gastos,
      notificar_emparejamientos,
      notificar_limites,
      notificar_liquidaciones
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (household_id)
    DO UPDATE SET
      emparejamiento_automatico = EXCLUDED.emparejamiento_automatico,
      umbral_emparejamiento_default = EXCLUDED.umbral_emparejamiento_default,
      tiempo_revision_default = EXCLUDED.tiempo_revision_default,
      limite_gasto_personal = EXCLUDED.limite_gasto_personal,
      requiere_aprobacion_default = EXCLUDED.requiere_aprobacion_default,
      liquidacion_automatica = EXCLUDED.liquidacion_automatica,
      dias_liquidacion = EXCLUDED.dias_liquidacion,
      notificaciones_activas = EXCLUDED.notificaciones_activas,
      notificar_nuevos_gastos = EXCLUDED.notificar_nuevos_gastos,
      notificar_emparejamientos = EXCLUDED.notificar_emparejamientos,
      notificar_limites = EXCLUDED.notificar_limites,
      notificar_liquidaciones = EXCLUDED.notificar_liquidaciones,
      updated_at = NOW()
    RETURNING *
  `,
    [
      householdId,
      config.emparejamiento_automatico ?? true,
      config.umbral_emparejamiento_default ?? 5.0,
      config.tiempo_revision_default ?? 7,
      config.limite_gasto_personal ?? 200.0,
      config.requiere_aprobacion_default ?? false,
      config.liquidacion_automatica ?? true,
      config.dias_liquidacion ?? 30,
      config.notificaciones_activas ?? true,
      config.notificar_nuevos_gastos ?? true,
      config.notificar_emparejamientos ?? true,
      config.notificar_limites ?? true,
      config.notificar_liquidaciones ?? false,
    ],
  );

  return result.rows[0] as any;
}

// ============================================================================
// FUNCIONES DE UTILIDAD Y VALIDACIÓN
// ============================================================================

/**
 * Validar si una transacción puede ser emparejada
 */
export async function canBePaired(transactionId: string): Promise<boolean> {
  const result = await query(
    `
    SELECT COUNT(*) as count
    FROM dual_flow_transactions
    WHERE id = $1
      AND transaccion_pareja IS NULL
      AND auto_paired = false
      AND estado IN ('approved', 'pending_review')
      AND tipo IN ('gasto_directo', 'ingreso_directo')
  `,
    [transactionId],
  );

  return parseInt(result.rows[0]?.count || '0') > 0;
}

/**
 * Obtener estadísticas de emparejamiento del hogar
 */
export async function getPairingStats(householdId: string): Promise<DualFlowStats> {
  const result = await query(
    `
    SELECT
      COUNT(*) as total_transacciones,
      COUNT(*) FILTER (WHERE auto_paired = true) as auto_emparejadas,
      COUNT(*) FILTER (WHERE estado = 'pending_review') as pendientes,
      COUNT(*) FILTER (WHERE tipo IN ('gasto_directo', 'ingreso_directo')) as candidatas_pairing,
      ROUND(
        COUNT(*) FILTER (WHERE auto_paired = true)::decimal /
        NULLIF(COUNT(*) FILTER (WHERE tipo IN ('gasto_directo', 'ingreso_directo')), 0) * 100,
        2
      ) as porcentaje_pairing
    FROM dual_flow_transactions
    WHERE household_id = $1
      AND fecha >= CURRENT_DATE - INTERVAL '90 days'
  `,
    [householdId],
  );

  return result.rows[0] as any;
}

/**
 * Buscar transacciones pendientes de revisión
 */
export async function getPendingReviewTransactions(
  householdId: string,
): Promise<DualFlowTransaction[]> {
  const result = await query(
    `
    SELECT * FROM dual_flow_transactions
    WHERE household_id = $1
      AND estado = 'pending_review'
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY created_at ASC
  `,
    [householdId],
  );

  return result.rows as any[];
}
