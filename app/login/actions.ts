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

  // Detectar la URL base correcta según el entorno
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${baseUrl}/auth/callback`,
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
