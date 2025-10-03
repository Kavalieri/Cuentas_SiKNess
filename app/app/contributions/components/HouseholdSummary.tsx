'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/format';
import { TrendingUp } from 'lucide-react';

type HouseholdSummaryProps = {
  monthlyGoal: number;
  totalPaid: number;
  currency?: string;
};

export function HouseholdSummary({
  monthlyGoal,
  totalPaid,
  currency = 'EUR',
}: HouseholdSummaryProps) {
  const progressPercentage = monthlyGoal > 0 ? (totalPaid / monthlyGoal) * 100 : 0;
  const remaining = Math.max(0, monthlyGoal - totalPaid);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Resumen del Hogar
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
