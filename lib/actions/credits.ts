'use server';

import { getCurrentUser, getUserHouseholdId, pgServer } from '@/lib/pgServer';
import type { Result } from '@/lib/result';
import { fail, ok } from '@/lib/result';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ============================================
// SCHEMAS
// ============================================

const ApplyCreditSchema = z.object({
  creditId: z.string().uuid(),
  contributionId: z.string().uuid(),
});

const SetAutoApplySchema = z.object({
  creditId: z.string().uuid(),
  autoApply: z.boolean(),
});

const SetMonthlyDecisionSchema = z.object({
  creditId: z.string().uuid(),
  decision: z.enum(['apply_to_month', 'keep_active', 'transfer_to_savings']),
});

// ============================================
// TYPES
// ============================================

export interface MemberCredit {
  id: string;
  household_id: string;
  profile_id: string;
  amount: number;
  currency: string;
  source_period_id: string | null;
  source_month: number;
  source_year: number;
  status: 'active' | 'applied' | 'expired' | 'transferred';
  applied_to_period_id: string | null;
  applied_to_contribution_id: string | null;
  applied_at: string | null;
  created_at: string;
  created_by: string | null;
  expires_at: string | null;
  auto_apply: boolean;
  transferred_to_savings: boolean;
  transferred_to_savings_at: string | null;
  savings_transaction_id: string | null;
  monthly_decision: string | null;
}

export interface CreditsSummary {
  active: {
    count: number;
    total_amount: number;
  };
  applied: {
    count: number;
    total_amount: number;
  };
}

// ============================================
// ACTIONS
// ============================================

/**
 * Obtiene todos los créditos activos de un miembro
 */
export async function getActiveCredits(): Promise<Result<MemberCredit[]>> {
  try {
    const supabase = await pgServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return fail('No autenticado');
    }

    // Obtener profile_id del usuario autenticado
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return fail('Perfil no encontrado');
    }

    const { data: credits, error } = await supabase
      .from('member_credits')
      .select('*')
      .eq('profile_id', profile.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo créditos:', error);
      return fail('Error al obtener créditos activos');
    }

    return ok(credits as MemberCredit[]);
  } catch (error) {
    console.error('Error en getActiveCredits:', error);
    return fail('Error inesperado al obtener créditos');
  }
}

/**
 * Obtiene todos los créditos (activos + histórico) de un miembro
 */
export async function getAllCredits(): Promise<Result<MemberCredit[]>> {
  try {
    const supabase = await pgServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return fail('No autenticado');
    }

    // Obtener profile_id del usuario autenticado
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return fail('Perfil no encontrado');
    }

    const { data: credits, error } = await supabase
      .from('member_credits')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo créditos:', error);
      return fail('Error al obtener créditos');
    }

    return ok(credits as MemberCredit[]);
  } catch (error) {
    console.error('Error en getAllCredits:', error);
    return fail('Error inesperado al obtener créditos');
  }
}

/**
 * Obtiene resumen de créditos de un miembro
 */
export async function getCreditsSummary(): Promise<Result<CreditsSummary>> {
  try {
    const supabase = await pgServer();
    const user = await getCurrentUser();

    if (!user) {
      return fail('No autenticado');
    }

    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No tienes un hogar activo');
    }

    // Obtener profile_id del usuario autenticado
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return fail('Perfil no encontrado');
    }

    // Obtener resumen directamente con queries
    const { data: activeCredits, error: activeError } = await supabase
      .from('member_credits')
      .select('amount')
      .eq('household_id', householdId)
      .eq('profile_id', profile.id)
      .eq('status', 'active');

    if (activeError) {
      console.error('Error obteniendo créditos activos:', activeError);
      return fail('Error al obtener créditos activos');
    }

    const { data: appliedCredits, error: appliedError } = await supabase
      .from('member_credits')
      .select('amount')
      .eq('household_id', householdId)
      .eq('profile_id', profile.id)
      .eq('status', 'applied');

    if (appliedError) {
      console.error('Error obteniendo créditos aplicados:', appliedError);
      return fail('Error al obtener créditos aplicados');
    }

    type AmountRow = { amount: number };
    const activeTotal = (activeCredits as unknown as AmountRow[] | undefined)?.reduce(
      (sum, credit) => sum + Number(credit.amount),
      0,
    ) || 0;
    const appliedTotal = (appliedCredits as unknown as AmountRow[] | undefined)?.reduce(
      (sum, credit) => sum + Number(credit.amount),
      0,
    ) || 0;

    const summary: CreditsSummary = {
      active: {
        count: activeCredits?.length || 0,
        total_amount: activeTotal,
      },
      applied: {
        count: appliedCredits?.length || 0,
        total_amount: appliedTotal,
      },
    };

    return ok(summary);
  } catch (error) {
    console.error('Error en getCreditsSummary:', error);
    return fail('Error inesperado al obtener resumen');
  }
}

/**
 * Aplica un crédito a una contribución específica
 */
