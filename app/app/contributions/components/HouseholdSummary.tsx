'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { TrendingUp, Calculator } from 'lucide-react';
import { CALCULATION_TYPE_LABELS, type CalculationType } from '@/lib/contributionTypes';

type HouseholdSummaryProps = {
  monthlyGoal: number;
  totalPaid: number;
  calculationType: CalculationType;
  currency?: string;
};

export function HouseholdSummary({
  monthlyGoal,
  totalPaid,
  calculationType,
  currency = 'EUR',
}: HouseholdSummaryProps) {
  const progressPercentage = monthlyGoal > 0 ? (totalPaid / monthlyGoal) * 100 : 0;
  const remaining = Math.max(0, monthlyGoal - totalPaid);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Resumen del Hogar
          </span>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Calculator className="h-3 w-3" />
            {CALCULATION_TYPE_LABELS[calculationType]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Meta mensual</span>
            <span className="font-semibold">{formatCurrency(monthlyGoal, currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total recaudado</span>
            <span className="font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(totalPaid, currency)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pendiente</span>
            <span className="font-semibold text-orange-600 dark:text-orange-400">
              {formatCurrency(remaining, currency)}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-semibold">{progressPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>

        {progressPercentage >= 100 && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
            <p className="text-sm text-green-700 dark:text-green-400 text-center font-medium">
              🎉 ¡Meta del mes alcanzada!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
