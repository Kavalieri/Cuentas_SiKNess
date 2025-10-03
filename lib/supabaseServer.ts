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
 * Obtiene el household_id del usuario autenticado
 */
export const getUserHouseholdId = async (): Promise<string | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) return null;
  return (data as { household_id: string }).household_id;
};
