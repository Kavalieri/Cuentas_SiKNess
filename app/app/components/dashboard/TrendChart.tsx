'use client';

import { IncomeVsExpensesChart } from '@/app/app/components/charts/IncomeVsExpensesChart';

interface TrendChartProps {
  current: {
    income: number;
    expenses: number;
    balance: number;
  };
  previous?: {
    income: number;
    expenses: number;
    balance: number;
  };
  change?: {
    income: number;
    expenses: number;
    balance: number;
  };
  currency?: string;
}

export function TrendChart({ current, previous, change, currency = 'EUR' }: TrendChartProps) {
  return (
    <IncomeVsExpensesChart
      current={current}
      previous={previous}
      change={change}
      currency={currency}
    />
  );
}
