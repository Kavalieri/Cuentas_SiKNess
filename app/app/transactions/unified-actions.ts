'use server';

import type { Result } from '@/lib/result';
import { fail, ok } from '@/lib/result';
import {
  getCurrentUser,
  getUserHouseholdId,
  getUserRoleInActiveHousehold,
  query,
  supabaseServer,
} from '@/lib/supabaseServer';
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
// VALIDACIÓN DE PERÍODOS
// =====================================================

async function validatePeriodForFlow(
  flowType: TransactionFlowType,
  year: number,
  month: number,
): Promise<Result<boolean>> {
  const periodResult = await getOrCreateContributionPeriod(year, month);
  if (!periodResult.ok) {
    return fail(periodResult.message);
  }

  const period = periodResult.data;
  if (!period) {
    return fail('No se pudo obtener información del período');
  }

  if (flowType === 'common' && !period.can_add_common_flows) {
    return fail(
      'Los flujos comunes no están permitidos en este período. El período debe estar en estado LOCKED.',
    );
  }

  if (flowType === 'direct' && !period.can_add_direct_flows) {
    return fail(
      'Los flujos directos no están permitidos en este período. El período está cerrado.',
    );
  }

  return ok(true);
}

/**
 * Obtener o crear período de contribución para un mes específico
 */
export async function getOrCreateContributionPeriod(
  year: number,
  month: number,
): Promise<
  Result<{
    id: string;
    status: 'SETUP' | 'LOCKED' | 'CLOSED';
    can_add_common_flows: boolean;
    can_add_direct_flows: boolean;
  }>
> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No se pudo determinar el hogar activo');
  }

  const supabase = await supabaseServer();

  // Buscar período existente
  const { data: existingPeriod, error: searchError } = await supabase
    .from('contribution_periods')
    .select('*')
    .eq('household_id', householdId)
    .eq('year', year)
    .eq('month', month)
    .single();

  if (searchError && (searchError as { code?: string }).code !== 'PGRST116') {
    return fail('Error al buscar período de contribución');
  }

  if (existingPeriod) {
    const status = existingPeriod.status as 'SETUP' | 'LOCKED' | 'CLOSED';
    return ok({
      id: existingPeriod.id,
      status,
      can_add_common_flows: status === 'LOCKED',
      can_add_direct_flows: status === 'SETUP' || status === 'LOCKED',
    });
  }

  // Crear nuevo período en estado SETUP
  const { data: newPeriod, error: createError } = await supabase
    .from('contribution_periods')
    .insert({
      household_id: householdId,
      year,
      month,
      status: 'SETUP',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (createError || !newPeriod) {
    return fail('Error al crear período de contribución');
  }

  return ok({
    id: newPeriod.id,
    status: 'SETUP',
    can_add_common_flows: false,
    can_add_direct_flows: true,
  });
}

/**
 * Bloquear período y calcular contribuciones
 */
export async function lockContributionPeriod(year: number, month: number): Promise<Result> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No se pudo determinar el hogar activo');
  }

  const user = await getCurrentUser();
  if (!user) {
    return fail('Usuario no autenticado');
  }

  const supabase = await supabaseServer();

  // Verificar que el usuario sea owner
  const { data: membership } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', householdId)
    .eq('profile_id', user.profile_id)
    .single();

  if (!membership || membership.role !== 'owner') {
    return fail('Solo los owners pueden bloquear períodos de contribución');
  }

  // Obtener período
  const periodResult = await getOrCreateContributionPeriod(year, month);
  if (!periodResult.ok) {
    return fail(periodResult.message);
  }

  const period = periodResult.data;
  if (!period || period.status !== 'SETUP') {
    return fail('El período ya está bloqueado o cerrado');
  }

  // Calcular contribuciones usando la función del sistema de períodos
  const { lockContributionPeriod: lockPeriodFunction } = await import(
    '@/lib/contributions/periods'
  );
  const lockResult = await lockPeriodFunction({ year, month });

  if (!lockResult.ok) {
    return fail('Error al calcular contribuciones: ' + lockResult.message);
  }

  // Actualizar estado del período
  const { error: updateError } = await supabase
    .from('contribution_periods')
    .update({
      status: 'LOCKED',
      locked_at: new Date().toISOString(),
      locked_by: user.profile_id,
    })
    .eq('id', period.id);

  if (updateError) {
    return fail('Error al actualizar estado del período');
  }

  revalidatePath('/app/contributions');
  return ok();
}

