'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseServer, getUserHouseholdId } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';

// ============================================================================
// TIPOS
// ============================================================================

export type AdjustmentTemplate = {
  id: string;
  household_id: string;
  name: string;
  category_id: string | null;
  icon: string | null;
  is_active: boolean;
  last_used_amount: number | null;
  sort_order: number;
  created_at: string | null;
  category?: {
    id: string;
    name: string;
    type: 'expense' | 'income';
  } | null;
};

// ============================================================================
// SCHEMAS DE VALIDACIÓN
// ============================================================================

const UpdateTemplateLastUsedSchema = z.object({
  templateId: z.string().uuid('ID de plantilla inválido'),
  amount: z.coerce.number().positive('El monto debe ser positivo'),
});

const CreateFromTemplateSchema = z.object({
  templateId: z.string().uuid('ID de plantilla inválido'),
  amount: z.coerce.number().positive('El monto debe ser positivo'),
  categoryId: z.string().uuid('ID de categoría inválido').optional(),
  reason: z.string().min(1, 'La razón es obligatoria').optional(),
  notes: z.string().optional(),
});

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Obtiene todas las plantillas de ajustes activas del hogar actual
 * con información de la categoría por defecto (si existe)
 */
export async function getAdjustmentTemplates(): Promise<Result<AdjustmentTemplate[]>> {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No tienes un hogar activo');

  const { data: templates, error } = await supabase
    .from('contribution_adjustment_templates')
    .select(
      `
      id,
      household_id,
      name,
      category_id,
      icon,
      is_active,
      last_used_amount,
      sort_order,
      created_at,
      category:categories!contribution_adjustment_templates_category_id_fkey (
        id,
        name,
        type
      )
    `
    )
    .eq('household_id', householdId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[getAdjustmentTemplates] Error:', error);
    return fail('Error al obtener las plantillas');
  }

  // Transformar el resultado para que coincida con el tipo esperado
  const templatesWithCategory: AdjustmentTemplate[] = templates.map((t) => ({
    id: t.id,
    household_id: t.household_id,
    name: t.name,
    category_id: t.category_id,
    icon: t.icon,
    is_active: t.is_active,
    last_used_amount: t.last_used_amount,
    sort_order: t.sort_order,
    created_at: t.created_at,
    category: t.category ? (Array.isArray(t.category) ? t.category[0] : t.category) : null,
  }));

  return ok(templatesWithCategory);
}

/**
 * Actualiza el último monto usado de una plantilla
 * (se llama automáticamente al crear ajuste desde plantilla)
 */
export async function updateTemplateLastUsed(
  templateId: string,
  amount: number
): Promise<Result<void>> {
  const parsed = UpdateTemplateLastUsedSchema.safeParse({ templateId, amount });
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No tienes un hogar activo');

  // Verificar que la plantilla pertenece al hogar del usuario
  const { data: template, error: checkError } = await supabase
    .from('contribution_adjustment_templates')
    .select('household_id')
    .eq('id', parsed.data.templateId)
    .single();

  if (checkError || !template) {
    console.error('[updateTemplateLastUsed] Error checking template:', checkError);
    return fail('Plantilla no encontrada');
  }

  if (template.household_id !== householdId) {
    return fail('No tienes permiso para actualizar esta plantilla');
  }

  // Actualizar last_used_amount
  const { error } = await supabase
    .from('contribution_adjustment_templates')
    .update({ last_used_amount: parsed.data.amount })
    .eq('id', parsed.data.templateId);

  if (error) {
    console.error('[updateTemplateLastUsed] Error updating:', error);
    return fail('Error al actualizar la plantilla');
  }

  revalidatePath('/app/contributions/adjustments');
  return ok();
}

/**
 * Crea un ajuste de contribución desde una plantilla
 * 
 * Este action:
 * 1. Valida los datos del formulario
 * 2. Obtiene información de la plantilla (categoría, nombre)
 * 3. Genera un reason automático si no se proporciona: "Pago [nombre_plantilla] [mes_actual]"
 * 4. Crea la transacción de gasto (expense) en la categoría seleccionada
 * 5. Crea la transacción de ingreso virtual (income) en "Aportación Cuenta Conjunta"
 * 6. Crea el ajuste relacionando ambas transacciones
 * 7. Actualiza el last_used_amount de la plantilla
 */
