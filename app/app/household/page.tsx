import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabaseServer, getCurrentUser } from '@/lib/supabaseServer';
import { getCurrentHouseholdId, isOwner } from '@/lib/adminCheck';
import { HouseholdInfo } from './components/HouseholdInfo';
import { MembersList } from './components/MembersList';
import { DangerZone } from './components/DangerZone';
import { OverviewWrapper } from './components/OverviewWrapper';
import { CategoriesTab } from './components/CategoriesTab';
import { StatusTab } from '@/app/app/contributions/components/StatusTab';
import { ConfigurationTab } from '@/app/app/contributions/components/ConfigurationTab';
import { HistoryTab } from '@/app/app/contributions/components/HistoryTab';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function HouseholdPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const householdId = await getCurrentHouseholdId();
  
  // Si no tiene household, redirigir a creación
  if (!householdId) {
    redirect('/app/household/create');
  }

  const userIsOwner = await isOwner();
  const supabase = await supabaseServer();

  // Obtener información del hogar
  const { data: household } = await supabase
    .from('households')
    .select('id, name, created_at')
    .eq('id', householdId)
    .single();

  if (!household) {
    return <div>Hogar no encontrado</div>;
  }

  // Obtener miembros del hogar
  const { data: membersData } = await supabase.rpc('get_household_members', {
    p_household_id: householdId,
  });

  // Enriquecer con ingresos actuales
  const members = await Promise.all(
    (membersData || []).map(async (member) => {
      const { data: income } = await supabase.rpc('get_member_income', {
        p_household_id: householdId,
        p_user_id: member.user_id,
        p_date: new Date().toISOString().split('T')[0],
      });

      return {
        id: member.id,
        user_id: member.user_id,
        email: member.email || 'Sin email',
        role: member.role as 'owner' | 'member',
        currentIncome: (income as number) ?? 0,
      };
    })
  );

  // Obtener contribuciones del mes actual
  const now = new Date();
  const { data: contributions } = await supabase
    .from('contributions')
    .select('*')
    .eq('household_id', householdId)
    .eq('year', now.getFullYear())
    .eq('month', now.getMonth() + 1);

  // Obtener meta mensual
  const { data: settings } = await supabase
    .from('household_settings')
    .select('monthly_contribution_goal')
    .eq('household_id', householdId)
    .single();

  const goalAmount = settings?.monthly_contribution_goal ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">🏠 Mi Hogar</h1>
        <p className="text-muted-foreground">
          {userIsOwner 
            ? 'Gestiona tu hogar, miembros y contribuciones' 
            : 'Información de tu hogar y contribuciones'}
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="contributions">Contribuciones</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="members">Miembros</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
          {userIsOwner && <TabsTrigger value="danger">⚠️ Peligroso</TabsTrigger>}
        </TabsList>

        {/* Tab 1: Overview / Resumen */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <OverviewWrapper
            householdId={householdId}
            initialMembers={members}
            initialContributions={contributions || []}
            initialGoalAmount={goalAmount}
            currentUserId={user.id}
          />
        </TabsContent>

        {/* Tab 2: Contribuciones (Config + Cálculo) */}
        <TabsContent value="contributions" className="space-y-6 mt-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">💰 Configuración de Contribuciones</h2>
              <p className="text-muted-foreground">
                Sistema de contribuciones proporcionales basado en ingresos
              </p>
            </div>
            
            <Tabs defaultValue="config" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="config">Configuración</TabsTrigger>
                <TabsTrigger value="status">Estado</TabsTrigger>
                <TabsTrigger value="history">Historial</TabsTrigger>
              </TabsList>

              <TabsContent value="config" className="space-y-6 mt-6">
                <ConfigurationTab householdId={householdId} />
              </TabsContent>

              <TabsContent value="status" className="space-y-6 mt-6">
                <StatusTab householdId={householdId} />
              </TabsContent>

              <TabsContent value="history" className="space-y-6 mt-6">
                <HistoryTab householdId={householdId} />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        {/* Tab 3: Categorías */}
        <TabsContent value="categories" className="space-y-6 mt-6">
          <CategoriesTab />
        </TabsContent>

        {/* Tab 4: Miembros */}
        <TabsContent value="members" className="space-y-6 mt-6">
          {userIsOwner ? (
            <Card>
              <CardHeader>
                <CardTitle>Miembros del Hogar</CardTitle>
                <CardDescription>
                  Gestiona los miembros y sus permisos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MembersList members={members} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Miembros del Hogar</CardTitle>
                <CardDescription>
                  Personas con acceso a este hogar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {members.map((member) => (
                    <li key={member.id} className="flex items-center gap-2">
                      <span>{member.email}</span>
                      {member.role === 'owner' && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          Administrador
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 5: Configuración del Hogar */}
        <TabsContent value="settings" className="space-y-6 mt-6">
          <HouseholdInfo 
            household={{
              id: household.id,
              name: household.name,
              created_at: household.created_at || new Date().toISOString(),
            }}
            isOwner={userIsOwner}
          />
        </TabsContent>

        {/* Tab 6: Zona Peligrosa (solo owner) */}
        {userIsOwner && (
          <TabsContent value="danger" className="space-y-6 mt-6">
            <DangerZone />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
