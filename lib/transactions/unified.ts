// lib/transactions/unified.ts
// Sistema unificado de transacciones que reemplaza la duplicidad actual

'use server';

import type { Result } from '@/lib/result';
import { fail, ok } from '@/lib/result';
import { getCurrentUser, getUserHouseholdId, pgServer } from '@/lib/pgServer';
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
  occurred_at: string;
  flow_type: TransactionFlowType;

  // Para flujo común
  paid_by?: string | null; // NULL = cuenta común, UUID = usuario específico

  // Para flujo directo
  real_payer_id?: string; // Quien pagó realmente de su bolsillo
  creates_balance_pair?: boolean; // Si debe crear transacción de equilibrio
}

// =====================================================
// ESQUEMAS DE VALIDACIÓN UNIFICADOS
// =====================================================

const BaseTransactionSchema = z.object({
  category_id: z
    .string()
    .transform((val) => (val === '' || val === 'none' ? null : val))
    .pipe(z.string().uuid().nullable()),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  currency: z.string().min(1).default('EUR'),
  description: z.string().optional(),
  occurred_at: z.string().min(1, 'La fecha es requerida'),
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
  const parsed = UnifiedTransactionSchema.safeParse(data);
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const user = await getCurrentUser();
  if (!user) {
    return fail('No autenticado');
  }

  const householdId = await getUserHouseholdId();
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

  if (!profile) {
    return fail('Usuario no encontrado');
  }

  // Validaciones específicas por flujo
  if (parsed.data.flow_type === 'common') {
    return await createCommonFlowTransaction(parsed.data, householdId, profile.id, supabase);
  } else {
    return await createDirectFlowTransaction(parsed.data, householdId, profile.id, supabase);
  }
}

// =====================================================
// FLUJO COMÚN (reemplaza expenses/actions.ts)
// =====================================================

async function createCommonFlowTransaction(
  data: z.infer<typeof CommonFlowSchema>,
  householdId: string,
  profileId: string,
  supabase: Awaited<ReturnType<typeof pgServer>>,
): Promise<Result<{ id: string }>> {
  // Asegurar período mensual
  const occurredDate = new Date(data.occurred_at);
  const year = occurredDate.getFullYear();
  const month = occurredDate.getMonth() + 1;

  const { data: periodId, error: periodError } = await supabase.rpc('ensure_monthly_period', {
    p_household_id: householdId,
    p_year: year,
    p_month: month,
  });

  if (periodError) {
    return fail(`Error al crear período mensual: ${periodError.message}`);
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
      period_id: periodId,
      paid_by: paidBy,
      flow_type: 'common',
      created_by_profile_id: profileId,
      updated_by_profile_id: profileId,
      created_by_member_id: profileId,
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
  return ok({ id: transaction.id });
}

// =====================================================
// FLUJO DIRECTO (reemplaza adjustment-actions.ts)
// =====================================================

async function createDirectFlowTransaction(
  data: z.infer<typeof DirectFlowSchema>,
  householdId: string,
  profileId: string,
  supabase: Awaited<ReturnType<typeof pgServer>>,
): Promise<Result<{ id: string; pair_id?: string }>> {
  // Solo permitir expense_direct (el sistema crea automáticamente el income_direct)
  if (data.type !== 'expense_direct') {
    return fail(
      'En flujo directo solo se pueden crear gastos directos. El ingreso se genera automáticamente.',
    );
  }

  // Asegurar período mensual
  const occurredDate = new Date(data.occurred_at);
  const year = occurredDate.getFullYear();
  const month = occurredDate.getMonth() + 1;

  const { data: periodId, error: periodError } = await supabase.rpc('ensure_monthly_period', {
    p_household_id: householdId,
    p_year: year,
    p_month: month,
  });

  if (periodError) {
    return fail(`Error al crear período mensual: ${periodError.message}`);
  }

  // Generar UUID para emparejar las transacciones
  const pairId = crypto.randomUUID();

  // 1. Crear el gasto directo (real)
  const { data: expenseTransaction, error: expenseError } = await supabase
    .from('transactions')
    .insert({
      household_id: householdId,
      profile_id: profileId, // Quien registró
      category_id: data.category_id,
      type: 'expense_direct',
      amount: data.amount,
      currency: data.currency,
      description: data.description || null,
      occurred_at: data.occurred_at,
      period_id: periodId,
      flow_type: 'direct',
      transaction_pair_id: pairId,
      created_by_member_id: profileId,
      real_payer_id: data.real_payer_id, // Quien pagó realmente
      created_by_profile_id: profileId,
      updated_by_profile_id: profileId,
    })
    .select('id')
    .single();

  if (expenseError) {
    return fail('Error al crear gasto directo: ' + expenseError.message);
  }

  if (!expenseTransaction) {
    return fail('Error al crear gasto directo');
  }

  // 2. Crear el ingreso directo de equilibrio (si se solicita)
  if (data.creates_balance_pair) {
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
        period_id: periodId,
        flow_type: 'direct',
        transaction_pair_id: pairId,
        created_by_member_id: profileId,
        real_payer_id: data.real_payer_id, // Mismo pagador real
        paid_by: data.real_payer_id, // El ingreso se atribuye al que pagó
        created_by_profile_id: profileId,
        updated_by_profile_id: profileId,
      })
      .select('id')
      .single();

    if (incomeError) {
      // Rollback: eliminar el gasto creado
      await supabase.from('transactions').delete().eq('id', expenseTransaction.id);
      return fail('Error al crear ingreso de equilibrio: ' + incomeError.message);
    }
  }

  revalidatePath('/app');
  revalidatePath('/app/expenses');
  revalidatePath('/app/contributions');

  return ok({
    id: expenseTransaction.id,
    pair_id: data.creates_balance_pair ? pairId : undefined,
  });
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
