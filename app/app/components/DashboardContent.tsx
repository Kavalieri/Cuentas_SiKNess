'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { FinancialSummary } from './dashboard/FinancialSummary';
import { BalanceBreakdown } from './dashboard/BalanceBreakdown';
import { CategoryChart } from './dashboard/CategoryChart';
import { TrendChart } from './dashboard/TrendChart';
import { RecentTransactions } from './dashboard/RecentTransactions';
import { LoadingState } from '@/components/shared/data-display/LoadingState';
import { AddTransactionDialog } from '@/app/app/expenses/components/AddTransactionDialog';
import { SavingsEvolutionChart } from '@/components/savings/SavingsEvolutionChart';
import { SavingsTab } from '@/components/savings/SavingsTab';
import { PendingCreditsWidget } from '@/components/credits/PendingCreditsWidget';
import { MyCreditsCard } from '@/components/credits/MyCreditsCard';
import { PersonalBalanceCard } from '@/components/contributions/PersonalBalanceCard';
import { getMonthSummary, getTransactions, getCategoryExpenses, getMonthComparison } from '@/app/app/expenses/actions';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowRight, TrendingUp, PiggyBank, BarChart3 } from 'lucide-react';
import type { SavingsBalance, SavingsTransaction } from '@/types/savings';
import type { Database } from '@/types/database';

type Category = {
  id: string;
  name: string;
  icon: string | null;
  type: string;
};

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'] | null;
  profiles?: Database['public']['Tables']['profiles']['Row'] | null;
  profile?: {
    display_name: string;
    avatar_url: string | null;
  } | null;
};

type CategoryExpense = {
  category_id: string | null;
  category_name: string;
  category_icon: string;
  total: number;
  count: number;
  percentage: number;
};

type MonthComparison = {
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
    income: number;
    expenses: number;
    balance: number;
  };
};

interface DashboardContentProps {
  householdId: string;
  initialCategories: Category[];
  initialTransactions: Transaction[];
  initialSummary: {
    expenses: number;
    income: number;
    balance: number;
  };
  initialCategoryExpenses: CategoryExpense[];
  initialComparison?: MonthComparison;
  initialSavingsEvolution: Array<{ date: string; balance: number }>;
  initialSavingsGoal?: number | null;
  initialSavingsBalance?: SavingsBalance;
  initialSavingsTransactions?: SavingsTransaction[];
  initialPendingCredits?: Array<{
    id: string;
    amount: number;
    currency: string;
    source_month: number;
    source_year: number;
    status: string;
    monthly_decision: string | null;
  }>;
  balanceBreakdown?: {
    totalBalance: number;
    freeBalance: number;
    activeCredits: number;
    reservedCredits: number;
  };
}

