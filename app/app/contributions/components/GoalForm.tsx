'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { setContributionGoal } from '@/app/app/contributions/actions';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';

interface GoalFormProps {
  householdId: string;
  currentGoal: number;
  currency: string;
}

export function GoalForm({ householdId, currentGoal, currency }: GoalFormProps) {
  const [goal, setGoal] = useState(currentGoal);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData();
    formData.append('household_id', householdId);
    formData.append('monthly_contribution_goal', goal.toString());
    formData.append('currency', currency);

    const result = await setContributionGoal(formData);

    setIsLoading(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success('Meta actualizada correctamente');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <Label htmlFor="goal">Fondo Mensual ({currency})</Label>
          <Input
            id="goal"
            type="number"
            step="0.01"
            min="0"
            value={goal}
            onChange={(e) => setGoal(parseFloat(e.target.value) || 0)}
            disabled={isLoading}
          />
        </div>
        <Button type="submit" disabled={isLoading || goal === currentGoal}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Guardando...' : 'Guardar Fondo'}
        </Button>
      </div>

      {goal > 0 && (
        <p className="text-sm text-muted-foreground">
          Fondo mensual configurado: <strong>{formatCurrency(goal, currency)}</strong>/mes
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-2">
        💡 Este es el fondo de partida mensual. Cada miembro aporta su parte proporcional según sus ingresos.
      </p>
    </form>
  );
}
