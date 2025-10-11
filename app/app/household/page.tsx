export const dynamic = 'force-dynamic';
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

  const supabase = await supabaseServer();

  // user.profile_id es profiles.id (el UUID del perfil usado en FKs)
  const currentProfile = { id: user.profile_id };

  const householdId = await getCurrentHouseholdId();

  // Si no tiene household, redirigir a creación
  if (!householdId) {
    redirect('/app/household/create');
  }

  const userIsOwner = await isOwner();

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

  type MemberData = {
    id: string;
    profile_id: string;
    email: string | null;
    role: string;
  };

  const typedMembersData = (membersData || []) as unknown as MemberData[];

  // Enriquecer con ingresos actuales
  const members = await Promise.all(
    typedMembersData.map(async (member) => {
      const { data: income } = await supabase.rpc('get_member_income', {
        p_household_id: householdId,
        p_profile_id: member.profile_id,
        p_date: new Date().toISOString().split('T')[0],
      });

      return {
        id: member.id,
        profile_id: member.profile_id,
        email: member.email || 'Sin email',
        role: member.role as 'owner' | 'member',
        currentIncome: (income as unknown as number) ?? 0,
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

  type Contribution = {
    id: string;
    household_id: string;
    profile_id: string;
    period_id: string;
    year: number;
    month: number;
    expected_amount: number | null;
    paid_amount: number;
    calculation_method: string | null;
    adjustments_total: number | null;
    created_at: string;
    updated_at: string;
    paid_at: string | null;
    status: string;
  };

  const typedContributions = (contributions || []) as unknown as Contribution[];

  // Obtener meta mensual y configuración
  const { data: settings } = await supabase
    .from('household_settings')
    .select('*')
    .eq('household_id', householdId)
    .single();

  const goalAmount = settings?.monthly_contribution_goal ?? 0;
  const currency = settings?.currency || 'EUR';
  const calculationType = (settings?.calculation_type as CalculationType) || CALCULATION_TYPES.PROPORTIONAL;

  // Obtener gastos e ingresos del mes actual para el resumen
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { data: monthTransactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('household_id', householdId)
    .gte('occurred_at', startOfMonth.toISOString().split('T')[0])
    .lte('occurred_at', endOfMonth.toISOString().split('T')[0]);

  type Transaction = {
    type: string;
    amount: number;
  };

  const typedTransactions = (monthTransactions || []) as unknown as Transaction[];
  const expenses = typedTransactions.filter(t => t.type === 'expense');
  const incomes = typedTransactions.filter(t => t.type === 'income');

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncomes = incomes.reduce((sum, i) => sum + i.amount, 0);

  // Preparar datos para ContributionsContent
  const totalIncome = members.reduce((sum, m) => sum + m.currentIncome, 0);
  const contributionsMap = new Map(
    typedContributions.map((c) => [c.profile_id, c])
  );

  const membersWithIncomes = members.map((m) => ({
    profile_id: m.profile_id,
    email: m.email,
    income: m.currentIncome,
    contribution: contributionsMap.get(m.profile_id) || null,
    role: m.role, // Incluir el rol del miembro
  }));

  const currentUserIncome = members.find((m) => m.profile_id === currentProfile.id)?.currentIncome || 0;
  const currentUserContribution = contributionsMap.get(currentProfile.id) || null;

  // Obtener categorías de gastos para pre-pagos
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon, type')
    .eq('household_id', householdId)
    .order('name');

  type Category = {
    id: string;
    name: string;
    icon: string | null;
    type: string;
  };

  const typedCategories = (categories || []) as unknown as Category[];

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
            initialContributions={typedContributions}
            initialGoalAmount={goalAmount}
            currentUserId={currentProfile.id}
            currency={currency}
            initialExpenses={totalExpenses}
            initialIncomes={totalIncomes}
          />
        </TabsContent>

        {/* Tab 2: Contribuciones */}
        <TabsContent value="contributions" className="space-y-6 mt-6">
          <ContributionsContent
            householdId={householdId}
            userEmail={user.email || ''}
            currentUserProfileId={currentProfile.id}
            currentUserIncome={currentUserIncome}
            currentUserContribution={currentUserContribution}
            totalIncome={totalIncome}
            membersWithIncomes={membersWithIncomes}
            monthlyGoal={goalAmount}
            calculationType={calculationType}
            currency={currency}
            isOwner={userIsOwner}
            categories={typedCategories}
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
                    <li key={member.profile_id} className="flex items-center gap-2">
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
