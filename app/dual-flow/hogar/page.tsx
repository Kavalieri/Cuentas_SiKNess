import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser, getUserHouseholdId } from '@/lib/supabaseServer';
import { ArrowRight, CheckCircle, Crown, Home, Plus, Settings, Users } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export default async function HogarDualFlowPage() {
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
        <h1 className="text-2xl font-bold tracking-tight">Gestión de Hogar</h1>
        <p className="text-muted-foreground">
          Administra tu hogar y crea nuevos hogares en el sistema dual-flow
        </p>
      </div>

      <Suspense fallback={<div>Cargando hogares...</div>}>
        <HogarContent user={currentUser} currentHouseholdId={householdId} />
      </Suspense>

      <div className="h-20"></div>
    </div>
  );
}

async function HogarContent({
  user,
  currentHouseholdId,
}: {
  user: any;
  currentHouseholdId: string;
}) {
  const { supabaseServer } = await import('@/lib/supabaseServer');
  const supabase = await supabaseServer();

  // Obtener todos los hogares donde el usuario es miembro
  const { data: userHouseholds } = await supabase.rpc('get_user_households', {
    p_user_id: user.id,
  });

  // Obtener información del hogar actual
  const { data: currentHousehold } = await supabase
    .from('households')
    .select('*')
    .eq('id', currentHouseholdId)
    .single();

  // Obtener miembros del hogar actual
  const { data: currentMembers } = await supabase.rpc('get_household_members', {
    p_household_id: currentHouseholdId,
  });

  const userRole = currentMembers?.find((m: any) => m.profile_id === user.id)?.role || 'member';

  return (
    <div className="space-y-6">
      {/* Hogar Actual */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              Hogar Actual
            </CardTitle>
            <Badge variant="default" className="gap-1">
              <CheckCircle className="w-3 h-3" />
              Activo
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{currentHousehold?.name || 'Sin nombre'}</h3>
              {userRole === 'owner' && (
                <Badge variant="secondary" className="gap-1">
                  <Crown className="w-3 h-3" />
                  Propietario
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Creado el {new Date(currentHousehold?.created_at || '').toLocaleDateString('es-ES')}
            </p>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{currentMembers?.length || 0} miembros</span>
            </div>
            <div className="text-muted-foreground">ID: {currentHouseholdId.slice(0, 8)}...</div>
          </div>

          {userRole === 'owner' && (
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1 gap-2" asChild>
                <Link href="/app/household/members">
                  <Users className="w-4 h-4" />
                  Gestionar Miembros
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-2" asChild>
                <Link href="/app/household/settings">
                  <Settings className="w-4 h-4" />
                  Configurar Hogar
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Todos los Hogares */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              Todos mis Hogares
            </CardTitle>
            <Button size="sm" className="gap-2" asChild>
              <Link href="/app/household/create">
                <Plus className="w-4 h-4" />
                Nuevo Hogar
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {userHouseholds && userHouseholds.length > 0 ? (
            userHouseholds.map((household: any) => (
              <Card
                key={household.household_id}
                className={`${
                  household.household_id === currentHouseholdId
                    ? 'border-primary/30 bg-primary/5'
                    : 'hover:bg-accent/50'
                } transition-colors`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{household.household_name || 'Sin nombre'}</h4>
                        {household.household_id === currentHouseholdId && (
                          <Badge variant="outline">Actual</Badge>
                        )}
                        {household.role === 'owner' && (
                          <Badge variant="secondary" className="gap-1">
                            <Crown className="w-3 h-3" />
                            Propietario
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {household.member_count || 0} miembros • {household.role}
                      </p>
                    </div>

                    {household.household_id !== currentHouseholdId && (
                      <Button variant="ghost" size="sm" className="gap-2" asChild>
                        <Link href={`/app/household/switch/${household.household_id}`}>
                          Cambiar
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Home className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No tienes acceso a otros hogares</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acciones rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start gap-3" asChild>
            <Link href="/app/household/create">
              <Plus className="w-4 h-4" />
              Crear Nuevo Hogar
            </Link>
          </Button>

          <Button variant="outline" className="w-full justify-start gap-3" asChild>
            <Link href="/app/invite">
              <Users className="w-4 h-4" />
              Unirme a un Hogar (por invitación)
            </Link>
          </Button>

          {userRole === 'owner' && (
            <Button variant="outline" className="w-full justify-start gap-3" asChild>
              <Link href="/app/household/invite">
                <Users className="w-4 h-4" />
                Invitar Miembros
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
