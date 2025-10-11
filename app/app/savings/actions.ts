'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseServer, getCurrentUser, getUserHouseholdId } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';

// ========================================================================
// SCHEMAS DE VALIDACIÓN
// ========================================================================

const TransferCreditSchema = z.object({
  creditId: z.string().uuid(),
  notes: z.string().optional(),
});

const WithdrawSchema = z.object({
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  reason: z.string().min(1, 'La razón es requerida'),
  categoryId: z.string().uuid().optional(),
  createCommonTransaction: z.coerce.boolean().default(false),
});

const DepositSchema = z.object({
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  profileId: z.string().uuid(),
  description: z.string().min(1, 'La descripción es requerida'),
  categoryId: z.string().uuid().optional(),
  category: z.enum(['emergency', 'vacation', 'home', 'investment', 'other']).optional(),
});

// ========================================================================
// TRANSFERIR CRÉDITO AL FONDO DE AHORRO
// ========================================================================

/**
 * Transfiere un crédito de miembro al fondo de ahorro del hogar
 * Llama a la función SQL `transfer_credit_to_savings` que:
 * - Valida que el crédito existe y está activo
 * - Marca el crédito como transferred_to_savings
 * - Crea savings_transaction tipo 'transfer_from_credit'
 * - Actualiza household_savings.current_balance
 */
export async function transferCreditToSavings(
  formData: FormData
): Promise<Result<{ savingsTransactionId: string }>> {
  const parsed = TransferCreditSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const user = await getCurrentUser();
  if (!user) {
    return fail('No autenticado');
  }

  const supabase = await supabaseServer();

  // Obtener profile_id del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    return fail('Usuario no encontrado');
  }

  const { data, error } = await supabase.rpc('transfer_credit_to_savings', {
    p_credit_id: parsed.data.creditId,
    p_transferred_by: profile.id,
    p_notes: parsed.data.notes || undefined,
  });

  if (error) {
    return fail(`Error al transferir crédito: ${error.message}`);
  }

  revalidatePath('/app');
  revalidatePath('/app/savings');
  revalidatePath('/app/contributions');

  return ok({ savingsTransactionId: data as string });
}

// ========================================================================
// RETIRAR DEL FONDO DE AHORRO
// ========================================================================

/**
 * Retira dinero del fondo de ahorro del hogar
 * Llama a la función SQL `withdraw_from_savings` que:
 * - Valida que hay suficiente balance
 * - Crea savings_transaction tipo 'withdrawal'
 * - Actualiza household_savings.current_balance
 * - Opcionalmente crea transacción común (expense) si createCommonTransaction=true
 */
export async function withdrawFromSavings(
  formData: FormData
): Promise<Result<{ savingsTransactionId: string; transactionId?: string }>> {
  const parsed = WithdrawSchema.safeParse(Object.fromEntries(formData));

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

  const supabase = await supabaseServer();

  // Obtener profile_id del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    return fail('Usuario no encontrado');
  }

  const { data, error } = await supabase.rpc('withdraw_from_savings', {
    p_household_id: householdId,
    p_amount: parsed.data.amount,
    p_reason: parsed.data.reason,
    p_withdrawn_by: profile.id,
    p_create_common_transaction: parsed.data.createCommonTransaction,
    p_category_id: parsed.data.categoryId || undefined,
    p_notes: undefined,
  });

  if (error) {
    return fail(`Error al retirar del ahorro: ${error.message}`);
  }

  revalidatePath('/app');
  revalidatePath('/app/savings');
  revalidatePath('/app/expenses');

  return ok(data as { savingsTransactionId: string; transactionId?: string });
}

// ========================================================================
// DEPOSITAR AL FONDO DE AHORRO
// ========================================================================

/**
 * Deposita dinero al fondo de ahorro del hogar
 * Llama a la función SQL `deposit_to_savings` que:
 * - Crea savings_transaction tipo 'deposit'
 * - Actualiza household_savings.current_balance
 * - Registra quién depositó (source_profile_id)
 */
export async function depositToSavings(
  formData: FormData
): Promise<Result<{ savingsTransactionId: string }>> {
  const parsed = DepositSchema.safeParse(Object.fromEntries(formData));

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

  const supabase = await supabaseServer();

  // Obtener profile_id del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    return fail('Usuario no encontrado');
  }

  const { data, error } = await supabase.rpc('deposit_to_savings', {
    p_household_id: householdId,
    p_amount: parsed.data.amount,
    p_source_profile_id: parsed.data.profileId,
    p_description: parsed.data.description,
    p_category: parsed.data.category || undefined,
    p_notes: undefined,
    p_created_by: profile.id,
  });

  if (error) {
    return fail(`Error al depositar al ahorro: ${error.message}`);
  }

  revalidatePath('/app');
  revalidatePath('/app/savings');

  return ok({ savingsTransactionId: data as string });
}

// ========================================================================
// OBTENER TRANSACCIONES DE AHORRO
// ========================================================================

/**
 * Obtiene todas las transacciones de ahorro del household con joins
 */
export async function getSavingsTransactions(_params?: {
  type?: 'deposit' | 'withdrawal' | 'transfer_from_credit' | 'interest' | 'adjustment';
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<Result<unknown[]>> {
  // La tabla savings_transactions no existe aún, devolver array vacío
  return ok([]);
}

// ========================================================================
// OBTENER ESTADO DEL FONDO DE AHORRO
// ========================================================================

/**
 * Obtiene el estado actual del fondo de ahorro del household
 */
export async function getHouseholdSavings(): Promise<Result<unknown>> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No tienes un hogar configurado');
  }

  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('household_savings')
    .select('*')
    .eq('household_id', householdId)
    .single();

  if (error) {
    // Si no existe, retornar balance 0
    if ((error as { code?: string }).code === 'PGRST116') {
      return ok({
        household_id: householdId,
        current_balance: 0,
        goal_amount: null,
        goal_description: null,
        goal_deadline: null,
      });
    }
    return fail('Error al obtener balance de ahorros');
  }

  return ok(data);
}

// ========================================================================
// ACTUALIZAR META DE AHORRO
// ========================================================================

const UpdateSavingsGoalSchema = z.object({
  goalAmount: z.coerce.number().positive().optional(),
  goalDescription: z.string().optional(),
  goalDeadline: z.string().optional(), // ISO date string
});

/**
 * Actualiza la meta de ahorro del household
 */
export async function updateSavingsGoal(formData: FormData): Promise<Result> {
  const parsed = UpdateSavingsGoalSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No tienes un hogar configurado');
  }

  const supabase = await supabaseServer();

  const { error } = await supabase
    .from('household_savings')
    .update({
      goal_amount: parsed.data.goalAmount || undefined,
      goal_description: parsed.data.goalDescription || undefined,
      goal_deadline: parsed.data.goalDeadline || undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('household_id', householdId);

  if (error) {
    return fail(`Error al actualizar meta: ${error.message}`);
  }

  revalidatePath('/app/savings');
  return ok();
}
