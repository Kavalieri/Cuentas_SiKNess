'use client';

import { StatCard } from '@/components/shared/data-display/StatCard';
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';
import { usePrivateFormat } from '@/lib/hooks/usePrivateFormat';

interface FinancialSummaryProps {
  income: number;
  expenses: number;
  balance: number;
  transactionCount: number;
  avgDaily?: number;
  previousMonthComparison?: {
    incomeChange: number;
    expensesChange: number;
  };
}

export function FinancialSummary({
  income,
  expenses,
  balance,
  transactionCount,
  avgDaily,
  previousMonthComparison,
}: FinancialSummaryProps) {
  const { formatPrivateCurrency } = usePrivateFormat();

  const balanceVariant = balance >= 0 ? 'success' : 'danger';

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Ingresos"
        value={formatPrivateCurrency(income)}
        icon={<TrendingUp className="h-4 w-4" />}
        variant="success"
        trend={
          previousMonthComparison?.incomeChange !== undefined
            ? {
                value: Math.abs(previousMonthComparison.incomeChange),
                direction: previousMonthComparison.incomeChange >= 0 ? 'up' : 'down',
              }
            : undefined
        }
        subtitle={previousMonthComparison ? 'vs mes anterior' : undefined}
      />

      <StatCard
        title="Gastos"
        value={formatPrivateCurrency(expenses)}
        icon={<TrendingDown className="h-4 w-4" />}
        variant="danger"
        trend={
          previousMonthComparison?.expensesChange !== undefined
            ? {
                value: Math.abs(previousMonthComparison.expensesChange),
                direction: previousMonthComparison.expensesChange >= 0 ? 'up' : 'down',
              }
            : undefined
        }
        subtitle={previousMonthComparison ? 'vs mes anterior' : undefined}
      />

      <StatCard
        title="Balance"
        value={formatPrivateCurrency(balance)}
        icon={<DollarSign className="h-4 w-4" />}
        variant={balanceVariant}
        subtitle={balance >= 0 ? 'Superávit' : 'Déficit'}
      />

      <StatCard
        title="Transacciones"
        value={transactionCount}
        icon={<BarChart3 className="h-4 w-4" />}
        subtitle={avgDaily ? `~${formatPrivateCurrency(avgDaily)}/día` : undefined}
      />
    </div>
  );
}
