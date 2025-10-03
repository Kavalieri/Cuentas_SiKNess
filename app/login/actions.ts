'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';

const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
});

/**
 * Envía un magic link al email especificado
 */
export async function sendMagicLink(formData: FormData): Promise<Result> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return fail('Email inválido', parsed.error.flatten().fieldErrors);
  }

  const supabase = await supabaseServer();
  const { email } = parsed.data;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Usar la URL de tu aplicación, no la de Supabase
      emailRedirectTo: `http://localhost:3000/auth/callback`,
    },
  });

  if (error) {
    return fail(error.message);
  }

  return ok({ email });
}

/**
 * Cierra la sesión del usuario actual
 */
export async function signOut(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect('/login');
}
