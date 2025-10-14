'use client';

import HouseholdSummaryDisplayCard from './HouseholdSummaryDisplayCard';

interface DualFlowSummaryProps {
  monthlyGoal: number;
  spent: number;
}

export default function DualFlowSummary({ monthlyGoal, spent }: DualFlowSummaryProps) {
  return <HouseholdSummaryDisplayCard monthlyGoal={monthlyGoal} spent={spent} />;
}
