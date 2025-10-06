'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonthSelector } from '@/components/shared/MonthSelector';
import { AddTransactionDialog } from '@/app/app/expenses/components/AddTransactionDialog';
import { TransactionsList } from '@/app/app/components/TransactionsList';
import { ExpensesByCategoryChart } from '@/app/app/components/charts/ExpensesByCategoryChart';
import { IncomeVsExpensesChart } from '@/app/app/components/charts/IncomeVsExpensesChart';
import { SavingsEvolutionChart } from '@/components/savings/SavingsEvolutionChart';
import { SavingsTab } from '@/components/savings/SavingsTab';
import { PendingCreditsWidget } from '@/components/credits/PendingCreditsWidget';
import { formatCurrency } from '@/lib/format';
import { getMonthSummary, getTransactions, getCategoryExpenses, getMonthComparison } from '@/app/app/expenses/actions';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowRight, TrendingUp, PiggyBank, BarChart3 } from 'lucide-react';
import type { SavingsBalance, SavingsTransaction } from '@/types/savings';

type Category = {
  id: string;
  name: string;
  icon: string | null;
  type: string;
};

type Transaction = {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  currency: string;
  description: string | null;
  occurred_at: string;
  created_at: string | null;
  updated_at?: string | null;
  category_id: string | null;
  paid_by?: string | null;
  status?: 'draft' | 'pending' | 'confirmed' | 'locked';
  categories: {
    id: string;
    name: string;
    icon: string | null;
  } | null;
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

type Member = {
  id: string;
  display_name: string;
  avatar_url: string | null;
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
  initialCategories: Category[];
  initialTransactions: Transaction[];
  initialSummary: {
    expenses: number;
    income: number;
    balance: number;
  };
  initialCategoryExpenses: CategoryExpense[];
  initialComparison?: MonthComparison;
  initialMembers: Member[];
  initialSavingsEvolution: Array<{ date: string; balance: number }>;
  initialSavingsGoal?: number | null;
  initialSavingsBalance?: SavingsBalance;
  initialSavingsTransactions?: SavingsTransaction[];
}

export function DashboardContent({
  initialCategories,
  initialTransactions,
  initialSummary,
  initialCategoryExpenses,
  initialComparison,
  initialMembers,
  initialSavingsEvolution,
  initialSavingsGoal,
  initialSavingsBalance,
  initialSavingsTransactions,
}: DashboardContentProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [summary, setSummary] = useState(initialSummary);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [categoryExpenses, setCategoryExpenses] = useState(initialCategoryExpenses);
  const [comparison, setComparison] = useState(initialComparison);
  const [isLoading, setIsLoading] = useState(false);

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
      toast.error('Error al cargar los transaccións');
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

  const expenseTransactions = transactions.filter((m) => m.type === 'expense');
  const incomeTransactions = transactions.filter((m) => m.type === 'income');

  // Limitar a 10 últimas transacciones para el dashboard
  const recentTransactions = transactions.slice(0, 10);
  const recentExpenses = expenseTransactions.slice(0, 10);
  const recentIncome = incomeTransactions.slice(0, 10);

  const hasMoreTransactions = transactions.length > 10;
  const hasMoreExpenses = expenseTransactions.length > 10;
  const hasMoreIncome = incomeTransactions.length > 10;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen de {selectedMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <MonthSelector value={selectedMonth} onChange={handleMonthChange} />
          {/* @ts-ignore - categories typing */}
          <AddTransactionDialog categories={initialCategories} />
        </div>
      </div>

      {/* Resumen Financiero */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ingresos del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary?.income || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {incomeTransactions.length} {incomeTransactions.length === 1 ? 'ingreso' : 'ingresos'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gastos del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary?.expenses || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {expenseTransactions.length} {expenseTransactions.length === 1 ? 'gasto' : 'gastos'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(summary?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary?.balance || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(summary?.balance || 0) >= 0 ? 'Superávit' : 'Déficit'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Widget de Créditos Pendientes */}
      <PendingCreditsWidget onRefresh={refreshData} />

      {/* PESTAÑAS PRINCIPALES */}
      <Tabs defaultValue="balance" className="w-full">
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

        {/* TAB BALANCE: Transacciones con filtros */}
        <TabsContent value="balance" className="mt-6 space-y-6">
          {/* Sub-tabs: Todos/Ingresos/Gastos */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="income">Ingresos</TabsTrigger>
              <TabsTrigger value="expenses">Gastos</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Últimas transacciones</CardTitle>
                      <CardDescription>
                        {recentTransactions.length} {hasMoreTransactions ? `de ${transactions.length}` : ''} transacción{transactions.length !== 1 ? 'es' : ''}
                      </CardDescription>
                    </div>
                    {hasMoreTransactions && (
                      <Link
                        href="/app/expenses"
                        className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        Ver todas
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <p className="text-muted-foreground text-center py-8">Cargando...</p>
                  ) : (
                    /* @ts-ignore - complex transactions typing */
                    <TransactionsList
                      transactions={recentTransactions}
                      categories={initialCategories}
                      members={initialMembers}
                      onUpdate={refreshData}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="income" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Ingresos Recientes</CardTitle>
                      <CardDescription>
                        {recentIncome.length} {hasMoreIncome ? 'de' : ''} {incomeTransactions.length} ingreso{incomeTransactions.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                    {hasMoreIncome && (
                      <Link
                        href="/app/expenses"
                        className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        Ver todos
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <p className="text-muted-foreground text-center py-8">Cargando...</p>
                  ) : (
                    /* @ts-ignore - complex transactions typing */
                    <TransactionsList
                      transactions={recentIncome}
                      categories={initialCategories}
                      members={initialMembers}
                      onUpdate={refreshData}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="expenses" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Gastos Recientes</CardTitle>
                      <CardDescription>
                        {recentExpenses.length} {hasMoreExpenses ? 'de' : ''} {expenseTransactions.length} gasto{expenseTransactions.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                    {hasMoreExpenses && (
                      <Link
                        href="/app/expenses"
                        className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        Ver todos
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <p className="text-muted-foreground text-center py-8">Cargando...</p>
                  ) : (
                    /* @ts-ignore - complex transactions typing */
                    <TransactionsList
                      transactions={recentExpenses}
                      categories={initialCategories}
                      members={initialMembers}
                      onUpdate={refreshData}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
            <ExpensesByCategoryChart data={categoryExpenses} currency="EUR" />
            <IncomeVsExpensesChart
              current={summary}
              previous={comparison?.previous}
              change={comparison?.change}
              currency="EUR"
            />
          </div>

          {/* Gráfico de Evolución de Ahorro */}
          {initialSavingsEvolution.length > 0 && (
            <SavingsEvolutionChart data={initialSavingsEvolution} goalAmount={initialSavingsGoal} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
