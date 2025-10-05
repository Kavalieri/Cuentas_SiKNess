'use client';

import { useState, useEffect } from 'react';
import { OverviewTab } from './OverviewTab';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
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
      const supabase = supabaseBrowser();

      // Obtener contribuciones del mes seleccionado
      const { data: newContributions } = await supabase
        .from('contributions')
        .select('*')
        .eq('household_id', householdId)
        .eq('year', selectedMonth.getFullYear())
        .eq('month', selectedMonth.getMonth() + 1);

      if (newContributions) {
        setContributions(newContributions);
      }

      // Obtener transacciones del mes seleccionado
      const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

      const { data: monthTransactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('household_id', householdId)
        .gte('occurred_at', startOfMonth.toISOString().split('T')[0])
        .lte('occurred_at', endOfMonth.toISOString().split('T')[0]);

      const expensesList = monthTransactions?.filter(t => t.type === 'expense') || [];
      const incomesList = monthTransactions?.filter(t => t.type === 'income') || [];
      
      setExpenses(expensesList.reduce((sum, e) => sum + e.amount, 0));
      setIncomes(incomesList.reduce((sum, i) => sum + i.amount, 0));
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
