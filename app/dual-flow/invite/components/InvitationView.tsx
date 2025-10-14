'use client';

import type { InvitationDetails } from '@/app/dual-flow/invite/actions';
import { acceptHouseholdInvitation } from '@/app/dual-flow/invite/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, CheckCircle2, Home, Sparkles, Users, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface InvitationViewProps {
  invitation: InvitationDetails;
  userEmail: string;
}

export function InvitationView({ invitation, userEmail }: InvitationViewProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Validar email si la invitación es específica para un email
  const emailMismatch =
    invitation.email !== null && invitation.email.toLowerCase() !== userEmail.toLowerCase();

  const handleAccept = async () => {
    if (emailMismatch) {
      toast.error('Esta invitación es para otro email');
      return;
    }

    setIsAccepting(true);
    const result = await acceptHouseholdInvitation(invitation.token, userEmail);

    if (!result.ok) {
      toast.error(result.message);
      setIsAccepting(false);
      return;
    }

    toast.success('¡Invitación aceptada! Bienvenido al hogar.');

    // Redirigir al dual-flow
    router.push('/dual-flow');
  };

  const handleReject = async () => {
    setIsRejecting(true);
    toast.info('Invitación rechazada');
    router.push('/dual-flow');
  };

  const expiresIn = formatDistanceToNow(new Date(invitation.expires_at), {
    addSuffix: true,
    locale: es,
  });

  // Extraer mensaje personalizado si existe
  const personalMessage =
    invitation.metadata && typeof invitation.metadata.personalMessage === 'string'
      ? invitation.metadata.personalMessage
      : null;

  if (invitation.type === 'household') {
    return (
      <div className="container max-w-2xl py-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Te han invitado a un hogar</h1>
          <p className="text-muted-foreground">
            {invitation.invited_by_email} te invita a unirte al sistema <strong>Dual-Flow</strong>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              {invitation.household_name || 'Hogar compartido'}
            </CardTitle>
            <CardDescription>
              Gestiona gastos compartidos con tu pareja usando el sistema Dual-Flow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Información */}
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Invitado por</p>
                  <p className="text-sm text-muted-foreground">{invitation.invited_by_email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Expira</p>
                  <p className="text-sm text-muted-foreground">{expiresIn}</p>
                </div>
              </div>

              {invitation.email && (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email específico</p>
                    <p className="text-sm text-muted-foreground">{invitation.email}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Mensaje personalizado */}
            {personalMessage && (
              <div className="p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm font-medium mb-2">Mensaje personal:</p>
                <p className="text-sm text-muted-foreground italic">
                  &ldquo;{personalMessage}&rdquo;
                </p>
              </div>
            )}

            {/* Características del sistema Dual-Flow */}
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Sistema Dual-Flow
              </h3>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Gestión avanzada de períodos mensuales</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Contribuciones y balances automáticos</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Dashboard en tiempo real</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Reportes y análisis detallados</span>
                </div>
              </div>
            </div>

            {/* Advertencia de email mismatch */}
            {emailMismatch && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">
                  ⚠️ Esta invitación es para <strong>{invitation.email}</strong>, pero estás
                  conectado como <strong>{userEmail}</strong>.
                </p>
                <p className="text-sm text-destructive mt-1">
                  Para aceptar esta invitación, debes iniciar sesión con el email correcto.
                </p>
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleAccept}
                disabled={isAccepting || emailMismatch}
                className="flex-1"
                size="lg"
              >
                {isAccepting ? 'Aceptando...' : 'Aceptar invitación'}
              </Button>
              <Button variant="outline" onClick={handleReject} disabled={isRejecting} size="lg">
                {isRejecting ? 'Rechazando...' : 'Rechazar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Para otros tipos de invitación (por ahora solo household)
  return (
    <div className="container max-w-md py-16">
      <Card>
        <CardHeader>
          <CardTitle>Tipo de invitación no soportado</CardTitle>
          <CardDescription>
            Esta invitación no puede ser procesada en el sistema Dual-Flow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/dual-flow')} className="w-full">
            Volver al inicio
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
