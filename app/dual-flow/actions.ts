'use server';

/**
 * Server Actions para el sistema Dual-Flow
 * Integración completa con las nuevas tablas PostgreSQL
 */

import { getCurrentUser } from '@/lib/auth';
import {
  approveDualFlowTransaction,
  createDualFlowTransaction,
  executeManualPairing,
  findPairingCandidates,
  getDualFlowBalance,
  getDualFlowConfig,
  getDualFlowTransactions,
  getPendingReviewTransactions,
  rejectDualFlowTransaction,
  unpairTransactions,
  upsertDualFlowConfig,
} from '@/lib/dualFlow';
import type { Result } from '@/lib/result';
import { fail, ok } from '@/lib/result';
import { getUserHouseholdId, query } from '@/lib/supabaseServer';
import type {
  DualFlowBalance,
  DualFlowConfig,
  DualFlowTransaction,
  DualFlowType,
  PairingCandidate,
  TransactionTypeDualFlow,
} from '@/types/dualFlow';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ============================================================================
// ESQUEMAS DE VALIDACIÓN ZOD
// ============================================================================

const CreateTransactionSchema = z.object({
  concepto: z.string().min(3, 'El concepto debe tener al menos 3 caracteres'),
  categoria: z.string().min(2, 'Selecciona una categoría'),
  importe: z.coerce.number().positive('El importe debe ser mayor a 0'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  tipo: z.enum(['gasto', 'gasto_directo', 'ingreso', 'ingreso_directo']),
  pagado_por: z.string().uuid().optional(),
  requiere_aprobacion: z.boolean().optional().default(false),
  umbral_emparejamiento: z.coerce.number().min(0).max(100).optional().default(5.0),
});

const ApproveTransactionSchema = z.object({
  transactionId: z.string().uuid('ID de transacción inválido'),
});

const PairTransactionsSchema = z.object({
  transactionId: z.string().uuid('ID de transacción inválido'),
  candidateId: z.string().uuid('ID de candidato inválido'),
});

const UpdateConfigSchema = z.object({
  emparejamiento_automatico: z.boolean().optional(),
  umbral_emparejamiento_default: z.coerce.number().min(0).max(100).optional(),
  tiempo_revision_default: z.coerce.number().min(1).max(30).optional(),
  limite_gasto_personal: z.coerce.number().min(0).optional(),
  requiere_aprobacion_default: z.boolean().optional(),
  liquidacion_automatica: z.boolean().optional(),
  dias_liquidacion: z.coerce.number().min(7).max(90).optional(),
  notificaciones_activas: z.boolean().optional(),
  notificar_nuevos_gastos: z.boolean().optional(),
  notificar_emparejamientos: z.boolean().optional(),
  notificar_limites: z.boolean().optional(),
  notificar_liquidaciones: z.boolean().optional(),
});

const PeriodPhaseSchema = z.enum(['preparing', 'validation', 'active', 'closing', 'closed']);

const MemberIncomeSchema = z
  .object({
    periodYear: z.coerce.number().int().min(2000).max(2100).optional(),
    periodMonth: z.coerce.number().int().min(1).max(12).optional(),
    grossIncome: z.coerce.number().min(0),
    otherIncome: z.coerce.number().min(0).optional(),
    notes: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    const yearProvided = data.periodYear !== undefined;
    const monthProvided = data.periodMonth !== undefined;

    if (yearProvided !== monthProvided) {
      const message = 'Debes especificar año y mes del período';
      if (!yearProvided) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['periodYear'] });
      }
      if (!monthProvided) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['periodMonth'] });
      }
    }
  });

const ReviewMemberIncomeSchema = z
  .object({
    memberId: z.string().uuid(),
    periodYear: z.coerce.number().int().min(2000).max(2100).optional(),
    periodMonth: z.coerce.number().int().min(1).max(12).optional(),
    status: z.enum(['validated', 'needs_revision']),
    grossIncome: z.coerce.number().min(0).optional(),
    otherIncome: z.coerce.number().min(0).optional(),
    notes: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    const yearProvided = data.periodYear !== undefined;
    const monthProvided = data.periodMonth !== undefined;

    if (yearProvided !== monthProvided) {
      const message = 'Debes especificar año y mes del período';
      if (!yearProvided) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['periodYear'] });
      }
      if (!monthProvided) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['periodMonth'] });
      }
    }
  });

