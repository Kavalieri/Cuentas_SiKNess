import { query } from '@/lib/pgServer';
import type {
    DualFlowBalance,
    DualFlowConfig,
    DualFlowMetrics,
    DualFlowStats,
    DualFlowTransaction,
    DualFlowWorkflow,
    PairingCandidate,
    TransactionTypeDualFlow,
} from '@/types/dualFlow';

const DEFAULT_CURRENCY = 'EUR';
const DEFAULT_REVIEW_DAYS = 7;
const DEFAULT_PAIRING_THRESHOLD = 5;

const DUAL_FLOW_BASE_SELECT = `
  SELECT
    t.id,
    t.household_id,
    COALESCE(NULLIF(t.description, ''), cat.name, 'Movimiento sin descripción') AS concepto,
    COALESCE(cat.name, 'Sin categoría') AS categoria,
    t.amount AS importe,
    t.occurred_at::date AS fecha,
    CASE
      WHEN t.type = 'expense_direct' THEN 'gasto_directo'::transaction_type_dual_flow
      WHEN t.type = 'income_direct' THEN 'ingreso_directo'::transaction_type_dual_flow
      WHEN t.type = 'expense' THEN 'gasto'::transaction_type_dual_flow
      ELSE 'ingreso'::transaction_type_dual_flow
    END AS tipo,
    t.dual_flow_status AS estado,
    CASE
      WHEN t.flow_type = 'direct' AND t.type LIKE 'expense%' THEN 'personal_to_common'::dual_flow_type
      WHEN t.flow_type = 'direct' AND t.type LIKE 'income%' THEN 'common_to_personal'::dual_flow_type
      ELSE 'common_fund'::dual_flow_type
    END AS tipo_flujo,
    t.created_by_profile_id AS creado_por,
    COALESCE(t.real_payer_id, t.paid_by) AS pagado_por,
    t.transaction_pair_id AS transaccion_pareja,
    t.auto_paired,
    t.requires_approval AS requiere_aprobacion,
    COALESCE(t.pairing_threshold, 5.00::numeric(5,2)) AS umbral_emparejamiento,
    COALESCE(t.review_days, 7) AS dias_revision,
    t.created_at,
    t.updated_at,
    t.approved_at,
    t.approved_by
  FROM transactions t
  LEFT JOIN categories cat ON cat.id = t.category_id
`;

type LedgerMapping = {
  ledgerType: 'income' | 'expense' | 'income_direct' | 'expense_direct';
  flowType: 'common' | 'direct';
  categoryType: 'income' | 'expense';
};

function mapTransactionType(tipo: TransactionTypeDualFlow): LedgerMapping {
  switch (tipo) {
    case 'gasto_directo':
      return { ledgerType: 'expense_direct', flowType: 'direct', categoryType: 'expense' };
    case 'ingreso_directo':
      return { ledgerType: 'income_direct', flowType: 'direct', categoryType: 'income' };
    case 'ingreso':
      return { ledgerType: 'income', flowType: 'common', categoryType: 'income' };
    case 'gasto':
    default:
      return { ledgerType: 'expense', flowType: 'common', categoryType: 'expense' };
  }
}

async function getHouseholdCurrency(householdId: string): Promise<string> {
  const result = await query<{ currency: string | null }>(
    `
			SELECT currency
			FROM household_settings
			WHERE household_id = $1
			LIMIT 1
		`,
    [householdId],
  );

  const currency = result.rows?.[0]?.currency;
  return currency && currency.trim().length > 0 ? currency : DEFAULT_CURRENCY;
}

async function ensureCategoryId(
  householdId: string,
  categoryName: string | undefined,
  categoryType: 'income' | 'expense',
  actorProfileId: string,
): Promise<string | null> {
  const normalized = categoryName?.trim();
  if (!normalized) {
    return null;
  }

  const existing = await query<{ id: string }>(
    `
			SELECT id
			FROM categories
			WHERE household_id = $1
				AND LOWER(name) = LOWER($2)
			LIMIT 1
		`,
    [householdId, normalized],
  );

  if (existing.rows?.[0]?.id) {
    return existing.rows[0].id;
  }

  const inserted = await query<{ id: string }>(
    `
			INSERT INTO categories (
				household_id,
				name,
				type,
				created_by_profile_id,
				updated_by_profile_id
			)
			VALUES ($1, $2, $3, $4, $4)
			RETURNING id
		`,
    [householdId, normalized, categoryType, actorProfileId],
  );

  return inserted.rows?.[0]?.id ?? null;
}

