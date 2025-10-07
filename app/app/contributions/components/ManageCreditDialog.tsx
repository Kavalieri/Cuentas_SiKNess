'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import type { MemberCredit } from '@/lib/actions/credits';
import { ArrowRight, PiggyBank, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ManageCreditDialogProps {
  credit: MemberCredit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ManageCreditDialog({ credit, open, onOpenChange, onSuccess }: ManageCreditDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [action, setAction] = useState<'apply' | 'transfer' | null>(null);

  const handleApplyToNextMonth = async () => {
    setIsLoading(true);
    setAction('apply');

    try {
      // TODO: Implementar applyCreditToContribution server action
      toast.info('Funcionalidad en desarrollo', {
        description: 'Aplicar crédito al mes siguiente estará disponible pronto',
      });

      setTimeout(() => {
        setIsLoading(false);
        setAction(null);
        onOpenChange(false);
        router.refresh();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (error) {
      console.error('Error aplicando crédito:', error);
      toast.error('Error al aplicar crédito');
      setIsLoading(false);
      setAction(null);
    }
  };

  const handleTransferToSavings = async () => {
    setIsLoading(true);
    setAction('transfer');

    try {
      // TODO: Usar transferCreditToSavings del módulo savings
      const response = await fetch('/api/credits/transfer-to-savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditId: credit.id }),
      });

      if (!response.ok) {
        throw new Error('Error en la transferencia');
      }

      toast.success('Crédito transferido al ahorro', {
        description: `${formatCurrency(credit.amount)} añadido al fondo común`,
      });

      onOpenChange(false);
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error transfiriendo crédito:', error);
      toast.error('Error al transferir al ahorro');
    } finally {
      setIsLoading(false);
      setAction(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gestionar Crédito</DialogTitle>
          <DialogDescription>
            Elige qué hacer con tu crédito de {formatCurrency(credit.amount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info del crédito */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Monto:</span>
              <span className="text-xl font-bold">{formatCurrency(credit.amount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Origen:</span>
              <span className="text-sm">
                {new Date(credit.source_year, credit.source_month - 1).toLocaleDateString('es-ES', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estado:</span>
              <Badge variant="default">Activo</Badge>
            </div>
          </div>

          {/* Opciones de acción */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Opciones disponibles:</Label>

            {/* Opción 1: Aplicar a mes siguiente */}
            <button
              onClick={handleApplyToNextMonth}
              disabled={isLoading}
              className="w-full p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">Aplicar al mes siguiente</h4>
                    {action === 'apply' && isLoading && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Reduce tu contribución esperada del próximo mes en {formatCurrency(credit.amount)}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
              </div>
            </button>

            {/* Opción 2: Transferir a ahorro */}
            <button
              onClick={handleTransferToSavings}
              disabled={isLoading}
              className="w-full p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <PiggyBank className="h-5 w-5 text-green-600 dark:text-green-300" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">Transferir al ahorro</h4>
                    {action === 'transfer' && isLoading && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Mueve este crédito al fondo de ahorro común del hogar
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
              </div>
            </button>
          </div>

          {/* Nota informativa */}
          <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
            <p className="font-medium mb-1">💡 ¿Cuál elegir?</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>Mes siguiente:</strong> Si quieres pagar menos el próximo mes
              </li>
              <li>
                <strong>Ahorro:</strong> Si prefieres guardarlo para gastos comunes futuros
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
