'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { Home } from 'lucide-react';

interface HouseholdSummaryDisplayCardProps {
  monthlyGoal: number;
  spent: number;
}

export default function HouseholdSummaryDisplayCard({
  monthlyGoal,
  spent,
}: HouseholdSummaryDisplayCardProps) {
  const remainingAmount = monthlyGoal - spent;
  const progressPercentage = monthlyGoal > 0 ? (spent / monthlyGoal) * 100 : 0;

  return (
    <Card className="animate-in fade-in-0 duration-700 slide-in-from-bottom-8 delay-1000">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Home className="h-4 w-4" />
          Resumen del Hogar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-green-600">{formatCurrency(monthlyGoal)}</div>
            <p className="text-xs text-muted-foreground">Objetivo mensual</p>
            {monthlyGoal === 0 && <p className="text-xs text-orange-600 mt-1">Sin configurar</p>}
          </div>
          <div>
            <div className="text-lg font-bold text-blue-600">{formatCurrency(spent)}</div>
            <p className="text-xs text-muted-foreground">Gastado hasta ahora</p>
          </div>
        </div>

        {monthlyGoal > 0 && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso mensual</span>
                <span>{progressPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    progressPercentage > 100
                      ? 'bg-red-500'
                      : progressPercentage > 80
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                />
              </div>
            </div>

            <div className="text-center">
              <div
                className={`text-sm font-medium ${
                  remainingAmount >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {remainingAmount >= 0 ? 'Te quedan ' : 'Te has pasado por '}
                {formatCurrency(Math.abs(remainingAmount))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
