'use client';

import { StatCard } from '@/components/shared/data-display/StatCard';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Coins } from 'lucide-react';
import { usePrivateFormat } from '@/lib/hooks/usePrivateFormat';

interface FinancialSummaryProps {
  income: number;
  expenses: number;
  balance: number;
  transactionCount: number;
  avgDaily?: number;
  householdCredits?: {
    totalActiveCredits: number;
    totalReservedCredits: number;
    balanceAfterCredits: number;
    rawBalance: number;
  };
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
  householdCredits,
  previousMonthComparison,
}: FinancialSummaryProps) {
  const { formatPrivateCurrency } = usePrivateFormat();

  const balanceVariant = balance >= 0 ? 'success' : 'danger';
  const totalCredits = (householdCredits?.totalActiveCredits || 0) + (householdCredits?.totalReservedCredits || 0);

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
        subtitle={avgDaily ? `~${formatPrivateCurrency(avgDaily)}/día` : undefined}
      />

      <StatCard
        title="Balance"
        value={formatPrivateCurrency(balance)}
        icon={<DollarSign className="h-4 w-4" />}
        variant={balanceVariant}
      />

      <StatCard
        title="Créditos del Hogar"
        value={formatPrivateCurrency(totalCredits)}
        icon={<Coins className="h-4 w-4" />}
        variant="default"
        subtitle={householdCredits ? `Saldo libre (sin créditos): ${formatPrivateCurrency(householdCredits.balanceAfterCredits)}` : undefined}
      />
    </div>
  );
}
