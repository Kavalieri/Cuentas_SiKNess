// lib/transactions/unified.ts
// Sistema unificado de transacciones que reemplaza la duplicidad actual

'use server';

import { getCurrentUser, getUserHouseholdId, pgServer } from '@/lib/pgServer';
import type { Result } from '@/lib/result';
import { fail, ok } from '@/lib/result';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// =====================================================
// TIPOS UNIFICADOS
// =====================================================

export type TransactionFlowType = 'common' | 'direct';
export type TransactionType = 'income' | 'expense' | 'income_direct' | 'expense_direct';

export interface UnifiedTransactionData {
  category_id?: string | null;
  type: TransactionType;
  amount: number;
  currency: string;
  description?: string;
  // ISO string o 'YYYY-MM-DDTHH:mm' desde input datetime-local
  occurred_at: string;
  flow_type: TransactionFlowType;

  // CRÍTICO: period_id explícito desde UI (selectedPeriod)
  // Si no se proporciona, se calcula desde occurred_at (legacy behavior)
  period_id?: string;

  // Para flujo común
  paid_by?: string | null; // NULL = cuenta común, UUID = usuario específico

  // Para flujo directo
  real_payer_id?: string; // Quien pagó realmente de su bolsillo
  creates_balance_pair?: boolean; // Si debe crear transacción de equilibrio
}

// =====================================================
// ESQUEMAS DE VALIDACIÓN UNIFICADOS
// =====================================================

const categoryIdSchema = z.preprocess(
  (val) => (val === '' || val === 'none' || val == null ? null : val),
  z.string().uuid().nullable(),
);

const BaseTransactionSchema = z.object({
  category_id: categoryIdSchema.optional(),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  currency: z.string().min(1).default('EUR'),
  description: z.string().optional(),
  occurred_at: z.string().min(1, 'La fecha es requerida'),
  period_id: z.string().uuid().optional(), // Periodo explícito desde UI
});

const CommonFlowSchema = BaseTransactionSchema.extend({
  type: z.enum(['income', 'expense']),
  flow_type: z.literal('common'),
  paid_by: z.string().optional(), // UUID del pagador o 'common'
});

const DirectFlowSchema = BaseTransactionSchema.extend({
  type: z.enum(['income_direct', 'expense_direct']),
  flow_type: z.literal('direct'),
  real_payer_id: z.string().uuid(), // Obligatorio: quien pagó de su bolsillo
  creates_balance_pair: z.boolean().default(true),
});

const UnifiedTransactionSchema = z.discriminatedUnion('flow_type', [
  CommonFlowSchema,
  DirectFlowSchema,
]);

// =====================================================
// FUNCIÓN PRINCIPAL UNIFICADA
// =====================================================

