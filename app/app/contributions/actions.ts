'use server';

import { CALCULATION_TYPES } from '@/lib/contributionTypes';
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
// Type Helpers
// =====================================================

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
  calculation_type: z
    .enum([CALCULATION_TYPES.PROPORTIONAL, CALCULATION_TYPES.EQUAL, CALCULATION_TYPES.CUSTOM])
    .default(CALCULATION_TYPES.PROPORTIONAL),
});

const ContributionAdjustmentSchema = z.object({
  contribution_id: z.string().uuid(),
  amount: z.coerce.number().refine((val) => val !== 0, {
    message: 'El ajuste no puede ser cero',
  }),
  type: z.enum(['manual', 'prepayment']).default('manual'),
  reason: z.string().min(3, 'La razón debe tener al menos 3 caracteres'),
  category_id: z.string().uuid().optional(),
  movement_id: z.string().uuid().optional(),
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
  const { error } = await supabase.from('member_incomes').upsert(incomeData, {
    onConflict: 'household_id,profile_id,effective_from',
    ignoreDuplicates: false,
  });

  if (error) {
    return fail('Error en operación');
  }

  // Recalcular contribuciones del mes actual automáticamente
  const now = new Date();
  await calculateAndCreateContributions(
    parsed.data.household_id,
    now.getFullYear(),
    now.getMonth() + 1,
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
  profileId: string,
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
  const { error } = await supabase.from('household_settings').upsert(
    {
      household_id: parsed.data.household_id,
      monthly_contribution_goal: parsed.data.monthly_contribution_goal,
      currency: parsed.data.currency,
      calculation_type: parsed.data.calculation_type,
      updated_at: new Date().toISOString(),
      updated_by: (await supabase.auth.getUser()).data.user?.id,
    },
    { onConflict: 'household_id' },
  );

  if (error) return fail('Error en operación');

  // Recalcular contribuciones del mes actual automáticamente
  const now = new Date();
  await calculateAndCreateContributions(
    parsed.data.household_id,
    now.getFullYear(),
    now.getMonth() + 1,
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
  month: number,
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
      },
    );

    if (calcError) {
      if (calcError.message.includes('Household settings not configured')) {
        return fail('Primero configura la meta de contribución mensual');
      }
      if (calcError.message.includes('No incomes configured')) {
        return fail('Primero configura los ingresos de los miembros');
      }
      return fail('Error en operación');
    }

    // Tipo para los resultados de calculate_monthly_contributions
    type CalculationResult = {
      profile_id: string;
      expected_amount: number;
      income_percentage: number;
      calculation_method: string;
    };

    // Crear contribuciones para cada miembro
    const contributions = (calculations as CalculationResult[]).map((calc) => ({
      household_id: householdId,
      profile_id: calc.profile_id,
      year,
      month,
      expected_amount: calc.expected_amount,
      paid_amount: 0,
      status: 'pending',
      calculation_method: calc.calculation_method, // ⭐ NEW: Guardar método usado
    }));

    const { error: insertError } = await supabase.from('contributions').upsert(contributions, {
      onConflict: 'household_id,profile_id,year,month',
      ignoreDuplicates: false,
    });

    if (insertError) return fail('Error en operación');

    revalidatePath('/app/contributions');
    return ok();
  } catch {
    return fail('Error en operación');
  }
}

export async function getMonthlyContributions(householdId: string, year: number, month: number) {
  // Usar query directo en lugar de sintaxis Supabase
  const result = await query(
    `
    SELECT
      c.*,
      p.email as user_email
    FROM contributions c
    LEFT JOIN profiles p ON p.id = c.profile_id
    WHERE c.household_id = $1
      AND c.year = $2
      AND c.month = $3
    ORDER BY c.created_at DESC
    `,
    [householdId, year, month],
  );

  if (!result.rows) {
    console.error('[getMonthlyContributions] No data returned');
    return [];
  }

  return result.rows || [];
}

