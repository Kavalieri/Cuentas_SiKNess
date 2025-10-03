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
}

export function OverviewWrapper({
  householdId,
  initialMembers,
  initialContributions,
  initialGoalAmount,
  currentUserId,
}: OverviewWrapperProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [contributions, setContributions] = useState(initialContributions);

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
    />
  );
}
