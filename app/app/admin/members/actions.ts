'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabaseServer';
import { getCurrentHouseholdId, isOwner } from '@/lib/adminCheck';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';

/**
 * Actualiza el rol de un miembro
 * Solo puede ser ejecutado por un owner
 */
export async function updateMemberRole(
  memberId: string,
  newRole: 'owner' | 'member'
): Promise<Result> {
  // Verificar permisos
  const userIsOwner = await isOwner();
  if (!userIsOwner) {
    return fail('No tienes permisos para cambiar roles');
  }

  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    return fail('No se encontró el household');
  }

  const supabase = await supabaseServer();

  // Actualizar rol
  const { error } = await supabase
    .from('household_members')
    .update({ role: newRole })
    .eq('id', memberId)
    .eq('household_id', householdId);

  if (error) {
    return fail(error.message);
  }

  revalidatePath('/app/admin/members');
  return ok();
}

/**
 * Elimina un miembro del household
 * Solo puede ser ejecutado por un owner
 */
export async function removeMember(memberId: string): Promise<Result> {
  // Verificar permisos
  const userIsOwner = await isOwner();
  if (!userIsOwner) {
    return fail('No tienes permisos para eliminar miembros');
  }

  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    return fail('No se encontró el household');
  }

  const supabase = await supabaseServer();

  // Verificar que no es el último owner
  const { data: owners, error: ownersError } = await supabase
    .from('household_members')
    .select('*')
    .eq('household_id', householdId)
    .eq('role', 'owner');

  if (ownersError) {
    return fail(ownersError.message);
  }

  // @ts-ignore
  if (owners && owners.length === 1 && owners[0]?.id === memberId) {
    return fail('No puedes eliminar el último owner del hogar');
  }

  // Eliminar miembro
  const { error } = await supabase
    .from('household_members')
    .delete()
    .eq('id', memberId)
    .eq('household_id', householdId);

  if (error) {
    return fail(error.message);
  }

  revalidatePath('/app/admin/members');
  return ok();
}
