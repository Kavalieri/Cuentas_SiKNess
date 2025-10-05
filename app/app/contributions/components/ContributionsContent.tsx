'use client';

import { HeroContribution } from './HeroContribution';
import { ContributionMembersList } from './ContributionMembersList';
import { ConfigurationSection } from './ConfigurationSection';
import { MyAdjustmentsPanel } from './MyAdjustmentsPanel';
import type { Database } from '@/types/database';
import type { CalculationType } from '@/lib/contributionTypes';

type Contribution = Database['public']['Tables']['contributions']['Row'];
type Category = Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'name' | 'icon' | 'type'>;

type Member = {
  profile_id: string;
  email: string;
  income: number;
  contribution: Contribution | null;
  role: 'owner' | 'member';
};

interface ContributionsContentProps {
  householdId: string;
  userEmail: string;
  currentUserProfileId: string;
  currentUserIncome: number;
  currentUserContribution: Contribution | null;
  totalIncome: number;
  membersWithIncomes: Member[];
  monthlyGoal: number;
  calculationType: CalculationType;
  currency: string;
  isOwner: boolean;
  categories: Category[];
}

export function ContributionsContent({
  householdId,
  userEmail,
  currentUserProfileId,
  currentUserIncome,
  currentUserContribution,
  totalIncome,
  membersWithIncomes,
  monthlyGoal,
  calculationType,
  currency,
  isOwner,
  categories,
}: ContributionsContentProps) {
  return (
    <div className="space-y-6">
      {/* Panel de Ajustes (visible para todos, en la parte alta) */}
      <MyAdjustmentsPanel
        isOwner={isOwner}
        currentUserProfileId={currentUserProfileId}
        categories={categories}
        currency={currency}
      />

      {/* Hero: Tu contribución */}
      <HeroContribution
        contribution={currentUserContribution}
        userEmail={userEmail}
        totalIncome={totalIncome}
        userIncome={currentUserIncome}
        currency={currency}
        categories={categories}
      />

      {/* Lista de miembros */}
      <ContributionMembersList
        members={membersWithIncomes}
        totalIncome={totalIncome}
      />

      {/* Configuración */}
      <ConfigurationSection
        householdId={householdId}
        currentGoal={monthlyGoal}
        currentCalculationType={calculationType}
        isOwner={isOwner}
        currency={currency}
      />
    </div>
  );
}
