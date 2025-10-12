'use client';

import { acceptInvitation } from '@/app/app/household/invitations/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function OnboardingPage() {
  const router = useRouter();
  const [invitationCode, setInvitationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAcceptInvitation = async () => {
    if (!invitationCode.trim()) {
      toast.error('Por favor introduce un código de invitación');
      return;
    }

    // Validar que sea un token válido (64 caracteres hexadecimales)
    if (invitationCode.length !== 64 || !/^[0-9a-f]+$/i.test(invitationCode)) {
      toast.error('Código de invitación inválido. Debe tener 64 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await acceptInvitation(invitationCode);

      if (!result.ok) {
        toast.error(result.message || 'Error al aceptar la invitación');
        return;
      }

      toast.success('¡Invitación aceptada! Bienvenido al hogar.');
      router.push('/app');
      router.refresh();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Ocurrió un error al procesar la invitación');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">¡Bienvenido a CuentasSiK! 🏠</h1>
        <p className="text-muted-foreground text-lg">
          Para comenzar, elige una de las siguientes opciones
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        {/* Opción 1: Crear hogar */}
        <Card className="border-2 hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🏡</span>
              Crear un Hogar Nuevo
            </CardTitle>
            <CardDescription className="text-base">
              Crea tu propio hogar y serás el administrador
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span>
                  Serás el <strong>propietario (owner)</strong> del hogar
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span>Podrás invitar a otros miembros</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span>Configurar contribuciones, categorías y más</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span>Gestión completa del hogar</span>
              </li>
            </ul>
            <Button
              className="w-full"
              size="lg"
              onClick={() => router.push('/app/household/create')}
            >
              Crear Mi Hogar →
            </Button>
          </CardContent>
        </Card>

        {/* Opción 2: Unirse con código de invitación */}
        <Card className="border-2 hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🔑</span>
              Introducir Código de Invitación
            </CardTitle>
            <CardDescription className="text-base">
              ¿Te han enviado un código? Úsalo para unirte a un hogar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">✓</span>
                <span>Introduce el código UUID que te enviaron</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">✓</span>
                <span>Te unirás automáticamente al hogar</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">✓</span>
                <span>
                  Serás <strong>miembro</strong> del hogar
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">✓</span>
                <span>Podrás registrar gastos y ver contribuciones</span>
              </li>
            </ul>

            {/* Input para código de invitación */}
            <div className="space-y-2 pt-2">
              <Label htmlFor="invitation-code">Código de Invitación</Label>
              <Input
                id="invitation-code"
                placeholder="Pega aquí el código de 64 caracteres"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value.trim())}
                className="font-mono text-xs"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                El código tiene 64 caracteres y fue generado por el propietario del hogar
              </p>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleAcceptInvitation}
              disabled={!invitationCode.trim() || isSubmitting}
            >
              {isSubmitting ? 'Procesando...' : 'Unirse al Hogar →'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8 bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="space-y-1">
              <p className="font-medium">¿No estás seguro?</p>
              <p className="text-sm text-muted-foreground">
                Si vives solo o eres el primero en registrarse en tu hogar,{' '}
                <strong>crea un hogar nuevo</strong>. Si alguien ya tiene un hogar configurado y te
                ha enviado un código, <strong>introdúcelo arriba</strong>. Siempre podrás crear más
                hogares o unirte a otros más adelante.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
