import { HeroContribution } from './components/HeroContribution';
import { HouseholdSummary } from './components/HouseholdSummary';
import { ContributionMembersList } from './components/ContributionMembersList';
import { ConfigurationSection } from './components/ConfigurationSection';
import { getCurrentHouseholdId } from '@/lib/adminCheck';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import type { Database } from '@/types/database';
import { CALCULATION_TYPES, type CalculationType } from '@/lib/contributionTypes';

type Contribution = Database['public']['Tables']['contributions']['Row'];

type Member = {
  user_id: string;
  email: string;
  income: number;
  contribution: Contribution | null;
};

export default async function ContributionsPage() {
  const householdId = await getCurrentHouseholdId();

  if (!householdId) {
    redirect('/app/settings?error=no-household');
  }

  const supabase = await supabaseServer();
  const user = (await supabase.auth.getUser()).data.user;

  if (!user) {
    redirect('/login');
  }

  // Obtener configuración del hogar
  const { data: settings } = await supabase
    .from('household_settings')
    .select('*')
    .eq('household_id', householdId)
    .maybeSingle();

  const monthlyGoal = settings?.monthly_contribution_goal || 0;
  const currency = settings?.currency || 'EUR';
  const calculationType = (settings?.calculation_type as CalculationType) || CALCULATION_TYPES.PROPORTIONAL;

  // Obtener miembros del hogar con sus ingresos
  const { data: membersData } = await supabase.rpc('get_household_members', {
    p_household_id: householdId,
  });

  // Obtener ingresos actuales de cada miembro
  const membersWithIncomes: Member[] = await Promise.all(
    (membersData || []).map(async (member) => {
      const { data: income } = await supabase.rpc('get_member_income', {
        p_household_id: householdId,
        p_user_id: member.user_id,
        p_date: new Date().toISOString().split('T')[0],
      });

      return {
        user_id: member.user_id,
        email: member.email || 'Sin email',
        income: (income as number) || 0,
        contribution: null,
      };
    })
  );

  // Calcular total de ingresos
  const totalIncome = membersWithIncomes.reduce((sum, m) => sum + m.income, 0);

  // Obtener contribuciones del mes actual
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: contributions } = await supabase
    .from('contributions')
    .select('*')
    .eq('household_id', householdId)
    .eq('month', currentMonth)
    .eq('year', currentYear);

  // Asignar contribuciones a miembros
  const contributionsMap = new Map(
    (contributions || []).map((c) => [c.user_id, c])
  );

  membersWithIncomes.forEach((member) => {
    member.contribution = contributionsMap.get(member.user_id) || null;
  });

    // Datos del usuario actual
  const currentUserIncome =
    membersWithIncomes.find((m) => m.user_id === user.id)?.income || 0;
  const currentUserContribution = contributionsMap.get(user.id) || null;

  // Calcular total pagado
  const totalPaid = (contributions || []).reduce(
    (sum, c) => sum + (c.paid_amount || 0),
    0
  );

  // Verificar si el usuario es owner
  const { data: memberData } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', householdId)
    .eq('user_id', user.id)
    .single();

  const isOwner = memberData?.role === 'owner';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">💰 Contribuciones</h1>
        <p className="text-muted-foreground mt-1">
          Sistema de contribuciones proporcionales basado en ingresos
        </p>
      </div>

      {/* Hero: Tu contribución */}
      <HeroContribution
        contribution={currentUserContribution}
        userEmail={user.email || ''}
        totalIncome={totalIncome}
        userIncome={currentUserIncome}
        currency={currency}
      />

      {/* Resumen del hogar */}
      <HouseholdSummary
        monthlyGoal={monthlyGoal}
        totalPaid={totalPaid}
        calculationType={calculationType}
        currency={currency}
      />

      {/* Lista de miembros */}
      <ContributionMembersList
        members={membersWithIncomes}
        totalIncome={totalIncome}
      />

      {/* Configuración */}
      <ConfigurationSection
        householdId={householdId}
        userId={user.id}
        currentGoal={monthlyGoal}
        currentIncome={currentUserIncome}
        currentCalculationType={calculationType}
        isOwner={isOwner}
        currency={currency}
      />
    </div>
  );
}
