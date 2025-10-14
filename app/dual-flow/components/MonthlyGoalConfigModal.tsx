'use client';

import { updateMonthlyGoalAction } from '@/app/dual-flow/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/format';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface MonthlyGoalConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGoal: number | null;
  onGoalUpdated: (newGoal: number) => void;
}

export default function MonthlyGoalConfigModal({
  open,
  onOpenChange,
  currentGoal,
  onGoalUpdated,
}: MonthlyGoalConfigModalProps) {
  const [goal, setGoal] = useState(currentGoal?.toString() || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setGoal(currentGoal?.toString() || '');
  }, [currentGoal, open]);

  const handleSave = async () => {
    const numericGoal = parseFloat(goal);

    if (isNaN(numericGoal) || numericGoal < 0) {
      toast.error('Por favor, introduce un número válido mayor o igual a 0');
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateMonthlyGoalAction(numericGoal);

      if (result.ok) {
        const updatedGoal = result.data?.monthlyGoal ?? numericGoal;
        const updatedCurrency = result.data?.currency ?? 'EUR';
        toast.success(
          `Objetivo mensual establecido en ${formatCurrency(updatedGoal, updatedCurrency)}`,
        );
        onGoalUpdated(updatedGoal);
        setGoal(updatedGoal.toString());
        onOpenChange(false);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Ha ocurrido un error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setGoal(currentGoal?.toString() || '');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurar Objetivo Mensual</DialogTitle>
          <DialogDescription>
            Establece el objetivo de gastos compartidos para este hogar. Este valor te ayudará a
            hacer seguimiento de los gastos mensuales.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="monthly-goal" className="text-right">
              Objetivo (€)
            </Label>
            <Input
              id="monthly-goal"
              type="number"
              min="0"
              step="0.01"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="col-span-3"
              placeholder="0.00"
            />
          </div>

          {currentGoal !== null && (
            <div className="text-sm text-muted-foreground">
              Objetivo actual: €{currentGoal.toFixed(2)}
            </div>
          )}

          {currentGoal === null && (
            <div className="text-sm text-muted-foreground">
              No hay objetivo configurado actualmente
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
