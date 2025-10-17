// lib/contributions/periods.ts
// Sistema de períodos de contribución con bloqueo y gestión de flujo directo

'use server';

import { getUserHouseholdId, pgServer } from '@/lib/pgServer';
import type { Result } from '@/lib/result';
import { fail, ok } from '@/lib/result';
import type { Database } from '@/types/database';
import { z } from 'zod';

type Contribution = Database['public']['Tables']['contributions']['Row'];

interface HouseholdSettings {
  monthly_target?: number;
  calculation_type?: string;
}

// =====================================================
// TIPOS Y ENUMS
// =====================================================

export type ContributionPeriodStatus =
  | 'setup' // Configurando contribuciones (solo flujo directo permitido)
  | 'locked' // Contribuciones fijadas, ejercicio abierto
  | 'closed'; // Período cerrado, solo consulta

export interface ContributionPeriodData {
  household_id: string;
  year: number;
  month: number;
  status: ContributionPeriodStatus;
  target_amount: number;
  locked_at?: string;
  locked_by?: string;
  closed_at?: string;
  closed_by?: string;
}

export interface MemberContributionCalculation {
  profile_id: string;
  base_contribution: number;
  direct_expenses_discount: number;
  final_contribution: number;
  status: 'pending' | 'paid' | 'partial';
}

// =====================================================
// ESQUEMAS DE VALIDACIÓN
// =====================================================

const LockContributionPeriodSchema = z.object({
  household_id: z.string().uuid(),
  year: z.number().int().min(2020).max(2030),
  month: z.number().int().min(1).max(12),
});

const _CloseContributionPeriodSchema = z.object({
  household_id: z.string().uuid(),
  year: z.number().int().min(2020).max(2030),
  month: z.number().int().min(1).max(12),
});

// =====================================================
// GESTIÓN DE PERÍODOS
// =====================================================

/**
 * Obtiene el estado actual del período de contribuciones
 */
export async function getContributionPeriodStatus(
  year: number,
  month: number,
): Promise<Result<ContributionPeriodData | null>> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No se pudo determinar el hogar activo');
  }

  const supabase = await pgServer();

  // TODO: Implementar tabla contribution_periods
  // Por ahora, simular basado en contributions existentes
  const { data: contributions, error } = await supabase
    .from('contributions')
    .select('status')
    .eq('household_id', householdId)
    .eq('year', year)
    .eq('month', month);

  if (error) {
    return fail('Error al obtener estado del período');
  }

  if (!contributions || contributions.length === 0) {
    return ok(null); // Período no iniciado
  }

  // Por ahora, determinar estado basado en contributions
  const hasLockedContributions = contributions.some((c: unknown) => {
    const contribution = c as Contribution;
    return contribution.status !== 'pending';
  });

  return ok({
    household_id: householdId,
    year,
    month,
    status: hasLockedContributions ? 'locked' : 'setup',
    target_amount: 0, // TODO: Obtener de household_settings
  });
}

/**
 * Bloquea las contribuciones del período y abre el ejercicio
 * Solo permite esta acción si se está en estado 'setup'
 */
export async function lockContributionPeriod(data: {
  year: number;
  month: number;
}): Promise<Result<MemberContributionCalculation[]>> {
  const parsed = LockContributionPeriodSchema.safeParse({
    ...data,
    household_id: await getUserHouseholdId(),
  });

  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const { household_id, year, month } = parsed.data;
  const supabase = await pgServer();

  // 1. Verificar que el período está en estado 'setup'
  const periodStatus = await getContributionPeriodStatus(year, month);
  if (!periodStatus.ok) {
    return fail(periodStatus.message);
  }

  if (periodStatus.data?.status !== 'setup') {
    return fail('El período ya está bloqueado o cerrado');
  }

  // 2. Calcular contribuciones considerando gastos directos
  const calculations = await calculateContributionsWithDirectExpenses(household_id, year, month);

  if (!calculations.ok || !calculations.data) {
    return fail('Error en cálculo de contribuciones');
  }

  // 3. Crear/actualizar contribuciones con los cálculos finales
  const contributionUpdates = calculations.data.map((calc) => ({
    household_id,
    profile_id: calc.profile_id,
    year,
    month,
    expected_amount: calc.final_contribution,
    paid_amount: 0,
    status: 'pending' as const,
    calculation_method: 'direct_adjusted',
  }));

  const { error: upsertError } = await supabase.from('contributions').upsert(contributionUpdates, {
    onConflict: 'household_id,profile_id,year,month',
    ignoreDuplicates: false,
  });

  if (upsertError) {
    return fail('Error al actualizar contribuciones');
  }

  // 4. TODO: Marcar período como 'locked' en tabla contribution_periods

  return ok(calculations.data);
}

