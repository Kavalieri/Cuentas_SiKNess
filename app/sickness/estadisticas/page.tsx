'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSiKness } from '@/contexts/SiKnessContext';
import { AlertCircle, BarChart3, TrendingDown, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ExpenseByCategory, IncomeVsExpense, PeriodOption } from './actions';
import { getExpensesByCategory, getIncomeVsExpenses } from './actions';
import { AdvancedQueries } from './AdvancedQueries';
import { GastosPorCategoria, IngresosVsGastos } from './components';

interface GlobalBalance {
  balance: {
    opening: number;
    closing: number;
    income: number;
    expenses: number;
    directExpenses: number;
    pendingContributions: number;
  };
}

interface PeriodSummary {
  opening_balance: number;
  closing_balance: number;
  total_income: number;
  total_expenses: number;
}

export default function EstadisticasPage() {
  const { activePeriod, selectedPeriod, periods, householdId } = useSiKness();

  // Datos globales
  const [globalExpenses, setGlobalExpenses] = useState<ExpenseByCategory[]>([]);
  const [globalIncomeVsExpenses, setGlobalIncomeVsExpenses] = useState<IncomeVsExpense[]>([]);

  // Datos del período seleccionado
  const [periodExpenses, setPeriodExpenses] = useState<ExpenseByCategory[]>([]);
  const [periodIncomeVsExpenses, setPeriodIncomeVsExpenses] = useState<IncomeVsExpense[]>([]);

  // Balance actual
  const [globalBalance, setGlobalBalance] = useState<GlobalBalance | null>(null);
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary | null>(null);

  const [loading, setLoading] = useState(true);

  // Obtener período completo a partir del selectedPeriod
  const selectedPeriodFull = useMemo(() => {
    if (!selectedPeriod) return activePeriod;
    return (periods || []).find((p: PeriodOption) => `${p.year}-${String(p.month).padStart(2, '0')}` === `${selectedPeriod.year}-${String(selectedPeriod.month).padStart(2, '0')}`) || activePeriod;
  }, [selectedPeriod, periods, activePeriod]);

  // Nombre del período en formato legible
  const periodName = useMemo(() => {
    if (!selectedPeriodFull) return 'Período actual';
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${months[selectedPeriodFull.month - 1]} ${selectedPeriodFull.year}`;
  }, [selectedPeriodFull]);

    // Calcular métricas de presupuesto diario (solo si tenemos un periodo válido)
  const dailyMetrics = useMemo(() => {
    if (!selectedPeriodFull || !periodSummary) return null;

    const { year, month, phase } = selectedPeriodFull;
    const { closing_balance: closing, total_expenses } = periodSummary;

    const now = new Date();
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);
    const daysElapsed = Math.max(1, Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const averageSpentPerDay = total_expenses / daysElapsed;
    const dailyBudget = daysRemaining > 0 ? closing / daysRemaining : 0;
    const isCurrentPeriod = now.getMonth() + 1 === month && now.getFullYear() === year;
    const isFuturePeriod = periodStart > now;

    return {
      averageSpentPerDay,
      dailyBudget,
      daysElapsed,
      daysRemaining,
      isCurrentPeriod,
      isFuturePeriod,
      periodPhase: phase,
    };
  }, [selectedPeriodFull, periodSummary]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  useEffect(() => {
    if (!householdId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Cargar datos globales
        const globalExp = await getExpensesByCategory(householdId);
        const globalIncome = await getIncomeVsExpenses(householdId);

        setGlobalExpenses(globalExp);
        setGlobalIncomeVsExpenses(globalIncome);

        // Cargar balance global
        const balanceRes = await fetch(`/api/sickness/balance/global?householdId=${householdId}`);
        if (balanceRes.ok) {
          const balanceData = await balanceRes.json();
          setGlobalBalance(balanceData);
        }

        // Cargar datos del período seleccionado
        if (selectedPeriodFull) {
          const periodExp = await getExpensesByCategory(householdId, selectedPeriodFull.year, selectedPeriodFull.month);
          const periodIncome = await getIncomeVsExpenses(householdId, selectedPeriodFull.year, selectedPeriodFull.month);

          setPeriodExpenses(periodExp);
          setPeriodIncomeVsExpenses(periodIncome);

          // Cargar resumen del período
          const summaryRes = await fetch(`/api/sickness/balance/period-summary?householdId=${householdId}&periodId=${selectedPeriodFull.id}`);
          if (summaryRes.ok) {
            const summaryData = await summaryRes.json();
            setPeriodSummary(summaryData);
          }
        }
      } catch (error) {
        console.error('Error loading statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [householdId, selectedPeriodFull]);

  return (
    <div className="container mx-auto p-4 space-y-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Estadísticas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualiza tus gastos e ingresos de forma detallada
        </p>
      </div>

      {/* BLOQUE DESTACADO: Balance Actual y Presupuesto Diario */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Wallet className="h-6 w-6 text-primary" />
            Balance Actual - {periodName}
          </CardTitle>
          <CardDescription>Estado financiero y presupuesto disponible</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Balance Actual */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Balance disponible</p>
              <div className="text-4xl font-bold">
                {formatCurrency(globalBalance?.balance.closing || 0)}
              </div>
            </div>

            {/* Presupuesto diario o estado del periodo */}
            {dailyMetrics && dailyMetrics.isFuturePeriod ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Estado del período</p>
                <div className="text-2xl font-medium text-blue-600">
                  {dailyMetrics.periodPhase === 'preparation' && 'En preparación'}
                  {dailyMetrics.periodPhase === 'pending_validation' && 'Pendiente de validar'}
                  {dailyMetrics.periodPhase === 'open' && 'Abierto (futuro)'}
                  {dailyMetrics.periodPhase === 'closed' && 'Cerrado (futuro)'}
                </div>
              </div>
            ) : dailyMetrics && dailyMetrics.isCurrentPeriod && dailyMetrics.daysRemaining > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Puedes gastar por día</p>
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(dailyMetrics.dailyBudget)}/día
                </div>
                <p className="text-xs text-muted-foreground">
                  {dailyMetrics.daysRemaining} día{dailyMetrics.daysRemaining !== 1 ? 's' : ''} restante{dailyMetrics.daysRemaining !== 1 ? 's' : ''}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Presupuesto diario</p>
                <div className="text-2xl font-medium text-muted-foreground">
                  Período finalizado
                </div>
              </div>
            )}

            {/* Gasto medio por día */}
            {dailyMetrics && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Gasto medio por día</p>
                <div className="text-3xl font-bold text-orange-600">
                  {formatCurrency(dailyMetrics.averageSpentPerDay)}/día
                </div>
                <p className="text-xs text-muted-foreground">
                  {dailyMetrics.daysElapsed} día{dailyMetrics.daysElapsed !== 1 ? 's' : ''} transcurrido{dailyMetrics.daysElapsed !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* BLOQUE 1: Datos Globales */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            📊 Datos Globales
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Resumen de todos los períodos sin filtro
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <GastosPorCategoria data={globalExpenses} isLoading={loading} title="Gastos por Categoría" />
          <div className="space-y-4">
            <IngresosVsGastos data={globalIncomeVsExpenses} isLoading={loading} title="Ingresos vs Gastos" />
            {/* Gasto medio diario global */}
            {globalIncomeVsExpenses.length > 0 && (
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">Gasto medio diario (global):</span>
                    </div>
                    <span className="text-lg font-bold text-orange-600">
                      {formatCurrency(
                        globalIncomeVsExpenses.reduce((sum, item) => sum + item.expense, 0) /
                        Math.max(1, globalIncomeVsExpenses.length * 30)
                      )}/día
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* BLOQUE 2: Período Seleccionado */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            📅 Período: {periodName}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Datos filtrados por el período seleccionado en la barra superior
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <GastosPorCategoria
            data={periodExpenses}
            isLoading={loading}
            title="Gastos por Categoría"
          />
          <div className="space-y-4">
            <IngresosVsGastos
              data={periodIncomeVsExpenses}
              isLoading={loading}
              title="Ingresos vs Gastos"
            />
            {/* Gasto medio diario del período */}
            {dailyMetrics && periodSummary && (
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">Gasto medio diario (período):</span>
                    </div>
                    <span className="text-lg font-bold text-orange-600">
                      {formatCurrency(dailyMetrics.averageSpentPerDay)}/día
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* BLOQUE 3: Análisis y Consultas Avanzadas */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Análisis y Consultas Avanzadas
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ejecuta consultas personalizadas y exporta resultados en múltiples formatos
          </p>
        </div>

        <AdvancedQueries
          householdId={householdId}
          periods={periods}
          selectedPeriod={selectedPeriod}
        />
      </section>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <AlertCircle className="h-5 w-5" />
            Información
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <p>✅ <strong>Datos en tiempo real:</strong> Los gráficos se actualizan automáticamente con tus transacciones.</p>
          <p>📊 <strong>Gastos por Categoría:</strong> Muestra la distribución de gastos en cada categoría.</p>
          <p>📈 <strong>Ingresos vs Gastos:</strong> Compara ingresos y gastos por mes.</p>
          <p>💰 <strong>Presupuesto diario:</strong> Calcula cuánto puedes gastar cada día hasta fin de mes.</p>
          <p>📉 <strong>Gasto medio:</strong> Promedio de gasto diario basado en el período actual.</p>
          <p>🔄 <strong>Selecciona un período:</strong> Usa la barra superior para filtrar datos de un mes específico.</p>
        </CardContent>
      </Card>
    </div>
  );
}
