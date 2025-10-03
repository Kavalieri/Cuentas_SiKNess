import { supabaseServer } from '@/lib/supabaseServer';

/**
 * Verifica si el usuario actual es administrador del sistema
 * Los system admins tienen acceso completo a todas las funcionalidades
 * @returns true si es system admin, false en caso contrario
 */
export async function isSystemAdmin(): Promise<boolean> {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  // Verificar si existe en la tabla system_admins
  const { data, error } = await supabase
    .from('system_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return false;
  }

  return true;
}

/**
 * Verifica si el usuario actual es owner de su household
 * @returns true si es owner, false en caso contrario
 */
export async function isOwner(): Promise<boolean> {
  const supabase = await supabaseServer();

  // Obtener usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  // Verificar rol en household_members
  const { data, error } = await supabase
    .from('household_members')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return false;
  }

  return data.role === 'owner';
}

/**
 * Obtiene el ID del household del usuario actual
 * @returns household_id o null si no pertenece a ninguno
 */
export async function getCurrentHouseholdId(): Promise<string | null> {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data.household_id;
}

/**
 * Obtiene información completa del usuario en su household
 */
export async function getCurrentUserMembership(): Promise<{
  userId: string;
  householdId: string;
  role: 'owner' | 'member';
} | null> {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    userId: user.id,
    householdId: data.household_id,
    role: data.role as 'owner' | 'member',
  };
}