/**
 * Calcula contribuciones considerando gastos directos del período
 */
async function calculateContributionsWithDirectExpenses(
  householdId: string,
  year: number,
  month: number,
): Promise<Result<MemberContributionCalculation[]>> {
  const supabase = await pgServer();

  // 1. Obtener configuración del hogar (meta mensual y método de cálculo)
  const { data: household, error: householdError } = await supabase
    .from('households')
    .select('settings')
    .eq('id', householdId)
    .single();

  if (householdError) {
    return fail('Error al obtener configuración del hogar');
  }

  const settings = household?.settings as HouseholdSettings;
  const targetAmount = settings?.monthly_target || 0;
  const calculationMethod = settings?.calculation_type || 'proportional';

  if (targetAmount <= 0) {
    return fail('Configura primero la meta de contribución mensual');
  }

  // 2. Obtener miembros e ingresos
  const { data: memberIncomes, error: incomesError } = await supabase
    .from('member_incomes')
    .select('profile_id, monthly_income')
    .eq('household_id', householdId)
    .eq('is_active', true);

  if (incomesError || !memberIncomes?.length) {
    return fail('Configura primero los ingresos de los miembros');
  }

  // 3. Obtener gastos directos del período actual
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate =
    month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  const { data: directExpenses, error: expensesError } = await supabase
    .from('transactions')
    .select('real_payer_id, amount')
    .eq('household_id', householdId)
    .eq('type', 'expense_direct')
    .eq('flow_type', 'direct')
    .gte('occurred_at', startDate)
    .lt('occurred_at', endDate);

  if (expensesError) {
    return fail('Error al obtener gastos directos');
  }

  // 4. Agrupar gastos directos por miembro
  type DirectExpenseRow = { real_payer_id: string | null; amount: number };
  const directExpensesByMember = ((directExpenses || []) as unknown as DirectExpenseRow[]).reduce(
    (acc: Record<string, number>, expense) => {
      const payerId = expense.real_payer_id;
      if (payerId) {
        acc[payerId] = (acc[payerId] || 0) + Number(expense.amount);
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  // 5. Calcular contribuciones base según método configurado
  type MemberIncomeRow = { profile_id: string; monthly_income: number };
  const totalIncome = (memberIncomes as unknown as MemberIncomeRow[]).reduce(
    (sum: number, income) => sum + Number(income.monthly_income),
    0,
  );

  const calculations: MemberContributionCalculation[] = (
    memberIncomes as unknown as MemberIncomeRow[]
  ).map((income) => {
    const profileId = income.profile_id;
    const memberIncome = Number(income.monthly_income);

    // Calcular contribución base según método
    let baseContribution = 0;
    switch (calculationMethod) {
      case 'proportional':
        baseContribution = (memberIncome / totalIncome) * targetAmount;
        break;
      case 'equal':
        baseContribution = targetAmount / memberIncomes.length;
        break;
      default:
        baseContribution = targetAmount / memberIncomes.length;
    }

    // Descontar gastos directos
    const directExpensesDiscount = directExpensesByMember[profileId] || 0;
    const finalContribution = Math.max(0, baseContribution - directExpensesDiscount);

    return {
      profile_id: profileId,
      base_contribution: baseContribution,
      direct_expenses_discount: directExpensesDiscount,
      final_contribution: finalContribution,
      status: 'pending' as const,
    };
  });

  return ok(calculations);
}

// =====================================================
// VALIDACIONES DE FLUJO
// =====================================================

/**
 * Verifica si se pueden crear transacciones de flujo directo
 */
export async function canCreateDirectFlowTransactions(
  year: number,
  month: number,
): Promise<Result<boolean>> {
  const periodStatus = await getContributionPeriodStatus(year, month);
  if (!periodStatus.ok) {
    return fail(periodStatus.message);
  }

  // Solo permitir flujo directo en estado 'setup'
  const canCreate = !periodStatus.data || periodStatus.data.status === 'setup';

  return ok(canCreate);
}

/**
 * Verifica si se pueden crear transacciones de flujo común
 */
export async function canCreateCommonFlowTransactions(
  year: number,
  month: number,
): Promise<Result<boolean>> {
  const periodStatus = await getContributionPeriodStatus(year, month);
  if (!periodStatus.ok) {
    return fail(periodStatus.message);
  }

  // Permitir flujo común en todos los estados excepto 'closed'
  const canCreate = !periodStatus.data || periodStatus.data.status !== 'closed';

  return ok(canCreate);
}
