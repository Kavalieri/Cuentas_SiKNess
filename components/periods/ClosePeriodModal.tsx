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
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { closePeriod } from '@/app/app/periods/actions';
import { formatCurrency } from '@/lib/format';
import { AlertTriangle, Lock, AlertCircle } from 'lucide-react';

interface ClosePeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  period: {
    id: string;
    year: number;
    month: number;
    status: string;
  };
  hasDescuadre: boolean;
  descuadreAmount?: number;
  currency?: string;
  onSuccess?: () => void;
}

export function ClosePeriodModal({
  isOpen,
  onClose,
  period,
  hasDescuadre,
  descuadreAmount = 0,
  currency = 'EUR',
  onSuccess,
}: ClosePeriodModalProps) {
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handleSubmit = () => {
    if (!confirmed) {
      toast.error('Debes confirmar que entiendes las consecuencias');
      return;
    }

    startTransition(async () => {
      const result = await closePeriod(period.id, notes || undefined);

      if (result.ok) {
        toast.success(`Período ${monthNames[period.month - 1]} ${period.year} cerrado correctamente`);
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
            <Lock className="h-5 w-5" />
            Cerrar Período - {monthNames[period.month - 1]} {period.year}
          </DialogTitle>
          <DialogDescription>
            Esta acción bloqueará todas las transacciones y ajustes del período.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning de descuadre */}
          {hasDescuadre && (
            <Card className="bg-destructive/10 border-destructive/30">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p className="font-semibold text-destructive">
                      ⚠️ Descuadre Detectado
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Hay una diferencia de{' '}
                      <span className="font-bold text-destructive">
                        {formatCurrency(Math.abs(descuadreAmount), currency)}
                      </span>{' '}
                      entre las contribuciones esperadas y el total del período.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {descuadreAmount > 0
                        ? 'Las contribuciones suman MÁS que el total del período'
                        : 'Las contribuciones suman MENOS que el total del período'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Información de cierre */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 space-y-2 text-sm">
                  <p className="font-medium">Al cerrar este período:</p>
                  <ul className="space-y-1 text-muted-foreground ml-4 list-disc">
                    <li>Todas las transacciones se marcarán como <code className="text-xs bg-background px-1 rounded">locked</code></li>
                    <li>No se podrán editar ni eliminar movimientos</li>
                    <li>Los ajustes de contribuciones quedarán bloqueados</li>
                    <li>El período cambiará a estado <code className="text-xs bg-background px-1 rounded">closed</code></li>
                    <li>Podrás reabrirlo hasta 3 veces si es necesario</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notas opcionales */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notas (opcional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Ej: Cierre mensual automático, revisado sin errores"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Registra cualquier observación sobre este cierre
            </p>
          </div>

          {/* Confirmación obligatoria */}
          <div className="flex items-start space-x-3 rounded-md border p-4 bg-background">
            <Checkbox
              id="confirm"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <div className="flex-1 space-y-1 leading-none">
              <Label
                htmlFor="confirm"
                className="text-sm font-medium cursor-pointer"
              >
                Entiendo que este período se cerrará permanentemente
              </Label>
              <p className="text-xs text-muted-foreground">
                Las transacciones se bloquearán y no podrán ser modificadas hasta reapertura
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !confirmed}
            variant={hasDescuadre ? 'destructive' : 'default'}
          >
            {isPending ? 'Cerrando...' : hasDescuadre ? 'Cerrar con descuadre' : 'Cerrar período'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
