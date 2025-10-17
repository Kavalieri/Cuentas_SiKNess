'use client';

import { closePeriod } from '@/app/sickness/periodo/actions';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, toNumber } from '@/lib/format';
import type { MonthlyPeriod } from '@/lib/periods';
import { formatPeriodMonth } from '@/lib/periods';
import { Lock, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface CloseMonthDialogProps {
  period: MonthlyPeriod;
  children?: React.ReactNode;
}

export function CloseMonthDialog({ period, children }: CloseMonthDialogProps) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = async () => {
    setIsLoading(true);

    const result = await closePeriod(period.id, notes || undefined);

    if (!result.ok) {
      toast.error(result.message);
    } else {
      toast.success(`Mes de ${formatPeriodMonth(period.year, period.month)} cerrado exitosamente`);
      setOpen(false);
      setNotes('');
    }

    setIsLoading(false);
  };

  const savings = toNumber(period.total_income) - toNumber(period.total_expenses);
  const isSavings = savings >= 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="default">
            <Lock className="mr-2 h-4 w-4" />
            Cerrar Mes
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cerrar Mes de {formatPeriodMonth(period.year, period.month)}</DialogTitle>
          <DialogDescription>
            Al cerrar el mes, el balance se consolidará y no podrás editar ni eliminar movimientos de
            este período. Esta acción puede ser revertida por un administrador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Resumen del Período */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <h4 className="font-semibold text-sm">Resumen del Período</h4>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">Balance Inicial</div>
                <div className="font-medium">{formatCurrency(toNumber(period.opening_balance))}</div>
              </div>

              <div>
                <div className="text-muted-foreground">Balance Final</div>
                <div className="font-bold text-lg">{formatCurrency(toNumber(period.closing_balance))}</div>
              </div>

              <div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  Ingresos
                </div>
                <div className="font-medium text-green-600">{formatCurrency(toNumber(period.total_income))}</div>
              </div>

              <div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  Gastos
                </div>
                <div className="font-medium text-red-600">{formatCurrency(toNumber(period.total_expenses))}</div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {isSavings ? 'Ahorro' : 'Déficit'} del mes
                </span>
                <span
                  className={`font-bold text-lg ${isSavings ? 'text-green-600' : 'text-red-600'}`}
                >
                  {isSavings ? '+' : ''}
                  {formatCurrency(savings)}
                </span>
              </div>
            </div>
          </div>

          {/* Notas Opcionales */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input
              id="notes"
              placeholder="Ej: Mes con gastos extra de vacaciones"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              Agrega notas o comentarios sobre este período
            </p>
          </div>

          {/* Advertencia */}
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 dark:bg-yellow-900/10 dark:border-yellow-900/50">
            <div className="flex gap-2">
              <Lock className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-500 mt-0.5" />
              <div className="text-xs text-yellow-800 dark:text-yellow-200">
                <strong>Importante:</strong> Los movimientos de este mes quedarán bloqueados para
                edición. El balance final ({formatCurrency(toNumber(period.closing_balance))}) se convertirá en
                el balance inicial del próximo mes.
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleClose} disabled={isLoading}>
            {isLoading ? 'Cerrando...' : 'Cerrar Mes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
