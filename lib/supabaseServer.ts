import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

/**
 * Cliente Supabase para Server Components y Server Actions
 * Usa las cookies para mantener la sesión del usuario
 */
export const supabaseServer = async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Puede fallar en Server Components, ignorar
          }
        },
      },
    },
  );
};

/**
 * Obtiene el usuario autenticado actual
 */
export const getCurrentUser = async () => {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

/**
 * Obtiene el household_id activo del usuario autenticado
 * Si el usuario pertenece a múltiples households, retorna el seleccionado activamente
 * Si no tiene household activo configurado, retorna el primero disponible y lo guarda
 */
export const getUserHouseholdId = async (): Promise<string | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await supabaseServer();

  // Obtener el profile_id del usuario autenticado
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) return null;

  // 1. Intentar obtener household activo desde user_settings
  const { data: settings } = await supabase
    .from('user_settings')
    .select('active_household_id')
    .eq('profile_id', profile.id)
    .maybeSingle();

  if (settings?.active_household_id) {
    // Verificar que todavía es miembro de ese household
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('profile_id', profile.id)
      .eq('household_id', settings.active_household_id)
      .maybeSingle();

    if (membership) {
      return settings.active_household_id;
    }
  }

  // 2. Fallback: Obtener el primer household disponible
  const { data: firstHousehold } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('profile_id', profile.id)
    .limit(1)
    .maybeSingle();

  if (firstHousehold) {
    // Guardar como activo para próxima vez
    await supabase
      .from('user_settings')
      .upsert({
        profile_id: profile.id,
        active_household_id: firstHousehold.household_id,
      });

    return firstHousehold.household_id;
  }

  return null;
};

/**
 * Obtiene todos los households a los que pertenece el usuario
 */
export const getUserHouseholds = async (): Promise<
  Array<{
    id: string;
    name: string;
    role: 'owner' | 'member';
    created_at: string | null;
  }>
> => {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await supabaseServer();

  // Obtener el profile_id del usuario autenticado
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) return [];

  const { data: memberships, error } = await supabase
    .from('household_members')
    .select(`
      household_id,
      role,
      households (
        id,
        name,
        created_at
      )
    `)
    .eq('profile_id', profile.id);

  if (error || !memberships) {
    console.error('Error fetching user households:', error);
    return [];
  }

  return memberships.map((m) => ({
    id: m.household_id,
    // @ts-ignore - Nested select returns object
    name: m.households.name,
    role: m.role as 'owner' | 'member',
    // @ts-ignore - Nested select returns object
    created_at: m.households.created_at,
  }));
};
