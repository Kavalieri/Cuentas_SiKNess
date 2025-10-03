import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Cliente Supabase con SERVICE_ROLE_KEY para operaciones de administración
 * 
 * ⚠️ SOLO usar en Server Components/Actions que verifican isSystemAdmin()
 * ⚠️ NUNCA exponer este cliente al navegador
 * ⚠️ Este cliente bypasea Row Level Security (RLS)
 * 
 * Usos válidos:
 * - Panel de administración (listado de usuarios)
 * - Operaciones que requieren auth.admin.*
 * - Scripts de seed/migración
 */
export const supabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables. Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