const TransitionPeriodPhaseSchema = z
  .object({
    periodYear: z.coerce.number().int().min(2000).max(2100).optional(),
    periodMonth: z.coerce.number().int().min(1).max(12).optional(),
    targetPhase: PeriodPhaseSchema,
  })
  .superRefine((data, ctx) => {
    const yearProvided = data.periodYear !== undefined;
    const monthProvided = data.periodMonth !== undefined;

    if (yearProvided !== monthProvided) {
      const message = 'Debes especificar año y mes del período';
      if (!yearProvided) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['periodYear'] });
      }
      if (!monthProvided) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['periodMonth'] });
      }
    }
  });

type PeriodPhase = z.infer<typeof PeriodPhaseSchema>;
type MemberIncomePayload = z.infer<typeof MemberIncomeSchema>;
type ReviewMemberIncomePayload = z.infer<typeof ReviewMemberIncomeSchema>;
type TransitionPeriodPhasePayload = z.infer<typeof TransitionPeriodPhaseSchema>;

interface MemberMonthlyIncomeRow {
  id: string;
  household_id: string;
  profile_id: string;
  period_year: number;
  period_month: number;
  gross_income: number | string;
  other_income: number | string;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface MonthlyPeriodRow {
  id: string;
  household_id: string;
  year: number;
  month: number;
  status: string;
  phase?: PeriodPhase | null;
  validated_at?: string | null;
  closed_at?: string | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getFlowTypeForTransactionType(tipo: TransactionTypeDualFlow): DualFlowType {
  switch (tipo) {
    case 'gasto_directo':
      return 'personal_to_common';
    case 'ingreso_directo':
      return 'common_to_personal';
    case 'gasto':
    case 'ingreso':
      return 'common_fund';
  }
}

async function resolveTargetPeriod(
  householdId: string,
  override?: { year?: number; month?: number },
): Promise<{ year: number; month: number }> {
  if (override?.year !== undefined && override.month !== undefined) {
    return { year: override.year, month: override.month };
  }

  const result = await query(
    `
      SELECT year, month
      FROM monthly_periods
      WHERE household_id = $1
      ORDER BY year DESC, month DESC
      LIMIT 1
    `,
    [householdId],
  );

  const row = result.rows[0] as { year: number; month: number } | undefined;

  if (row) {
    return { year: row.year, month: row.month };
  }

  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth() + 1 };
}

async function ensureMonthlyPeriod(
  householdId: string,
  year: number,
  month: number,
): Promise<MonthlyPeriodRow | null> {
  const existing = await query(
    `
      SELECT id, year, month, status, phase, validated_at, closed_at
      FROM monthly_periods
      WHERE household_id = $1 AND year = $2 AND month = $3
      LIMIT 1
    `,
    [householdId, year, month],
  );

  if (existing.rows[0]) {
    return existing.rows[0] as MonthlyPeriodRow;
  }

  const inserted = await query(
    `
      INSERT INTO monthly_periods (
        household_id,
        year,
        month,
        status,
        phase,
        opening_balance,
        closing_balance,
        total_expenses,
        total_income,
        auto_close_enabled,
        reopened_count,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, 'open', 'preparing', 0, 0, 0, 0, true, 0, NOW(), NOW())
      RETURNING id, year, month, status, phase, validated_at, closed_at
    `,
    [householdId, year, month],
  );

  return (inserted.rows[0] as MonthlyPeriodRow) ?? null;
}

async function logDualFlowEvent(params: {
  householdId: string;
  periodId?: string | null;
  profileId?: string | null;
  eventType: string;
  payload?: unknown;
}): Promise<void> {
  try {
    await query(
      `
        INSERT INTO dual_flow_events (household_id, period_id, profile_id, event_type, payload)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        params.householdId,
        params.periodId ?? null,
        params.profileId ?? null,
        params.eventType,
        params.payload ? JSON.stringify(params.payload) : null,
      ],
    );
  } catch (error) {
    console.error('Error logging dual flow event:', error);
  }
}

function parseNumericValue(value: string | number): number {
  if (typeof value === 'number') {
    return value;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// ============================================================================
// CRUD TRANSACCIONES DUAL-FLOW
// ============================================================================

/**
 * Crear nueva transacción dual-flow
 */
export async function createDualFlowTransactionAction(
  formData: FormData,
): Promise<Result<{ id: string }>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return fail('Usuario no autenticado');
    }

    // Obtener household_id del usuario actual
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('Usuario no pertenece a ningún hogar');
    }

    // Validar datos del formulario
    const parsed = CreateTransactionSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    const createdBy = currentUser.profile_id;

    // Determinar tipo_flujo automáticamente
    const tipoFlujo = getFlowTypeForTransactionType(data.tipo);

    // Crear la transacción
    const transaction = await createDualFlowTransaction({
      household_id: householdId,
      concepto: data.concepto,
      categoria: data.categoria,
      importe: data.importe,
      fecha: data.fecha,
      tipo: data.tipo,
      estado: 'pending_review', // Estado inicial
      tipo_flujo: tipoFlujo,
      creado_por: createdBy,
      pagado_por: data.pagado_por,
      auto_paired: false,
      requiere_aprobacion: data.requiere_aprobacion,
      umbral_emparejamiento: data.umbral_emparejamiento,
      dias_revision: 7, // Default
    });

    // Revalidar rutas del dual-flow
    revalidatePath('/dual-flow');
    revalidatePath('/dual-flow/inicio');
    revalidatePath('/dual-flow/balance');

    return ok({ id: transaction.id });
  } catch (error) {
    console.error('Error creating dual-flow transaction:', error);
    return fail('Error interno del servidor');
  }
}

/**
 * Obtener transacciones dual-flow del hogar
 */
export async function getDualFlowTransactionsAction(filters?: {
  estado?: string;
  limit?: number;
}): Promise<Result<DualFlowTransaction[]>> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('Usuario no pertenece a ningún hogar');
    }

    const transactions = await getDualFlowTransactions(
      householdId,
      filters?.limit || 50,
      filters?.estado,
    );

    return ok(transactions);
  } catch (error) {
    console.error('Error fetching dual-flow transactions:', error);
    return fail('Error interno del servidor');
  }
}

/**
 * Obtener balance dual-flow del hogar
 */
export async function getDualFlowBalanceAction(): Promise<Result<DualFlowBalance>> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('Usuario no pertenece a ningún hogar');
    }

    const balance = await getDualFlowBalance(householdId);

    return ok(
      balance || {
        household_id: householdId,
        fondo_comun: 0,
        gastos_personales_pendientes: 0,
        reembolsos_pendientes: 0,
        total_personal_to_common: 0,
        total_common_to_personal: 0,
        total_transacciones: 0,
        pendientes_revision: 0,
        auto_emparejadas: 0,
      },
    );
  } catch (error) {
    console.error('Error fetching dual-flow balance:', error);
    return fail('Error interno del servidor');
  }
}

// ============================================================================
// WORKFLOW Y APROBACIONES
// ============================================================================

/**
 * Aprobar transacción (dispara auto-pairing automático)
 */
export async function approveDualFlowTransactionAction(formData: FormData): Promise<Result> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return fail('Usuario no autenticado');
    }

    const parsed = ApproveTransactionSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return fail('ID de transacción inválido');
    }

    const approvedBy = currentUser.profile_id;

    await approveDualFlowTransaction(parsed.data.transactionId, approvedBy);

    // Revalidar rutas
    revalidatePath('/dual-flow');
    revalidatePath('/dual-flow/balance');

    return ok();
  } catch (error) {
    console.error('Error approving transaction:', error);
    return fail('Error interno del servidor');
  }
}

/**
 * Rechazar transacción
 */
export async function rejectDualFlowTransactionAction(formData: FormData): Promise<Result> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return fail('Usuario no autenticado');
    }

    const parsed = ApproveTransactionSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return fail('ID de transacción inválido');
    }

    const approvedBy = currentUser.profile_id;

    await rejectDualFlowTransaction(parsed.data.transactionId, approvedBy);

    // Revalidar rutas
    revalidatePath('/dual-flow');
    revalidatePath('/dual-flow/balance');

    return ok();
  } catch (error) {
    console.error('Error rejecting transaction:', error);
    return fail('Error interno del servidor');
  }
}

// ============================================================================
// AUTO-PAIRING Y EMPAREJAMIENTO MANUAL
// ============================================================================

/**
 * Buscar candidatos para emparejamiento
 */
export async function findPairingCandidatesAction(
  transactionId: string,
  umbral?: number,
): Promise<Result<PairingCandidate[]>> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('Usuario no pertenece a ningún hogar');
    }

    const candidates = await findPairingCandidates(householdId, transactionId, umbral || 5.0);

    return ok(candidates);
  } catch (error) {
    console.error('Error finding pairing candidates:', error);
    return fail('Error interno del servidor');
  }
}

/**
 * Ejecutar emparejamiento manual
 */
export async function executePairingAction(formData: FormData): Promise<Result> {
  try {
    const parsed = PairTransactionsSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return fail('IDs de transacciones inválidos');
    }

    const success = await executeManualPairing(parsed.data.transactionId, parsed.data.candidateId);

    if (!success) {
      return fail('No se pudo ejecutar el emparejamiento');
    }

    // Revalidar rutas
    revalidatePath('/dual-flow');
    revalidatePath('/dual-flow/balance');

    return ok();
  } catch (error) {
    console.error('Error executing pairing:', error);
    return fail('Error interno del servidor');
  }
}

/**
 * Deshacer emparejamiento
 */
export async function unpairTransactionsAction(formData: FormData): Promise<Result> {
  try {
    const parsed = ApproveTransactionSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return fail('ID de transacción inválido');
    }

    await unpairTransactions(parsed.data.transactionId);

    // Revalidar rutas
    revalidatePath('/dual-flow');
    revalidatePath('/dual-flow/balance');

    return ok();
  } catch (error) {
    console.error('Error unpairing transactions:', error);
    return fail('Error interno del servidor');
  }
}

// ============================================================================
// CONFIGURACIÓN DUAL-FLOW
// ============================================================================

/**
 * Obtener configuración dual-flow del hogar
 */
export async function getDualFlowConfigAction(): Promise<Result<DualFlowConfig>> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('Usuario no pertenece a ningún hogar');
    }

    const config = await getDualFlowConfig(householdId);

    if (config) {
      return ok(config);
    }

    const nowIso = new Date().toISOString();

    return ok({
      household_id: householdId,
      emparejamiento_automatico: true,
      umbral_emparejamiento_default: 5.0,
      tiempo_revision_default: 7,
      limite_gasto_personal: 200.0,
      requiere_aprobacion_default: false,
      liquidacion_automatica: true,
      dias_liquidacion: 30,
      notificaciones_activas: true,
      notificar_nuevos_gastos: true,
      notificar_emparejamientos: true,
      notificar_limites: true,
      notificar_liquidaciones: false,
      created_at: nowIso,
      updated_at: nowIso,
    });
  } catch (error) {
    console.error('Error fetching dual-flow config:', error);
    return fail('Error interno del servidor');
  }
}

/**
 * Actualizar configuración dual-flow
 */
export async function updateDualFlowConfigAction(formData: FormData): Promise<Result> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('Usuario no pertenece a ningún hogar');
    }

    const parsed = UpdateConfigSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return fail('Datos de configuración inválidos', parsed.error.flatten().fieldErrors);
    }

    await upsertDualFlowConfig(householdId, parsed.data);

    // Revalidar rutas
    revalidatePath('/dual-flow/opciones');

    return ok();
  } catch (error) {
    console.error('Error updating dual-flow config:', error);
    return fail('Error interno del servidor');
  }
}

// ============================================================================
// UTILIDADES Y DASHBOARD
// ============================================================================

/**
 * Obtener transacciones pendientes de revisión
 */
export async function getPendingReviewAction(): Promise<Result<DualFlowTransaction[]>> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('Usuario no pertenece a ningún hogar');
    }

    const pending = await getPendingReviewTransactions(householdId);

    return ok(pending);
  } catch (error) {
    console.error('Error fetching pending transactions:', error);
    return fail('Error interno del servidor');
  }
}

/**
 * Obtener datos completos para el dashboard dual-flow
 */
export async function getDualFlowDashboardAction(): Promise<
  Result<{
    balance: DualFlowBalance;
    recentTransactions: DualFlowTransaction[];
    pendingReview: DualFlowTransaction[];
    config: DualFlowConfig;
  }>
> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('Usuario no pertenece a ningún hogar');
    }

    // Obtener todos los datos en paralelo
    const [balance, recentTransactions, pendingReview, config] = await Promise.all([
      getDualFlowBalance(householdId),
      getDualFlowTransactions(householdId, 10),
      getPendingReviewTransactions(householdId),
      getDualFlowConfig(householdId),
    ]);

    const nowIso = new Date().toISOString();

    return ok({
      balance:
        balance ||
        ({
          household_id: householdId,
          fondo_comun: 0,
          gastos_personales_pendientes: 0,
          reembolsos_pendientes: 0,
          total_personal_to_common: 0,
          total_common_to_personal: 0,
          total_transacciones: 0,
          pendientes_revision: 0,
          auto_emparejadas: 0,
        } satisfies DualFlowBalance),
      recentTransactions,
      pendingReview,
      config:
        config ||
        ({
          household_id: householdId,
          emparejamiento_automatico: true,
          umbral_emparejamiento_default: 5.0,
          tiempo_revision_default: 7,
          limite_gasto_personal: 200.0,
          requiere_aprobacion_default: false,
          liquidacion_automatica: true,
          dias_liquidacion: 30,
          notificaciones_activas: true,
          notificar_nuevos_gastos: true,
          notificar_emparejamientos: true,
          notificar_limites: true,
          notificar_liquidaciones: false,
          created_at: nowIso,
          updated_at: nowIso,
        } satisfies DualFlowConfig),
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return fail('Error interno del servidor');
  }
}

// ============================================================================
// INGRESOS DE MIEMBROS Y GESTIÓN DE PERÍODOS
// ============================================================================

export async function submitMemberIncomeAction(
  formData: FormData,
): Promise<Result<{ id: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('Usuario no autenticado');
    }

    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('Usuario no pertenece a ningún hogar');
    }

    const parsed = MemberIncomeSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
    }

    const payload: MemberIncomePayload = parsed.data;
    const period = await resolveTargetPeriod(householdId, {
      year: payload.periodYear,
      month: payload.periodMonth,
    });

    const periodRow = await ensureMonthlyPeriod(householdId, period.year, period.month);
    if (!periodRow) {
      return fail('No se pudo preparar el período mensual');
    }

    const result = await query(
      `
        INSERT INTO member_monthly_income (
          household_id,
          profile_id,
          period_year,
          period_month,
          gross_income,
          other_income,
          notes,
          status,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, COALESCE($6, 0), $7, 'submitted', NOW())
        ON CONFLICT (household_id, profile_id, period_year, period_month)
        DO UPDATE SET
          gross_income = EXCLUDED.gross_income,
          other_income = EXCLUDED.other_income,
          notes = EXCLUDED.notes,
          status = 'submitted',
          updated_at = NOW()
        RETURNING *
      `,
      [
        householdId,
        user.profile_id,
        period.year,
        period.month,
        payload.grossIncome,
        payload.otherIncome ?? 0,
        payload.notes ?? null,
      ],
    );

    const row = result.rows[0] as MemberMonthlyIncomeRow | undefined;

    if (!row) {
      return fail('No se pudo registrar el ingreso mensual');
    }

    await logDualFlowEvent({
      householdId,
      periodId: periodRow.id,
      profileId: user.profile_id,
      eventType: 'member_income_submitted',
      payload: {
        periodYear: period.year,
        periodMonth: period.month,
        grossIncome: parseNumericValue(row.gross_income),
        otherIncome: parseNumericValue(row.other_income),
      },
    });

    revalidatePath('/dual-flow/inicio');
    revalidatePath('/dual-flow/hogar');

    return ok({ id: row.id });
  } catch (error) {
    console.error('Error submitting member income:', error);
    return fail('Error registrando ingreso mensual');
  }
}

export async function reviewMemberIncomeAction(formData: FormData): Promise<Result> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('Usuario no autenticado');
    }

    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('Usuario no pertenece a ningún hogar');
    }

    const parsed = ReviewMemberIncomeSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
    }

    const payload: ReviewMemberIncomePayload = parsed.data;
    const period = await resolveTargetPeriod(householdId, {
      year: payload.periodYear,
      month: payload.periodMonth,
    });

    const periodRow = await ensureMonthlyPeriod(householdId, period.year, period.month);
    if (!periodRow) {
      return fail('No se pudo preparar el período mensual');
    }

    const grossIncome = payload.grossIncome ?? null;
    const otherIncome = payload.otherIncome ?? null;

    const result = await query(
      `
        UPDATE member_monthly_income
        SET
          status = $1,
          gross_income = COALESCE($2, gross_income),
          other_income = COALESCE($3, other_income),
          notes = COALESCE($4, notes),
          updated_at = NOW()
        WHERE household_id = $5
          AND profile_id = $6
          AND period_year = $7
          AND period_month = $8
        RETURNING *
      `,
      [
        payload.status,
        grossIncome,
        otherIncome,
        payload.notes ?? null,
        householdId,
        payload.memberId,
        period.year,
        period.month,
      ],
    );

    const row = result.rows[0] as MemberMonthlyIncomeRow | undefined;

    if (!row) {
      return fail('No se encontró el ingreso a revisar para el período indicado');
    }

    await logDualFlowEvent({
      householdId,
      periodId: periodRow.id,
      profileId: user.profile_id,
      eventType: 'member_income_reviewed',
      payload: {
        memberId: payload.memberId,
        periodYear: period.year,
        periodMonth: period.month,
        status: payload.status,
        grossIncome: grossIncome ?? parseNumericValue(row.gross_income),
        otherIncome: otherIncome ?? parseNumericValue(row.other_income),
      },
    });

    revalidatePath('/dual-flow/inicio');
    revalidatePath('/dual-flow/periodos');

    return ok();
  } catch (error) {
    console.error('Error reviewing member income:', error);
    return fail('Error al actualizar el estado del ingreso');
  }
}

export async function transitionPeriodPhaseAction(formData: FormData): Promise<Result> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('Usuario no autenticado');
    }

    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('Usuario no pertenece a ningún hogar');
    }

    const parsed = TransitionPeriodPhaseSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
    }

    const payload: TransitionPeriodPhasePayload = parsed.data;
    const period = await resolveTargetPeriod(householdId, {
      year: payload.periodYear,
      month: payload.periodMonth,
    });

    const periodRow = await ensureMonthlyPeriod(householdId, period.year, period.month);
    if (!periodRow) {
      return fail('No se pudo preparar el período mensual');
    }

    // Ajustamos fase, status y marcas de tiempo del período de forma coherente
    const updateResult = await query(
      `
        UPDATE monthly_periods
        SET
          phase = $1,
          status = CASE
            WHEN $1 = 'closed' THEN 'closed'
            WHEN $1 = 'closing' THEN 'pending_close'
            ELSE 'open'
          END,
          validated_at = CASE
            WHEN $1 = 'validation' THEN COALESCE(validated_at, NOW())
            WHEN $1 = 'preparing' THEN NULL
            ELSE validated_at
          END,
          closed_at = CASE
            WHEN $1 = 'closed' THEN NOW()
            ELSE NULL
          END,
          updated_at = NOW()
        WHERE household_id = $2 AND year = $3 AND month = $4
        RETURNING id, phase, validated_at, closed_at
      `,
      [payload.targetPhase, householdId, period.year, period.month],
    );

    const updatedRow = updateResult.rows[0] as MonthlyPeriodRow | undefined;

    if (!updatedRow) {
      return fail('No se pudo actualizar el período solicitado');
    }

    await logDualFlowEvent({
      householdId,
      periodId: updatedRow.id,
      profileId: user.profile_id,
      eventType: 'period_phase_transition',
      payload: {
        periodYear: period.year,
        periodMonth: period.month,
        targetPhase: payload.targetPhase,
      },
    });

    revalidatePath('/dual-flow/periodos');
    revalidatePath('/dual-flow/inicio');

    return ok();
  } catch (error) {
    console.error('Error transitioning period phase:', error);
    return fail('Error actualizando el estado del período');
  }
}

// ============================================================================
// CONFIGURACIÓN DEL HOGAR
// ============================================================================

/**
 * Obtiene la configuración del hogar actual (objetivo mensual, etc.)
 */
export async function getHouseholdSettingsAction(): Promise<
  Result<{
    monthlyGoal: number | null;
    calculationType: string;
    currency: string;
  }>
> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No se encontró el hogar activo');
    }

    const result = await query(
      `SELECT
         monthly_contribution_goal,
         calculation_type,
         currency
       FROM household_settings
       WHERE household_id = $1`,
      [householdId],
    );

    if (result.rows.length === 0) {
      // Si no existe configuración, crear una por defecto
      await query(
        `INSERT INTO household_settings (household_id, calculation_type, currency, updated_at)
         VALUES ($1, 'equal', 'EUR', NOW())`,
        [householdId],
      );

      return ok({
        monthlyGoal: null,
        calculationType: 'equal',
        currency: 'EUR',
      });
    }

    const settings = result.rows[0];
    if (!settings) {
      return fail('Configuración del hogar no encontrada');
    }

    return ok({
      monthlyGoal: settings.monthly_contribution_goal
        ? parseFloat(settings.monthly_contribution_goal)
        : null,
      calculationType: settings.calculation_type || 'equal',
      currency: settings.currency || 'EUR',
    });
  } catch (error) {
    console.error('Error fetching household settings:', error);
    return fail('Error obteniendo configuración del hogar');
  }
}

/**
 * Actualiza el objetivo mensual del hogar
 */
export async function updateMonthlyGoalAction(
  monthlyGoal: number,
): Promise<Result<{ monthlyGoal: number; calculationType: string; currency: string }>> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No se encontró el hogar activo');
    }

    if (monthlyGoal < 0) {
      return fail('El objetivo mensual no puede ser negativo');
    }

    // Verificar si existe configuración
    const existingResult = await query(
      `SELECT calculation_type, currency
       FROM household_settings
       WHERE household_id = $1`,
      [householdId],
    );

    if (existingResult.rows.length === 0) {
      // Crear nueva configuración
      await query(
        `INSERT INTO household_settings (
          household_id,
          monthly_contribution_goal,
          calculation_type,
          currency,
          updated_at
        ) VALUES ($1, $2, 'equal', 'EUR', NOW())`,
        [householdId, monthlyGoal],
      );
    } else {
      // Actualizar configuración existente
      await query(
        `UPDATE household_settings
         SET monthly_contribution_goal = $2, updated_at = NOW()
         WHERE household_id = $1`,
        [householdId, monthlyGoal],
      );
    }

    const updatedResult = await query(
      `SELECT monthly_contribution_goal, calculation_type, currency
       FROM household_settings
       WHERE household_id = $1`,
      [householdId],
    );

    const updatedSettings = updatedResult.rows[0] as
      | {
          monthly_contribution_goal: string | null;
          calculation_type: string | null;
          currency: string | null;
        }
      | undefined;

    const response = {
      monthlyGoal:
        updatedSettings?.monthly_contribution_goal !== null &&
        updatedSettings?.monthly_contribution_goal !== undefined
          ? parseFloat(updatedSettings.monthly_contribution_goal)
          : monthlyGoal,
      calculationType: updatedSettings?.calculation_type || 'equal',
      currency: updatedSettings?.currency || 'EUR',
    };

    revalidatePath('/dual-flow/hogar');
    revalidatePath('/dual-flow/inicio');

    return ok(response);
  } catch (error) {
    console.error('Error updating monthly goal:', error);
    return fail('Error actualizando el objetivo mensual');
  }
}
