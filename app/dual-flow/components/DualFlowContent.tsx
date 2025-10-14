'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import HouseholdSummaryCard from './HouseholdSummaryCard';

interface DualFlowContentProps {
  monthlyGoal: number;
  spent: number;
}

export default function DualFlowContent({ monthlyGoal, spent }: DualFlowContentProps) {
  const router = useRouter();
  const [currentGoal, setCurrentGoal] = useState(monthlyGoal);

  useEffect(() => {
    setCurrentGoal(monthlyGoal);
  }, [monthlyGoal]);

  const handleGoalUpdated = (updatedGoal: number) => {
    setCurrentGoal(updatedGoal);
    router.refresh();
  };

  return (
    <HouseholdSummaryCard
      monthlyGoal={currentGoal}
      spent={spent}
      onGoalUpdated={handleGoalUpdated}
    />
  );
}
