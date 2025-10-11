import { supabaseServer } from '@/lib/supabaseServer';

/**
 * Verifica si el usuario actual es administrador del sistema
 * Los system admins tienen acceso completo a todas las funcionalidades
 *
 * ✅ OPTIMIZADO: Usa campo directo is_system_admin en profiles (sin JOINs)
 *
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

  // Obtener profile_id del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_system_admin')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    return false;
  }

  // ✅ Campo directo, sin JOIN con system_admins
  return profile.is_system_admin || false;
}

/**
 * Verifica si el usuario actual es owner de su household
 *
 * ✅ OPTIMIZADO: Usa campo booleano is_owner (sin comparación de strings)
 *
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

  // Obtener profile_id del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    return false;
  }

  // ✅ Verificar con campo booleano directo (más rápido que string comparison)
  const { data, error } = await supabase
    .from('household_members')
    .select('is_owner')
    .eq('profile_id', profile.id)
    .single();

  if (error || !data) {
    return false;
  }

  return data.is_owner;
}

/**
 * Verifica si un usuario específico es owner de un household específico
 *
 * ✅ OPTIMIZADO: Query directa con campo booleano
 *
 * @param profileId - ID del perfil del usuario
 * @param householdId - ID del household
 * @returns true si es owner, false en caso contrario
 */
export async function isHouseholdOwner(
  profileId: string,
  householdId: string
): Promise<boolean> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('household_members')
    .select('is_owner')
    .eq('profile_id', profileId)
    .eq('household_id', householdId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.is_owner;
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

  // Obtener profile_id del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    return null;
  }

  // Buscar household usando profile_id
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('profile_id', profile.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data.household_id;
}

/**
 * Obtiene información completa del usuario en su household
 *
 * ✅ OPTIMIZADO: Usa campo booleano is_owner
 *
 * @returns Información del usuario o null si no pertenece a ningún household
 */
export async function getCurrentUserMembership(): Promise<{
  userId: string;
  profileId: string;
  householdId: string;
  isOwner: boolean; // ✅ Cambiado de role a isOwner
} | null> {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Obtener profile_id del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    return null;
  }

  // Buscar membership usando profile_id
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id, is_owner')
    .eq('profile_id', profile.id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    userId: user.id,
    profileId: profile.id,
    householdId: data.household_id,
    isOwner: data.is_owner, // ✅ Campo booleano directo
  };
}

/**
 * Obtiene el ID del perfil del usuario actual
 *
 * @returns profile_id o null si no hay usuario autenticado
 */
export async function getCurrentProfileId(): Promise<string | null> {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  return profile?.id || null;
}