async function fetchTransactionById(id: string): Promise<DualFlowTransaction | null> {
  const result = await query<DualFlowTransaction>(
    `
      WITH dual_flow_base AS (
        ${DUAL_FLOW_BASE_SELECT}
      )
      SELECT *
      FROM dual_flow_base
      WHERE id = $1
      LIMIT 1
		`,
    [id],
  );

  return result.rows?.[0] ?? null;
}

function buildWorkflowSelect(
  whereClause: string,
  orderClause: string,
  limitParamPosition: number | null,
): string {
  const limitFragment = limitParamPosition ? `LIMIT $${limitParamPosition}` : '';
  return `
    WITH dual_flow_base AS (
      ${DUAL_FLOW_BASE_SELECT}
    )
    SELECT
      base.*,
      pair.concepto AS pareja_concepto,
      pair.importe AS pareja_importe,
      pair.tipo AS pareja_tipo,
      creator.display_name AS creado_por_nombre,
      payer.display_name AS pagado_por_nombre,
      EXTRACT(DAY FROM (NOW() - base.created_at))::integer AS dias_desde_creacion,
      GREATEST(
        COALESCE(base.dias_revision, 0) -
        CAST(EXTRACT(DAY FROM (NOW() - base.created_at)) AS INTEGER),
        0
      )::integer AS dias_restantes_revision
    FROM dual_flow_base AS base
    LEFT JOIN dual_flow_base AS pair
      ON base.transaccion_pareja = pair.id
    LEFT JOIN profiles AS creator ON creator.id = base.creado_por
    LEFT JOIN profiles AS payer ON payer.id = base.pagado_por
    ${whereClause}
    ${orderClause}
    ${limitFragment}
	`;
}

// ---------------------------------------------------------------------------
// Compatibilidad de esquema: resolver periodo y fase con fallback a status
// ---------------------------------------------------------------------------

type PhaseLike = 'preparing' | 'validation' | 'active' | 'closing' | 'closed';

function mapLegacyStatusToPhase(status: string | null | undefined): PhaseLike {
  const s = (status || '').toLowerCase();
  // Mapear distintos posibles valores legacy a fases unificadas
  if (s === 'closed') return 'closed';
  if (s === 'pending_close') return 'closing';
  if (s === 'future') return 'preparing';
  // Algunos entornos usan 'open' o 'active' como estado activo
  if (s === 'open' || s === 'active') return 'active';
  // Fallback seguro
  return 'active';
}

