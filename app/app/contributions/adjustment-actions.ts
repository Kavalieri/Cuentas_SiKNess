'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';
import type { Database } from '@/types/database';

// =====================================================
// Type Helpers
// =====================================================

type AdjustmentRow = Database['public']['Tables']['contribution_adjustments']['Row'];
type AdjustmentInsert = Database['public']['Tables']['contribution_adjustments']['Insert'];
type MovementInsert = Database['public']['Tables']['transactions']['Insert'];

// =====================================================
// Helper: Obtener Profile ID del usuario autenticado
// =====================================================

async function getCurrentProfileId(supabase: Awaited<ReturnType<typeof supabaseServer>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  return profile?.id || null;
}

// =====================================================
// Schemas de Validación
// =====================================================

const CreatePrepaymentRequestSchema = z.object({
  contribution_id: z.string().uuid(),
  amount: z.coerce.number().negative({ message: 'El monto debe ser negativo (reducción de contribución)' }),
  reason: z.string().min(3, 'La razón debe tener al menos 3 caracteres'),
  category_id: z.string().uuid().optional(),
  expense_description: z.string().optional(),
  income_description: z.string().optional(),
});

const ApprovePrepaymentSchema = z.object({
  adjustment_id: z.string().uuid(),
  expense_category_id: z.string().uuid(),
  expense_description: z.string().min(1, 'La descripción del gasto es requerida'),
  income_description: z.string().min(1, 'La descripción del ingreso es requerida'),
});

const RejectPrepaymentSchema = z.object({
  adjustment_id: z.string().uuid(),
  rejection_reason: z.string().min(3, 'Debe proporcionar una razón para el rechazo'),
});

const RecordExtraIncomeSchema = z.object({
  contribution_id: z.string().uuid(),
  amount: z.coerce.number().negative({ message: 'El monto debe ser negativo (reducción de contribución)' }),
  reason: z.string().min(3, 'La razón debe tener al menos 3 caracteres'),
});

// =====================================================
// 1. Crear Solicitud de Pre-pago (Miembro)
// =====================================================

export async function createPrepaymentRequest(formData: FormData): Promise<Result<{ id: string }>> {
  const parsed = CreatePrepaymentRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return fail('Usuario no autenticado');
  }

  // Obtener profile_id del usuario actual
  const profileId = await getCurrentProfileId(supabase);
  if (!profileId) {
    return fail('Perfil de usuario no encontrado');
  }

  // Verificar que el usuario sea miembro del hogar de esta contribución
  const { data: contribution, error: contributionError } = await supabase
    .from('contributions')
    .select('household_id, profile_id')
    .eq('id', parsed.data.contribution_id)
    .single();

  if (contributionError || !contribution) {
    return fail('Contribución no encontrada');
  }

  const { data: membership } = await supabase
    .from('household_members')
    .select('profile_id')
    .eq('household_id', contribution.household_id)
    .eq('profile_id', profileId)
    .single();

  if (!membership) {
    return fail('No tienes permiso para crear ajustes en este hogar');
  }

  // Crear ajuste con estado pending
  const adjustmentData: AdjustmentInsert = {
    contribution_id: parsed.data.contribution_id,
    amount: parsed.data.amount,
    type: 'prepayment',
    reason: parsed.data.reason,
    category_id: parsed.data.category_id || null,
    expense_description: parsed.data.expense_description || null,
    income_description: parsed.data.income_description || null,
    status: 'pending',
    created_by: profileId, // Usar profile_id en lugar de auth_user_id
  };

  const { data: adjustment, error } = await supabase
    .from('contribution_adjustments')
    .insert(adjustmentData)
    .select('id')
    .single();

  if (error) {
    return fail(error.message);
  }

  // TODO: Notificar a owners del hogar

  revalidatePath('/app/contributions');
  return ok({ id: adjustment.id });
}

// =====================================================
// 2. Aprobar Pre-pago (Owner)
// =====================================================