// =====================================================
// FUNCIÓN PRINCIPAL UNIFICADA
// =====================================================

/**
 * Crea una transacción unificada (reemplaza createTransaction y approvePrepayment)
 */
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

  // Validar período para el flujo
  const occurredDate = new Date(parsed.data.occurred_at);
  const year = occurredDate.getFullYear();
  const month = occurredDate.getMonth() + 1;

  const periodValidation = await validatePeriodForFlow(parsed.data.flow_type, year, month);
  if (!periodValidation.ok) {
    return fail(periodValidation.message || 'Período no válido para este tipo de transacción');
  }

  // Dirigir a la función específica según flujo
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
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
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
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
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
// FUNCIONES DE CONVENIENCIA PARA FORMULARIOS
// =====================================================

/**
 * Crear transacción común desde FormData (compatible con UI existente)
 */
export async function createCommonTransaction(formData: FormData): Promise<Result<{ id: string }>> {
  const data: UnifiedTransactionData = {
    category_id: formData.get('category_id') as string,
    type: formData.get('type') as TransactionType,
    amount: parseFloat(formData.get('amount') as string),
    currency: (formData.get('currency') as string) || 'EUR',
    description: formData.get('description') as string,
    occurred_at: formData.get('occurred_at') as string,
    flow_type: 'common',
    paid_by: formData.get('paid_by') as string,
  };

  const result = await createUnifiedTransaction(data);
  if (!result.ok) return result;

  return ok({ id: result.data?.id || '' });
}

/**
 * Crear gasto directo desde FormData
 */
export async function createDirectExpense(
  formData: FormData,
): Promise<Result<{ id: string; pair_id?: string }>> {
  const data: UnifiedTransactionData = {
    category_id: formData.get('category_id') as string,
    type: 'expense_direct',
    amount: parseFloat(formData.get('amount') as string),
    currency: (formData.get('currency') as string) || 'EUR',
    description: formData.get('description') as string,
    occurred_at: formData.get('occurred_at') as string,
    flow_type: 'direct',
    real_payer_id: formData.get('real_payer_id') as string,
    creates_balance_pair: true,
  };

  return await createUnifiedTransaction(data);
}

// =====================================================
// UTILIDADES PARA CONSULTA
// =====================================================

// Añadir tipos para las funciones de utilidad
interface Transaction {
  id: string;
  type: string;
  amount: number;
  flow_type: string;
  transaction_pair_id?: string;
  [key: string]: unknown;
}

interface FlowStatistics {
  [key: string]: number;
}

/**
 * Obtener transacciones emparejadas de flujo directo
 */
export async function getTransactionPairs(pairId: string): Promise<Result<Transaction[]>> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No se pudo determinar el hogar activo');
  }

  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('household_id', householdId)
    .eq('transaction_pair_id', pairId)
    .order('type', { ascending: false }); // expense_direct primero

  if (error) {
    return fail('Error al obtener transacciones emparejadas');
  }

  return ok((data as Transaction[]) || []);
}

/**
 * Obtener estadísticas de flujos por período
 */
export async function getFlowStatistics(
  year: number,
  month: number,
): Promise<Result<FlowStatistics>> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No se pudo determinar el hogar activo');
  }

  const supabase = await supabaseServer();

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate =
    month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  const { data, error } = await supabase
    .from('transactions')
    .select('flow_type, type, amount')
    .eq('household_id', householdId)
    .gte('occurred_at', startDate)
    .lt('occurred_at', endDate);

  if (error) {
    return fail('Error al obtener estadísticas');
  }

  // Agrupar por flujo y tipo
  const stats = ((data as Transaction[]) || []).reduce((acc: FlowStatistics, t: Transaction) => {
    const key = `${t.flow_type}_${t.type}`;
    acc[key] = (acc[key] || 0) + parseFloat(t.amount.toString());
    return acc;
  }, {} as FlowStatistics);

  return ok(stats);
}

// =====================================================
// FUNCIONES DE UTILIDAD PARA COMPATIBILIDAD UI
// =====================================================

/**
 * Aprobar prepago usando flujo directo - Reemplaza approvePrepayment
 */
