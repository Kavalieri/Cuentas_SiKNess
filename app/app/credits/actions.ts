'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseServer, getCurrentUser, getUserHouseholdId } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';

// ========================================================================
// SCHEMAS DE VALIDACIÓN
// ========================================================================

const MonthlyDecisionSchema = z.object({
  creditId: z.string().uuid(),
  decision: z.enum(['apply_to_month', 'keep_active', 'transfer_to_savings']),
  targetMonth: z.coerce.number().int().min(1).max(12).optional(),
  targetYear: z.coerce.number().int().optional(),
});

// ========================================================================
// OBTENER CRÉDITOS PENDIENTES DE DECISIÓN
// ========================================================================

/**
 * Obtiene todos los créditos activos del usuario actual
 * que requieren decisión mensual
 */
export async function getPendingCredits(): Promise<
  Result<
    Array<{
      id: string;
      amount: number;
      currency: string;
      source_month: number;
      source_year: number;
      status: string;
      monthly_decision: string | null;
      profile_id: string;
      created_at: string;
    }>
  >
> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No tienes un hogar activo');
  }

  const user = await getCurrentUser();
  if (!user) {
    return fail('No autenticado');
  }

  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('member_credits')
    .select('id, amount, currency, source_month, source_year, status, monthly_decision, profile_id, created_at')
    .eq('household_id', householdId)
    .eq('profile_id', user.profile_id)
    .in('status', ['active', 'pending_decision'])
    .order('created_at', { ascending: true });

  if (error) {
    return fail('Error en operación');
  }

  type CreditData = {
    id: string;
    amount: number;
    currency: string;
    source_month: number;
    source_year: number;
    status: string;
    monthly_decision: string | null;
    profile_id: string;
    created_at: string;
  };

  const typedData = (data as unknown as CreditData[]) ?? [];
  return ok(typedData);
}

/**
 * Obtiene la contribución actual del usuario para un mes específico
 */
export async function getCurrentContribution(
  year: number,
  month: number
): Promise<Result<{ expected_amount: number | null; paid_amount: number } | null>> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No tienes un hogar activo');
  }

  const user = await getCurrentUser();
  if (!user) {
    return fail('No autenticado');
  }

  const supabase = await supabaseServer();

  // Primero obtener el período
  const { data: period, error: periodError } = await supabase
    .from('monthly_periods')
    .select('id')
    .eq('household_id', householdId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (periodError) {
    return fail('Error en operación');
  }

  if (!period) {
    return ok(null);
  }

  // Obtener contribución del usuario
  const { data, error } = await supabase
    .from('contributions')
    .select('expected_amount, paid_amount')
    .eq('period_id', period.id)
    .eq('profile_id', user.profile_id)
    .maybeSingle();

  if (error) {
    return fail('Error en operación');
  }

  type ContributionData = {
    expected_amount: number | null;
    paid_amount: number;
  };

  const typedData = data as unknown as ContributionData | null;
  return ok(typedData);
}

// ========================================================================
// PROCESAR DECISIÓN MENSUAL DE CRÉDITO
// ========================================================================

/**
 * Procesa la decisión mensual de un crédito:
 * - apply_to_month: Aplica el crédito a la contribución del mes actual
 * - keep_active: Mantiene el crédito activo para futuros meses
 * - transfer_to_savings: Transfiere el crédito al fondo de ahorro
 */
