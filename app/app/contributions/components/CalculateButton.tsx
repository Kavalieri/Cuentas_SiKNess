'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { calculateAndCreateContributions } from '@/app/app/contributions/actions';
import { toast } from 'sonner';

interface CalculateButtonProps {
  householdId: string;
  month: Date;
}

export function CalculateButton({ householdId, month }: CalculateButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCalculate = async () => {
    setIsLoading(true);

    const result = await calculateAndCreateContributions(
      householdId,
      month.getFullYear(),
      month.getMonth() + 1
    );

    setIsLoading(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success('Contribuciones calculadas correctamente');
  };

  return (
    <Button onClick={handleCalculate} disabled={isLoading}>
      {isLoading ? 'Calculando...' : '🧮 Calcular Contribuciones'}
    </Button>
  );
}
