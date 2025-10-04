'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';
import { CALCULATION_TYPES } from '@/lib/contributionTypes';
import type { Database } from '@/types/database';

// =====================================================
// Type Helpers
// =====================================================

// Helper type para inserts de transactions que evita problemas con tipos opcionales
type MovementInsert = Database['public']['Tables']['transactions']['Insert'];

// =====================================================
// Schemas de Validación
// =====================================================

const MemberIncomeSchema = z.object({
  household_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  monthly_income: z.coerce.number().nonnegative(),
  effective_from: z.coerce.date(),
});

const HouseholdSettingsSchema = z.object({
  household_id: z.string().uuid(),
  monthly_contribution_goal: z.coerce.number().positive(),
  currency: z.string().min(3).max(3).default('EUR'),
  calculation_type: z.enum([
    CALCULATION_TYPES.PROPORTIONAL,
    CALCULATION_TYPES.EQUAL,
    CALCULATION_TYPES.CUSTOM,
  ]).default(CALCULATION_TYPES.PROPORTIONAL),
});

const ContributionAdjustmentSchema = z.object({
  contribution_id: z.string().uuid(),
  amount: z.coerce.number().refine((val) => val !== 0, {
    message: 'El ajuste no puede ser cero',
  }),
  reason: z.string().min(3, 'La razón debe tener al menos 3 caracteres'),
});

const PrePaymentSchema = z.object({
  household_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020),
  amount: z.coerce.number().positive(),
  category_id: z.string().uuid(),
  description: z.string().min(3, 'La descripción debe tener al menos 3 caracteres'),
});

// =====================================================
// Member Incomes
// =====================================================

export async function setMemberIncome(formData: FormData): Promise<Result> {
  const parsed = MemberIncomeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const supabase = await supabaseServer();
  
  // Convertir fecha a string ISO para Supabase
  const effective_from_str: string = parsed.data.effective_from.toISOString().split('T')[0]!;
  
  const incomeData: {
    household_id: string;
    profile_id: string;
    monthly_income: number;
    effective_from: string;
  } = {
    household_id: parsed.data.household_id,
    profile_id: parsed.data.profile_id,
    monthly_income: parsed.data.monthly_income,
    effective_from: effective_from_str,
  };
  
  // Usar UPSERT para actualizar si ya existe o crear si no existe
  const { error } = await supabase
    .from('member_incomes')
    .upsert(incomeData, {
      onConflict: 'household_id,profile_id,effective_from',
      ignoreDuplicates: false,
    });

  if (error) {
    return fail(error.message);
  }

  // Recalcular contribuciones del mes actual automáticamente
  const now = new Date();
  await calculateAndCreateContributions(
    parsed.data.household_id,
    now.getFullYear(),
    now.getMonth() + 1
  );

  revalidatePath('/app/contributions');
  revalidatePath('/app/household');
  revalidatePath('/app/profile');
  return ok();
}

export async function getMemberIncomes(householdId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('member_incomes')
    .select('*')
    .eq('household_id', householdId)
    .order('effective_from', { ascending: false });

  if (error) return [];
  // @ts-ignore - Supabase type inference issue
  return data || [];
}

export async function getCurrentMemberIncome(
  householdId: string,
  profileId: string
): Promise<number> {
  const supabase = await supabaseServer();

  // @ts-ignore - Supabase type inference issue
  const { data, error } = await supabase.rpc('get_member_income', {
    p_household_id: householdId,
    p_profile_id: profileId,
    p_date: new Date().toISOString().split('T')[0],
  });

  if (error) return 0;
  return data || 0;
}

// =====================================================
// Household Settings
// =====================================================

export async function setContributionGoal(formData: FormData): Promise<Result> {
  const parsed = HouseholdSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const supabase = await supabaseServer();

  // Upsert: insertar o actualizar
  // @ts-ignore - Supabase type inference issue
  const { error } = await supabase
    .from('household_settings')
    .upsert(
      {
        household_id: parsed.data.household_id,
        monthly_contribution_goal: parsed.data.monthly_contribution_goal,
        currency: parsed.data.currency,
        calculation_type: parsed.data.calculation_type,
        updated_at: new Date().toISOString(),
        updated_by: (await supabase.auth.getUser()).data.user?.id,
      },
      { onConflict: 'household_id' }
    );

  if (error) return fail(error.message);

  // Recalcular contribuciones del mes actual automáticamente
  const now = new Date();
  await calculateAndCreateContributions(
    parsed.data.household_id,
    now.getFullYear(),
    now.getMonth() + 1
  );

  revalidatePath('/app/contributions');
  revalidatePath('/app/household');
  return ok();
}