export async function approveAdjustmentPrepayment(formData: FormData): Promise<Result> {
  const supabase = await supabaseServer();
  const user = await getCurrentUser();
  if (!user) {
    return fail('Usuario no autenticado');
  }

  const profileId = user.profile_id;

  // Obtener datos del FormData
  const adjustmentId = formData.get('adjustment_id') as string;
  const expenseCategoryId = formData.get('expense_category_id') as string;
  const expenseDescription = formData.get('expense_description') as string;

  if (!adjustmentId || !expenseCategoryId || !expenseDescription) {
    return fail('Faltan datos requeridos');
  }

  // Obtener ajuste y validar estado
  const { data: adjustment, error: adjustmentError } = await supabase
    .from('contribution_adjustments')
    .select(
      `
      *,
      contributions!inner(
        household_id,
        profile_id,
        year,
        month
      )
    `,
    )
    .eq('id', adjustmentId)
    .single();

  if (adjustmentError || !adjustment) {
    return fail('Ajuste no encontrado');
  }

  if (adjustment.status !== 'pending') {
    return fail('Este ajuste ya fue procesado');
  }

  const contribution = adjustment.contributions;
  const householdId = contribution.household_id;

  // Verificar que el usuario sea owner del hogar
  const { data: membership } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', householdId)
    .eq('profile_id', profileId)
    .single();

  if (!membership || membership.role !== 'owner') {
    return fail('Solo los owners pueden aprobar pre-pagos');
  }

  // Calcular monto absoluto (el adjustment tiene monto negativo)
  const absoluteAmount = Math.abs(adjustment.amount);

  // Crear fecha del movimiento (primer día del mes de la contribución)
  const movementDateStr = `${contribution.year}-${String(contribution.month).padStart(2, '0')}-01`;

  // Usar createDirectExpense para crear la transacción directa
  const directExpenseData: UnifiedTransactionData = {
    category_id: expenseCategoryId,
    type: 'expense_direct',
    amount: absoluteAmount,
    currency: 'EUR',
    description: expenseDescription,
    occurred_at: movementDateStr,
    flow_type: 'direct',
    real_payer_id: contribution.profile_id, // El miembro que hizo el prepago
    creates_balance_pair: true,
  };

  const transactionResult = await createUnifiedTransaction(directExpenseData);
  if (!transactionResult.ok) {
    return fail('Error al crear transacciones: ' + transactionResult.message);
  }

  // Actualizar ajuste a aprobado
  const { error: updateError } = await supabase
    .from('contribution_adjustments')
    .update({
      status: 'approved',
      approved_by: profileId,
      approved_at: new Date().toISOString(),
      expense_category_id: expenseCategoryId,
      expense_description: expenseDescription,
      // Usar el nuevo ID de la transacción directa principal
      movement_id: transactionResult.data?.id,
    })
    .eq('id', adjustmentId);

  if (updateError) {
    return fail('Error al actualizar ajuste: ' + updateError.message);
  }

  revalidatePath('/app/contributions');
  revalidatePath('/app/expenses');
  revalidatePath('/app');

  return ok();
}

/**
 * Obtener miembros del hogar con rol - Para compatibilidad con UI existente
 */
export async function getHouseholdMembersWithRole(): Promise<
  Result<{
    members: Array<{ id: string; display_name: string }>;
    userRole: 'owner' | 'member';
    currentUserId: string;
  }>
> {
  const user = await getCurrentUser();
  if (!user) {
    return fail('No autenticado');
  }

  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No tienes un hogar configurado');
  }

  const role = await getUserRoleInActiveHousehold();
  if (!role) {
    return fail('No se pudo determinar tu rol en el hogar');
  }

  const currentProfileId = user.profile_id;

  // Obtener todos los miembros del household con SQL nativo
  const result = await query(
    `SELECT
      hm.profile_id,
      p.id,
      p.display_name
    FROM household_members hm
    JOIN profiles p ON hm.profile_id = p.id
    WHERE hm.household_id = $1`,
    [householdId],
  );

  if (!result.rows || result.rows.length === 0) {
    return fail('Error al obtener miembros del hogar');
  }

  type MemberRaw = {
    profile_id: string;
    id: string;
    display_name: string;
  };

  const typedMembers = result.rows as MemberRaw[];

  return ok({
    members: typedMembers.map((m) => ({
      id: m.id,
      display_name: m.display_name,
    })),
    userRole: role as 'owner' | 'member',
    currentUserId: currentProfileId,
  });
}
