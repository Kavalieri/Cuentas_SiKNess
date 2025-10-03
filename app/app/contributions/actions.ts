'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';

// =====================================================
// Schemas de Validación
// =====================================================

const MemberIncomeSchema = z.object({
  household_id: z.string().uuid(),
  user_id: z.string().uuid(),
  monthly_income: z.coerce.number().nonnegative(),
  effective_from: z.coerce.date(),
});

const HouseholdSettingsSchema = z.object({
  household_id: z.string().uuid(),
  monthly_contribution_goal: z.coerce.number().positive(),
  currency: z.string().min(3).max(3).default('EUR'),
});

const ContributionAdjustmentSchema = z.object({
  contribution_id: z.string().uuid(),
  amount: z.coerce.number().refine((val) => val !== 0, {
    message: 'El ajuste no puede ser cero',
  }),
  reason: z.string().min(3, 'La razón debe tener al menos 3 caracteres'),
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
  // @ts-ignore - Supabase type inference issue
  const { error } = await supabase.from('member_incomes').insert(parsed.data);

  if (error) {
    if (error.code === '23505') {
      return fail('Ya existe un ingreso para esta fecha');
    }
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
  userId: string
): Promise<number> {
  const supabase = await supabaseServer();

  // @ts-ignore - Supabase type inference issue
  const { data, error } = await supabase.rpc('get_member_income', {
    p_household_id: householdId,
    p_user_id: userId,
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
      user_id: calc.user_id,
      year,
      month,
      expected_amount: calc.expected_amount,
      paid_amount: 0,
      status: 'pending',
    }));

    const { error: insertError } = await supabase
      .from('contributions')
      .upsert(contributions, {
        onConflict: 'household_id,user_id,year,month',
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
    .select('expected_amount, household_id, user_id, month, year')
    .eq('id', contributionId)
    .single();

  if (fetchError) return fail(fetchError.message);
  if (!contribution) return fail('Contribución no encontrada');

  // @ts-ignore - Supabase type inference
  const { expected_amount, household_id, user_id, month, year } = contribution;

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
  // @ts-ignore - Supabase type inference issue
  const { error: movementError } = await supabase.from('movements').insert({
    household_id,
    user_id,
    category_id: categoryId,
    type: 'income',
    amount: expected_amount,
    currency: 'EUR',
    note: `Contribución mensual ${month}/${year}`,
    occurred_at: new Date().toISOString().split('T')[0],
  });

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