export async function processMonthlyDecision(formData: FormData): Promise<Result> {
  const parsed = MonthlyDecisionSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No tienes un hogar activo');
  }

  const user = await getCurrentUser();
  if (!user) {
    return fail('No autenticado');
  }

  const supabase = await supabaseServer();

  // Verificar que el crédito existe y pertenece al usuario
  const { data: credit, error: creditError } = await supabase
    .from('member_credits')
    .select('id, amount, status, profile_id, household_id')
    .eq('id', parsed.data.creditId)
    .single();

  if (creditError || !credit) {
    return fail('Crédito no encontrado');
  }

  if (credit.profile_id !== user.profile_id) {
    return fail('No tienes permiso para modificar este crédito');
  }

  if (credit.household_id !== householdId) {
    return fail('El crédito no pertenece a tu hogar activo');
  }

  if (!['active', 'pending_decision'].includes(credit.status)) {
    return fail('El crédito no está en un estado válido para tomar decisiones');
  }

  const { decision } = parsed.data;

  // Ejecutar acción según la decisión
  if (decision === 'apply_to_month') {
    // Aplicar crédito a la contribución del mes especificado (o actual)
    const targetYear = parsed.data.targetYear || new Date().getFullYear();
    const targetMonth = parsed.data.targetMonth || new Date().getMonth() + 1;

    // Obtener o crear el período
    const { data: periodId, error: periodError } = await supabase.rpc('ensure_monthly_period', {
      p_household_id: householdId,
      p_year: targetYear,
      p_month: targetMonth,
    });

    if (periodError) {
      return fail('Error en operación');
    }

    // Obtener contribución del usuario en ese período
    const { data: contribution, error: contributionError } = await supabase
      .from('contributions')
      .select('id, expected_amount, paid_amount')
      .eq('period_id', periodId)
      .eq('profile_id', user.profile_id)
      .maybeSingle();

    if (contributionError) {
      return fail('Error en operación');
    }

    if (!contribution) {
      return fail('No se encontró una contribución para este período');
    }

    // Actualizar el crédito
    const { error: updateError } = await supabase
      .from('member_credits')
      .update({
        status: 'applied',
        monthly_decision: 'apply_to_month',
        applied_at: new Date().toISOString(),
        applied_to_contribution_id: contribution.id,
        applied_to_period_id: periodId,
      })
      .eq('id', parsed.data.creditId);

    if (updateError) {
      return fail('Error en operación');
    }

    // Actualizar paid_amount de la contribución
    const newPaidAmount = Number(contribution.paid_amount) + Number(credit.amount);

    const { error: contributionUpdateError } = await supabase
      .from('contributions')
      .update({
        paid_amount: newPaidAmount,
      })
      .eq('id', contribution.id);

    if (contributionUpdateError) {
      return fail('Error en operación');
    }

    revalidatePath('/app');
    revalidatePath('/app/contributions');
    return ok();
  } else if (decision === 'keep_active') {
    // Mantener activo - solo actualizar monthly_decision
    const { error: updateError } = await supabase
      .from('member_credits')
      .update({
        monthly_decision: 'keep_active',
      })
      .eq('id', parsed.data.creditId);

    if (updateError) {
      return fail('Error en operación');
    }

    revalidatePath('/app');
    return ok();
  } else if (decision === 'transfer_to_savings') {
    // Transferir al fondo de ahorro - llamar a la función SQL existente
    const { error: transferError } = await supabase.rpc('transfer_credit_to_savings', {
      p_credit_id: parsed.data.creditId,
      p_transferred_by: user.id,
      p_notes: 'Transferido mediante decisión mensual',
    });

    if (transferError) {
      return fail('Error en operación');
    }

    revalidatePath('/app');
    revalidatePath('/app/savings');
    return ok();
  }

  return fail('Decisión no válida');
}

/**
 * Obtiene el total de créditos activos de todo el household
 * y el balance descontando estos créditos
 */
export async function getHouseholdCreditsBalance(): Promise<
  Result<{
    totalActiveCredits: number;
    totalReservedCredits: number;
    balanceAfterCredits: number;
    totalIncome: number;
    totalExpenses: number;
    rawBalance: number;
  }>
> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No tienes un hogar activo');
  }

  const supabase = await supabaseServer();

  // 1. Obtener créditos totales del household
  const { data: credits } = await supabase
    .from('member_credits')
    .select('amount, reserved_at')
    .eq('household_id', householdId)
    .eq('status', 'active');

  const creditsData = (credits as unknown as Array<{ amount: number; reserved_at: string | null }>) ?? [];
  const totalActiveCredits = creditsData.filter(c => !c.reserved_at).reduce((sum, c) => sum + Number(c.amount), 0);
  const totalReservedCredits = creditsData.filter(c => c.reserved_at).reduce((sum, c) => sum + Number(c.amount), 0);

  // 2. Obtener balance total del household (todos los transactions)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('household_id', householdId);

  const transactionsData = (transactions as unknown as Array<{ type: string; amount: number }>) ?? [];
  const totalIncome = transactionsData.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpenses = transactionsData.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
  const rawBalance = totalIncome - totalExpenses;

  // 3. Balance después de descontar créditos (dinero realmente disponible)
  const balanceAfterCredits = rawBalance - totalActiveCredits - totalReservedCredits;

  return ok({
    totalActiveCredits,
    totalReservedCredits,
    balanceAfterCredits,
    totalIncome,
    totalExpenses,
    rawBalance,
  });
}