export async function applyCreditToContribution(
  formData: FormData,
): Promise<Result<{ amountApplied: number; newExpectedAmount: number }>> {
  try {
    const supabase = await pgServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return fail('No autenticado');
    }

    const parsed = ApplyCreditSchema.safeParse({
      creditId: formData.get('creditId'),
      contributionId: formData.get('contributionId'),
    });

    if (!parsed.success) {
      return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
    }

    const { creditId, contributionId } = parsed.data;

    // Aplicar crédito via función SQL
    const { data, error } = (await supabase.rpc('apply_credit_to_contribution', {
      p_credit_id: creditId,
      p_contribution_id: contributionId,
      p_applied_by: user.id,
    })) as unknown as {
      data: { amount_applied: number; new_expected_amount: number } | null;
      error: Error | null;
    };

    if (error) {
      console.error('Error aplicando crédito:', error);
      return fail(error.message);
    }

    if (!data) {
      return fail('No se pudo aplicar el crédito');
    }

    revalidatePath('/app/contributions');

    return ok({
      amountApplied: data.amount_applied,
      newExpectedAmount: data.new_expected_amount,
    });
  } catch (error) {
    console.error('Error en applyCreditToContribution:', error);
    return fail('Error inesperado al aplicar crédito');
  }
}

/**
 * Configura si un crédito se auto-aplica en próximos meses
 */
export async function setCreditAutoApply(formData: FormData): Promise<Result> {
  try {
    const supabase = await pgServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return fail('No autenticado');
    }

    const parsed = SetAutoApplySchema.safeParse({
      creditId: formData.get('creditId'),
      autoApply: formData.get('autoApply') === 'true',
    });

    if (!parsed.success) {
      return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
    }

    const { creditId, autoApply } = parsed.data;

    // Actualizar crédito
    const { error } = await supabase
      .from('member_credits')
      .update({ auto_apply: autoApply })
      .eq('id', creditId)
      .eq('profile_id', user.profile_id) // Seguridad: solo sus propios créditos
      .eq('status', 'active'); // Solo créditos activos

    if (error) {
      console.error('Error actualizando auto_apply:', error);
      return fail('Error al actualizar configuración');
    }

    revalidatePath('/app/contributions');

    return ok();
  } catch (error) {
    console.error('Error en setCreditAutoApply:', error);
    return fail('Error inesperado');
  }
}

/**
 * Configura la decisión mensual de un crédito
 */
export async function setCreditMonthlyDecision(formData: FormData): Promise<Result> {
  try {
    const supabase = await pgServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return fail('No autenticado');
    }

    const parsed = SetMonthlyDecisionSchema.safeParse({
      creditId: formData.get('creditId'),
      decision: formData.get('decision'),
    });

    if (!parsed.success) {
      return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
    }

    const { creditId, decision } = parsed.data;

    // Actualizar crédito
    const { error } = await supabase
      .from('member_credits')
      .update({ monthly_decision: decision })
      .eq('id', creditId)
      .eq('profile_id', user.profile_id)
      .eq('status', 'active');

    if (error) {
      console.error('Error actualizando decisión mensual:', error);
      return fail('Error al actualizar decisión');
    }

    revalidatePath('/app/contributions');

    return ok();
  } catch (error) {
    console.error('Error en setCreditMonthlyDecision:', error);
    return fail('Error inesperado');
  }
}

/**
 * Genera crédito manualmente para un miembro (solo owners)
 * Útil para ajustes o correcciones
 */
export async function createManualCredit(
  profileId: string,
  amount: number,
): Promise<Result<string>> {
  try {
    const supabase = await pgServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return fail('No autenticado');
    }

    // Verificar que el usuario es owner
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('active_household_id')
      .eq('profile_id', user.profile_id)
      .single();

    if (!userSettings?.active_household_id) {
      return fail('No tienes un hogar activo');
    }

    const { data: membership } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', userSettings.active_household_id)
      .eq('profile_id', user.profile_id)
      .single();

    if (membership?.role !== 'owner') {
      return fail('Solo los propietarios pueden crear créditos manuales');
    }

    // Crear crédito
    const now = new Date();
    const { data: credit, error } = await supabase
      .from('member_credits')
      .insert({
        household_id: userSettings.active_household_id,
        profile_id: profileId,
        amount,
        currency: 'EUR',
        source_month: now.getMonth() + 1,
        source_year: now.getFullYear(),
        status: 'active',
        auto_apply: false,
        transferred_to_savings: false,
        monthly_decision: 'keep_active',
        created_by: user.id,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creando crédito manual:', error);
      return fail('Error al crear crédito');
    }

    if (!credit) {
      return fail('No se pudo crear el crédito');
    }

    revalidatePath('/app/contributions');

    return ok(credit.id);
  } catch (error) {
    console.error('Error en createManualCredit:', error);
    return fail('Error inesperado');
  }
}

/**
 * Ejecuta auto-aplicación de créditos para un período específico
 * (Admin/cron job)
 */
export async function autoApplyCreditsForPeriod(periodId: string): Promise<Result> {
  try {
    const supabase = await pgServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return fail('No autenticado');
    }

    // Obtener household_id del usuario
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('active_household_id')
      .eq('profile_id', user.profile_id)
      .single();

    if (!userSettings?.active_household_id) {
      return fail('No tienes un hogar activo');
    }

    // Ejecutar auto-aplicación
    const { data, error } = (await supabase.rpc('auto_apply_active_credits', {
      p_household_id: userSettings.active_household_id,
      p_period_id: periodId,
    })) as unknown as {
      data: { credits_applied: number; total_amount_applied: number } | null;
      error: Error | null;
    };

    if (error) {
      console.error('Error en auto-aplicación de créditos:', error);
      return fail('Error al auto-aplicar créditos');
    }

    revalidatePath('/app/contributions');

    return ok(data);
  } catch (error) {
    console.error('Error en autoApplyCreditsForPeriod:', error);
    return fail('Error inesperado');
  }
}