async function getOrCreatePeriodIdAndPhase(
  householdId: string,
  occurredAt: string | Date,
): Promise<{ periodId: string; phase: PhaseLike }> {
  const d = new Date(occurredAt as string);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;

  // 1) Asegurar periodo
  const ensured = await query<{ id: string }>(
    `
      SELECT ensure_monthly_period($1, $2, $3) AS id
    `,
    [householdId, year, month],
  );
  const periodId = ensured.rows?.[0]?.id;
  if (!periodId) {
    throw new Error('No se pudo asegurar el período mensual');
  }

  // 2) ¿Existe columna phase?
  const phaseExistsRes = await query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'monthly_periods'
          AND column_name = 'phase'
      ) AS exists
    `,
  );
  const phaseExists = Boolean(phaseExistsRes.rows?.[0]?.exists);

  if (phaseExists) {
    const period = await query<{ phase: string; household_id: string }>(
      `
        SELECT phase, household_id
        FROM monthly_periods
        WHERE id = $1
        LIMIT 1
      `,
      [periodId],
    );
    const row = period.rows?.[0];
    if (!row || row.household_id !== householdId) {
      throw new Error('Período inválido o no pertenece al hogar');
    }
    // phase ya es PhaseLike en entornos nuevos; permitir 'validation' si existe
    const phase = (row.phase as PhaseLike) ?? 'active';
    return { periodId, phase };
  }

  // Fallback: usar status legacy
  const legacy = await query<{ status: string | null; household_id: string }>(
    `
      SELECT status, household_id
      FROM monthly_periods
      WHERE id = $1
      LIMIT 1
    `,
    [periodId],
  );
  const legacyRow = legacy.rows?.[0];
  if (!legacyRow || legacyRow.household_id !== householdId) {
    throw new Error('Período inválido o no pertenece al hogar');
  }
  const phase = mapLegacyStatusToPhase(legacyRow.status);
  return { periodId, phase };
}

// ============================================================================
// OPERACIONES CRUD
// ============================================================================

export async function createDualFlowTransaction(
  transaction: Omit<DualFlowTransaction, 'id' | 'created_at' | 'updated_at'>,
): Promise<DualFlowTransaction> {
  const mapping = mapTransactionType(transaction.tipo);
  const currency = await getHouseholdCurrency(transaction.household_id);
  const categoryId = await ensureCategoryId(
    transaction.household_id,
    transaction.categoria,
    mapping.categoryType,
    transaction.creado_por,
  );

  // Resolver periodo y fase para aplicar reglas de negocio
  const { periodId, phase } = await getOrCreatePeriodIdAndPhase(
    transaction.household_id,
    transaction.fecha,
  );

  // Reglas globales de bloqueo por fase
  if (phase === 'preparing') {
    throw new Error(
      'El período todavía no está iniciado. Debe bloquearse primero para poder registrar movimientos.',
    );
  }
  if (phase === 'closing' || phase === 'closed') {
    throw new Error('El período no permite registrar nuevos movimientos en esta fase.');
  }

  // Reglas por flujo y tipo
  if (mapping.flowType === 'common') {
    if (phase !== 'active') {
      throw new Error('Los movimientos del flujo común solo pueden crearse cuando el período está activo.');
    }
  } else if (mapping.flowType === 'direct') {
    // Solo gastos directos; el ingreso se genera automáticamente por el sistema
    if (mapping.ledgerType === 'income_direct') {
      throw new Error(
        'En el flujo directo solo se pueden crear gastos directos; el ingreso de equilibrio se genera automáticamente.',
      );
    }
    if (phase !== 'validation' && phase !== 'active') {
      throw new Error('Los gastos directos solo pueden registrarse en fases de validación o activo.');
    }
  }

  const paidBy = transaction.pagado_por ?? null;
  const realPayer = mapping.flowType === 'direct' ? paidBy : null;
  const profileId = transaction.pagado_por ?? transaction.creado_por;

  const inserted = await query<{ id: string }>(
    `
			INSERT INTO transactions (
				household_id,
				category_id,
				type,
				flow_type,
				amount,
				currency,
				description,
				occurred_at,
        performed_at,
				profile_id,
				paid_by,
				real_payer_id,
				created_by_profile_id,
				updated_by_profile_id,
				created_by_member_id,
				dual_flow_status,
				requires_approval,
				auto_paired,
				review_days,
				pairing_threshold,
        period_id
			)
			VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20
			)
			RETURNING id
		`,
    [
      transaction.household_id,
      categoryId,
      mapping.ledgerType,
      mapping.flowType,
      transaction.importe,
      currency,
      transaction.concepto,
      transaction.fecha,
      transaction.fecha,
      profileId,
      paidBy,
      realPayer,
      transaction.creado_por,
      transaction.creado_por,
      transaction.creado_por,
      transaction.estado ?? 'pending_review',
      Boolean(transaction.requiere_aprobacion),
      false,
      transaction.dias_revision ?? DEFAULT_REVIEW_DAYS,
      transaction.umbral_emparejamiento ?? DEFAULT_PAIRING_THRESHOLD,
      periodId,
    ],
  );

  const newId = inserted.rows?.[0]?.id;
  if (!newId) {
    throw new Error('No se pudo crear la transaccion dual-flow');
  }

  const created = await fetchTransactionById(newId);
  if (!created) {
    throw new Error('La transaccion dual-flow no esta disponible tras la insercion');
  }

  return created;
}

export async function getDualFlowTransactions(
  householdId: string,
  limit: number = 50,
  estado?: string,
): Promise<DualFlowTransaction[]> {
  let whereClause = 'WHERE base.household_id = $1';
  const params: (string | number)[] = [householdId];

  if (estado) {
    params.push(estado);
    whereClause += ` AND base.estado = $${params.length}`;
  }

  params.push(limit);
  const sql = `
    WITH dual_flow_base AS (
      ${DUAL_FLOW_BASE_SELECT}
    )
    SELECT *
    FROM dual_flow_base AS base
    ${whereClause}
    ORDER BY base.created_at DESC
    LIMIT $${params.length}
	`;

  const result = await query<DualFlowTransaction>(sql, params);
  return result.rows ?? [];
}

export async function getDualFlowTransactionWithWorkflow(
  transactionId: string,
): Promise<DualFlowWorkflow | null> {
  const sql = buildWorkflowSelect('WHERE base.id = $1', '', null);
  const result = await query<DualFlowWorkflow>(`${sql} LIMIT 1`, [transactionId]);
  return result.rows?.[0] ?? null;
}

export async function approveDualFlowTransaction(
  transactionId: string,
  approvedBy: string,
): Promise<DualFlowTransaction | null> {
  const updated = await query<{ id: string }>(
    `
			UPDATE transactions
			SET
				dual_flow_status = 'approved',
				approved_at = NOW(),
				approved_by = $2,
				requires_approval = FALSE,
				updated_at = NOW()
			WHERE id = $1
			RETURNING id
		`,
    [transactionId, approvedBy],
  );

  const id = updated.rows?.[0]?.id;
  return id ? fetchTransactionById(id) : null;
}

export async function rejectDualFlowTransaction(
  transactionId: string,
  approvedBy: string,
): Promise<DualFlowTransaction | null> {
  const updated = await query<{ id: string }>(
    `
			UPDATE transactions
			SET
				dual_flow_status = 'rejected',
				approved_at = NOW(),
				approved_by = $2,
				updated_at = NOW()
			WHERE id = $1
			RETURNING id
		`,
    [transactionId, approvedBy],
  );

  const id = updated.rows?.[0]?.id;
  return id ? fetchTransactionById(id) : null;
}

// ============================================================================
// AUTO-PAIRING Y STORED PROCEDURES
// ============================================================================

export async function findPairingCandidates(
  householdId: string,
  transactionId: string,
  umbral: number = 5.0,
): Promise<PairingCandidate[]> {
  const result = await query<PairingCandidate>(
    `
			SELECT *
			FROM find_pairing_candidates($1, $2, $3)
		`,
    [householdId, transactionId, umbral],
  );

  return result.rows ?? [];
}

export async function executeManualPairing(
  transactionId: string,
  candidateId: string,
): Promise<boolean> {
  const result = await query<{ success: boolean }>(
    `
			SELECT execute_auto_pairing($1, $2) AS success
		`,
    [transactionId, candidateId],
  );

  return Boolean(result.rows?.[0]?.success);
}

export async function unpairTransactions(transactionId: string): Promise<void> {
  const current = await query<{ transaction_pair_id: string | null }>(
    `
			SELECT transaction_pair_id
			FROM transactions
			WHERE id = $1
			LIMIT 1
		`,
    [transactionId],
  );

  const pairUuid = current.rows?.[0]?.transaction_pair_id ?? null;

  await query(
    `
			UPDATE transactions
			SET
				transaction_pair_id = NULL,
				auto_paired = false,
				dual_flow_status = CASE
					WHEN requires_approval THEN 'pending_review'
					ELSE 'approved'
				END,
				updated_at = NOW()
			WHERE id = $1
		`,
    [transactionId],
  );

  if (pairUuid) {
    await query(
      `
				UPDATE transactions
				SET
					transaction_pair_id = NULL,
					auto_paired = false,
					dual_flow_status = CASE
						WHEN requires_approval THEN 'pending_review'
						ELSE 'approved'
					END,
					updated_at = NOW()
				WHERE transaction_pair_id = $1
			`,
      [pairUuid],
    );
  }
}

// ============================================================================
// VISTAS Y BALANCE
// ============================================================================

export async function getDualFlowBalance(householdId: string): Promise<DualFlowBalance | null> {
  const result = await query<DualFlowBalance>(
    `
			SELECT *
			FROM v_dual_flow_balance
			WHERE household_id = $1
		`,
    [householdId],
  );

  return result.rows?.[0] ?? null;
}

export async function getDualFlowWorkflow(
  householdId: string,
  limit: number = 20,
): Promise<DualFlowWorkflow[]> {
  const params: (string | number)[] = [householdId, limit];
  const sql = buildWorkflowSelect(
    'WHERE base.household_id = $1',
    'ORDER BY base.created_at DESC',
    2,
  );
  const result = await query<DualFlowWorkflow>(sql, params);
  return result.rows ?? [];
}

export async function getDualFlowMetrics(): Promise<DualFlowMetrics | null> {
  const result = await query<{
    total_transacciones: string;
    hogares_activos: string;
    gastos_directos: string;
    gastos_comunes: string;
    ingresos_directos: string;
    ingresos_comunes: string;
    pendientes_revision: string;
    auto_emparejadas: string;
    aprobadas: string;
    completadas: string;
    porcentaje_auto_pairing: string | null;
    importe_promedio: string | null;
    dias_promedio_procesamiento: string | null;
  }>(
    `
      WITH dual_flow_base AS (
        ${DUAL_FLOW_BASE_SELECT}
      )
      SELECT
				COUNT(*) AS total_transacciones,
				COUNT(DISTINCT household_id) AS hogares_activos,
				COUNT(*) FILTER (WHERE tipo = 'gasto_directo') AS gastos_directos,
				COUNT(*) FILTER (WHERE tipo = 'gasto') AS gastos_comunes,
				COUNT(*) FILTER (WHERE tipo = 'ingreso_directo') AS ingresos_directos,
				COUNT(*) FILTER (WHERE tipo = 'ingreso') AS ingresos_comunes,
				COUNT(*) FILTER (WHERE estado = 'pending_review') AS pendientes_revision,
				COUNT(*) FILTER (WHERE auto_paired) AS auto_emparejadas,
				COUNT(*) FILTER (WHERE estado = 'approved') AS aprobadas,
				COUNT(*) FILTER (WHERE estado = 'completed') AS completadas,
				CASE
					WHEN COUNT(*) FILTER (WHERE tipo IN ('gasto_directo', 'ingreso_directo')) = 0 THEN 0
					ELSE ROUND(
						COUNT(*) FILTER (WHERE auto_paired::numeric) /
						NULLIF(COUNT(*) FILTER (WHERE tipo IN ('gasto_directo', 'ingreso_directo')), 0) * 100,
						2
					)
				END AS porcentaje_auto_pairing,
				ROUND(AVG(importe), 2) AS importe_promedio,
				ROUND(
					AVG(
						EXTRACT(DAY FROM (COALESCE(updated_at, created_at) - created_at))
					),
					1
				) AS dias_promedio_procesamiento
        FROM dual_flow_base
			WHERE fecha >= CURRENT_DATE - INTERVAL '30 days'
		`,
  );

  const row = result.rows?.[0];
  if (!row) {
    return null;
  }

  return {
    scope: 'system_wide',
    total_transacciones: Number.parseInt(row.total_transacciones ?? '0', 10),
    hogares_activos: Number.parseInt(row.hogares_activos ?? '0', 10),
    gastos_directos: Number.parseInt(row.gastos_directos ?? '0', 10),
    gastos_comunes: Number.parseInt(row.gastos_comunes ?? '0', 10),
    ingresos_directos: Number.parseInt(row.ingresos_directos ?? '0', 10),
    ingresos_comunes: Number.parseInt(row.ingresos_comunes ?? '0', 10),
    pendientes_revision: Number.parseInt(row.pendientes_revision ?? '0', 10),
    auto_emparejadas: Number.parseInt(row.auto_emparejadas ?? '0', 10),
    aprobadas: Number.parseInt(row.aprobadas ?? '0', 10),
    completadas: Number.parseInt(row.completadas ?? '0', 10),
    porcentaje_auto_pairing: Number.parseFloat(row.porcentaje_auto_pairing ?? '0') || 0,
    importe_promedio: Number.parseFloat(row.importe_promedio ?? '0') || 0,
    dias_promedio_procesamiento: Number.parseFloat(row.dias_promedio_procesamiento ?? '0') || 0,
  };
}

// ============================================================================
// CONFIGURACIÓN DUAL-FLOW
// ============================================================================

export async function getDualFlowConfig(householdId: string): Promise<DualFlowConfig | null> {
  const result = await query<DualFlowConfig>(
    `
			SELECT *
			FROM dual_flow_config
			WHERE household_id = $1
		`,
    [householdId],
  );

  return result.rows?.[0] ?? null;
}

export async function upsertDualFlowConfig(
  householdId: string,
  config: Partial<DualFlowConfig>,
): Promise<DualFlowConfig | null> {
  const result = await query<DualFlowConfig>(
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

  return result.rows?.[0] ?? null;
}

// ============================================================================
// UTILIDADES
// ============================================================================

export async function canBePaired(transactionId: string): Promise<boolean> {
  const result = await query<{ count: string }>(
    `
			SELECT COUNT(*) AS count
			FROM transactions
			WHERE id = $1
				AND flow_type = 'direct'
				AND transaction_pair_id IS NULL
				AND auto_paired = false
				AND dual_flow_status IN ('approved', 'pending_review')
				AND type IN ('expense_direct', 'income_direct')
		`,
    [transactionId],
  );

  return Number.parseInt(result.rows?.[0]?.count ?? '0', 10) > 0;
}

export async function getPairingStats(householdId: string): Promise<DualFlowStats | null> {
  const result = await query<{
    total_transacciones: string;
    auto_emparejadas: string;
    pendientes: string;
    candidatas_pairing: string;
  }>(
    `
			SELECT
				COUNT(*) AS total_transacciones,
				COUNT(*) FILTER (WHERE auto_paired) AS auto_emparejadas,
				COUNT(*) FILTER (WHERE dual_flow_status = 'pending_review') AS pendientes,
				COUNT(*) FILTER (
					WHERE flow_type = 'direct'
						AND type IN ('expense_direct', 'income_direct')
				) AS candidatas_pairing
			FROM transactions
			WHERE household_id = $1
				AND occurred_at >= CURRENT_DATE - INTERVAL '90 days'
		`,
    [householdId],
  );

  const row = result.rows?.[0];
  if (!row) {
    return null;
  }

  const directCandidates = Number.parseInt(row.candidatas_pairing ?? '0', 10);
  const autoPaired = Number.parseInt(row.auto_emparejadas ?? '0', 10);
  const porcentaje =
    directCandidates > 0 ? Number(((autoPaired / directCandidates) * 100).toFixed(2)) : 0;

  return {
    total_transacciones: Number.parseInt(row.total_transacciones ?? '0', 10),
    auto_emparejadas: autoPaired,
    pendientes: Number.parseInt(row.pendientes ?? '0', 10),
    candidatas_pairing: directCandidates,
    porcentaje_pairing: porcentaje,
  };
}

export async function getPendingReviewTransactions(
  householdId: string,
): Promise<DualFlowTransaction[]> {
  const result = await query<DualFlowTransaction>(
    `
      WITH dual_flow_base AS (
        ${DUAL_FLOW_BASE_SELECT}
      )
      SELECT *
      FROM dual_flow_base
			WHERE household_id = $1
				AND estado = 'pending_review'
				AND created_at >= NOW() - INTERVAL '30 days'
			ORDER BY created_at ASC
		`,
    [householdId],
  );

  return result.rows ?? [];
}

export async function refreshDualFlowMaterializedViews(): Promise<void> {
  await query('SELECT refresh_critical_matviews()');
}

/**
 * Verifica si un usuario tiene acceso al sistema dual-flow
 * @param _userEmail Email del usuario (no usado por ahora)
 * @returns Objeto con hasAccess boolean
 */
export async function checkDualFlowAccess(_userEmail: string): Promise<{ hasAccess: boolean }> {
  // TODO: Implementar lógica de acceso al dual-flow
  // Por ahora, siempre retorna false ya que el proyecto está en transición
  return { hasAccess: false };
}
