import { HeroContribution } from './HeroContribution';
import { HouseholdSummary } from './HouseholdSummary';
import { ContributionMembersList } from './ContributionMembersList';
import { ConfigurationSection } from './ConfigurationSection';
import { PrePaymentsSection } from './PrePaymentsSection';
import type { Database } from '@/types/database';
import type { CalculationType } from '@/lib/contributionTypes';

type Contribution = Database['public']['Tables']['contributions']['Row'];
type Category = Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'name' | 'icon' | 'type'>;
type PrePayment = Database['public']['Tables']['pre_payments']['Row'] & {
  user?: { email: string };
  category?: { name: string; icon: string | null };
};

type Member = {
  profile_id: string;
  email: string;
  income: number;
  contribution: Contribution | null;
  role: 'owner' | 'member';
};

interface ContributionsContentProps {
  householdId: string;
  userId: string;
  userEmail: string;
  currentUserIncome: number;
  currentUserContribution: Contribution | null;
  totalIncome: number;
  membersWithIncomes: Member[];
  monthlyGoal: number;
  totalPaid: number;
  calculationType: CalculationType;
  currency: string;
  isOwner: boolean;
  categories: Category[];
  prePayments: PrePayment[];
  currentMonth: number;
  currentYear: number;
}

export function ContributionsContent({
  householdId,
  userId,
  userEmail,
  currentUserIncome,
  currentUserContribution,
  totalIncome,
  membersWithIncomes,
  monthlyGoal,
  totalPaid,
  calculationType,
  currency,
  isOwner,
  categories,
  prePayments,
  currentMonth,
  currentYear,
}: ContributionsContentProps) {
  return (
    <div className="space-y-6">
      {/* Hero: Tu contribución */}
      <HeroContribution
        contribution={currentUserContribution}
        userEmail={userEmail}
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

      {/* Pre-pagos (solo visible para owners) */}
      <PrePaymentsSection
        householdId={householdId}
        members={membersWithIncomes.map((m) => ({
          profile_id: m.profile_id,
          email: m.email,
          role: m.role, // Usar el rol real del miembro
        }))}
        categories={categories}
        prePayments={prePayments}
        currentMonth={currentMonth}
        currentYear={currentYear}
        isOwner={isOwner}
      />

      {/* Lista de miembros */}
      <ContributionMembersList
        members={membersWithIncomes}
        totalIncome={totalIncome}
      />

      {/* Configuración */}
      <ConfigurationSection
        householdId={householdId}
        userId={userId}
        currentGoal={monthlyGoal}
        currentIncome={currentUserIncome}
        currentCalculationType={calculationType}
        isOwner={isOwner}
        currency={currency}
      />
    </div>
  );
}
