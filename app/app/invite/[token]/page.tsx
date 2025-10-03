import { redirect } from 'next/navigation';
import { acceptInvitation } from '@/app/app/household/invitations/actions';
import { getCurrentUser } from '@/lib/supabaseServer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Home, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface AcceptInvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function AcceptInvitePage({ params }: AcceptInvitePageProps) {
  const { token } = await params;
  const user = await getCurrentUser();

  // Si no está autenticado, redirigir a login con returnUrl
  if (!user) {
    redirect(`/login?returnUrl=/app/invite/${token}`);
  }

  // Intentar aceptar la invitación
  const result = await acceptInvitation(token);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {result.ok ? (
            <>
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-500" />
              </div>
              <CardTitle className="text-2xl">¡Invitación Aceptada!</CardTitle>
              <CardDescription className="text-base mt-2">
                Te has unido al hogar <strong>{result.data?.householdName}</strong>
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-500" />
              </div>
              <CardTitle className="text-2xl">Error</CardTitle>
              <CardDescription className="text-base mt-2 text-destructive">
                {result.message}
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent>
          {result.ok ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm text-muted-foreground">
                  Ya puedes acceder a todas las funciones del hogar, ver gastos compartidos
                  y contribuir con los demás miembros.
                </p>
              </div>

              <Link href="/app" className="block">
                <Button className="w-full" size="lg">
                  <Home className="mr-2 h-5 w-5" />
                  Ir al Dashboard
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                      Posibles causas:
                    </p>
                    <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1 list-disc list-inside">
                      <li>La invitación ha expirado (más de 7 días)</li>
                      <li>El link ya fue utilizado</li>
                      <li>El email no coincide con tu cuenta</li>
                      <li>Ya eres miembro de este hogar</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Link href="/app" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Ir al Dashboard
                  </Button>
                </Link>
                <Link href="/app/settings" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Configuración
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
