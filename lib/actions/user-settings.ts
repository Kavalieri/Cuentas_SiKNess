'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer, getCurrentUser } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';

/**
 * Cambia el household activo del usuario
 * Solo puede cambiar a households de los que es miembro
 */
export async function setActiveHousehold(householdId: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) {
    return fail('Usuario no autenticado');
  }

  const supabase = await supabaseServer();

  // Obtener el profile_id del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    return fail('Perfil no encontrado');
  }

  // Verificar que el usuario es miembro de este household
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('profile_id', profile.id)
    .eq('household_id', householdId)
    .maybeSingle();

  if (!membership) {
    return fail('No eres miembro de este hogar');
  }

  // Actualizar settings
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      profile_id: profile.id,
      active_household_id: householdId,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error updating active household:', error);
    return fail('Error al cambiar de hogar');
  }

  // Revalidar layout completo (afecta navegación y todos los datos)
  revalidatePath('/app', 'layout');

  return ok();
}

/**
 * Obtiene el household activo del usuario desde settings
 */
export async function getActiveHouseholdId(): Promise<string | undefined> {
  const user = await getCurrentUser();
  if (!user) return undefined;

  const supabase = await supabaseServer();

  // Obtener el profile_id del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) return undefined;

  const { data: settings } = await supabase
    .from('user_settings')
    .select('active_household_id')
    .eq('profile_id', profile.id)
    .maybeSingle();

  return settings?.active_household_id || undefined;
}
