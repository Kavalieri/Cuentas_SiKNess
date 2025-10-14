'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  DollarSign,
  PieChart,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface DashboardEjecutivoProps {
  householdId: string;
}

interface DashboardStats {
  members: {
    active: number;
    total: number;
  };
  period: {
    id: string | null;
    label: string;
    year: number;
    month: number;
    startDate: string;
    endDate: string;
    status: string;
    rawStatus: string;
    progress: number;
    closingBalance: number;
  } | null;
  totals: {
    income: number;
    expenses: number;
    balance: number;
    transactionCount: number;
    currency: string;
  };
  averages: {
    perMember: number;
    perDay: number;
  };
  contributions: {
    completed: number;
    pending: number;
  };
  credits: {
    available: number;
    used: number;
  };
  savings: {
    currentBalance: number;
    goalAmount: number;
  };
  meta: {
    computedAt: string;
  };
}

export function DashboardEjecutivo({ householdId }: DashboardEjecutivoProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardStats = async () => {
      try {
        const response = await fetch('/api/dual-flow/dashboard/stats');
        if (response.ok) {
          const result = await response.json();
          if (isMounted) {
            setStats(result.stats);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardStats();

    return () => {
      isMounted = false;
    };
  }, [householdId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">Cargando dashboard ejecutivo...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          No se pudieron cargar las estadísticas del dashboard
        </div>
      </div>
    );
  }

  const currency = stats.totals.currency || 'EUR';
  const periodData = {
    label: stats.period?.label || 'Sin período activo',
    progress: stats.period?.progress || 0,
    balance: stats.totals.balance,
    savingsBalance: stats.savings.currentBalance,
    transactionCount: stats.totals.transactionCount,
    isPositive: stats.totals.balance >= 0,
  };

  const contributionCompletionRate =
    stats.contributions.completed + stats.contributions.pending > 0
      ? (stats.contributions.completed /
          (stats.contributions.completed + stats.contributions.pending)) *
        100
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Dashboard Ejecutivo</h1>
          <p className="text-muted-foreground">Visión general del estado financiero de tu hogar</p>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Miembros Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.members.active}</div>
            <p className="text-xs text-muted-foreground">de {stats.members.total} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance del Período</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                periodData.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(periodData.balance, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {periodData.isPositive ? 'Superávit' : 'Déficit'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso del Período</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periodData.progress}%</div>
            <p className="text-xs text-muted-foreground">{periodData.label}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contribuciones</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(contributionCompletionRate)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.contributions.completed} de{' '}
              {stats.contributions.completed + stats.contributions.pending} completadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estado del período actual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Estado del Período Actual
          </CardTitle>
          <CardDescription>
            {stats.period
              ? `${stats.period.label} (${stats.period.startDate} - ${stats.period.endDate})`
              : 'No hay período activo'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progreso del período</span>
              <span>{periodData.progress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${periodData.progress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Ingresos Totales</h4>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totals.income, currency)}
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Gastos Totales</h4>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totals.expenses, currency)}
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Balance Final</span>
              <span
                className={`text-xl font-bold ${
                  periodData.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(periodData.balance, currency)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {periodData.isPositive ? 'Superávit' : 'Déficit'} del período
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recomendaciones inteligentes */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recomendaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.contributions.pending > 0 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Contribuciones pendientes
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Tienes {stats.contributions.pending} contribuciones sin completar
                  </p>
                </div>
              </div>
            )}

            {stats.totals.balance < 0 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">Balance negativo</p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Considera reducir gastos o aumentar ingresos
                  </p>
                </div>
              </div>
            )}

            {stats.credits.available > 0 && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    Créditos disponibles
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Tienes {formatCurrency(stats.credits.available, currency)} en créditos sin usar
                  </p>
                </div>
              </div>
            )}

            {stats.savings.currentBalance > 0 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Ahorros acumulados
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Excelente trabajo manteniendo{' '}
                    {formatCurrency(stats.savings.currentBalance, currency)} ahorrados
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Estadísticas del Período
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Fondo Común</h4>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(periodData.savingsBalance, currency)}
                </p>
                <p className="text-sm text-muted-foreground">Balance del fondo compartido</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Transacciones</h4>
                <p className="text-2xl font-bold">{periodData.transactionCount}</p>
                <p className="text-sm text-muted-foreground">Operaciones realizadas</p>
              </div>
            </div>

            {/* Próximas funcionalidades */}
            <div className="border-t pt-4 space-y-2">
              <h4 className="font-medium text-muted-foreground">Próximamente:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                <span>📊 Gráficos de evolución</span>
                <span>🏷️ Gastos por categoría</span>
                <span>📈 Comparativa con períodos anteriores</span>
                <span>💾 Exportar datos del período</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
