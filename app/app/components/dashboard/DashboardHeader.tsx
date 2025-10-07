'use client';

import { MonthSelector } from '@/components/shared/MonthSelector';
import { ExportButton } from '@/components/exports/ExportButton';

interface DashboardHeaderProps {
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
}

export function DashboardHeader({ selectedMonth, onMonthChange }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold">📊 Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Resumen de tus finanzas
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <MonthSelector
          value={selectedMonth}
          onChange={onMonthChange}
        />
        <ExportButton
          defaultYear={selectedMonth.getFullYear()}
          defaultMonth={selectedMonth.getMonth() + 1}
        />
      </div>
    </div>
  );
}