export async function updateContributionPaidAmount(
  contributionId: string,
  paidAmount: number,
): Promise<Result> {
  const supabase = await supabaseServer();

  // @ts-ignore - Supabase type inference issue
  const { error: updateError } = await supabase
    .from('contributions')
    .update({ paid_amount: paidAmount, updated_at: new Date().toISOString() })
    .eq('id', contributionId);

  if (updateError) return fail('Error en operación');

  // Actualizar estado según monto pagado
  // @ts-ignore - Supabase type inference issue
  const { error: statusError } = await supabase.rpc('update_contribution_status', {
    p_contribution_id: contributionId,
  });

  if (statusError) return fail('Error en operación');

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

  if (fetchError) return fail('Error al obtener contribución');
  if (!contribution) return fail('Contribución no encontrada');

  // @ts-ignore - Supabase type inference
  const { expected_amount, household_id, profile_id, month, year } = contribution;

  // 1. Buscar o crear categoría "Aportación Cuenta Conjunta" (tipo income)
  let { data: aportacionCategoryData } = await supabase
    .from('categories')
    .select('id')
    .eq('household_id', household_id)
    .eq('name', 'Aportación Cuenta Conjunta')
    .eq('type', 'income')
    .maybeSingle();

  // Si no existe, crearla
  if (!aportacionCategoryData) {
    const { data: newCategory, error: createCatError } = await supabase
      .from('categories')
      .insert({
        household_id,
        name: 'Aportación Cuenta Conjunta',
        type: 'income',
        icon: '🏦',
      })
      .select('id')
      .single();

    if (createCatError || !newCategory)
      return fail('Error al crear categoría Aportación Cuenta Conjunta');
    aportacionCategoryData = newCategory;
  }

  // @ts-ignore - Supabase type inference
  const categoryId: string = aportacionCategoryData.id;

  // 1.5. Obtener email del miembro para incluirlo en la descripción
  const { data: memberProfile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', profile_id)
    .single();

  const memberEmail = memberProfile?.email || 'Miembro desconocido';

  // 1.6. Obtener usuario actual para auditoría
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('No autenticado');

  // 1.7. Obtener profile_id del usuario actual
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!currentProfile) return fail('Perfil no encontrado');

  // 2. Crear movimiento de ingreso con auditoría completa
  const movementData = {
    household_id,
    profile_id,
    category_id: categoryId,
    type: 'income' as const,
    amount: expected_amount,
    currency: 'EUR',
    description: `Contribución mensual ${month}/${year} - ${memberEmail}`,
    occurred_at: new Date().toISOString().substring(0, 10),
    // ⭐ AUDITORÍA: Rastreo completo del origen
    paid_by: profile_id, // Quién pagó realmente
    created_by: currentProfile.id, // Quién registró el movimiento
    source_type: 'manual', // Origen: registrado manualmente
    source_id: contributionId, // ID de la contribución origen
    status: 'confirmed', // Estado inicial
  };

  const { error: movementError } = await supabase
    .from('transactions')
    .insert(movementData as unknown as never);

  if (movementError) return fail('Error al crear movimiento de ingreso');

  // 3. El trigger automático recalculará paid_amount al insertar la transacción
  // NO necesitamos llamar a updateContributionPaidAmount porque el trigger lo hace

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

export async function addContributionAdjustment(formData: FormData): Promise<Result> {
  const parsed = ContributionAdjustmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const supabase = await supabaseServer();
  const user = (await supabase.auth.getUser()).data.user;

  if (!user) return fail('No autenticado');

  // Obtener profile_id del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) return fail('Usuario no encontrado');

  // Obtener datos de la contribución para saber household_id y profile_id del miembro
  const { data: contribution, error: contributionError } = await supabase
    .from('contributions')
    .select('household_id, profile_id, year, month')
    .eq('id', parsed.data.contribution_id)
    .single();

  if (contributionError || !contribution) return fail('Contribución no encontrada');

  // Obtener email del miembro para la descripción
  const { data: memberProfile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', contribution.profile_id)
    .single();

  const memberEmail = memberProfile?.email || 'Miembro desconocido';

  let movementId: string | null = parsed.data.movement_id || null;
  let incomeMovementId: string | null = null;

  // Si es un prepayment con monto negativo y tiene categoría, crear movimientos automáticamente
  const isPrepayment = parsed.data.type === 'prepayment';
  const isNegativeAmount = parsed.data.amount < 0;
  const hasCategory =
    parsed.data.category_id &&
    parsed.data.category_id !== '' &&
    parsed.data.category_id !== '__none__';

  if (isPrepayment && isNegativeAmount && hasCategory) {
    const absoluteAmount = Math.abs(parsed.data.amount);
    const today = new Date().toISOString().substring(0, 10);

    // 1. Crear movimiento de GASTO (el gasto real que hizo el miembro)
    const expenseData = {
      household_id: contribution.household_id,
      profile_id: contribution.profile_id,
      category_id: parsed.data.category_id,
      type: 'expense' as const,
      amount: absoluteAmount,
      currency: 'EUR',
      description: `${parsed.data.reason} [Pre-pago]`,
      occurred_at: today,
      // created_at y updated_at se manejan automáticamente por DEFAULT NOW()
    };

    const { data: expenseMovement, error: expenseError } = await supabase
      .from('transactions')
      .insert(expenseData as unknown as never) // Cast: created_at/updated_at auto-managed by DB
      .select('id')
      .single();

    if (expenseError || !expenseMovement) {
      return fail(
        'Error al crear movimiento de gasto: ' + (expenseError?.message || 'desconocido'),
      );
    }

    movementId = expenseMovement.id;

    // 2. Crear movimiento de INGRESO virtual (el aporte que representa ese gasto)
    const incomeData = {
      household_id: contribution.household_id,
      profile_id: contribution.profile_id,
      category_id: null, // Los ingresos virtuales no tienen categoría
      type: 'income' as const,
      amount: absoluteAmount,
      currency: 'EUR',
      description: `Aporte virtual ${contribution.month}/${contribution.year} - ${memberEmail} [Ajuste: ${parsed.data.reason}]`,
      occurred_at: today,
      // created_at y updated_at se manejan automáticamente por DEFAULT NOW()
    };

    const { data: incomeMovement, error: incomeError } = await supabase
      .from('transactions')
      .insert(incomeData as unknown as never) // Cast: created_at/updated_at auto-managed by DB
      .select('id')
      .single();

    if (incomeError || !incomeMovement) {
      // Si falla el ingreso, eliminar el gasto creado
      await supabase.from('transactions').delete().eq('id', movementId);
      return fail(
        'Error al crear movimiento de ingreso virtual: ' + (incomeError?.message || 'desconocido'),
      );
    }

    incomeMovementId = incomeMovement.id;
  }

  // @ts-ignore - Supabase type inference issue
  const { error } = await supabase.from('contribution_adjustments').insert({
    contribution_id: parsed.data.contribution_id,
    amount: parsed.data.amount,
    type: parsed.data.type,
    reason: parsed.data.reason,
    category_id: hasCategory ? parsed.data.category_id : null,
    movement_id: movementId,
    created_by: profile.id,
  });

  if (error) {
    // Si falla la inserción del ajuste, eliminar los movimientos creados
    if (movementId) await supabase.from('transactions').delete().eq('id', movementId);
    if (incomeMovementId) await supabase.from('transactions').delete().eq('id', incomeMovementId);
    return fail('Error en operación');
  }

  // El trigger update_contribution_adjustments_total() actualizará automáticamente:
  // - contributions.adjustments_total
  // - contributions.expected_amount
  // - contributions.updated_at

  revalidatePath('/app/contributions');
  revalidatePath('/app');
  revalidatePath('/app/expenses');
  return ok();
}

export async function getContributionAdjustments(contributionId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('contribution_adjustments')
    .select(
      `
      *,
      category:categories(id, name, icon, type),
      movement:transactions(id, description, amount, occurred_at),
      creator:profiles(id, email)
    `,
    )
    .eq('contribution_id', contributionId)
    .order('created_at', { ascending: false });

  if (error) return [];
  // @ts-ignore - Supabase type inference issue
  return data || [];
}

export async function getHouseholdAdjustments(householdId: string, year: number, month: number) {
  const supabase = await supabaseServer();

  interface ContributionIdOnly {
    id: string;
  }

  // Obtener todas las contribuciones del hogar para el mes
  const { data: contributions } = await supabase
    .from('contributions')
    .select('id')
    .eq('household_id', householdId)
    .eq('year', year)
    .eq('month', month);

  const typedContributions = (contributions as unknown as ContributionIdOnly[]) ?? [];
  if (typedContributions.length === 0) return [];

  const contributionIds = typedContributions.map((c) => c.id);

  // Obtener todos los ajustes de esas contribuciones
  const { data, error } = await supabase
    .from('contribution_adjustments')
    .select(
      `
      *,
      contribution:contributions(id, profile_id, profiles(id, email)),
      category:categories(id, name, icon, type),
      movement:transactions(id, description, amount, occurred_at),
      creator:profiles(id, email)
    `,
    )
    .in('contribution_id', contributionIds)
    .order('created_at', { ascending: false });

  if (error) return [];
  // @ts-ignore - Supabase type inference issue
  return data || [];
}

export async function deleteContributionAdjustment(adjustmentId: string): Promise<Result> {
  const supabase = await supabaseServer();

  // 1. Obtener el ajuste
  const { data: adjustment, error: fetchError } = await supabase
    .from('contribution_adjustments')
    .select('*')
    .eq('id', adjustmentId)
    .single();

  if (fetchError) return fail('Error en operación');
  if (!adjustment) return fail('Ajuste no encontrado');

  // 2. Obtener la contribución asociada
  const { data: contribution, error: contributionError } = await supabase
    .from('contributions')
    .select('profile_id, household_id, year, month')
    .eq('id', adjustment.contribution_id)
    .single();

  if (contributionError || !contribution) return fail('Contribución no encontrada');

  // 2. Buscar y eliminar movimientos asociados
  const movementsToDelete: string[] = [];

  // A) Si tiene movement_id directo, agregarlo
  if (adjustment.movement_id) {
    movementsToDelete.push(adjustment.movement_id);
  }

  interface TransactionIdOnly {
    id: string;
  }

  // B) Buscar por descripción con [Ajuste: razón]
  const searchPattern = `%[Ajuste: ${adjustment.reason}]%`;
  const { data: movementsByDescription } = await supabase
    .from('transactions')
    .select('id')
    .eq('household_id', contribution.household_id)
    .like('description', searchPattern);

  const typedByDescription = (movementsByDescription as unknown as TransactionIdOnly[]) ?? [];
  typedByDescription.forEach((m) => {
    if (!movementsToDelete.includes(m.id)) {
      movementsToDelete.push(m.id);
    }
  });

  // C) Buscar por descripción con [Pre-pago] (formato antiguo)
  if (adjustment.type === 'prepayment' && adjustment.category_id) {
    const { data: movementsByPrePago } = await supabase
      .from('transactions')
      .select('id')
      .eq('household_id', contribution.household_id)
      .eq('profile_id', contribution.profile_id)
      .eq('category_id', adjustment.category_id)
      .eq('type', 'expense')
      .like('description', '%[Pre-pago]%');

    const typedByPrePago = (movementsByPrePago as unknown as TransactionIdOnly[]) ?? [];
    typedByPrePago.forEach((m) => {
      if (!movementsToDelete.includes(m.id)) {
        movementsToDelete.push(m.id);
      }
    });
  }

  // Eliminar todos los movimientos encontrados
  if (movementsToDelete.length > 0) {
    const { error: deleteMovementsError } = await supabase
      .from('transactions')
      .delete()
      .in('id', movementsToDelete);

    if (deleteMovementsError) {
      console.error('Error al eliminar movimientos:', deleteMovementsError);
      // No fallar, continuar con la eliminación del ajuste
    }
  }

  // 3. Registrar en journal antes de eliminar
  const user = await getCurrentUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (profile) {
      await supabase.from('journal_adjustments').insert({
        adjustment_id: adjustmentId,
        action: 'annulment',
        old_data: adjustment,
        performed_by: profile.id,
        reason: `Anulación de ajuste: ${adjustment.reason}`,
      });
    }
  }

  // 4. Eliminar el ajuste
  const { error: deleteError } = await supabase
    .from('contribution_adjustments')
    .delete()
    .eq('id', adjustmentId);

  if (deleteError) return fail('Error en operación');

  // El trigger update_contribution_adjustments_total() actualizará automáticamente
  // el total de ajustes y el monto esperado de la contribución

  revalidatePath('/app/contributions');
  revalidatePath('/app');
  revalidatePath('/app/expenses');
  return ok();
}

// =====================================================
// Dashboard de Contribuciones
// =====================================================

export async function getContributionsSummary(householdId: string) {
  const supabase = await supabaseServer();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  interface ContributionSummary {
    expected_amount: number;
    paid_amount: number;
    status: string;
  }

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

  const typedContributions = (contributions as unknown as ContributionSummary[]) ?? [];
  const totalExpected = typedContributions.reduce((sum, c) => sum + (c.expected_amount || 0), 0);
  const totalPaid = typedContributions.reduce((sum, c) => sum + (c.paid_amount || 0), 0);
  const totalPending = totalExpected - totalPaid;
  const completionPercentage = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

  return {
    totalExpected,
    totalPaid,
    totalPending,
    completionPercentage,
  };
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
  amount: number,
): Promise<Result> {
  const supabase = await supabaseServer();

  // Obtener datos completos de la contribución
  const { data: contribution, error: fetchError } = await supabase
    .from('contributions')
    .select(
      'expected_amount, adjustments_total, paid_amount, household_id, profile_id, month, year',
    )
    .eq('id', contributionId)
    .single();

  if (fetchError) return fail('Error en operación');
  if (!contribution) return fail('Contribución no encontrada');

  // Validar que la contribución tenga expected_amount configurado
  if (contribution.expected_amount === null) {
    return fail('No se puede registrar pago: el miembro debe configurar sus ingresos primero');
  }

  const { expected_amount, paid_amount, household_id, profile_id, month, year } = contribution;

  // Calcular monto ajustado (expected_amount ya incluye adjustments_total)
  const adjusted_amount = expected_amount;

  // Validar que el monto sea positivo
  if (amount <= 0) {
    return fail('El monto debe ser mayor a cero');
  }

  // 1. Buscar o crear categoría "Aportación Cuenta Conjunta" (tipo income)
  let { data: aportacionCategoryData } = await supabase
    .from('categories')
    .select('id')
    .eq('household_id', household_id)
    .eq('name', 'Aportación Cuenta Conjunta')
    .eq('type', 'income')
    .maybeSingle();

  // Si no existe, crearla
  if (!aportacionCategoryData) {
    const { data: newCategory, error: createCatError } = await supabase
      .from('categories')
      .insert({
        household_id,
        name: 'Aportación Cuenta Conjunta',
        type: 'income',
        icon: '🏦',
      })
      .select('id')
      .single();

    if (createCatError || !newCategory)
      return fail('Error al crear categoría Aportación Cuenta Conjunta');
    aportacionCategoryData = newCategory;
  }

  const categoryId: string = aportacionCategoryData.id;

  // 1.5. Obtener email del miembro para incluirlo en la descripción
  const { data: memberProfile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', profile_id)
    .single();

  const memberEmail = memberProfile?.email || 'Miembro desconocido';

  // 1.6. Obtener usuario actual para auditoría
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('No autenticado');

  // 1.7. Obtener profile_id del usuario actual
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!currentProfile) return fail('Perfil no encontrado');

  // 2. Crear movimiento de ingreso con auditoría completa
  const movementData = {
    household_id,
    profile_id,
    category_id: categoryId,
    type: 'income' as const,
    amount,
    currency: 'EUR',
    description: `Contribución mensual ${month}/${year} - ${memberEmail}`,
    occurred_at: new Date().toISOString().substring(0, 10),
    // ⭐ AUDITORÍA: Rastreo completo del origen
    paid_by: profile_id, // Quién pagó realmente
    created_by: currentProfile.id, // Quién registró el movimiento
    source_type: 'manual', // Origen: registrado manualmente
    source_id: contributionId, // ID de la contribución origen
    status: 'confirmed', // Estado inicial
  };

  const { error: movementError } = await supabase
    .from('transactions')
    .insert(movementData as unknown as never);

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

// =====================================================
// FASE 3: Balance Breakdown & Personal Balance
// =====================================================

/**
 * Obtiene el desglose completo del balance del hogar
 * Muestra: balance total, balance libre, créditos activos, créditos reservados
 */
export async function getBalanceBreakdown(householdId: string): Promise<
  Result<{
    totalBalance: number;
    freeBalance: number;
    activeCredits: number;
    reservedCredits: number;
    members: Array<{
      profileId: string;
      displayName: string;
      activeCredits: number;
      reservedCredits: number;
    }>;
  }>
> {
  const supabase = await supabaseServer();

  // 1. Verificar autenticación
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('No autenticado');

  interface TransactionBalance {
    type: string;
    amount: number;
  }

  // 2. Obtener balance total del household (suma de ingresos - gastos)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('household_id', householdId)
    .eq('status', 'confirmed');

  const typedTransactions = (transactions as unknown as TransactionBalance[]) ?? [];
  const totalIncome =
    typedTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const totalExpenses =
    typedTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const totalBalance = totalIncome - totalExpenses;

  // 3. Obtener créditos activos y reservados usando las funciones SQL
  const { data: activeCreditsData } = await supabase.rpc('get_active_credits_sum', {
    p_household_id: householdId,
  });

  const { data: reservedCreditsData } = await supabase.rpc('get_reserved_credits_sum', {
    p_household_id: householdId,
  });

  const activeCredits = Number(activeCreditsData || 0);
  const reservedCredits = Number(reservedCreditsData || 0);

  // 4. Balance libre = balance total - créditos activos
  // (los créditos activos forman parte del balance pero pertenecen a miembros específicos)
  const freeBalance = totalBalance - activeCredits;

  interface MemberCredit {
    amount: number;
    reserved_at: string | null;
    profile_id: string;
    profiles:
      | {
          id: string;
          display_name: string;
        }
      | {
          id: string;
          display_name: string;
        }[];
  }

  // 5. Obtener desglose por miembro
  const { data: memberCredits } = await supabase
    .from('member_credits')
    .select(
      `
      amount,
      reserved_at,
      profile_id
    `,
    )
    .eq('household_id', householdId)
    .eq('status', 'active');

  // Obtener profile_ids únicos
  interface MemberCredit {
    profile_id: string;
    [key: string]: unknown;
  }

  const memberCreditsTyped = (memberCredits as MemberCredit[]) || [];
  const memberProfileIds = [
    ...new Set(memberCreditsTyped.map((c) => c.profile_id).filter(Boolean)),
  ];

  // Obtener perfiles
  const profilesResult =
    memberProfileIds.length > 0
      ? await supabase.from('profiles').select('id, display_name').in('id', memberProfileIds)
      : { data: [], error: null };

  // Crear mapa de perfiles
  interface Profile {
    id: string;
    display_name: string;
  }

  const typedProfiles = (profilesResult.data as Profile[]) || [];
  const memberProfilesMap = new Map(typedProfiles.map((p) => [p.id, p]));

  // Enriquecer member credits con perfiles
  const enrichedMemberCredits = memberCreditsTyped.map((credit) => ({
    ...credit,
    profiles: credit.profile_id ? memberProfilesMap.get(credit.profile_id) : null,
  }));

  const typedMemberCredits = enrichedMemberCredits as unknown as MemberCredit[];

  // Agrupar por miembro
  const membersMap = new Map<
    string,
    {
      profileId: string;
      displayName: string;
      activeCredits: number;
      reservedCredits: number;
    }
  >();

  typedMemberCredits.forEach((credit) => {
    const profileId = credit.profile_id;
    const profile = Array.isArray(credit.profiles) ? credit.profiles[0] : credit.profiles;
    const displayName = profile?.display_name || 'Usuario';

    if (!membersMap.has(profileId)) {
      membersMap.set(profileId, {
        profileId,
        displayName,
        activeCredits: 0,
        reservedCredits: 0,
      });
    }

    const member = membersMap.get(profileId)!;
    if (credit.reserved_at) {
      member.reservedCredits += Number(credit.amount);
    } else {
      member.activeCredits += Number(credit.amount);
    }
  });

  const members = Array.from(membersMap.values());

  return ok({
    totalBalance,
    freeBalance,
    activeCredits,
    reservedCredits,
    members,
  });
}

/**
 * Obtiene el balance personal de un miembro específico
 * Muestra: contribución esperada, pagado, pendiente, créditos propios
 */
export async function getPersonalBalance(householdId: string): Promise<
  Result<{
    expectedContribution: number;
    paidAmount: number;
    adjustmentsPaid: number;
    baseAmount: number;
    totalContributed: number;
    pendingAmount: number;
    creditGenerated: number;
    status: string;
    myActiveCredits: number;
    myReservedCredits: number;
    contributionId: string | null;
  }>
> {
  const supabase = await supabaseServer();

  // 1. Verificar autenticación y obtener profile
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('No autenticado');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) return fail('Perfil no encontrado');

  // 2. Obtener contribución del mes actual
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { data: contribution } = await supabase
    .from('contributions')
    .select('*')
    .eq('household_id', householdId)
    .eq('profile_id', profile.id)
    .eq('year', currentYear)
    .eq('month', currentMonth)
    .single();

  if (!contribution) {
    return ok({
      expectedContribution: 0,
      paidAmount: 0,
      adjustmentsPaid: 0,
      baseAmount: 0,
      totalContributed: 0,
      pendingAmount: 0,
      creditGenerated: 0,
      status: 'pending_configuration',
      myActiveCredits: 0,
      myReservedCredits: 0,
      contributionId: null,
    });
  }

  const expectedAmount = Number(contribution.expected_amount || 0);
  const paidAmount = Number(contribution.paid_amount || 0);
  const adjustmentsTotal = Number(contribution.adjustments_total || 0);
  const adjustmentsPaid = Number(contribution.adjustments_paid_amount || 0);

  // DEBUG: Ver datos raw
  console.log('[getPersonalBalance] Contribution data:', {
    expected_amount: contribution.expected_amount,
    paid_amount: contribution.paid_amount,
    adjustments_total: contribution.adjustments_total,
    adjustments_paid_amount: contribution.adjustments_paid_amount,
  });

  // Calcular base amount (expected sin ajustes)
  const baseAmount = expectedAmount - adjustmentsTotal;

  // Total realmente aportado al household
  const totalContributed = paidAmount + adjustmentsPaid;

  // Calcular si hay crédito generado (exceso sobre la base original)
  const creditGenerated = Math.max(0, totalContributed - baseAmount);

  console.log('[getPersonalBalance] Calculated:', {
    baseAmount,
    totalContributed,
    creditGenerated,
    adjustmentsPaid,
  });

  // NOTA: expected_amount YA incluye adjustments_total (trigger lo actualiza)
  // expected_amount = base + adjustments_total
  const pendingAmount = Math.max(0, expectedAmount - paidAmount);

  interface MyCredit {
    amount: number;
    reserved_at: string | null;
  }

  // 3. Obtener créditos propios (activos y reservados)
  const { data: myCredits } = await supabase
    .from('member_credits')
    .select('amount, reserved_at')
    .eq('household_id', householdId)
    .eq('profile_id', profile.id)
    .eq('status', 'active');

  const typedMyCredits = (myCredits as unknown as MyCredit[]) ?? [];
  const myActiveCredits =
    typedMyCredits.filter((c) => !c.reserved_at).reduce((sum, c) => sum + Number(c.amount), 0) || 0;
  const myReservedCredits =
    typedMyCredits.filter((c) => c.reserved_at).reduce((sum, c) => sum + Number(c.amount), 0) || 0;

  return ok({
    expectedContribution: expectedAmount,
    paidAmount,
    adjustmentsPaid,
    baseAmount,
    totalContributed,
    pendingAmount,
    creditGenerated,
    status: contribution.status,
    myActiveCredits,
    myReservedCredits,
    contributionId: contribution.id,
  });
}

/**
 * Aprueba un ajuste de contribución (solo owner)
 * Cambia status de 'pending' → 'active'
 */
export async function approveContributionAdjustment(adjustmentId: string): Promise<Result> {
  const supabase = await supabaseServer();
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No tienes un hogar configurado');

  // Verificar rol de owner
  const role = await getUserRoleInActiveHousehold();
  if (role !== 'owner') {
    return fail('Solo el propietario puede aprobar ajustes');
  }

  // 1. Obtener ajuste actual
  const { data: adjustment, error: fetchError } = await supabase
    .from('contribution_adjustments')
    .select('*')
    .eq('id', adjustmentId)
    .single();

  if (fetchError) return fail('Error en operación');
  if (!adjustment) return fail('Ajuste no encontrado');

  // 2. Obtener contribución asociada
  const { data: contribution, error: contributionError } = await supabase
    .from('contributions')
    .select('household_id')
    .eq('id', adjustment.contribution_id)
    .single();

  if (contributionError || !contribution) return fail('Contribución no encontrada');

  // Verificar que pertenece al household
  if (contribution.household_id !== householdId) {
    return fail('El ajuste no pertenece a tu hogar');
  }

  // Verificar que está en estado pending
  if (adjustment.status !== 'pending') {
    return fail(`No se puede aprobar un ajuste en estado "${adjustment.status}"`);
  }

  // 2. Obtener profile_id del usuario para auditoría
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) return fail('Perfil no encontrado');

  // 3. Actualizar estado a 'active'
  const { error: updateError } = await supabase
    .from('contribution_adjustments')
    .update({
      status: 'active',
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', adjustmentId);

  if (updateError) {
    return fail('Error en operación');
  }

  revalidatePath('/app/contributions/adjustments');
  return ok();
}

/**
 * Rechaza un ajuste de contribución (solo owner)
 * Cambia status de 'pending' → 'cancelled'
 * Opcionalmente elimina transacciones asociadas
 */
export async function rejectContributionAdjustment(
  adjustmentId: string,
  rejectionReason?: string,
): Promise<Result> {
  const supabase = await supabaseServer();
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No tienes un hogar configurado');

  // Verificar rol de owner
  const role = await getUserRoleInActiveHousehold();
  if (role !== 'owner') {
    return fail('Solo el propietario puede rechazar ajustes');
  }

  // 1. Obtener ajuste actual
  const { data: adjustment, error: fetchError } = await supabase
    .from('contribution_adjustments')
    .select('*')
    .eq('id', adjustmentId)
    .single();

  if (fetchError) return fail('Error en operación');
  if (!adjustment) return fail('Ajuste no encontrado');

  // 2. Obtener contribución asociada
  const { data: contribution, error: contributionError } = await supabase
    .from('contributions')
    .select('household_id, profile_id')
    .eq('id', adjustment.contribution_id)
    .single();

  if (contributionError || !contribution) return fail('Contribución no encontrada');

  // Verificar que pertenece al household
  if (contribution.household_id !== householdId) {
    return fail('El ajuste no pertenece a tu hogar');
  }

  // Verificar que está en estado pending
  if (adjustment.status !== 'pending') {
    return fail(`No se puede rechazar un ajuste en estado "${adjustment.status}"`);
  }

  // 2. Obtener profile_id del usuario para auditoría
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) return fail('Perfil no encontrado');

  // 3. Actualizar estado a 'cancelled' con razón
  const updatedReason = rejectionReason
    ? `${adjustment.reason || ''} [RECHAZADO: ${rejectionReason}]`.trim()
    : adjustment.reason;

  const { error: updateError } = await supabase
    .from('contribution_adjustments')
    .update({
      status: 'cancelled',
      reason: updatedReason,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', adjustmentId);

  if (updateError) {
    return fail('Error en operación');
  }

  // 4. Eliminar transacciones asociadas (si existen)
  const movementsToDelete: string[] = [];

  // A) Si tiene movement_id directo, agregarlo
  if (adjustment.movement_id) {
    movementsToDelete.push(adjustment.movement_id);
  }

  interface TransactionIdOnly {
    id: string;
  }

  // B) Buscar por descripción con [Ajuste: razón]
  const searchPattern = `%[Ajuste: ${adjustment.reason}]%`;
  const { data: movementsByDescription } = await supabase
    .from('transactions')
    .select('id')
    .eq('household_id', contribution.household_id)
    .like('description', searchPattern);

  const typedMovements = (movementsByDescription as unknown as TransactionIdOnly[]) ?? [];
  typedMovements.forEach((m) => {
    if (!movementsToDelete.includes(m.id)) {
      movementsToDelete.push(m.id);
    }
  });

  // Eliminar todos los movimientos identificados
  if (movementsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .in('id', movementsToDelete);

    if (deleteError) {
      console.error('[rejectContributionAdjustment] Error eliminando transacciones:', deleteError);
      // No fallar por esto, ya se canceló el ajuste
    }
  }

  revalidatePath('/app/contributions/adjustments');
  return ok();
}
