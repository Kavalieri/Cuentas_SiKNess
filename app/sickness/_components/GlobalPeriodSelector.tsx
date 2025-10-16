'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSiKness } from '@/contexts/SiKnessContext';
import { Calendar, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export function GlobalPeriodSelector() {
  const { activePeriod, selectPeriod } = useSiKness();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(activePeriod?.year || currentYear);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handlePeriodSelect = (month: number) => {
    selectPeriod(selectedYear, month);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">
            {activePeriod
              ? `${MONTHS[activePeriod.month - 1]} ${activePeriod.year}`
              : 'Seleccionar período'}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Seleccionar Período</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Selector de año */}
        <div className="flex items-center justify-center gap-2 py-3">
          {years.map((year) => (
            <Button
              key={year}
              variant={selectedYear === year ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedYear(year)}
              className="h-8 px-3"
            >
              {year}
            </Button>
          ))}
        </div>

        <DropdownMenuSeparator />

        {/* Grid de meses */}
        <div className="grid grid-cols-3 gap-2 p-3">
          {MONTHS.map((month, index) => {
            const monthNumber = index + 1;
            const isActive =
              activePeriod?.year === selectedYear && activePeriod?.month === monthNumber;
            const isCurrent =
              currentYear === selectedYear && new Date().getMonth() + 1 === monthNumber;

            return (
              <Button
                key={month}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePeriodSelect(monthNumber)}
                className={`h-12 ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}
              >
                <div className="flex flex-col items-center">
                  <span className="text-xs font-medium">{month.slice(0, 3)}</span>
                  {isCurrent && <span className="text-[10px] text-muted-foreground">Actual</span>}
                </div>
              </Button>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