export async function approvePrepayment(formData: FormData): Promise<Result> {
  const parsed = ApprovePrepaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return fail('Usuario no autenticado');
  }

  // Obtener profile_id del usuario actual
  const profileId = await getCurrentProfileId(supabase);
  if (!profileId) {
    return fail('Perfil de usuario no encontrado');
  }

  // Obtener ajuste y validar estado
  const { data: adjustment, error: adjustmentError } = await supabase
    .from('contribution_adjustments')
    .select(`
      *,
      contributions!inner(
        household_id,
        profile_id,
        year,
        month
      )
    `)
    .eq('id', parsed.data.adjustment_id)
    .single();

  if (adjustmentError || !adjustment) {
    return fail('Ajuste no encontrado');
  }

  if (adjustment.status !== 'pending') {
    return fail('Este ajuste ya fue procesado');
  }

  // Verificar que el usuario sea owner del hogar
  const { data: membership } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', adjustment.contributions.household_id)
    .eq('profile_id', profileId)
    .single();

  if (!membership || membership.role !== 'owner') {
    return fail('Solo los owners pueden aprobar pre-pagos');
  }

  // Obtener categoría para validar
  const { data: category } = await supabase
    .from('categories')
    .select('name, type')
    .eq('id', parsed.data.expense_category_id)
    .single();

  if (!category) {
    return fail('Categoría no encontrada');
  }

  if (category.type !== 'expense') {
    return fail('La categoría debe ser de tipo gasto');
  }

  // Calcular monto absoluto (el adjustment tiene monto negativo)
  const absoluteAmount = Math.abs(adjustment.amount);

  // Crear fecha del movimiento (usamos el primer día del mes de la contribución)
  const movementDate = new Date(adjustment.contributions.year, adjustment.contributions.month - 1, 1);
  const movementDateStr = movementDate.toISOString().split('T')[0]!;

  // 1. Crear movimiento de GASTO (expense)
  const expenseData: MovementInsert = {
    household_id: adjustment.contributions.household_id,
    type: 'expense',
    amount: absoluteAmount,
    currency: 'EUR', // TODO: Obtener de household_settings
    category_id: parsed.data.expense_category_id,
    description: parsed.data.expense_description,
    occurred_at: movementDateStr,
  };

  const { data: expenseMovement, error: expenseError } = await supabase
    .from('transactions')
    .insert(expenseData)
    .select('id')
    .single();

  if (expenseError || !expenseMovement) {
    return fail('Error al crear movimiento de gasto: ' + expenseError?.message);
  }

  // 2. Crear movimiento de INGRESO VIRTUAL (income)
  const incomeData: MovementInsert = {
    household_id: adjustment.contributions.household_id,
    type: 'income',
    amount: absoluteAmount,
    currency: 'EUR',
    category_id: null, // Sin categoría para ingresos virtuales
    description: parsed.data.income_description,
    occurred_at: movementDateStr,
  };

  const { data: incomeMovement, error: incomeError } = await supabase
    .from('transactions')
    .insert(incomeData)
    .select('id')
    .single();

  if (incomeError || !incomeMovement) {
    // Rollback: eliminar el gasto creado
    await supabase.from('transactions').delete().eq('id', expenseMovement.id);
    return fail('Error al crear movimiento de ingreso: ' + incomeError?.message);
  }

  // 3. Actualizar ajuste a aprobado y vincular movimientos
  const { error: updateError } = await supabase
    .from('contribution_adjustments')
    .update({
      status: 'approved',
      approved_by: profileId, // Usar profile_id en lugar de auth_user_id
      approved_at: new Date().toISOString(),
      expense_category_id: parsed.data.expense_category_id,
      expense_description: parsed.data.expense_description,
      income_description: parsed.data.income_description,
      movement_id: expenseMovement.id,
      income_movement_id: incomeMovement.id,
    })
    .eq('id', parsed.data.adjustment_id);

  if (updateError) {
    // Rollback: eliminar ambos movimientos
    await supabase.from('transactions').delete().eq('id', expenseMovement.id);
    await supabase.from('transactions').delete().eq('id', incomeMovement.id);
    return fail('Error al actualizar ajuste: ' + updateError.message);
  }

  // 4. Recalcular contribución del mes
  // TODO: Implementar recalculo automático de paid_amount y status

  // TODO: Notificar al miembro de la aprobación

  revalidatePath('/app/contributions');
  revalidatePath('/app/expenses');
  revalidatePath('/app');
  
  return ok();
}

// =====================================================
// 3. Rechazar Pre-pago (Owner)
// =====================================================

