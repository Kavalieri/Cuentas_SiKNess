'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { Home, Mail, CheckCircle2, Clock } from 'lucide-react';
import { acceptInvitation } from '@/app/app/household/invitations/actions';
import { toast } from 'sonner';

interface PendingInvitation {
  id: string;
  token: string;
  household_name: string | null;
  invited_by_email: string;
  expires_at: string;
  type: string;
}

interface DashboardOnboardingProps {
  pendingInvitation?: PendingInvitation;
}

export function DashboardOnboarding({ pendingInvitation }: DashboardOnboardingProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAcceptInvitation = async () => {
    if (!pendingInvitation) return;

    setIsAccepting(true);
    const result = await acceptInvitation(pendingInvitation.token);
    setIsAccepting(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success('¡Te has unido al hogar correctamente!');
    router.push('/app');
    router.refresh();
  };

  const daysUntilExpiry = pendingInvitation 
    ? Math.ceil((new Date(pendingInvitation.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">¡Bienvenido a CuentasSiK! 🏠</h1>
        <p className="text-muted-foreground text-lg">
          Para comenzar, elige una de las siguientes opciones
        </p>
      </div>

      {/* Invitación Pendiente */}
      {pendingInvitation && (
        <Alert className="border-2 border-primary bg-primary/5">
          <Mail className="h-5 w-5" />
          <AlertDescription className="space-y-4">
            <div>
              <p className="font-semibold text-lg mb-2">
                ¡Tienes una invitación pendiente!
              </p>
              <p className="text-sm">
                Has sido invitado a unirte al hogar{' '}
                <strong>{pendingInvitation.household_name || 'sin nombre'}</strong> por{' '}
                <strong>{pendingInvitation.invited_by_email}</strong>
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Expira en {daysUntilExpiry} {daysUntilExpiry === 1 ? 'día' : 'días'}
              </span>
            </div>

            <Button 
              onClick={handleAcceptInvitation}
              disabled={isAccepting}
              size="lg"
              className="w-full"
            >
              {isAccepting ? 'Uniéndome...' : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Aceptar Invitación y Unirme
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Opción 1: Crear hogar */}
        <Card className="border-2 hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-6 w-6" />
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
                <span>Serás el <strong>propietario (owner)</strong> del hogar</span>
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
              variant="outline"
            >
              Crear Mi Hogar →
            </Button>
          </CardContent>
        </Card>

        {/* Opción 2: Esperar invitación */}
        <Card className={`border-2 transition-colors ${pendingInvitation ? 'opacity-50' : 'hover:border-primary'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-6 w-6" />
                Esperar Invitación
              </CardTitle>
              {pendingInvitation && (
                <Badge variant="secondary">Ya tienes una</Badge>
              )}
            </div>
            <CardDescription className="text-base">
              Únete a un hogar existente cuando te inviten
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">✓</span>
                <span>Alguien con un hogar te enviará una invitación</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">✓</span>
                <span>Recibirás un enlace o lo verás aquí arriba</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">✓</span>
                <span>Te unirás como <strong>miembro</strong> del hogar</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">✓</span>
                <span>Podrás gestionar gastos e ingresos compartidos</span>
              </li>
            </ul>
            
            {pendingInvitation ? (
              <div className="text-center py-3 text-sm text-muted-foreground">
                Acepta tu invitación arriba para continuar
              </div>
            ) : (
              <div className="text-center py-3 text-sm text-muted-foreground">
                Esperando a que te inviten...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">💡 ¿Qué es un Hogar en CuentasSiK?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Un <strong>hogar</strong> es un espacio compartido donde tú y tu pareja (u otros miembros) 
            pueden gestionar juntos sus finanzas:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Registrar gastos e ingresos compartidos</li>
            <li>Configurar contribuciones proporcionales según ingresos</li>
            <li>Ver el estado del fondo común mensual</li>
            <li>Organizar gastos por categorías</li>
            <li>Hacer seguimiento del balance conjunto</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
