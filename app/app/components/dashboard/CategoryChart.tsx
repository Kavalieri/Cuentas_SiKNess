'use client';

import { ExpensesByCategoryChart } from '@/app/app/components/charts/ExpensesByCategoryChart';

interface CategoryData {
  category_id: string | null;
  category_name: string;
  category_icon: string;
  total: number;
  percentage: number;
}

interface CategoryChartProps {
  data: CategoryData[];
  currency?: string;
}

export function CategoryChart({ data, currency = 'EUR' }: CategoryChartProps) {
  return (
    <ExpensesByCategoryChart
      data={data}
      currency={currency}
    />
  );
}
