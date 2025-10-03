'use client';

import { MonthSelector } from '@/components/shared/MonthSelector';
import { MonthlyFundStatus } from './MonthlyFundStatus';
import type { Database } from '@/types/database';

type Contribution = Database['public']['Tables']['contributions']['Row'];

interface Member {
  id: string;
  profile_id: string;
  email: string;
  role: 'owner' | 'member';
  currentIncome: number;
}

interface OverviewTabProps {
  householdId: string;
  members: Member[];
  contributions: Contribution[];
  goalAmount: number;
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
  currentUserId: string;
}

export function OverviewTab({
  householdId,
  members,
  contributions,
  goalAmount,
  selectedMonth,
  onMonthChange,
  currentUserId,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Selector de mes */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Estado del Fondo Mensual</h2>
          <p className="text-sm text-muted-foreground">
            Aportaciones de cada miembro al fondo común
          </p>
        </div>
        <MonthSelector value={selectedMonth} onChange={onMonthChange} />
      </div>

      {/* Estado del fondo con aportaciones */}
      <MonthlyFundStatus
        householdId={householdId}
        members={members}
        contributions={contributions}
        monthlyFund={goalAmount}
        currentUserId={currentUserId}
        selectedMonth={selectedMonth}
      />
    </div>
  );
}
