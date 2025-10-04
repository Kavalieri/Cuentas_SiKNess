'use client';

import { HeroContribution } from './HeroContribution';
import { HouseholdSummary } from './HouseholdSummary';
import { ContributionMembersList } from './ContributionMembersList';
import { ConfigurationSection } from './ConfigurationSection';
import { PendingApprovalsPanel } from './PendingApprovalsPanel';
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
}

export function ContributionsContent({
  householdId,
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
        categories={categories}
      />

      {/* Resumen del hogar */}
      <HouseholdSummary
        monthlyGoal={monthlyGoal}
        totalPaid={totalPaid}
        calculationType={calculationType}
        currency={currency}
      />

      {/* Panel de Aprobaciones (solo owners) */}
      {isOwner && (
        <PendingApprovalsPanel categories={categories} currency={currency} />
      )}

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
