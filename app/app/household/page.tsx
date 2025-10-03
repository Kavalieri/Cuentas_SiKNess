import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabaseServer, getCurrentUser } from '@/lib/supabaseServer';
import { getCurrentHouseholdId, isOwner } from '@/lib/adminCheck';
import { HouseholdInfo } from './components/HouseholdInfo';
import { MembersList } from './components/MembersList';
import { DangerZone } from './components/DangerZone';
import { OverviewWrapper } from './components/OverviewWrapper';
import { CategoriesTab } from './components/CategoriesTab';
import { ContributionsContent } from '@/app/app/contributions/components/ContributionsContent';
import { getPrePayments } from '@/app/app/contributions/actions';
import { getPendingInvitations } from './invitations/actions';
import { PendingInvitationsList } from './components/PendingInvitationsList';
import { CreateInviteDialog } from './components/CreateInviteDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CALCULATION_TYPES, type CalculationType } from '@/lib/contributionTypes';

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

  // Obtener meta mensual y configuración
  const { data: settings } = await supabase
    .from('household_settings')
    .select('*')
    .eq('household_id', householdId)
    .single();

  const goalAmount = settings?.monthly_contribution_goal ?? 0;
  const currency = settings?.currency || 'EUR';
  const calculationType = (settings?.calculation_type as CalculationType) || CALCULATION_TYPES.PROPORTIONAL;

  // Preparar datos para ContributionsContent
  const totalIncome = members.reduce((sum, m) => sum + m.currentIncome, 0);
  const contributionsMap = new Map(
    (contributions || []).map((c) => [c.user_id, c])
  );
  
  const membersWithIncomes = members.map((m) => ({
    user_id: m.user_id,
    email: m.email,
    income: m.currentIncome,
    contribution: contributionsMap.get(m.user_id) || null,
  }));

  const currentUserIncome = members.find((m) => m.user_id === user.id)?.currentIncome || 0;
  const currentUserContribution = contributionsMap.get(user.id) || null;
  const totalPaid = (contributions || []).reduce((sum, c) => sum + (c.paid_amount || 0), 0);

  // Obtener categorías de gastos para pre-pagos
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon, type')
    .eq('household_id', householdId)
    .order('name');

  // Obtener pre-pagos del mes actual
  const prePayments = await getPrePayments(householdId, now.getFullYear(), now.getMonth() + 1);

  // Obtener invitaciones pendientes (solo para owners)
  const pendingInvitations = userIsOwner ? await getPendingInvitations() : [];

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

        {/* Tab 2: Contribuciones */}
        <TabsContent value="contributions" className="space-y-6 mt-6">
          <ContributionsContent
            householdId={householdId}
            userId={user.id}
            userEmail={user.email || ''}
            currentUserIncome={currentUserIncome}
            currentUserContribution={currentUserContribution}
            totalIncome={totalIncome}
            membersWithIncomes={membersWithIncomes}
            monthlyGoal={goalAmount}
            totalPaid={totalPaid}
            calculationType={calculationType}
            currency={currency}
            isOwner={userIsOwner}
            categories={categories || []}
            prePayments={prePayments}
            currentMonth={now.getMonth() + 1}
            currentYear={now.getFullYear()}
            memberRole={members.find((m) => m.user_id === user.id)?.role || 'member'}
          />
        </TabsContent>

        {/* Tab 3: Categorías */}
        <TabsContent value="categories" className="space-y-6 mt-6">
          <CategoriesTab />
        </TabsContent>

        {/* Tab 4: Miembros */}
        <TabsContent value="members" className="space-y-6 mt-6">
          {/* Invitaciones pendientes (solo owners) */}
          {userIsOwner && pendingInvitations.length > 0 && (
            <PendingInvitationsList invitations={pendingInvitations} />
          )}

          {userIsOwner ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Miembros del Hogar</CardTitle>
                    <CardDescription>
                      Gestiona los miembros y sus permisos
                    </CardDescription>
                  </div>
                  <CreateInviteDialog householdId={household.id} />
                </div>
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
