export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';

interface AcceptInvitePageProps {
  params: Promise<{ token: string }>;
}

/**
 * Ruta de compatibilidad: /app/invite/[token]
 * Redirige a /app/invite?token=xxx para usar el flujo correcto
 * 
 * Esta ruta existe para mantener compatibilidad con URLs antiguas.
 * El flujo correcto usa query strings para evitar problemas con cookies
 * en Server Components (Next.js 15).
 */
export default async function AcceptInvitePage({ params }: AcceptInvitePageProps) {
  const { token } = await params;
  
  // Redirigir a la ruta correcta con query string
  redirect(`/app/invite?token=${token}`);
}
