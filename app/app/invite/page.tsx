export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/supabaseServer';
import { getInvitationDetails } from '@/app/app/household/invitations/actions';
import { InvitationView } from './components/InvitationView';

interface InvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const params = await searchParams;
  
  // Intentar obtener token de query string o de cookie
  let token = params.token;
  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get('invitation_token')?.value;
  }

  if (!token) {
    return (
      <div className="container max-w-md py-16">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
          <h1 className="text-2xl font-bold text-destructive mb-4">Token no encontrado</h1>
          <p className="text-muted-foreground">
            No se encontró un token de invitación válido. Asegúrate de usar el enlace completo que te enviaron.
          </p>
        </div>
      </div>
    );
  }

  // Verificar si el usuario está autenticado
  const user = await getCurrentUser();

  // Si no está autenticado, redirigir a login con returnUrl
  if (!user) {
    redirect(`/login?returnUrl=/app/invite?token=${token}`);
  }

  // Obtener detalles de la invitación
  const result = await getInvitationDetails(token);

  if (!result.ok) {
    return (
      <div className="container max-w-md py-16">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
          <h1 className="text-2xl font-bold text-destructive mb-4">Invitación inválida</h1>
          <p className="text-muted-foreground mb-4">{result.message}</p>
          <p className="text-sm text-muted-foreground">
            Posibles razones:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
            <li>La invitación ha expirado</li>
            <li>Ya fue utilizada</li>
            <li>Fue cancelada por quien la creó</li>
            <li>El token es incorrecto</li>
          </ul>
        </div>
      </div>
    );
  }

  // Renderizar vista según el tipo de invitación
  return <InvitationView invitation={result.data!} userEmail={user.email || ''} />;
}
