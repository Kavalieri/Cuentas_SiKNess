'use client';

import { usePeriodContext } from '@/app/dual-flow/contexts/PeriodContext';
import { Button } from '@/components/ui/button';
import { formatPeriodMonth } from '@/lib/periods';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Selector de período para el sistema dual-flow
 * Conectado al PeriodContext global - todos los cambios afectan toda la app
 */
export function PeriodSelector() {
  const {
    currentPeriod,
    selectedPeriod,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    loading,
    periodData,
  } = usePeriodContext();

  const isCurrentPeriod =
    selectedPeriod.year === currentPeriod.year && selectedPeriod.month === currentPeriod.month;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={goToPreviousMonth}
        disabled={loading}
        aria-label="Período anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="min-w-[180px] text-center">
        <div className="flex items-center justify-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <p className="font-semibold">
            {formatPeriodMonth(selectedPeriod.year, selectedPeriod.month)}
          </p>
        </div>
        {periodData && (
          <p className="text-xs text-muted-foreground mt-1">
            Balance: €{periodData.closing_balance || 0} • {periodData.status}
          </p>
        )}
        {loading && <p className="text-xs text-muted-foreground mt-1">Cargando...</p>}
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={goToNextMonth}
        disabled={loading}
        aria-label="Período siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentPeriod && (
        <Button variant="outline" size="sm" onClick={goToCurrentMonth} disabled={loading}>
          Actual
        </Button>
      )}
    </div>
  );
}
