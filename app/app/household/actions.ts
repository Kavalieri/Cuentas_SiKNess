'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseServer, getCurrentUser, getUserHouseholdId } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';
import { isOwner } from '@/lib/adminCheck';

const HouseholdSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
});

/**
 * Crea un nuevo household para el usuario actual
 */
export async function createHousehold(formData: FormData): Promise<Result<{ household_id: string }>> {
  const parsed = HouseholdSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const user = await getCurrentUser();
  if (!user) {
    return fail('No autenticado');
  }

  const supabase = await supabaseServer();

  // Usar función SQL con SECURITY DEFINER para bypasear problemas de RLS
  // @ts-ignore - Supabase types issue con Next.js 15
  const { data, error } = await supabase.rpc('create_household_with_member', {
    p_household_name: parsed.data.name,
    p_user_id: user.id,
  });

  if (error || !data) {
    console.error('❌ Error creando household:', error);
    return fail(error?.message || 'Error al crear el hogar');
  }

  // @ts-ignore - data es JSON con household_id
  const household_id = data.household_id as string;

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
    return fail(error.message);
  }

  return ok(data);
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
  const { error } = await supabase
    .from('households')
    .update({ name })
    .eq('id', householdId);

  if (error) {
    return fail(error.message);
  }

  revalidatePath('/app/household');
  return ok();
}

/**
 * Actualiza el rol de un miembro (solo owners)
 */
export async function updateMemberRole(
  memberId: string,
  newRole: 'owner' | 'member'
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
    return fail(error.message);
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
    .select('user_id')
    .eq('household_id', householdId)
    .eq('role', 'owner');

  if (owners && owners.length === 1) {
    const { data: memberToDelete } = await supabase
      .from('household_members')
      .select('user_id')
      .eq('id', memberId)
      .single();

    if (memberToDelete && owners[0]?.user_id === memberToDelete.user_id) {
      return fail('No puedes eliminar el último administrador del hogar');
    }
  }

  // Eliminar miembro
  const { error } = await supabase
    .from('household_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    return fail(error.message);
  }

  revalidatePath('/app/household');
  return ok();
}
