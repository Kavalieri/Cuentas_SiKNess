export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { supabaseServer, getUserHouseholdId } from '@/lib/supabaseServer';
import {
  getTrendData,
  getCategoryDistribution,
  getContributionsComparison,
  getTopCategories,
} from './actions';
import { ReportsContent } from './components/ReportsContent';
import { BarChart3 } from 'lucide-react';

export const metadata = {
  title: 'Reportes | CuentasSiK',
  description: 'Visualiza tus estadísticas financieras y tendencias',
};

export default async function ReportsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const householdId = await getUserHouseholdId();
  if (!householdId) {
    redirect('/app/household/create');
  }

  // Calcular fechas para el mes actual
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  // Obtener todos los datos en paralelo
  const [
    trendResult,
    expenseDistributionResult,
    incomeDistributionResult,
    contributionsResult,
    topExpensesResult,
    topIncomeResult,
  ] = await Promise.all([
    getTrendData({ months: 12 }),
    getCategoryDistribution({ startDate, endDate, type: 'expense' }),
    getCategoryDistribution({ startDate, endDate, type: 'income' }),
    getContributionsComparison({ year, month }),
    getTopCategories({ type: 'expense', limit: 10 }),
    getTopCategories({ type: 'income', limit: 10 }),
  ]);

  const trendData = trendResult.ok ? trendResult.data || [] : [];
  const expenseDistribution = expenseDistributionResult.ok ? expenseDistributionResult.data || [] : [];
  const incomeDistribution = incomeDistributionResult.ok ? incomeDistributionResult.data || [] : [];
  const contributions = contributionsResult.ok ? contributionsResult.data || [] : [];
  const topExpenses = topExpensesResult.ok ? topExpensesResult.data || [] : [];
  const topIncome = topIncomeResult.ok ? topIncomeResult.data || [] : [];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Reportes Financieros
          </h1>
          <p className="text-muted-foreground">
            Visualiza tus estadísticas, tendencias y distribución de gastos
          </p>
        </div>
      </div>

      {/* Content */}
      <ReportsContent
        initialTrendData={trendData}
        initialExpenseDistribution={expenseDistribution}
        initialIncomeDistribution={incomeDistribution}
        initialContributions={contributions}
        initialTopExpenses={topExpenses}
        initialTopIncome={topIncome}
      />
    </div>
  );
}
