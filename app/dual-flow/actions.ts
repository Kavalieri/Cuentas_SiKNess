'use server';

/**
 * Server Actions para el sistema Dual-Flow
 * Integración completa con las nuevas tablas PostgreSQL
 */

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
import { getUserHouseholdId } from '@/lib/supabaseServer';
import type { DualFlowType, TransactionTypeDualFlow } from '@/types/dualFlow';
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

    // Obtener perfil del usuario (creado_por)
    // TODO: Implementar getUserProfile() para obtener el perfil actual
    const createdBy = 'temp-user-id'; // Por ahora placeholder

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
}): Promise<Result<any[]>> {
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
export async function getDualFlowBalanceAction(): Promise<Result<any>> {
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
    const parsed = ApproveTransactionSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return fail('ID de transacción inválido');
    }

    // TODO: Obtener perfil del usuario que aprueba
    const approvedBy = 'temp-user-id'; // Por ahora placeholder

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
    const parsed = ApproveTransactionSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return fail('ID de transacción inválido');
    }

    // TODO: Obtener perfil del usuario que rechaza
    const approvedBy = 'temp-user-id'; // Por ahora placeholder

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
): Promise<Result<any[]>> {
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
export async function getDualFlowConfigAction(): Promise<Result<any>> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('Usuario no pertenece a ningún hogar');
    }

    const config = await getDualFlowConfig(householdId);

    return ok(
      config || {
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
      },
    );
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
export async function getPendingReviewAction(): Promise<Result<any[]>> {
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
    balance: any;
    recentTransactions: any[];
    pendingReview: any[];
    config: any;
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

    return ok({
      balance: balance || {
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
      recentTransactions,
      pendingReview,
      config: config || {
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
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return fail('Error interno del servidor');
  }
}
