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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { reopenPeriod } from '@/app/app/periods/actions';
import { AlertTriangle, Unlock, Info } from 'lucide-react';

interface ReopenPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  period: {
    id: string;
    year: number;
    month: number;
    status: string;
    reopened_count: number;
  };
  maxReopens?: number;
  onSuccess?: () => void;
}

export function ReopenPeriodModal({
  isOpen,
  onClose,
  period,
  maxReopens = 3,
  onSuccess,
}: ReopenPeriodModalProps) {
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const remainingReopens = maxReopens - period.reopened_count;
  const isMaxReached = remainingReopens <= 0;
  const isLastReopening = remainingReopens === 1;

  const handleSubmit = () => {
    if (reason.trim().length < 10) {
      toast.error('La razón debe tener al menos 10 caracteres');
      return;
    }

    if (isMaxReached) {
      toast.error('Se ha alcanzado el máximo de reaperturas permitidas');
      return;
    }

    startTransition(async () => {
      const result = await reopenPeriod(period.id, reason);

      if (result.ok) {
        toast.success(`Período ${monthNames[period.month - 1]} ${period.year} reabierto correctamente`);
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5" />
            Reabrir Período - {monthNames[period.month - 1]} {period.year}
          </DialogTitle>
          <DialogDescription>
            Esta acción desbloqueará las transacciones del período cerrado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Contador de reaperturas */}
          <Card className={isMaxReached ? 'bg-destructive/10 border-destructive/30' : isLastReopening ? 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800' : 'bg-muted/50'}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                {isMaxReached ? (
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                ) : (
                  <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {isMaxReached
                        ? '⛔ Límite de reaperturas alcanzado'
                        : isLastReopening
                        ? '⚠️ Última reapertura disponible'
                        : 'Contador de reaperturas'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant={isMaxReached ? 'destructive' : isLastReopening ? 'secondary' : 'outline'}>
                        {period.reopened_count} / {maxReopens}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isMaxReached
                      ? 'Este período ya fue reabierto el máximo de veces permitido. No se puede volver a abrir.'
                      : `Esta será la reapertura #${period.reopened_count + 1}. ${
                          isLastReopening
                            ? 'Después de esta no habrá más oportunidades.'
                            : `Quedarán ${remainingReopens - 1} ${remainingReopens - 1 === 1 ? 'reapertura' : 'reaperturas'} disponibles.`
                        }`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {!isMaxReached && (
            <>
              {/* Advertencias */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                    <div className="flex-1 space-y-2 text-sm">
                      <p className="font-medium text-orange-900 dark:text-orange-100">
                        Al reabrir este período:
                      </p>
                      <ul className="space-y-1 text-muted-foreground ml-4 list-disc">
                        <li>Todas las transacciones volverán a ser <strong>editables</strong></li>
                        <li>Los ajustes de contribuciones se podrán modificar</li>
                        <li>El estado cambiará de <code className="text-xs bg-background px-1 rounded">closed</code> a <code className="text-xs bg-background px-1 rounded">active</code></li>
                        <li>Se incrementará el contador de reaperturas</li>
                        <li>Se registrará esta acción en el log de auditoría</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Razón obligatoria */}
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-sm font-medium">
                  Razón de la reapertura <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Ej: Se detectó un error en los gastos de restaurantes, necesitamos corregir varios movimientos"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="resize-none"
                  disabled={isMaxReached}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Mínimo 10 caracteres. Esta razón quedará registrada permanentemente.
                  </p>
                  <p className={`text-xs ${reason.length < 10 ? 'text-muted-foreground' : 'text-green-600 dark:text-green-400'}`}>
                    {reason.length} / 10
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || reason.trim().length < 10 || isMaxReached}
            variant="default"
          >
            {isPending ? 'Reabriendo...' : 'Reabrir período'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
