import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Separator } from '@/components/ui/separator'; // No disponible
import { getCurrentUser, getUserHouseholdId } from '@/lib/supabaseServer';
import {
  ArrowLeft,
  Bell,
  CheckCircle,
  Home,
  LogOut,
  Settings,
  User,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export default async function PerfilDualFlowPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const householdId = await getUserHouseholdId();
  if (!householdId) {
    redirect('/app/onboarding');
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Perfil Dual-Flow</h1>
        <p className="text-muted-foreground">
          Gestión de perfil y configuraciones del sistema dual-flow
        </p>
      </div>

      <Suspense fallback={<div>Cargando perfil...</div>}>
        <PerfilContent user={currentUser} householdId={householdId} />
      </Suspense>

      <div className="h-20"></div>
    </div>
  );
}

async function PerfilContent({ user, householdId }: { user: any; householdId: string }) {
  // Obtener información del hogar
  const { supabaseServer } = await import('@/lib/supabaseServer');
  const supabase = await supabaseServer();

  const { data: household } = await supabase
    .from('households')
    .select('name')
    .eq('id', householdId)
    .single();

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  const { data: memberInfo } = await supabase.rpc('get_household_members', {
    p_household_id: householdId,
  });

  const userRole = memberInfo?.find((m: any) => m.profile_id === user.id)?.role || 'member';

  return (
    <div className="space-y-6">
      {/* Header del usuario */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{profile?.full_name || user.email}</CardTitle>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <Badge variant={userRole === 'owner' ? 'default' : 'secondary'} className="mt-1">
                  {userRole === 'owner' ? 'Propietario' : 'Miembro'}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="w-4 h-4 text-primary" />
                Sistema Dual-Flow
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Información del hogar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Hogar Actual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{household?.name || 'Sin nombre'}</div>
              <p className="text-sm text-muted-foreground">ID: {householdId.slice(0, 8)}...</p>
            </div>
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="w-3 h-3" />
              Activo
            </Badge>
          </div>

          <div className="border-t" />

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total de miembros</span>
              <span>{memberInfo?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tu rol</span>
              <span className="capitalize">{userRole === 'owner' ? 'Propietario' : 'Miembro'}</span>
            </div>
          </div>

          {userRole === 'owner' && (
            <div className="pt-2">
              <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                <Link href="/dual-flow/hogar">
                  <Users className="w-4 h-4" />
                  Gestionar Hogar
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuraciones rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuraciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="ghost" className="w-full justify-start gap-3" asChild>
            <Link href="/dual-flow/mas">
              <Zap className="w-4 h-4" />
              Configuración Dual-Flow
            </Link>
          </Button>

          <Button variant="ghost" className="w-full justify-start gap-3" asChild>
            <Link href="/app/profile">
              <User className="w-4 h-4" />
              Perfil Personal
            </Link>
          </Button>

          <Button variant="ghost" className="w-full justify-start gap-3" asChild>
            <Link href="/app/settings">
              <Bell className="w-4 h-4" />
              Notificaciones
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Acciones */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start gap-3" asChild>
            <Link href="/app">
              <ArrowLeft className="w-4 h-4" />
              Volver al Sistema Anterior
            </Link>
          </Button>

          <Button variant="outline" className="w-full justify-start gap-3" asChild>
            <Link href="/app/household">
              <Home className="w-4 h-4" />
              Cambiar de Hogar
            </Link>
          </Button>

          <div className="border-t" />

          <Button variant="destructive" className="w-full justify-start gap-3" asChild>
            <Link href="/auth/logout">
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