export async function rejectPrepayment(formData: FormData): Promise<Result> {
  const parsed = RejectPrepaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return fail('Usuario no autenticado');
  }

  // Obtener profile_id del usuario actual
  const profileId = await getCurrentProfileId(supabase);
  if (!profileId) {
    return fail('Perfil de usuario no encontrado');
  }

  // Obtener ajuste y validar estado
  const { data: adjustment, error: adjustmentError } = await supabase
    .from('contribution_adjustments')
    .select(`
      *,
      contributions!inner(household_id)
    `)
    .eq('id', parsed.data.adjustment_id)
    .single();

  if (adjustmentError || !adjustment) {
    return fail('Ajuste no encontrado');
  }

  if (adjustment.status !== 'pending') {
    return fail('Este ajuste ya fue procesado');
  }

  // Verificar que el usuario sea owner del hogar
  const { data: membership } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', adjustment.contributions.household_id)
    .eq('profile_id', profileId)
    .single();

  if (!membership || membership.role !== 'owner') {
    return fail('Solo los owners pueden rechazar pre-pagos');
  }

  // Actualizar ajuste a rechazado
  const updatedReason = `${adjustment.reason}\n\n❌ RECHAZADO: ${parsed.data.rejection_reason}`;
  
  const { error: updateError } = await supabase
    .from('contribution_adjustments')
    .update({
      status: 'rejected',
      rejected_by: profileId, // Usar profile_id en lugar de auth_user_id
      rejected_at: new Date().toISOString(),
      reason: updatedReason,
    })
    .eq('id', parsed.data.adjustment_id);

  if (updateError) {
    return fail('Error al rechazar ajuste: ' + updateError.message);
  }

  // TODO: Notificar al miembro del rechazo

  revalidatePath('/app/contributions');
  
  return ok();
}

// =====================================================
// 4. Registrar Ingreso Extra (Miembro)
// =====================================================

export async function recordExtraIncome(formData: FormData): Promise<Result> {
  const parsed = RecordExtraIncomeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return fail('Usuario no autenticado');
  }

  // Obtener profile_id del usuario actual
  const profileId = await getCurrentProfileId(supabase);
  if (!profileId) {
    return fail('Perfil de usuario no encontrado');
  }

  // Obtener contribución
  const { data: contribution, error: contributionError } = await supabase
    .from('contributions')
    .select('household_id, profile_id, year, month')
    .eq('id', parsed.data.contribution_id)
    .single();

  if (contributionError || !contribution) {
    return fail('Contribución no encontrada');
  }

  // Verificar que el usuario sea miembro del hogar
  const { data: membership } = await supabase
    .from('household_members')
    .select('profile_id')
    .eq('household_id', contribution.household_id)
    .eq('profile_id', profileId)
    .single();

  if (!membership) {
    return fail('No tienes permiso para crear ajustes en este hogar');
  }

  // Calcular monto absoluto
  const absoluteAmount = Math.abs(parsed.data.amount);

  // Crear fecha del movimiento
  const movementDate = new Date(contribution.year, contribution.month - 1, 1);
  const movementDateStr = movementDate.toISOString().split('T')[0]!;

  // 1. Crear movimiento de INGRESO
  const incomeData: MovementInsert = {
    household_id: contribution.household_id,
    type: 'income',
    amount: absoluteAmount,
    currency: 'EUR', // TODO: Obtener de household_settings
    category_id: null, // Sin categoría para ingresos extra
    description: `Ingreso extra: ${parsed.data.reason}`,
    occurred_at: movementDateStr,
  };

  const { data: incomeMovement, error: incomeError } = await supabase
    .from('transactions')
    .insert(incomeData)
    .select('id')
    .single();

  if (incomeError || !incomeMovement) {
    return fail('Error al crear movimiento: ' + incomeError?.message);
  }

  // 2. Crear ajuste con estado approved (automático para ingresos extra)
  const adjustmentData: AdjustmentInsert = {
    contribution_id: parsed.data.contribution_id,
    amount: parsed.data.amount,
    type: 'extra_income',
    reason: parsed.data.reason,
    status: 'approved',
    approved_by: profileId, // Usar profile_id en lugar de auth_user_id
    approved_at: new Date().toISOString(),
    movement_id: incomeMovement.id,
    created_by: profileId, // Usar profile_id en lugar de auth_user_id
  };

  const { error: adjustmentError } = await supabase
    .from('contribution_adjustments')
    .insert(adjustmentData);

  if (adjustmentError) {
    // Rollback: eliminar movimiento
    await supabase.from('transactions').delete().eq('id', incomeMovement.id);
    return fail('Error al crear ajuste: ' + adjustmentError.message);
  }

  // 3. Recalcular contribución del mes
  // TODO: Implementar recalculo automático

  revalidatePath('/app/contributions');
  revalidatePath('/app/expenses');
  revalidatePath('/app');
  
  return ok();
}