export async function getHouseholdSettings(householdId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('household_settings')
    .select('*')
    .eq('household_id', householdId)
    .single();

  if (error) return null;
  return data;
}

// =====================================================
// Contributions
// =====================================================

export async function calculateAndCreateContributions(
  householdId: string,
  year: number,
  month: number
): Promise<Result> {
  const supabase = await supabaseServer();

  try {
    // Llamar a la función de cálculo
    // @ts-ignore - Supabase type inference issue
    const { data: calculations, error: calcError } = await supabase.rpc(
      'calculate_monthly_contributions',
      {
        p_household_id: householdId,
        p_year: year,
        p_month: month,
      }
    );

    if (calcError) {
      if (calcError.message.includes('Household settings not configured')) {
        return fail('Primero configura la meta de contribución mensual');
      }
      if (calcError.message.includes('No incomes configured')) {
        return fail('Primero configura los ingresos de los miembros');
      }
      return fail(calcError.message);
    }

    // Crear contribuciones para cada miembro
    // @ts-ignore - Supabase type inference
    const contributions = calculations.map((calc) => ({
      household_id: householdId,
      profile_id: calc.profile_id,
      year,
      month,
      expected_amount: calc.expected_amount,
      paid_amount: 0,
      status: 'pending',
    }));

    const { error: insertError } = await supabase
      .from('contributions')
      .upsert(contributions, {
        onConflict: 'household_id,profile_id,year,month',
        ignoreDuplicates: false,
      });

    if (insertError) return fail(insertError.message);

    revalidatePath('/app/contributions');
    return ok();
  } catch (error) {
    return fail((error as Error).message);
  }
}

export async function getMonthlyContributions(
  householdId: string,
  year: number,
  month: number
) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('contributions')
    .select(
      `
      *,
      user:auth.users(id, email)
    `
    )
    .eq('household_id', householdId)
    .eq('year', year)
    .eq('month', month);

  if (error) return [];
  // @ts-ignore - Supabase type inference issue
  return data || [];
}

export async function updateContributionPaidAmount(
  contributionId: string,
  paidAmount: number
): Promise<Result> {
  const supabase = await supabaseServer();

  // @ts-ignore - Supabase type inference issue
  const { error: updateError } = await supabase
    .from('contributions')
    .update({ paid_amount: paidAmount, updated_at: new Date().toISOString() })
    .eq('id', contributionId);

  if (updateError) return fail(updateError.message);

  // Actualizar estado según monto pagado
  // @ts-ignore - Supabase type inference issue
  const { error: statusError } = await supabase.rpc('update_contribution_status', {
    p_contribution_id: contributionId,
  });

  if (statusError) return fail(statusError.message);

  revalidatePath('/app/contributions');
  return ok();
}

/**
 * Marca una contribución como pagada (paid_amount = expected_amount)
 */
export async function markContributionAsPaid(contributionId: string): Promise<Result> {
  const supabase = await supabaseServer();

  // Obtener datos completos de la contribución
  const { data: contribution, error: fetchError } = await supabase
    .from('contributions')
    .select('expected_amount, household_id, profile_id, month, year')
    .eq('id', contributionId)
    .single();

  if (fetchError) return fail(fetchError.message);
  if (!contribution) return fail('Contribución no encontrada');

  // @ts-ignore - Supabase type inference
  const { expected_amount, household_id, profile_id, month, year } = contribution;

  // 1. Buscar o crear categoría "Nómina" (tipo income)
  let { data: nominaCategoryData } = await supabase
    .from('categories')
    .select('id')
    .eq('household_id', household_id)
    .eq('name', 'Nómina')
    .eq('type', 'income')
    .maybeSingle();

  // Si no existe, crearla
  if (!nominaCategoryData) {
    const { data: newCategory, error: createCatError } = await supabase
      .from('categories')
      .insert({
        household_id,
        name: 'Nómina',
        type: 'income',
        icon: '💰',
      })
      .select('id')
      .single();

    if (createCatError || !newCategory) return fail('Error al crear categoría Nómina');
    nominaCategoryData = newCategory;
  }

  // @ts-ignore - Supabase type inference
  const categoryId: string = nominaCategoryData.id;

  // 2. Crear movimiento de ingreso
  const movementData: MovementInsert = {
    household_id,
    profile_id,
    category_id: categoryId,
    type: 'income',
    amount: expected_amount,
    currency: 'EUR',
    description: `Contribución mensual ${month}/${year}`,
    occurred_at: new Date().toISOString().substring(0, 10),
  };

  const { error: movementError } = await supabase.from('transactions').insert(movementData);

  if (movementError) return fail('Error al crear movimiento de ingreso');

  // 3. Actualizar contribución como pagada
  // @ts-ignore
  const result = await updateContributionPaidAmount(contributionId, expected_amount);

  if (!result.ok) return result;

  revalidatePath('/app/contributions');
  revalidatePath('/app');
  revalidatePath('/app/expenses');
  return ok();
}

