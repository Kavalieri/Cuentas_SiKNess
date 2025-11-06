'use client';

import { MonthStatusBadge } from '@/components/shared/MonthStatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, toNumber } from '@/lib/format';
import type { MonthlyPeriod } from '@/lib/periods';
import { calculateMonthlySavings, formatPeriodMonth, normalizePeriodPhase } from '@/lib/periods';
import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react';

interface MonthlyPeriodCardProps {
  period: MonthlyPeriod;
  onClick?: () => void;
  showActions?: boolean;
  hasDescuadre?: boolean;
  descuadreAmount?: number;
  onRefresh?: () => void;
}

export function MonthlyPeriodCard({
  period,
  onClick,
  showActions = false,
  hasDescuadre: _hasDescuadre = false,
  descuadreAmount: _descuadreAmount = 0,
  onRefresh: _onRefresh,
}: MonthlyPeriodCardProps) {
  const savings = calculateMonthlySavings(period);
  const isSavings = savings >= 0;
  const normalizedPhase = normalizePeriodPhase(period.phase);

  return (
    <Card
      className={`transition-all hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">
          {formatPeriodMonth(period.year ?? 0, period.month ?? 0)}
        </CardTitle>
  <MonthStatusBadge phase={String(period.phase)} />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Balance Inicial */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Balance Inicial</span>
            <span className="font-medium">{formatCurrency(toNumber(period.opening_balance))}</span>
          </div>

          {/* Ingresos */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">Ingresos</span>
            </div>
            <span className="font-medium text-green-600">
              +{formatCurrency(toNumber(period.total_income))}
            </span>
          </div>

          {/* Gastos */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-muted-foreground">Gastos</span>
            </div>
            <span className="font-medium text-red-600">
              -{formatCurrency(toNumber(period.total_expenses))}
            </span>
          </div>

          {/* Separador */}
          <div className="border-t border-dashed pt-2" />

          {/* Balance Final */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="font-semibold">Balance Final</span>
            </div>
            <span className="text-lg font-bold">{formatCurrency(toNumber(period.closing_balance))}</span>
          </div>

          {/* Ahorro del Mes */}
          {normalizedPhase !== 'active' && normalizedPhase !== 'preparing' && normalizedPhase !== 'unknown' && (
            <div className="rounded-lg bg-muted/50 p-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {isSavings ? 'Ahorro' : 'Déficit'} del mes
                </span>
                <span className={`font-semibold ${isSavings ? 'text-green-600' : 'text-red-600'}`}>
                  {isSavings ? '+' : ''}
                  {formatCurrency(savings)}
                </span>
              </div>
            </div>
          )}

          {/* Notas (si está cerrado) */}
          {normalizedPhase === 'closed' && period.notes && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Notas:</span> {period.notes}
            </div>
          )}

          {/* Acciones de período */}
          {showActions && (
            <div className="pt-2 border-t text-xs text-muted-foreground">
              {/* TODO: Reintegrar acciones de período cuando el componente esté disponible */}
              Acciones de período no disponibles temporalmente.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
