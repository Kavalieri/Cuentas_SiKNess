'use server';

import { cookies } from 'next/headers';

/**
 * Limpia la cookie de invitación después de ser usada o si es inválida
 * Esto previene que el sistema intente validar tokens ya usados
 */
export async function clearInvitationCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('invitation_token');
}
