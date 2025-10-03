'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InvitationDetails } from '@/app/app/household/invitations/actions';
import { acceptInvitation } from '@/app/app/household/invitations/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Users, Calendar, CheckCircle2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

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
    const result = await acceptInvitation(invitation.token);

    if (!result.ok) {
      toast.error(result.message);
      setIsAccepting(false);
      return;
    }

    toast.success('¡Invitación aceptada!');
    
    // Redirigir según el tipo
    if (invitation.type === 'household') {
      router.push('/app');
    } else {
      router.push('/app/onboarding');
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    // Por ahora solo redirigimos - en el futuro podríamos marcar como rejected
    toast.info('Invitación rechazada');
    router.push('/app/onboarding');
  };

  const expiresIn = formatDistanceToNow(new Date(invitation.expires_at), {
    addSuffix: true,
    locale: es,
  });

  // Extraer mensaje personalizado si existe
  const personalMessage = 
    invitation.metadata && 
    typeof invitation.metadata.personalMessage === 'string' 
      ? invitation.metadata.personalMessage 
      : null;

  if (invitation.type === 'household') {
    return (
      <div className="container max-w-2xl py-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Home className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Te han invitado a un hogar</h1>
          <p className="text-muted-foreground">
            {invitation.invited_by_email} te invita a unirte
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              {invitation.household_name || 'Hogar compartido'}
            </CardTitle>
            <CardDescription>Gestiona gastos compartidos con tu pareja</CardDescription>
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
              {invitation.email && (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email de la invitación</p>
                    <p className="text-sm text-muted-foreground">{invitation.email}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Expira</p>
                  <p className="text-sm text-muted-foreground">{expiresIn}</p>
                </div>
              </div>
            </div>

            {/* Advertencia si el email no coincide */}
            {emailMismatch && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                <p className="text-sm text-destructive font-medium mb-1">Email no coincide</p>
                <p className="text-sm text-muted-foreground">
                  Esta invitación es para <strong>{invitation.email}</strong>, pero iniciaste sesión con{' '}
                  <strong>{userEmail}</strong>. Por favor, inicia sesión con el email correcto o solicita una nueva
                  invitación.
                </p>
              </div>
            )}

            {/* Mensaje personalizado */}
            {personalMessage && (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-medium mb-1">Mensaje personal</p>
                <p className="text-sm text-muted-foreground">
                  {personalMessage}
                </p>
              </div>
            )}

            {/* Límite de usos */}
            {invitation.max_uses && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Usos:</span>
                <Badge variant="secondary">
                  {invitation.current_uses} / {invitation.max_uses}
                </Badge>
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleAccept}
                disabled={isAccepting || isRejecting || emailMismatch}
                className="flex-1"
                size="lg"
              >
                {isAccepting ? 'Aceptando...' : 'Aceptar y Unirme'}
              </Button>
              <Button
                onClick={handleReject}
                variant="outline"
                disabled={isAccepting || isRejecting}
                className="flex-1"
                size="lg"
              >
                {isRejecting ? 'Rechazando...' : 'Rechazar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invitación tipo 'app'
  return (
    <div className="container max-w-2xl py-16">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 mb-4">
          <Sparkles className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold mb-2">¡Te han invitado a CuentasSiK!</h1>
        <p className="text-muted-foreground">
          {invitation.invited_by_email} te recomienda nuestra app para gestionar gastos compartidos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comienza a gestionar tus gastos</CardTitle>
          <CardDescription>
            CuentasSiK te ayuda a llevar un control claro y transparente de los gastos compartidos con tu pareja
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Características */}
          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Registro de gastos</p>
                <p className="text-sm text-muted-foreground">Añade y categoriza todos tus gastos e ingresos</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Contribuciones proporcionales</p>
                <p className="text-sm text-muted-foreground">
                  Cada uno aporta según sus ingresos de forma automática
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Transparencia total</p>
                <p className="text-sm text-muted-foreground">Ambos pueden ver y gestionar los gastos del hogar</p>
              </div>
            </div>
          </div>

          {/* Mensaje personalizado */}
          {personalMessage && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-1">Mensaje de {invitation.invited_by_email}</p>
              <p className="text-sm text-muted-foreground">
                {personalMessage}
              </p>
            </div>
          )}

          {/* Información adicional */}
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Invitación válida hasta:</span>
              <span className="font-medium">{expiresIn}</span>
            </div>
            {invitation.max_uses && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Usos disponibles:</span>
                <Badge variant="secondary">
                  {invitation.max_uses - invitation.current_uses} restantes
                </Badge>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleAccept} disabled={isAccepting || isRejecting} className="flex-1" size="lg">
              {isAccepting ? 'Iniciando...' : 'Empezar Ahora'}
            </Button>
            <Button onClick={handleReject} variant="outline" disabled={isAccepting || isRejecting} size="lg">
              {isRejecting ? 'Cancelando...' : 'Ahora No'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