export async function createAdjustmentFromTemplate(data: {
  templateId: string;
  amount: number;
  categoryId?: string;
  reason?: string;
  notes?: string;
}): Promise<Result<{ adjustmentId: string }>> {
  const parsed = CreateFromTemplateSchema.safeParse(data);
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No tienes un hogar activo');

  // Obtener información de la plantilla
  const { data: template, error: templateError } = await supabase
    .from('contribution_adjustment_templates')
    .select('id, name, category_id, household_id')
    .eq('id', parsed.data.templateId)
    .single();

  if (templateError || !template) {
    console.error('[createAdjustmentFromTemplate] Error fetching template:', templateError);
    return fail('Plantilla no encontrada');
  }

  if (template.household_id !== householdId) {
    return fail('No tienes permiso para usar esta plantilla');
  }

  // Determinar categoryId (prioridad: parámetro > default de plantilla)
  const categoryId = parsed.data.categoryId || template.category_id;
  if (!categoryId) {
    return fail(
      'Debes seleccionar una categoría (la plantilla no tiene categoría por defecto)'
    );
  }

  // Generar reason automático si no se proporciona
  const currentDate = new Date();
  const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  const autoReason = `Pago ${template.name} ${monthName}`;
  const reason = parsed.data.reason || autoReason;

  // Obtener o crear la contribución del mes actual
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  let { data: contribution } = await supabase
    .from('contributions')
    .select('id')
    .eq('household_id', householdId)
    .eq('profile_id', user.id)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  // Si no existe contribución para este mes, crearla automáticamente
  if (!contribution) {
    const { data: newContribution, error: createError } = await supabase
      .from('contributions')
      .insert({
        household_id: householdId,
        profile_id: user.id,
        year,
        month,
        expected_amount: 0, // Se calculará después
        paid_amount: 0,
        status: 'pending',
        created_by: user.id,
      })
      .select('id')
      .single();

    if (createError || !newContribution) {
      console.error('[createAdjustmentFromTemplate] Error creating contribution:', createError);
      return fail('Error al crear la contribución del mes');
    }

    contribution = newContribution;
  }

  // 1. Obtener categoría "Aportación Cuenta Conjunta" para el ingreso virtual
  const { data: incomeCategory, error: incomeCatError } = await supabase
    .from('categories')
    .select('id')
    .eq('household_id', householdId)
    .eq('type', 'income')
    .eq('name', 'Aportación Cuenta Conjunta')
    .maybeSingle();

  if (incomeCatError || !incomeCategory) {
    console.error('[createAdjustmentFromTemplate] Income category not found:', incomeCatError);
    return fail('No se encontró la categoría de ingresos para aportaciones');
  }

  // 2. Crear transacción de gasto (expense)
  const expenseTransaction = {
    household_id: householdId,
    category_id: categoryId,
    type: 'expense' as const,
    amount: parsed.data.amount,
    currency: 'EUR',
    description: `[Pre-pago] ${reason}`,
    occurred_at: currentDate.toISOString(),
    paid_by: user.id,
    created_by: user.id,
    source_type: 'adjustment' as const,
    status: 'confirmed' as const,
    split_type: 'none' as const,
  };

  const { data: expenseData, error: expenseError } = await supabase
    .from('transactions')
    .insert(expenseTransaction)
    .select('id')
    .single();

  if (expenseError || !expenseData) {
    console.error('[createAdjustmentFromTemplate] Error creating expense:', expenseError);
    return fail('Error al crear la transacción de gasto');
  }

  // 3. Crear transacción de ingreso virtual (income)
  const incomeTransaction = {
    household_id: householdId,
    category_id: incomeCategory.id,
    type: 'income' as const,
    amount: parsed.data.amount,
    currency: 'EUR',
    description: `[Ajuste: ${reason}]`,
    occurred_at: currentDate.toISOString(),
    paid_by: user.id,
    created_by: user.id,
    source_type: 'adjustment' as const,
    status: 'confirmed' as const,
  };

  const { data: incomeData, error: incomeError } = await supabase
    .from('transactions')
    .insert(incomeTransaction)
    .select('id')
    .single();

  if (incomeError || !incomeData) {
    console.error('[createAdjustmentFromTemplate] Error creating income:', incomeError);
    // Rollback: eliminar la transacción de gasto
    await supabase.from('transactions').delete().eq('id', expenseData.id);
    return fail('Error al crear la transacción de ingreso');
  }

  // 4. Crear el ajuste de contribución
  const adjustment = {
    contribution_id: contribution.id,
    amount: parsed.data.amount,
    reason,
    category_id: categoryId,
    expense_description: `[Pre-pago] ${reason}`,
    income_description: `[Ajuste: ${reason}]`,
    income_movement_id: incomeData.id,
    movement_id: expenseData.id,
    status: 'approved' as const,
    type: 'prepayment' as const,
    created_by: user.id,
    approved_at: currentDate.toISOString(),
    approved_by: user.id,
  };

  const { data: adjustmentData, error: adjustmentError } = await supabase
    .from('contribution_adjustments')
    .insert(adjustment)
    .select('id')
    .single();

  if (adjustmentError || !adjustmentData) {
    console.error('[createAdjustmentFromTemplate] Error creating adjustment:', adjustmentError);
    // Rollback: eliminar ambas transacciones
    await supabase.from('transactions').delete().eq('id', expenseData.id);
    await supabase.from('transactions').delete().eq('id', incomeData.id);
    return fail('Error al crear el ajuste');
  }

  // 5. Vincular la transacción de gasto con el ajuste (source_id)
  const { error: updateError } = await supabase
    .from('transactions')
    .update({ source_id: adjustmentData.id })
    .eq('id', expenseData.id);

  if (updateError) {
    console.error('[createAdjustmentFromTemplate] Error linking transaction:', updateError);
    // No hacer rollback aquí, el ajuste ya está creado correctamente
  }

  // 6. Actualizar el last_used_amount de la plantilla
  await updateTemplateLastUsed(parsed.data.templateId, parsed.data.amount);

  revalidatePath('/app/contributions/adjustments');
  revalidatePath('/app/contributions');
  revalidatePath('/app');

  return ok({ adjustmentId: adjustmentData.id });
}
