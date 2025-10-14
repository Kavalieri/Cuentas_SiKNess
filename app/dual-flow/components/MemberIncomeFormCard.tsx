'use client';

import { submitMemberIncomeAction } from '@/app/dual-flow/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/format';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

type MemberIncomeStatus = 'draft' | 'submitted' | 'validated' | 'needs_revision';

interface MemberIncomeFormCardProps {
  periodLabel: string;
  periodYear: number;
  periodMonth: number;
  currency: string;
  existingIncome?: {
    grossIncome: number;
    otherIncome: number;
    notes: string | null;
    status: MemberIncomeStatus;
  };
}

export function MemberIncomeFormCard({
  periodLabel,
  periodYear,
  periodMonth,
  currency,
  existingIncome,
}: MemberIncomeFormCardProps) {
  const router = useRouter();
  const [grossIncome, setGrossIncome] = useState(
    existingIncome ? existingIncome.grossIncome.toString() : '',
  );
  const [otherIncome, setOtherIncome] = useState(
    existingIncome ? existingIncome.otherIncome.toString() : '',
  );
  const [notes, setNotes] = useState(existingIncome?.notes ?? '');
  const [isPending, startTransition] = useTransition();

  const statusBadge = useMemo(() => {
    if (!existingIncome) {
      return null;
    }

    const map: Record<
      MemberIncomeStatus,
      { label: string; variant: 'outline' | 'default' | 'secondary' | 'destructive' }
    > = {
      draft: { label: 'Borrador', variant: 'secondary' },
      submitted: { label: 'Pendiente de revisión', variant: 'outline' },
      validated: { label: 'Validado', variant: 'default' },
      needs_revision: { label: 'Revisión solicitada', variant: 'destructive' },
    };

    return map[existingIncome.status];
  }, [existingIncome]);

  const handleSubmit = (formData: FormData) => {
    formData.set('periodYear', periodYear.toString());
    formData.set('periodMonth', periodMonth.toString());

    startTransition(async () => {
      const result = await submitMemberIncomeAction(formData);

      if (result.ok) {
        toast.success('Ingreso mensual guardado correctamente');
        router.refresh();
      } else {
        toast.error(result.message ?? 'No se pudo guardar el ingreso');
      }
    });
  };

  return (
    <Card className="border-l-4 border-l-primary/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Mis ingresos del período</CardTitle>
            <p className="text-sm text-muted-foreground">Periodo {periodLabel}</p>
          </div>
          {statusBadge && <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="periodYear" value={periodYear} />
          <input type="hidden" name="periodMonth" value={periodMonth} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="grossIncome">Ingreso principal</Label>
              <Input
                id="grossIncome"
                name="grossIncome"
                type="number"
                min="0"
                step="0.01"
                value={grossIncome}
                onChange={(event) => setGrossIncome(event.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="otherIncome">Otros ingresos</Label>
              <Input
                id="otherIncome"
                name="otherIncome"
                type="number"
                min="0"
                step="0.01"
                value={otherIncome}
                onChange={(event) => setOtherIncome(event.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Información adicional para el propietario"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>

          {existingIncome && (
            <p className="text-xs text-muted-foreground">
              Último registro:{' '}
              {formatCurrency(existingIncome.grossIncome + existingIncome.otherIncome, currency)}{' '}
              totales
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando…' : 'Enviar ingresos'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
