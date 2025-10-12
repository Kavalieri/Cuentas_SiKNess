'use client';

import { useState, useEffect } from 'react';
import { OverviewTab } from './OverviewTab';
import { getMonthlyOverviewData } from '@/app/app/household/actions';
import type { Database } from '@/types/database';

type Contribution = Database['public']['Tables']['contributions']['Row'];

interface Member {
  id: string;
  profile_id: string;
  email: string;
  role: 'owner' | 'member';
  currentIncome: number;
}

interface OverviewWrapperProps {
  householdId: string;
  initialMembers: Member[];
  initialContributions: Contribution[];
  initialGoalAmount: number;
  currentUserId: string;
  currency: string;
  initialExpenses: number;
  initialIncomes: number;
}

export function OverviewWrapper({
  householdId,
  initialMembers,
  initialContributions,
  initialGoalAmount,
  currentUserId,
  currency,
  initialExpenses,
  initialIncomes,
}: OverviewWrapperProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [contributions, setContributions] = useState(initialContributions);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [incomes, setIncomes] = useState(initialIncomes);

  // Fetch data cuando cambia el mes
  useEffect(() => {
    const fetchMonthData = async () => {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth() + 1;

      const result = await getMonthlyOverviewData(year, month);
      
      if (result.ok && result.data) {
        setContributions(result.data.contributions);
        setExpenses(result.data.expensesTotal);
        setIncomes(result.data.incomesTotal);
      } else {
        console.error('Error fetching monthly data:', result.ok ? 'No data' : result.message);
      }
    };

    fetchMonthData();
  }, [selectedMonth, householdId]);

  return (
    <OverviewTab
      householdId={householdId}
      members={initialMembers}
      contributions={contributions}
      goalAmount={initialGoalAmount}
      selectedMonth={selectedMonth}
      onMonthChange={setSelectedMonth}
      currentUserId={currentUserId}
      currency={currency}
      expenses={expenses}
      incomes={incomes}
    />
  );
}
