import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabaseServer, getCurrentUser } from '@/lib/supabaseServer';
import Link from 'next/link';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ waitingInvite?: string; create?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const supabase = await supabaseServer();
  
  // Verificar si el usuario tiene household
  const { data: household } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .maybeSingle();

  // Si viene con waitingInvite=true, redirigir a onboarding
  // El nuevo sistema unificado maneja invitaciones en /app/invite
  if (params.waitingInvite === 'true' && !household) {
    redirect('/app/onboarding');
  }

  // Si ya tiene household, mostrar configuración normal
  if (household) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configuración</h1>
          <p className="text-muted-foreground">
            Gestiona tu cuenta y preferencias
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información de la Cuenta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Email:</p>
              <p className="font-medium">{user.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Navegación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/app/household">
              <Button variant="outline" className="w-full justify-start">
                Ver Mi Hogar →
              </Button>
            </Link>
            <Link href="/app/profile">
              <Button variant="outline" className="w-full justify-start">
                Editar Perfil →
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si no tiene household y no viene de waitingInvite, redirigir a onboarding
  redirect('/app/onboarding');
}
