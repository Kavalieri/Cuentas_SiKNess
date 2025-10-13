import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser, getUserHouseholds, query } from '@/lib/supabaseServer';
import { ArrowRight, Crown, Home, Plus, Settings, Users } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

interface Household {
  id: string;
  name: string;
  role: 'owner' | 'member';
  is_owner: boolean;
  member_count?: number;
  created_at?: string;
}

export default async function ManageHouseholdsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  // Obtener todos los hogares del usuario
  const userHouseholdsRaw = await getUserHouseholds();
  const userHouseholds = userHouseholdsRaw as unknown as Household[];

  // Obtener hogar activo
  const activeHouseholdResult = await query(
    'SELECT active_household_id FROM user_settings WHERE profile_id = $1',
    [currentUser.profile_id]
  );
  
  const activeHouseholdId = activeHouseholdResult.rows[0]?.active_household_id;

  // Enriquecer con datos adicionales
  const enrichedHouseholds = await Promise.all(
    userHouseholds.map(async (household) => {
      // Obtener número de miembros
      const memberCountResult = await query(
        'SELECT COUNT(*) as count FROM household_members WHERE household_id = $1',
        [household.id]
      );
      
      return {
        ...household,
        member_count: parseInt(memberCountResult.rows[0]?.count || '0'),
        is_active: household.id === activeHouseholdId,
      };
    })
  );

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Gestionar Hogares</h1>
        <p className="text-muted-foreground">
          Administra todos tus hogares, cambia entre ellos o crea nuevos
        </p>
      </div>

      {/* Crear Nuevo Hogar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Crear Nuevo Hogar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Crea un nuevo hogar para gestionar gastos separados
          </p>
          <Button asChild>
            <Link href="/dual-flow/hogar/create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Hogar
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Hogares */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Mis Hogares</h2>
        
        {enrichedHouseholds.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No tienes hogares aún</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu primer hogar para comenzar a gestionar gastos
              </p>
              <Button asChild>
                <Link href="/dual-flow/hogar/create">Crear Primer Hogar</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {enrichedHouseholds.map((household) => (
              <Card key={household.id} className={household.is_active ? 'ring-2 ring-primary' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      <span>{household.name}</span>
                      {household.is_active && (
                        <Badge variant="default" className="text-xs">
                          Activo
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {household.is_owner && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          Owner
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {household.member_count} miembros
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!household.is_active && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dual-flow/hogar/switch?id=${household.id}`}>
                            Activar
                          </Link>
                        </Button>
                      )}
                      
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dual-flow/hogar/${household.id}/settings`}>
                          <Settings className="h-4 w-4" />
                        </Link>
                      </Button>
                      
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dual-flow/hogar/${household.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Espaciado para navegación inferior */}
      <div className="h-20"></div>
    </div>
  );
}