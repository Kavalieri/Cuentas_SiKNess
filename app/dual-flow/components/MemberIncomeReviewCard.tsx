'use client';

import { reviewMemberIncomeAction } from '@/app/dual-flow/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/format';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

type MemberIncomeStatus = 'draft' | 'submitted' | 'validated' | 'needs_revision';

type ReviewableIncome = {
  id: string;
  profileId: string;
  displayName: string;
  email: string;
  grossIncome: number;
  otherIncome: number;
  notes: string | null;
  status: MemberIncomeStatus;
};

interface MemberIncomeReviewCardProps {
  incomes: ReviewableIncome[];
  periodLabel: string;
  periodYear: number;
  periodMonth: number;
  currency: string;
}

const STATUS_LABELS: Record<MemberIncomeStatus, string> = {
  draft: 'Borrador',
  submitted: 'Pendiente',
  validated: 'Validado',
  needs_revision: 'Revisión solicitada',
};

export function MemberIncomeReviewCard({
  incomes,
  periodLabel,
  periodYear,
  periodMonth,
  currency,
}: MemberIncomeReviewCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    formData.set('periodYear', periodYear.toString());
    formData.set('periodMonth', periodMonth.toString());

    startTransition(async () => {
      const result = await reviewMemberIncomeAction(formData);

      if (result.ok) {
        toast.success('Ingreso revisado correctamente');
        router.refresh();
      } else {
        toast.error(result.message ?? 'No se pudo actualizar el ingreso');
      }
    });
  };

  return (
    <Card className="border-l-4 border-l-amber-500/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Revisión de ingresos del hogar</CardTitle>
            <p className="text-sm text-muted-foreground">Periodo {periodLabel}</p>
          </div>
          <Badge variant="outline">Propietario</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {incomes.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay ingresos pendientes de revisión para este período.
          </p>
        )}

        {incomes.map((income) => (
          <form key={income.id} action={handleSubmit} className="space-y-3 rounded-lg border p-4">
            <input type="hidden" name="memberId" value={income.profileId} />

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">{income.displayName}</span>
                <Badge variant="secondary">{STATUS_LABELS[income.status]}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">{income.email}</span>
              <span className="text-xs text-muted-foreground">
                Total declarado: {formatCurrency(income.grossIncome + income.otherIncome, currency)}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor={`gross-${income.id}`}>Ingreso principal</Label>
                <Input
                  id={`gross-${income.id}`}
                  name="grossIncome"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={income.grossIncome.toString()}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor={`other-${income.id}`}>Otros ingresos</Label>
                <Input
                  id={`other-${income.id}`}
                  name="otherIncome"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={income.otherIncome.toString()}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor={`status-${income.id}`}>Estado</Label>
                <Select name="status" defaultValue={income.status}>
                  <SelectTrigger id={`status-${income.id}`}>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="validated">Validado</SelectItem>
                    <SelectItem value="needs_revision">Requiere revisión</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor={`notes-${income.id}`}>Notas para el miembro</Label>
              <Textarea
                id={`notes-${income.id}`}
                name="notes"
                placeholder="Comentarios opcionales"
                defaultValue={income.notes ?? ''}
                rows={3}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Guardando…' : 'Guardar revisión'}
              </Button>
            </div>
          </form>
        ))}
      </CardContent>
    </Card>
  );
}
