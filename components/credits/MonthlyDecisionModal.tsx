'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { processMonthlyDecision } from '@/app/app/credits/actions';
import { formatCurrency } from '@/lib/format';
import { AlertCircle, CheckCircle, TrendingDown, ArrowRight, PiggyBank } from 'lucide-react';

interface MonthlyDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  credit: {
    id: string;
    amount: number;
    currency: string;
    source_month: number;
    source_year: number;
  };
  currentContribution?: {
    expected_amount: number;
    paid_amount: number;
  } | null;
  onSuccess?: () => void;
}

type DecisionOption = 'apply_to_month' | 'keep_active' | 'transfer_to_savings';

export function MonthlyDecisionModal({
  isOpen,
  onClose,
  credit,
  currentContribution,
  onSuccess,
}: MonthlyDecisionModalProps) {
  const [decision, setDecision] = useState<DecisionOption>('apply_to_month');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('creditId', credit.id);
      formData.append('decision', decision);

      const result = await processMonthlyDecision(formData);

      if (result.ok) {
        toast.success('Decisión aplicada correctamente');
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.message);
      }
    });
  };

  // Calcular preview según la decisión
  const getPreview = () => {
    if (!currentContribution) {
      return null;
    }

    const { expected_amount, paid_amount } = currentContribution;
    const remaining = expected_amount - paid_amount;

    if (decision === 'apply_to_month') {
      const newPaidAmount = paid_amount + credit.amount;
      const newRemaining = expected_amount - newPaidAmount;

      return (
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="font-medium text-green-900 dark:text-green-100">
                  Tu contribución mejorará
                </p>
                <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Pagado actual:</span>
                    <span className="font-medium">{formatCurrency(paid_amount, credit.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Después del crédito:</span>
                    <span className="font-medium">{formatCurrency(newPaidAmount, credit.currency)}</span>
                  </div>
                  <div className="h-px bg-green-200 dark:bg-green-800 my-1" />
                  <div className="flex items-center justify-between">
                    <span>Pendiente antes:</span>
                    <span className="font-medium">{formatCurrency(remaining, credit.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pendiente después:</span>
                    <span className="font-semibold text-base">
                      {formatCurrency(newRemaining, credit.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (decision === 'keep_active') {
      return (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  El crédito seguirá disponible
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Podrás decidir qué hacer con él en cualquier momento futuro. El crédito de{' '}
                  <span className="font-semibold">{formatCurrency(credit.amount, credit.currency)}</span>{' '}
                  permanecerá activo.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (decision === 'transfer_to_savings') {
      return (
        <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <PiggyBank className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="font-medium text-purple-900 dark:text-purple-100">
                  Se agregará al fondo de ahorro
                </p>
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  Los{' '}
                  <span className="font-semibold">{formatCurrency(credit.amount, credit.currency)}</span>{' '}
                  se transferirán al fondo de ahorro común del hogar. Esta acción no se puede revertir.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>¿Qué hacer con tu crédito?</DialogTitle>
          <DialogDescription>
            Tienes un crédito de{' '}
            <span className="font-semibold text-foreground">
              {formatCurrency(credit.amount, credit.currency)}
            </span>{' '}
            del mes {credit.source_month}/{credit.source_year}. Elige qué deseas hacer:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={decision} onValueChange={(value) => setDecision(value as DecisionOption)}>
            <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="apply_to_month" id="apply" />
              <div className="flex-1 space-y-1 leading-none">
                <Label
                  htmlFor="apply"
                  className="font-medium cursor-pointer flex items-center gap-2"
                >
                  <TrendingDown className="h-4 w-4" />
                  Aplicar a mi contribución este mes
                </Label>
                <p className="text-sm text-muted-foreground">
                  Reducirá lo que debes aportar este mes
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="keep_active" id="keep" />
              <div className="flex-1 space-y-1 leading-none">
                <Label
                  htmlFor="keep"
                  className="font-medium cursor-pointer flex items-center gap-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  Mantener activo para después
                </Label>
                <p className="text-sm text-muted-foreground">
                  Guardar el crédito para usarlo en otro mes
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="transfer_to_savings" id="transfer" />
              <div className="flex-1 space-y-1 leading-none">
                <Label
                  htmlFor="transfer"
                  className="font-medium cursor-pointer flex items-center gap-2"
                >
                  <PiggyBank className="h-4 w-4" />
                  Transferir al fondo de ahorro
                </Label>
                <p className="text-sm text-muted-foreground">
                  Aportar al fondo común del hogar
                </p>
              </div>
            </div>
          </RadioGroup>

          {getPreview()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Aplicando...' : 'Confirmar decisión'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
