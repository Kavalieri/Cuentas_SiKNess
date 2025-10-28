'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { sendMagicLink, signOut as authSignOut } from '@/lib/auth';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';

const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
});

/**
 * Envía un magic link al email especificado
 */
export async function sendMagicLink_Action(formData: FormData): Promise<Result> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return fail('Email inválido', parsed.error.flatten().fieldErrors);
  }

  const { email } = parsed.data;
  
  // Capturar token de invitación si existe
  const invitationToken = formData.get('invitation');
  let redirectUrl: string | undefined;
  
  if (invitationToken && typeof invitationToken === 'string') {
    // Si hay invitación, redirigir al endpoint de aceptación después de verificar
    redirectUrl = `/api/auth/accept-email-invitation/${invitationToken}`;
  }

  const result = await sendMagicLink(email, redirectUrl);

  if (!result.success) {
    return fail(result.error || 'Error al enviar el correo');
  }

  return ok({ email });
}

/**
 * Cierra la sesión del usuario actual
 */
export async function signOut(): Promise<void> {
  await authSignOut();
  redirect('/login');
}