export function DashboardContent({
  householdId,
  initialCategories,
  initialTransactions,
  initialSummary,
  initialCategoryExpenses,
  initialComparison,
  initialSavingsEvolution,
  initialSavingsGoal,
  initialSavingsBalance,
  initialSavingsTransactions,
  initialPendingCredits = [],
  balanceBreakdown,
}: DashboardContentProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [summary, setSummary] = useState(initialSummary);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [categoryExpenses, setCategoryExpenses] = useState(initialCategoryExpenses);
  const [comparison, setComparison] = useState(initialComparison);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estado de pestaña activa con persistencia
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('dashboard-active-tab') || 'balance';
    }
    return 'balance';
  });

  // Guardar estado de pestaña cuando cambia
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('dashboard-active-tab', activeTab);
    }
  }, [activeTab]);

  const handleMonthChange = async (newDate: Date) => {
    setSelectedMonth(newDate);
    setIsLoading(true);

    const year = newDate.getFullYear();
    const month = newDate.getMonth() + 1;

    // Calcular rango de fechas del mes
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const [summaryResult, transactionsResult, categoryExpensesResult, comparisonResult] = await Promise.all([
      getMonthSummary(year, month),
      getTransactions({ startDate, endDate }),
      getCategoryExpenses({ startDate, endDate }),
      getMonthComparison({ currentMonth: `${year}-${month.toString().padStart(2, '0')}` }),
    ]);

    if (summaryResult.ok) {
      setSummary(summaryResult.data || { expenses: 0, income: 0, balance: 0 });
    } else {
      toast.error('Error al cargar el resumen');
    }

    if (transactionsResult.ok) {
      setTransactions((transactionsResult.data || []) as Transaction[]);
    } else {
      toast.error('Error al cargar las transacciones');
    }

    if (categoryExpensesResult.ok) {
      setCategoryExpenses((categoryExpensesResult.data || []) as CategoryExpense[]);
    }

    if (comparisonResult.ok && comparisonResult.data) {
      setComparison(comparisonResult.data as MonthComparison);
    }

    setIsLoading(false);
  };

  // Función para refrescar datos sin cambiar el mes seleccionado
  const refreshData = async () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth() + 1;

    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const [summaryResult, transactionsResult, categoryExpensesResult] = await Promise.all([
      getMonthSummary(year, month),
      getTransactions({ startDate, endDate }),
      getCategoryExpenses({ startDate, endDate }),
    ]);

    if (summaryResult.ok) {
      setSummary(summaryResult.data || { expenses: 0, income: 0, balance: 0 });
    }

    if (transactionsResult.ok) {
      setTransactions((transactionsResult.data || []) as Transaction[]);
    }

    if (categoryExpensesResult.ok) {
      setCategoryExpenses((categoryExpensesResult.data || []) as CategoryExpense[]);
    }
  };

  // Calcular transacciones recientes (últimas 10)
  const recentTransactions = transactions.slice(0, 10);

  // Calcular promedio diario de gastos
  const daysInMonth = new Date(
    selectedMonth.getFullYear(),
    selectedMonth.getMonth() + 1,
    0
  ).getDate();
  const avgDailyExpenses = summary.expenses / daysInMonth;

  // Calcular cambio porcentual para FinancialSummary
  const previousMonthComparison = comparison ? {
    incomeChange: comparison.change.income,
    expensesChange: comparison.change.expenses,
  } : undefined;

  return (
    <div className="space-y-6">
      {/* Header con MonthSelector y ExportButton */}
      <DashboardHeader
        selectedMonth={selectedMonth}
        onMonthChange={handleMonthChange}
      />

      {/* AddTransactionDialog flotante (esquina) */}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40">
        {/* @ts-ignore - categories typing */}
        <AddTransactionDialog categories={initialCategories} />
      </div>

      {isLoading ? (
        <LoadingState message="Cargando datos del dashboard..." />
      ) : (
        <>
          {/* Resumen Financiero: 4 StatCards */}
          <FinancialSummary
            income={summary.income}
            expenses={summary.expenses}
            balance={summary.balance}
            transactionCount={transactions.length}
            avgDaily={avgDailyExpenses}
            previousMonthComparison={previousMonthComparison}
          />

          {/* Balance Breakdown + Personal Balance + My Credits */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {balanceBreakdown && (
              <BalanceBreakdown
                totalBalance={balanceBreakdown.totalBalance}
                freeBalance={balanceBreakdown.freeBalance}
                activeCredits={balanceBreakdown.activeCredits}
                reservedCredits={balanceBreakdown.reservedCredits}
              />
            )}
            <PersonalBalanceCard householdId={householdId} />
            <MyCreditsCard householdId={householdId} />
          </div>

          {/* Widget de Créditos Pendientes */}
          <PendingCreditsWidget initialCredits={initialPendingCredits} onRefresh={refreshData} />

          {/* PESTAÑAS PRINCIPALES */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="balance" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Balance</span>
              </TabsTrigger>
              <TabsTrigger value="savings" className="gap-2">
                <PiggyBank className="h-4 w-4" />
                <span className="hidden sm:inline">Ahorro</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Estadísticas</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB BALANCE: Transacciones recientes */}
            <TabsContent value="balance" className="mt-6 space-y-6">
              <RecentTransactions transactions={recentTransactions} />
              
              {/* Card para ver página completa */}
              <Card>
                <CardContent className="py-6">
                  <Link
                    href="/app/transactions"
                    className="flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    Ver todas las transacciones con filtros avanzados
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB AHORRO: Módulo completo de ahorro */}
            <TabsContent value="savings" className="mt-6">
              {initialSavingsBalance && initialSavingsTransactions ? (
                <SavingsTab
                  initialBalance={initialSavingsBalance}
                  initialTransactions={initialSavingsTransactions}
                />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      No hay información de ahorro disponible
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* TAB ESTADÍSTICAS: Gráficos */}
            <TabsContent value="stats" className="mt-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <CategoryChart data={categoryExpenses} currency="EUR" />
                {comparison && (
                  <TrendChart
                    current={comparison.current}
                    previous={comparison.previous}
                    change={comparison.change}
                    currency="EUR"
                  />
                )}
              </div>

              {/* Gráfico de Evolución de Ahorro */}
              {initialSavingsEvolution.length > 0 && (
                <SavingsEvolutionChart data={initialSavingsEvolution} goalAmount={initialSavingsGoal} />
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
