'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { markContributionAsPaid } from '@/app/app/contributions/actions';
import { useState } from 'react';

type Contribution = {
  id: string;
  expected_amount: number;
  paid_amount: number;
  status: string;
  month: number;
  year: number;
};

type HeroContributionProps = {
  contribution: Contribution | null;
  userEmail: string;
  totalIncome: number;
  userIncome: number;
  currency?: string;
};

export function HeroContribution({
  contribution,
  totalIncome,
  userIncome,
  currency = 'EUR',
}: HeroContributionProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!contribution) {
    return (
      <Card className="border-2 border-dashed">
        <CardHeader>
          <CardTitle className="text-2xl">🎯 Tu Contribución Este Mes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            No hay contribuciones calculadas para este mes.
          </p>
          <p className="text-sm text-muted-foreground">
            Asegúrate de que tu ingreso mensual y la meta del hogar estén configurados.
          </p>
        </CardContent>
      </Card>
    );
  }

  const percentage = totalIncome > 0 ? (userIncome / totalIncome) * 100 : 0;
  const isPaid = contribution.status === 'paid';
  const isPending = contribution.status === 'pending';

  const handleMarkAsPaid = async () => {
    setIsLoading(true);
    const result = await markContributionAsPaid(contribution.id);

    if (result.ok) {
      toast.success('✅ Contribución marcada como pagada');
    } else {
      toast.error(result.message);
    }
    setIsLoading(false);
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center justify-between">
          <span>🎯 Tu Contribución Este Mes</span>
          <Badge variant={isPaid ? 'default' : 'secondary'} className="text-sm">
            {isPaid ? (
              <>
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Pagado
              </>
            ) : (
              <>
                <Clock className="mr-1 h-4 w-4" />
                Pendiente
              </>
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Tu aportación:</span>
            <span className="text-3xl font-bold">
              {formatCurrency(contribution.expected_amount, currency)}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Porcentaje del hogar:</span>
            <span className="text-xl font-semibold text-muted-foreground">
              {percentage.toFixed(1)}%
            </span>
          </div>
        </div>

        {isPaid && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
            <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Has completado tu contribución de este mes. ¡Gracias!
            </p>
          </div>
        )}

        {isPending && (
          <Button
            onClick={handleMarkAsPaid}
            disabled={isLoading}
            size="lg"
            className="w-full"
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            {isLoading ? 'Procesando...' : 'Marcar como Pagado'}
          </Button>
        )}

        <p className="text-xs text-muted-foreground">
          Basado en tu ingreso mensual de {formatCurrency(userIncome, currency)}
        </p>
      </CardContent>
    </Card>
  );
}
