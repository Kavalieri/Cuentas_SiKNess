/**
 * Tipos para datos de gráficos
 */

export interface CategoryExpense {
  category_id: string;
  category_name: string;
  category_icon: string;
  total: number;
  count: number;
  percentage: number;
}

export interface DailyExpense {
  date: string; // ISO format YYYY-MM-DD
  amount: number;
  count: number;
}

export interface MonthComparison {
  current: {
    income: number;
    expenses: number;
    balance: number;
  };
  previous: {
    income: number;
    expenses: number;
    balance: number;
  };
  change: {
    income: number; // Percentage
    expenses: number; // Percentage
    balance: number; // Percentage
  };
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
  [key: string]: unknown;
}
