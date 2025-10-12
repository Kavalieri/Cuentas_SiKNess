'use server';

import { isOwner } from '@/lib/adminCheck';
import type { Result } from '@/lib/result';
import { fail, ok } from '@/lib/result';
import { getCurrentUser, getUserHouseholdId, supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Database } from '@/types/database';

type Contribution = Database['public']['Tables']['contributions']['Row'];

const HouseholdSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
});

/**
 * Crea un nuevo household para el usuario actual
 */
export async function createHousehold(
  formData: FormData,
): Promise<Result<{ household_id: string }>> {
  const parsed = HouseholdSchema.safeParse(Object.fromEntries(formData));

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
    return fail('Perfil no encontrado');
  }

  // Usar nueva función atómica create_household_with_owner
  // @ts-ignore - Supabase types issue con Next.js 15
  const { data, error } = await supabase.rpc('create_household_with_owner', {
    p_name: parsed.data.name,
    p_profile_id: profile.id,
  });

  if (error || !data) {
    console.error('❌ Error creando household:', error);
    return fail(error?.message || 'Error al crear el hogar');
  }

  const household_id = data as string;

  // NUEVO: Establecer el nuevo household como activo automáticamente
  await supabase.from('user_active_household').upsert({
    profile_id: profile.id,
    household_id: household_id,
    updated_at: new Date().toISOString(),
  });

  revalidatePath('/app');
  return ok({ household_id });
}

/**
 * Obtiene el household del usuario actual
 */
export async function getCurrentHousehold(): Promise<Result<{ id: string; name: string } | null>> {
  const householdId = await getUserHouseholdId();

  if (!householdId) {
    return ok(null);
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('households')
    .select('id, name')
    .eq('id', householdId)
    .single();

  if (error) {
    return fail('Error en operación');
  }

  type HouseholdData = { id: string; name: string };
  const typedData = data as unknown as HouseholdData | null;

  return ok(typedData);
}

/**
 * Actualiza el nombre del household (solo owners)
 */
export async function updateHouseholdName(formData: FormData): Promise<Result> {
  const userIsOwner = await isOwner();
  if (!userIsOwner) {
    return fail('No tienes permisos para esta acción');
  }

  const householdId = formData.get('household_id') as string;
  const name = formData.get('name') as string;

  if (!householdId || !name?.trim()) {
    return fail('Datos inválidos');
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.from('households').update({ name }).eq('id', householdId);

  if (error) {
    return fail('Error en operación');
  }

  revalidatePath('/app/household');
  return ok();
}

/**
 * Actualiza el rol de un miembro (solo owners)
 */
export async function updateMemberRole(
  memberId: string,
  newRole: 'owner' | 'member',
): Promise<Result> {
  const userIsOwner = await isOwner();
  if (!userIsOwner) {
    return fail('No tienes permisos para esta acción');
  }

  const supabase = await supabaseServer();

  const { error } = await supabase
    .from('household_members')
    .update({ role: newRole })
    .eq('id', memberId);

  if (error) {
    return fail('Error en operación');
  }

  revalidatePath('/app/household');
  return ok();
}

/**
 * Elimina un miembro del hogar (solo owners)
 * Previene eliminar el último owner
 */
export async function removeMember(memberId: string): Promise<Result> {
  const userIsOwner = await isOwner();
  if (!userIsOwner) {
    return fail('No tienes permisos para esta acción');
  }

  const supabase = await supabaseServer();
  const householdId = await getUserHouseholdId();

  if (!householdId) {
    return fail('No perteneces a ningún hogar');
  }

  // Verificar que no es el último owner
  const { data: owners } = await supabase
    .from('household_members')
    .select('profile_id')
    .eq('household_id', householdId)
    .eq('role', 'owner');

  type OwnerData = { profile_id: string };
  const typedOwners = (owners as unknown as OwnerData[]) ?? [];

  if (typedOwners.length === 1) {
    const { data: memberToDelete } = await supabase
      .from('household_members')
      .select('profile_id')
      .eq('id', memberId)
      .single();

    const typedMemberToDelete = memberToDelete as unknown as OwnerData | null;

    if (typedMemberToDelete && typedOwners[0]?.profile_id === typedMemberToDelete.profile_id) {
      return fail('No puedes eliminar el último administrador del hogar');
    }
  }

  // Eliminar miembro
  const { error } = await supabase.from('household_members').delete().eq('id', memberId);

  if (error) {
    return fail('Error en operación');
  }

  revalidatePath('/app/household');
  return ok();
}

/**
 * Obtiene los miembros del hogar actual
 */
export async function getHouseholdMembers(): Promise<
  Result<Array<{ id: string; display_name: string; avatar_url: string | null }>>
> {
  const householdId = await getUserHouseholdId();

  if (!householdId) {
    return fail('No perteneces a ningún hogar');
  }

  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('household_members')
    .select(
      `
      profile_id,
      profiles (
        id,
        display_name,
        avatar_url
      )
    `,
    )
    .eq('household_id', householdId);

  if (error) {
    return fail('Error en operación');
  }

  type MemberWithProfile = {
    profile_id: string;
    profiles: {
      id: string;
      display_name: string;
      avatar_url: string | null;
    } | null;
  };

  const typedData = (data as unknown as MemberWithProfile[]) ?? [];

  // Transformar datos
  const members = typedData
    .filter((m) => m.profiles)
    .map((m) => {
      const profile = m.profiles;
      return {
        id: profile?.id || '',
        display_name: profile?.display_name || 'Sin nombre',
        avatar_url: profile?.avatar_url || null,
      };
    });

  return ok(members);
}

// =====================================================
// FUNCIONES PARA OVERVIEW WRAPPER
// =====================================================

/**
 * Obtener datos mensuales para el overview (contribuciones + resumen transacciones)
 */
export async function getMonthlyOverviewData(year: number, month: number): Promise<Result<{
  contributions: Contribution[];
  expensesTotal: number;
  incomesTotal: number;
}>> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No se pudo determinar el hogar activo');
  }

  const supabase = await supabaseServer();

  try {
    // 1. Obtener contribuciones del mes
    const { data: contributions, error: contributionsError } = await supabase
      .from('contributions')
      .select('*')
      .eq('household_id', householdId)
      .eq('year', year)
      .eq('month', month);

    if (contributionsError) {
      return fail('Error al obtener contribuciones: ' + contributionsError.message);
    }

    // 2. Obtener transacciones del mes
    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
    const endOfMonth = month === 12 
      ? `${year + 1}-01-01` 
      : `${year}-${String(month + 1).padStart(2, '0')}-01`;

    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('household_id', householdId)
      .gte('occurred_at', startOfMonth)
      .lt('occurred_at', endOfMonth);

    if (transactionsError) {
      return fail('Error al obtener transacciones: ' + transactionsError.message);
    }

    // 3. Calcular totales
    const typedTransactions = (transactions || []) as Array<{ type: string; amount: number }>;
    const expensesTotal = typedTransactions
      .filter(t => t.type === 'expense' || t.type === 'expense_direct')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const incomesTotal = typedTransactions
      .filter(t => t.type === 'income' || t.type === 'income_direct')
      .reduce((sum, t) => sum + t.amount, 0);

    return ok({
      contributions: (contributions as Contribution[]) || [],
      expensesTotal,
      incomesTotal,
    });

  } catch {
    return fail('Error inesperado al obtener datos mensuales');
  }
}
