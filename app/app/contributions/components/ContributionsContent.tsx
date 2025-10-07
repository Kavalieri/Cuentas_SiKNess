'use client';

import { HeroContribution } from './HeroContribution';
import { ContributionMembersList } from './ContributionMembersList';
import { ConfigurationSection } from './ConfigurationSection';
import { TabsNav } from '@/components/shared/navigation/TabsNav';
import { FileText, Coins } from 'lucide-react';
import type { Database } from '@/types/database';
import type { CalculationType } from '@/lib/contributionTypes';

type Contribution = Database['public']['Tables']['contributions']['Row'];
type Category = Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'name' | 'icon' | 'type'>;

type Member = {
  profile_id: string;
  email: string;
  income: number | null; // NULL si no está configurado
  contribution: Contribution | null;
  role: 'owner' | 'member';
};

interface ContributionsContentProps {
  householdId: string;
  userEmail: string;
  currentUserProfileId: string;
  currentUserIncome: number | null; // NULL si no está configurado
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
  currentUserProfileId, // eslint-disable-line @typescript-eslint/no-unused-vars
  currentUserIncome,
  currentUserContribution,
  totalIncome,
  membersWithIncomes,
  monthlyGoal,
  calculationType,
  currency,
  isOwner,
  categories, // eslint-disable-line @typescript-eslint/no-unused-vars
}: ContributionsContentProps) {
  // Tabs de navegación
  const tabs = [
    {
      label: 'Resumen',
      href: '/app/contributions',
      description: 'Vista general de contribuciones',
    },
    {
      label: 'Ajustes',
      href: '/app/contributions/adjustments',
      icon: <FileText className="h-4 w-4" />,
      description: 'Gestión de pre-pagos y ajustes',
    },
    {
      label: 'Créditos',
      href: '/app/contributions/credits',
      icon: <Coins className="h-4 w-4" />,
      description: 'Créditos por sobrepagas',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Navegación por tabs */}
      <TabsNav tabs={tabs} />

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
