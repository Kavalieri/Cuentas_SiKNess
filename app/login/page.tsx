'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, UserPlus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { sendMagicLink_Action } from './actions';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [hasInvitation, setHasInvitation] = useState(false);
  const searchParams = useSearchParams();

  // Detectar si viene con token de invitación
  useEffect(() => {
    const returnUrl = searchParams.get('returnUrl');
    const invitationToken = searchParams.get('invitation');
    if (returnUrl?.includes('/app/invite') || invitationToken) {
      setHasInvitation(true);
    }
  }, [searchParams]);

  // Mostrar error si viene del callback
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      if (error === 'no_session') {
        toast.error('No se pudo crear la sesión. Intenta de nuevo.');
      } else {
        toast.error(`Error: ${error}`);
      }
    }
  }, [searchParams]);

  const handleGoogleLogin = () => {
    console.log('[Login] handleGoogleLogin called');
    alert('Botón clickeado - Ver consola para más info');

    try {
      // Capturar token de invitación si existe
      const invitationToken = searchParams.get('invitation');
      console.log('[Login] Invitation token:', invitationToken);

      // Construir URL de OAuth
      let oauthUrl = '/auth/google';
      if (invitationToken) {
        oauthUrl += `?invitation=${encodeURIComponent(invitationToken)}`;
      }

      console.log('[Login] Google OAuth redirect:', oauthUrl);

      // Redireccionar a Google OAuth
      window.location.href = oauthUrl;
    } catch (error) {
      console.error('[Login] Error en handleGoogleLogin:', error);
      toast.error('Error al iniciar sesión con Google');
    }
  };  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', email);

      // Capturar token de invitación si existe
      const invitationToken = searchParams.get('invitation');
      if (invitationToken) {
        formData.append('invitation', invitationToken);
      }

      const result = await sendMagicLink_Action(formData);

      if (!result.ok) {
        toast.error(result.message);
      } else {
        setEmailSent(true);
        toast.success('¡Revisa tu correo! Te hemos enviado un enlace de acceso.');
      }
    } catch {
      toast.error('Ocurrió un error. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Revisa tu correo</CardTitle>
            <CardDescription>
              Te hemos enviado un enlace mágico a <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Haz clic en el enlace del correo para acceder a tu cuenta. El enlace es válido durante
              1 hora.
            </p>
            <Button variant="outline" onClick={() => setEmailSent(false)} className="w-full">
              Volver a enviar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hasInvitation && <UserPlus className="h-5 w-5" />}
            {hasInvitation ? '¡Te han invitado!' : 'Iniciar Sesión'}
          </CardTitle>
          <CardDescription>
            {hasInvitation
              ? 'Inicia sesión o crea una cuenta para aceptar tu invitación'
              : 'Introduce tu email y te enviaremos un enlace mágico para acceder'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasInvitation && (
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Has recibido una invitación. Después de iniciar sesión, podrás aceptarla
                automáticamente.
              </AlertDescription>
            </Alert>
          )}

          {/* Botón de Google OAuth */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            className="w-full"
            disabled={isLoading}
          >
            🔵 Continuar con Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">O</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Enviando...' : 'Enviar enlace mágico'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
