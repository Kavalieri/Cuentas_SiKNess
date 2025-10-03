'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setMemberIncome } from '@/app/app/contributions/actions';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { startOfMonth } from 'date-fns';

interface IncomeFormProps {
  householdId: string;
  userId: string;
  currentIncome: number;
}

export function IncomeForm({ householdId, userId, currentIncome }: IncomeFormProps) {
  const [income, setIncome] = useState(currentIncome);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData();
    formData.append('household_id', householdId);
    formData.append('user_id', userId);
    formData.append('monthly_income', income.toString());
    formData.append('effective_from', startOfMonth(new Date()).toISOString());

    const result = await setMemberIncome(formData);

    setIsLoading(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success('Ingreso actualizado correctamente');
  };

  const hasChanged = income !== currentIncome;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="income">Ingreso Mensual (EUR)</Label>
        <Input
          id="income"
          type="number"
          step="0.01"
          min="0"
          value={income}
          onChange={(e) => setIncome(parseFloat(e.target.value) || 0)}
          disabled={isLoading}
          className="text-lg"
        />
        {income > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Ingreso actual: <strong>{formatCurrency(income)}</strong>/mes
          </p>
        )}
      </div>

      <Button type="submit" disabled={isLoading || !hasChanged}>
        {isLoading ? 'Guardando...' : 'Actualizar Ingreso'}
      </Button>

      {!hasChanged && currentIncome > 0 && (
        <p className="text-sm text-muted-foreground">
          Tu ingreso está configurado correctamente
        </p>
      )}
    </form>
  );
}