export async function createUnifiedTransaction(
  data: UnifiedTransactionData,
): Promise<Result<{ id: string; pair_id?: string }>> {
  console.log('[createUnifiedTransaction] Starting with data:', JSON.stringify(data, null, 2));

  const parsed = UnifiedTransactionSchema.safeParse(data);
  if (!parsed.success) {
    console.error('[createUnifiedTransaction] Validation failed:', parsed.error);
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const user = await getCurrentUser();
  console.log('[createUnifiedTransaction] Current user:', user?.id);
  if (!user) {
    return fail('No autenticado');
  }

  const householdId = await getUserHouseholdId();
  console.log('[createUnifiedTransaction] Household ID:', householdId);
  if (!householdId) {
    return fail('No tienes un hogar configurado');
  }

  const supabase = await pgServer();

  // Obtener profile_id del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  console.log('[createUnifiedTransaction] Profile:', profile);
  if (!profile) {
    return fail('Usuario no encontrado');
  }

  // Validaciones específicas por flujo
  const userEmail = userEmailOrNull(user);

  if (parsed.data.flow_type === 'common') {
    console.log('[createUnifiedTransaction] Calling common flow');
    return await createCommonFlowTransaction(
      parsed.data,
      householdId,
      profile.id,
      userEmail,
      supabase,
    );
  } else {
    console.log('[createUnifiedTransaction] Calling direct flow');
    return await createDirectFlowTransaction(
      parsed.data,
      householdId,
      profile.id,
      userEmail,
      supabase,
    );
  }
}

// =====================================================
// FLUJO COMÚN (reemplaza expenses/actions.ts)
// =====================================================

async function createCommonFlowTransaction(
  data: z.infer<typeof CommonFlowSchema>,
  householdId: string,
  profileId: string,
  userEmail: string | null,
  supabase: Awaited<ReturnType<typeof pgServer>>,
): Promise<Result<{ id: string }>> {
  // Determinar periodo: usar period_id explícito si existe, sino calcular desde occurred_at
  let periodId: string;

  if (data.period_id) {
    // Usar periodo explícito desde UI (selectedPeriod)
    periodId = data.period_id;
    console.log('[createCommonFlowTransaction] Using explicit period_id from UI:', periodId);
  } else {
    // Legacy: calcular desde occurred_at
    console.log('[createCommonFlowTransaction] No period_id provided, calculating from occurred_at');
    const occurredDate = new Date(data.occurred_at);
    const year = occurredDate.getFullYear();
    const month = occurredDate.getMonth() + 1;

    const { data: calculatedPeriodId, error: periodError } = await supabase.rpc('ensure_monthly_period', {
      p_household_id: householdId,
      p_year: year,
      p_month: month,
    });

    if (periodError) {
      return fail(`Error al crear período mensual: ${periodError.message}`);
    }
    periodId = calculatedPeriodId;
  }

  // Comprobar fase del período y reglas de flujo
  const { data: periodRow, error: periodErr } = await supabase
    .from('monthly_periods')
    .select('phase, household_id, status')
    .eq('id', periodId)
    .single();
  if (periodErr || !periodRow || periodRow.household_id !== householdId) {
    return fail('Período inválido o no pertenece al hogar');
  }

  // Bloqueos por fase para flujo común (income/expense)
  if (periodRow.phase === 'preparing') {
    return fail('El período todavía no está iniciado. Debe bloquearse primero para poder registrar movimientos.');
  }
  if (periodRow.phase === 'closed') {
    return fail('El período está cerrado. No se pueden registrar nuevos movimientos.');
  }
  if (periodRow.phase !== 'active') {
    // En validation y closing no permitimos flujo común
    return fail('Los movimientos comunes solo pueden crearse cuando el período está activo');
  }

  // Determinar paid_by
  let paidBy: string | null = profileId; // Default: usuario actual
  if (data.paid_by === 'common') {
    paidBy = null; // Cuenta común
  } else if (data.paid_by && data.paid_by !== '') {
    paidBy = data.paid_by; // Usuario específico
  }

  // Validación: Si es ingreso, paid_by NO puede ser NULL
  if (data.type === 'income' && paidBy === null) {
    return fail('Los ingresos deben tener un usuario asignado para trazabilidad');
  }

  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert({
      household_id: householdId,
      profile_id: profileId, // Quien registró la transacción
      category_id: data.category_id,
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      description: data.description || null,
      occurred_at: data.occurred_at,
      performed_at: data.occurred_at,
      period_id: periodId,
      paid_by: paidBy,
      flow_type: 'common',
      created_by_profile_id: profileId,
      updated_by_profile_id: profileId,
      created_by_member_id: profileId,
      performed_by_email: userEmail,
    })
    .select('id')
    .single();

  if (error) {
    return fail(error.message);
  }

  if (!transaction) {
    return fail('Error al crear transacción');
  }

  revalidatePath('/app');
  revalidatePath('/app/expenses');
  // Revalidar página de balance Sickness
  revalidatePath('/sickness/balance');
  return ok({ id: transaction.id });
}

// =====================================================
// FLUJO DIRECTO (reemplaza adjustment-actions.ts)
// =====================================================

async function createDirectFlowTransaction(
  data: z.infer<typeof DirectFlowSchema>,
  householdId: string,
  profileId: string,
  userEmail: string | null,
  supabase: Awaited<ReturnType<typeof pgServer>>,
): Promise<Result<{ id: string; pair_id?: string }>> {
  console.log('[createDirectFlowTransaction] Starting with:', {
    householdId,
    profileId,
    data,
  });

  // Solo permitir expense_direct (el sistema crea automáticamente el income_direct)
  if (data.type !== 'expense_direct') {
    return fail(
      'En flujo directo solo se pueden crear gastos directos. El ingreso se genera automáticamente.',
    );
  }

  // Determinar periodo: usar period_id explícito si existe, sino calcular desde occurred_at
  let periodId: string;

  if (data.period_id) {
    // Usar periodo explícito desde UI (selectedPeriod)
    periodId = data.period_id;
    console.log('[createDirectFlowTransaction] Using explicit period_id from UI:', periodId);
  } else {
    // Legacy: calcular desde occurred_at
    console.log('[createDirectFlowTransaction] No period_id provided, calculating from occurred_at');
    const occurredDate = new Date(data.occurred_at);
    const year = occurredDate.getFullYear();
    const month = occurredDate.getMonth() + 1;

    const { data: calculatedPeriodId, error: periodError } = await supabase.rpc('ensure_monthly_period', {
      p_household_id: householdId,
      p_year: year,
      p_month: month,
    });

    if (periodError) {
      console.error('[createDirectFlowTransaction] Period error:', periodError);
      return fail(`Error al crear período mensual: ${periodError.message}`);
    }
    periodId = calculatedPeriodId;
  }

  console.log('[createDirectFlowTransaction] Period ID:', periodId);

  // Reglas de fase para gastos directos
  const { data: periodRow, error: periodErr } = await supabase
    .from('monthly_periods')
    .select('phase, household_id, status')
    .eq('id', periodId)
    .single();
  if (periodErr || !periodRow || periodRow.household_id !== householdId) {
    return fail('Período inválido o no pertenece al hogar');
  }

  // BLOQUEO TOTAL en preparing: nadie puede crear nada
  if (periodRow.phase === 'preparing') {
    return fail('El período todavía no está iniciado. Debe bloquearse primero para poder registrar gastos directos.');
  }

  // Bloqueo si está cerrado
  if (periodRow.phase === 'closed') {
    return fail('El período está cerrado. No se pueden registrar nuevos movimientos.');
  }

  // Gastos directos solo en validation o active
  if (periodRow.phase !== 'validation' && periodRow.phase !== 'active') {
    return fail('Los gastos directos solo pueden registrarse en fases de validación o activo');
  }

  // Generar UUID para emparejar las transacciones
  const pairId = crypto.randomUUID();
  console.log('[createDirectFlowTransaction] Pair ID:', pairId);

  // 1. Crear el gasto directo (real)
  const insertData = {
    household_id: householdId,
    profile_id: profileId, // Quien registró
    category_id: data.category_id,
    type: 'expense_direct',
    amount: data.amount,
    currency: data.currency,
    description: data.description || null,
    occurred_at: data.occurred_at,
    performed_at: data.occurred_at,
    period_id: periodId,
    flow_type: 'direct',
    transaction_pair_id: pairId,
    created_by_member_id: profileId,
    real_payer_id: data.real_payer_id, // Quien pagó realmente
    created_by_profile_id: profileId,
    updated_by_profile_id: profileId,
    performed_by_email: userEmail,
  };

  console.log('[createDirectFlowTransaction] Insert data:', insertData);

  const { data: expenseTransaction, error: expenseError } = await supabase
    .from('transactions')
    .insert(insertData)
    .select('id')
    .single();

  console.log('[createDirectFlowTransaction] Expense result:', {
    transaction: expenseTransaction,
    error: expenseError,
  });

  if (expenseError) {
    return fail('Error al crear gasto directo: ' + expenseError.message);
  }

  if (!expenseTransaction) {
    return fail('Error al crear gasto directo');
  }

  // 2. Crear el ingreso directo de equilibrio (si se solicita)
  if (data.creates_balance_pair) {
    console.log('[createDirectFlowTransaction] Creating balance pair');
    const { data: _incomeTransaction, error: incomeError } = await supabase
      .from('transactions')
      .insert({
        household_id: householdId,
        profile_id: profileId,
        category_id: null, // Los ingresos de equilibrio no necesitan categoría específica
        type: 'income_direct',
        amount: data.amount,
        currency: data.currency,
        description: `Equilibrio: ${data.description || 'Gasto directo'}`,
        occurred_at: data.occurred_at,
        performed_at: data.occurred_at,
        period_id: periodId,
        flow_type: 'direct',
        transaction_pair_id: pairId,
        created_by_member_id: profileId,
        real_payer_id: data.real_payer_id, // Mismo pagador real
        paid_by: data.real_payer_id, // El ingreso se atribuye al que pagó
        created_by_profile_id: profileId,
        updated_by_profile_id: profileId,
        performed_by_email: userEmail,
      })
      .select('id')
      .single();

    console.log('[createDirectFlowTransaction] Income result:', {
      transaction: _incomeTransaction,
      error: incomeError,
    });

    if (incomeError) {
      // Rollback: eliminar el gasto creado
      await supabase.from('transactions').delete().eq('id', expenseTransaction.id);
      return fail('Error al crear ingreso de equilibrio: ' + incomeError.message);
    }
  }

  console.log('[createDirectFlowTransaction] Success, revalidating paths');
  revalidatePath('/app');
  revalidatePath('/app/expenses');
  revalidatePath('/app/contributions');
  // Revalidar página de balance Sickness
  revalidatePath('/sickness/balance');

  return ok({
    id: expenseTransaction.id,
    pair_id: data.creates_balance_pair ? pairId : undefined,
  });
}

// Utilidad local para obtener email de usuario actual (si está disponible)
function userEmailOrNull(user: { email?: string | null } | null | undefined): string | null {
  try {
    return user?.email ?? null;
  } catch {
    return null;
  }
}

// =====================================================
// UTILIDADES PARA MIGRACIÓN
// =====================================================

/**
 * Migra transacciones existentes de ajustes al nuevo sistema
 */
export async function migrateAdjustmentTransactions(): Promise<Result> {
  // TODO: Implementar migración de adjustment-actions.ts al sistema unificado
  return ok();
}

/**
 * Helper para obtener transacciones emparejadas
 */
export async function getTransactionPairs(householdId: string, pairId: string) {
  const supabase = await pgServer();

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('household_id', householdId)
    .eq('transaction_pair_id', pairId)
    .order('type', { ascending: false }); // expense_direct primero

  if (error) return null;
  return data;
}
