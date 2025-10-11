export const dynamic = 'force-dynamic';
import { ContributionsContent } from './components/ContributionsContent';
import { getCurrentHouseholdId } from '@/lib/adminCheck';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import type { Database } from '@/types/database';
import { CALCULATION_TYPES, type CalculationType } from '@/lib/contributionTypes';

type Contribution = Database['public']['Tables']['contributions']['Row'];

type Member = {
  profile_id: string;
  email: string;
  income: number | null; // NULL si no está configurado
  contribution: Contribution | null;
  role: 'owner' | 'member';
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

  // Obtener profile_id del usuario actual
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!currentProfile) {
    redirect('/login');
  }

  const currentProfileId = currentProfile.id;

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

  interface MemberRaw {
    profile_id: string;
    email: string;
    role: string;
  }

  const typedMembersData = (membersData as unknown as MemberRaw[]) ?? [];

  // Obtener ingresos actuales de cada miembro
  const membersWithIncomes: Member[] = await Promise.all(
    typedMembersData.map(async (member) => {
      const { data: income } = await supabase.rpc('get_member_income', {
        p_household_id: householdId,
        p_profile_id: member.profile_id,
        p_date: new Date().toISOString().split('T')[0],
      });

      return {
        profile_id: member.profile_id,
        email: member.email || 'Sin email',
        income: income as number | null, // ✅ Preserve NULL (sin configurar)
        contribution: null,
        role: member.role as 'owner' | 'member', // Incluir el rol del miembro
      };
    })
  );

  // Calcular total de ingresos (solo miembros configurados)
  const totalIncome = membersWithIncomes.reduce((sum, m) => sum + (m.income ?? 0), 0);

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

  const typedContributions = (contributions as unknown as Contribution[]) ?? [];

  // Asignar contribuciones a miembros
  const contributionsMap = new Map(
    typedContributions.map((c) => [c.profile_id, c])
  );

  membersWithIncomes.forEach((member) => {
    member.contribution = contributionsMap.get(member.profile_id) || null;
  });

  // Datos del usuario actual
  const currentUserIncome =
    membersWithIncomes.find((m) => m.profile_id === currentProfileId)?.income || 0;
  const currentUserContribution = contributionsMap.get(currentProfileId) || null;

  // Calcular total pagado del mes actual
  // Obtener todos los ingresos del mes (incluye pagos al fondo + aportes virtuales de pre-pagos)
  const startDate = new Date(currentYear, currentMonth - 1, 1).toISOString().substring(0, 10);
  const endDate = new Date(currentYear, currentMonth, 0).toISOString().substring(0, 10);

  const { data: monthlyIncomes } = await supabase
    .from('transactions')
    .select('amount')
    .eq('household_id', householdId)
    .eq('type', 'income')
    .gte('occurred_at', startDate)
    .lte('occurred_at', endDate);

  interface IncomeAmount {
    amount: number;
  }

  const typedMonthlyIncomes = (monthlyIncomes as unknown as IncomeAmount[]) ?? [];
  const totalPaid = typedMonthlyIncomes.reduce((sum, income) => sum + income.amount, 0);

  console.log('[DEBUG] Monthly Incomes:', monthlyIncomes?.length || 0, 'transactions');
  console.log('[DEBUG] Total Paid (all incomes):', totalPaid, 'Monthly Goal:', monthlyGoal);

  // Verificar si el usuario es owner
  const isOwner = membersWithIncomes.find((m) => m.profile_id === currentProfileId)?.role === 'owner';

  // Obtener categorías de gastos
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon, type')
    .eq('household_id', householdId)
    .order('name');

  type Category = Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'name' | 'icon' | 'type'>;
  const typedCategories = (categories as unknown as Category[]) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">💰 Contribuciones</h1>
        <p className="text-muted-foreground mt-1">
          Sistema de contribuciones proporcionales basado en ingresos
        </p>
      </div>

      <ContributionsContent
        householdId={householdId}
        userEmail={user.email || ''}
        currentUserProfileId={currentProfileId}
        currentUserIncome={currentUserIncome}
        currentUserContribution={currentUserContribution}
        totalIncome={totalIncome}
        membersWithIncomes={membersWithIncomes}
        monthlyGoal={monthlyGoal}
        calculationType={calculationType}
        currency={currency}
        isOwner={isOwner}
        categories={typedCategories}
      />
    </div>
  );
}
