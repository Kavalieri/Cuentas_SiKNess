'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfMonth, addMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MonthSelectorProps {
  value: Date;
  onChange: (date: Date) => void;
}

export function MonthSelector({ value, onChange }: MonthSelectorProps) {
  const currentMonth = startOfMonth(value);

  const handlePrevious = () => {
    onChange(addMonths(currentMonth, -1));
  };

  const handleNext = () => {
    onChange(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    onChange(startOfMonth(new Date()));
  };

  const isCurrentMonth = format(currentMonth, 'yyyy-MM') === format(startOfMonth(new Date()), 'yyyy-MM');

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevious}
        aria-label="Mes anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="min-w-[180px] text-center">
        <p className="font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </p>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={handleNext}
        aria-label="Mes siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentMonth && (
        <Button variant="outline" size="sm" onClick={handleToday}>
          Hoy
        </Button>
      )}
    </div>
  );
}
