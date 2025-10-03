import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Cliente Supabase para Client Components
 * Usa el almacenamiento del navegador para la sesión
 */
export const supabaseBrowser = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
};