// =====================================================
// 5. Actualizar Ajuste Pendiente (Owner, antes de aprobar)
// =====================================================

export async function updatePendingAdjustment(formData: FormData): Promise<Result> {
  const UpdatePendingSchema = z.object({
    adjustment_id: z.string().uuid(),
    expense_category_id: z.string().uuid().optional(),
    expense_description: z.string().optional(),
    income_description: z.string().optional(),
  });

  const parsed = UpdatePendingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return fail('Usuario no autenticado');
  }

  // Obtener profile_id del usuario actual
  const profileId = await getCurrentProfileId(supabase);
  if (!profileId) {
    return fail('Perfil de usuario no encontrado');
  }

  // Obtener ajuste y validar estado
  const { data: adjustment, error: adjustmentError } = await supabase
    .from('contribution_adjustments')
    .select(`
      *,
      contributions!inner(household_id)
    `)
    .eq('id', parsed.data.adjustment_id)
    .single();

  if (adjustmentError || !adjustment) {
    return fail('Ajuste no encontrado');
  }

  if (adjustment.status !== 'pending') {
    return fail('Solo se pueden editar ajustes pendientes');
  }

  // Verificar que el usuario sea owner del hogar
  const { data: membership } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', adjustment.contributions.household_id)
    .eq('profile_id', profileId)
    .single();

  if (!membership || membership.role !== 'owner') {
    return fail('Solo los owners pueden editar ajustes');
  }

  // Construir objeto de actualización solo con campos definidos
  const updateData: Partial<AdjustmentInsert> = {};
  
  if (parsed.data.expense_category_id) {
    updateData.expense_category_id = parsed.data.expense_category_id;
  }
  if (parsed.data.expense_description !== undefined) {
    updateData.expense_description = parsed.data.expense_description;
  }
  if (parsed.data.income_description !== undefined) {
    updateData.income_description = parsed.data.income_description;
  }

  // Actualizar solo los campos proporcionados
  const { error: updateError } = await supabase
    .from('contribution_adjustments')
    .update(updateData)
    .eq('id', parsed.data.adjustment_id);

  if (updateError) {
    return fail('Error al actualizar ajuste: ' + updateError.message);
  }

  revalidatePath('/app/contributions');
  
  return ok();
}

// =====================================================
// 6. Helpers - Obtener Ajustes Pendientes (Owner)
// =====================================================

export async function getPendingAdjustments(): Promise<Result<AdjustmentRow[]>> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return fail('Usuario no autenticado');
  }

  // Obtener profile_id del usuario actual
  const profileId = await getCurrentProfileId(supabase);
  if (!profileId) {
    return fail('Perfil de usuario no encontrado');
  }

  // Obtener household_id activo del usuario
  const householdId = await import('@/lib/supabaseServer').then(m => m.getUserHouseholdId());
  if (!householdId) {
    return fail('No se pudo determinar el hogar activo');
  }

  // Verificar que sea owner
  const { data: membership } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', householdId)
    .eq('profile_id', profileId)
    .single();

  if (!membership || membership.role !== 'owner') {
    return fail('Solo los owners pueden ver ajustes pendientes');
  }

  // Obtener ajustes pendientes del hogar
  const { data: adjustments, error } = await supabase
    .from('contribution_adjustments')
    .select(`
      *,
      contributions!inner(
        household_id,
        profile_id,
        year,
        month,
        profiles!inner(display_name, email)
      ),
      category:categories!category_id(name, type),
      expense_category:categories!expense_category_id(name, type)
    `)
    .eq('contributions.household_id', householdId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    return fail('Error al obtener ajustes: ' + error.message);
  }

  return ok(adjustments as unknown as AdjustmentRow[]);
}