/**
 * Marca una contribución como no pagada (paid_amount = 0)
 */
export async function markContributionAsUnpaid(contributionId: string): Promise<Result> {
  return updateContributionPaidAmount(contributionId, 0);
}

// =====================================================
// Contribution Adjustments
// =====================================================

export async function addContributionAdjustment(
  formData: FormData
): Promise<Result> {
  const parsed = ContributionAdjustmentSchema.safeParse(
    Object.fromEntries(formData)
  );
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const supabase = await supabaseServer();
  const user = (await supabase.auth.getUser()).data.user;

  if (!user) return fail('No autenticado');

  // @ts-ignore - Supabase type inference issue
  const { error } = await supabase.from('contribution_adjustments').insert({
    contribution_id: parsed.data.contribution_id,
    amount: parsed.data.amount,
    reason: parsed.data.reason,
    created_by: user.id,
  });

  if (error) return fail(error.message);

  // Recalcular el expected_amount de la contribución
  const { data: contribution, error: fetchError } = await supabase
    .from('contributions')
    .select('expected_amount')
    .eq('id', parsed.data.contribution_id)
    .single();

  if (fetchError) return fail(fetchError.message);

  const newExpectedAmount =
    // @ts-ignore
    (contribution.expected_amount || 0) + parsed.data.amount;

  // @ts-ignore - Supabase type inference issue
  const { error: updateError } = await supabase
    .from('contributions')
    .update({
      expected_amount: newExpectedAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.contribution_id);

  if (updateError) return fail(updateError.message);

  revalidatePath('/app/contributions');
  return ok();
}

export async function getContributionAdjustments(contributionId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('contribution_adjustments')
    .select(
      `
      *,
      creator:auth.users(id, email)
    `
    )
    .eq('contribution_id', contributionId)
    .order('created_at', { ascending: false });

  if (error) return [];
  // @ts-ignore - Supabase type inference issue
  return data || [];
}

// =====================================================
// Dashboard de Contribuciones
// =====================================================

export async function getContributionsSummary(householdId: string) {
  const supabase = await supabaseServer();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Obtener contribuciones del mes actual
  const { data: contributions, error } = await supabase
    .from('contributions')
    .select('expected_amount, paid_amount, status')
    .eq('household_id', householdId)
    .eq('year', year)
    .eq('month', month);

  if (error) {
    return {
      totalExpected: 0,
      totalPaid: 0,
      totalPending: 0,
      completionPercentage: 0,
    };
  }

  // @ts-ignore - Supabase type inference issue
  const totalExpected = (contributions || []).reduce(
    (sum: number, c: Record<string, unknown>) => sum + ((c.expected_amount as number) || 0),
    0
  );
  // @ts-ignore - Supabase type inference issue
  const totalPaid = (contributions || []).reduce(
    (sum: number, c: Record<string, unknown>) => sum + ((c.paid_amount as number) || 0),
    0
  );
  const totalPending = totalExpected - totalPaid;
  const completionPercentage =
    totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

  return {
    totalExpected,
    totalPaid,
    totalPending,
    completionPercentage,
  };
}

// =====================================================
// Pre-pagos (Advance Payments)
// =====================================================

/**
 * Crear un pre-pago: gasto que un miembro hace antes de la contribución
 * Se descuenta automáticamente de su contribución mensual esperada
 */
export async function createPrePayment(formData: FormData): Promise<Result> {
  const parsed = PrePaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const supabase = await supabaseServer();
  const user = (await supabase.auth.getUser()).data.user;

  if (!user) return fail('Usuario no autenticado');

  // Obtener profile_id del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) return fail('Usuario no encontrado');

  // Verificar que el usuario es owner del hogar
  const { data: memberData } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', parsed.data.household_id)
    .eq('profile_id', profile.id)
    .single();

  if (!memberData || memberData.role !== 'owner') {
    return fail('Solo el propietario del hogar puede crear pre-pagos');
  }

  // 1. Crear el movimiento de gasto
  const movementData: MovementInsert = {
    household_id: parsed.data.household_id,
    profile_id: parsed.data.profile_id,
    category_id: parsed.data.category_id,
    type: 'expense',
    amount: parsed.data.amount,
    currency: 'EUR',
    description: `[PRE-PAGO] ${parsed.data.description}`,
    occurred_at: new Date().toISOString().substring(0, 10),
  };

  const { data: movement, error: movementError } = await supabase
    .from('transactions')
    .insert(movementData)
    .select('id')
    .single();

  if (movementError || !movement) {
    return fail('Error al crear el movimiento de gasto');
  }

  // 2. Crear el pre-pago
  const { error: prePaymentError } = await supabase
    .from('pre_payments')
    .insert({
      household_id: parsed.data.household_id,
      profile_id: parsed.data.profile_id,
      month: parsed.data.month,
      year: parsed.data.year,
      amount: parsed.data.amount,
      category_id: parsed.data.category_id,
      description: parsed.data.description,
      movement_id: movement.id,
      created_by: user.id,
    });

  if (prePaymentError) {
    console.error('Pre-payment insert error:', prePaymentError);
    // Rollback: eliminar el movimiento si falla el pre-pago
    await supabase.from('transactions').delete().eq('id', movement.id);
    return fail(`Error al crear el pre-pago: ${prePaymentError.message}`);
  }

  // El trigger automáticamente actualizará contribution.pre_payment_amount

  revalidatePath('/app/contributions');
  revalidatePath('/app/expenses');
  revalidatePath('/app');
  return ok();
}

/**
 * Obtener pre-pagos de un hogar para un mes específico
 */
export async function getPrePayments(
  householdId: string,
  year: number,
  month: number
) {
  const supabase = await supabaseServer();

  // Obtener pre-pagos
  const { data: prePayments, error } = await supabase
    .from('pre_payments')
    .select('*')
    .eq('household_id', householdId)
    .eq('year', year)
    .eq('month', month)
    .order('created_at', { ascending: false });

  if (error || !prePayments) return [];

  // Obtener datos de miembros con sus emails
  const { data: membersData } = await supabase.rpc('get_household_members', {
    p_household_id: householdId,
  });

  // Obtener categorías
  const categoryIds = [...new Set(prePayments.map((pp) => pp.category_id).filter(Boolean))] as string[];
  const { data: categories } = categoryIds.length > 0
    ? await supabase
        .from('categories')
        .select('id, name, icon')
        .eq('household_id', householdId)
        .in('id', categoryIds)
    : { data: [] };

  // Construir lookup maps
  const membersMap = new Map(
    (membersData || []).map((m: { profile_id: string; email: string | null }) => [
      m.profile_id,
      m.email || 'Desconocido',
    ])
  );
  const categoriesMap = new Map(
    (categories || []).map((c) => [c.id, { name: c.name, icon: c.icon }])
  );

  // Enriquecer pre-pagos con datos relacionados
  return prePayments.map((pp) => ({
    ...pp,
    user: { email: membersMap.get(pp.profile_id) || 'Desconocido' },
    category: categoriesMap.get(pp.category_id || '') || { name: 'Sin categoría', icon: null },
  }));
}

/**
 * Eliminar un pre-pago
 */
export async function deletePrePayment(prePaymentId: string): Promise<Result> {
  const supabase = await supabaseServer();
  const user = (await supabase.auth.getUser()).data.user;

  if (!user) return fail('Usuario no autenticado');

  // Obtener datos del pre-pago
  const { data: prePayment } = await supabase
    .from('pre_payments')
    .select('household_id, movement_id')
    .eq('id', prePaymentId)
    .single();

  if (!prePayment) return fail('Pre-pago no encontrado');

  // Obtener profile_id del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) return fail('Usuario no encontrado');

  // Verificar que el usuario es owner
  const { data: memberData } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', prePayment.household_id)
    .eq('profile_id', profile.id)
    .single();

  if (!memberData || memberData.role !== 'owner') {
    return fail('Solo el propietario del hogar puede eliminar pre-pagos');
  }

  // Eliminar el pre-pago (esto disparará el trigger para actualizar la contribución)
  const { error: deleteError } = await supabase
    .from('pre_payments')
    .delete()
    .eq('id', prePaymentId);

  if (deleteError) return fail('Error al eliminar el pre-pago');

  // Eliminar el movimiento asociado
  if (prePayment.movement_id) {
    await supabase
      .from('transactions')
      .delete()
      .eq('id', prePayment.movement_id);
  }

  revalidatePath('/app/contributions');
  revalidatePath('/app/expenses');
  revalidatePath('/app');
  return ok();
}

// =====================================================
// Registro de Pagos Personalizados
// =====================================================

/**
 * Registrar un pago de contribución (total, parcial o excedente)
 * Reemplaza a markContributionAsPaid con soporte para montos personalizados
 */
export async function recordContributionPayment(
  contributionId: string,
  amount: number
): Promise<Result> {
  const supabase = await supabaseServer();

  // Obtener datos completos de la contribución
  const { data: contribution, error: fetchError } = await supabase
    .from('contributions')
    .select('expected_amount, pre_payment_amount, paid_amount, household_id, profile_id, month, year')
    .eq('id', contributionId)
    .single();

  if (fetchError) return fail(fetchError.message);
  if (!contribution) return fail('Contribución no encontrada');

  const { expected_amount, pre_payment_amount, paid_amount, household_id, profile_id, month, year } =
    contribution;

  // Calcular monto ajustado
  const adjusted_amount = expected_amount - (pre_payment_amount || 0);

  // Validar que el monto sea positivo
  if (amount <= 0) {
    return fail('El monto debe ser mayor a cero');
  }

  // 1. Buscar o crear categoría "Nómina" (tipo income)
  let { data: nominaCategoryData } = await supabase
    .from('categories')
    .select('id')
    .eq('household_id', household_id)
    .eq('name', 'Nómina')
    .eq('type', 'income')
    .maybeSingle();

  // Si no existe, crearla
  if (!nominaCategoryData) {
    const { data: newCategory, error: createCatError } = await supabase
      .from('categories')
      .insert({
        household_id,
        name: 'Nómina',
        type: 'income',
        icon: '💰',
      })
      .select('id')
      .single();

    if (createCatError || !newCategory) return fail('Error al crear categoría Nómina');
    nominaCategoryData = newCategory;
  }

  const categoryId: string = nominaCategoryData.id;

  // 2. Crear movimiento de ingreso
  const movementData: MovementInsert = {
    household_id,
    profile_id,
    category_id: categoryId,
    type: 'income',
    amount,
    currency: 'EUR',
    description: `Contribución mensual ${month}/${year}`,
    occurred_at: new Date().toISOString().substring(0, 10),
  };

  const { error: movementError } = await supabase.from('transactions').insert(movementData);

  if (movementError) return fail('Error al crear movimiento de ingreso');

  // 3. Actualizar contribución
  const newPaidAmount = (paid_amount || 0) + amount;
  
  let newStatus: string;
  if (newPaidAmount >= adjusted_amount) {
    newStatus = 'paid';
  } else if (newPaidAmount > 0) {
    newStatus = 'partial';
  } else {
    newStatus = 'pending';
  }

  // Si hay sobrepago, marcarlo como overpaid
  if (newPaidAmount > adjusted_amount) {
    newStatus = 'overpaid';
  }

  const { error: updateError } = await supabase
    .from('contributions')
    .update({
      paid_amount: newPaidAmount,
      status: newStatus,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', contributionId);

  if (updateError) return fail('Error al actualizar contribución');

  revalidatePath('/app/contributions');
  revalidatePath('/app');
  revalidatePath('/app/expenses');
  return ok();
}
