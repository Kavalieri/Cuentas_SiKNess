'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  effective_balance: number; // Balance real calculado dinámicamente
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
  const [_globalBalance, setGlobalBalance] = useState<GlobalBalance | null>(null);
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

  // Calcular métricas del período (presupuesto y gasto medio CORREGIDO)
  const dailyMetrics = useMemo(() => {
    if (!selectedPeriodFull || !periodSummary) return null;

    const { year, month, phase } = selectedPeriodFull;
    const { effective_balance, total_expenses } = periodSummary;

    const now = new Date();
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0); // Último día del mes
    const totalDaysInPeriod = periodEnd.getDate(); // 28, 29, 30 o 31

    const isCurrentPeriod = now.getMonth() + 1 === month && now.getFullYear() === year;
    const isPastPeriod = periodEnd < now;
    const isFuturePeriod = periodStart > now;

    // Calcular días a considerar para gasto medio CORRECTAMENTE
    let daysToConsider: number;
    if (isPastPeriod) {
      // Periodo terminado: usar TODOS los días del periodo (no días hasta hoy)
      daysToConsider = totalDaysInPeriod;
    } else if (isCurrentPeriod) {
      // Periodo actual: desde día 1 hasta hoy (día del mes actual)
      daysToConsider = Math.max(1, now.getDate());
    } else {
      // Periodo futuro: evitar división por cero
      daysToConsider = 1;
    }

    const averageSpentPerDay = total_expenses / daysToConsider;

    // Presupuesto diario solo tiene sentido en periodo actual con días restantes
    const daysRemaining = isCurrentPeriod
      ? Math.max(0, totalDaysInPeriod - now.getDate())
      : 0;
    const dailyBudget = daysRemaining > 0 ? effective_balance / daysRemaining : 0;

    // Determinar si mostrar presupuesto diario
    // Se muestra en períodos actuales con días restantes durante fases activas:
    // - preparing: Configurando el período (status='SETUP')
    // - validation: Listo para abrir, esperando validación (status='LOCKED')
    // - active: Período activo aceptando transacciones (status='open') ← LA MÁS IMPORTANTE
    const shouldShowDailyBudget =
      (phase === 'preparing' || phase === 'validation' || phase === 'active') &&
      isCurrentPeriod &&
      daysRemaining > 0;

    return {
      averageSpentPerDay,
      dailyBudget,
      daysToConsider, // Días realmente usados en el cálculo
      totalDaysInPeriod,
      daysRemaining,
      isCurrentPeriod,
      isPastPeriod,
      isFuturePeriod,
      shouldShowDailyBudget,
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
          {/* Columna 1: Gastos por Categoría + Presupuesto diario */}
          <div className="space-y-4">
            <GastosPorCategoria
              data={periodExpenses}
              isLoading={loading}
              title="Gastos por Categoría"
            />

            {/* Presupuesto diario (solo en períodos activos) */}
            {dailyMetrics?.shouldShowDailyBudget && periodSummary && (
              <Card className="border-2 border-green-600/30 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Presupuesto diario disponible:</span>
                      </div>
                      <span className="text-xl font-bold text-green-600">
                        {formatCurrency(dailyMetrics.dailyBudget)}/día
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Días restantes:</span>
                      <span className="font-medium">
                        {dailyMetrics.daysRemaining} día{dailyMetrics.daysRemaining !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-green-200 dark:border-green-800">
                      <span className="text-muted-foreground">Balance efectivo:</span>
                      <span className="font-bold text-green-700 dark:text-green-400">
                        {formatCurrency(periodSummary.effective_balance)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Columna 2: Ingresos vs Gastos + Gasto medio diario */}
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">Gasto medio diario (período):</span>
                      </div>
                      <span className="text-lg font-bold text-orange-600">
                        {formatCurrency(dailyMetrics.averageSpentPerDay)}/día
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {dailyMetrics.daysToConsider} día{dailyMetrics.daysToConsider !== 1 ? 's' : ''} considerado{dailyMetrics.daysToConsider !== 1 ? 's' : ''}
                    </p>
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
            Información sobre Estadísticas
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <p>✅ <strong>Datos en tiempo real:</strong> Los gráficos se actualizan automáticamente con tus transacciones.</p>
          <p>📊 <strong>Gastos por Categoría:</strong> Distribución de gastos clasificados por categoría.</p>
          <p>📈 <strong>Ingresos vs Gastos:</strong> Comparativa mensual de ingresos y gastos.</p>
          <p>📉 <strong>Gasto medio diario (global):</strong> Promedio histórico considerando todos tus datos.</p>
          <p>📉 <strong>Gasto medio diario (período):</strong> Promedio de gasto basado en los días del período seleccionado (completos si es pasado, transcurridos si es actual).</p>
          <p>💰 <strong>Presupuesto diario:</strong> Visible en períodos actuales durante preparación (SETUP), validación (LOCKED) o cuando está activo (OPEN - fase 3). Calcula cuánto puedes gastar por día hasta fin de mes basándose en el balance efectivo disponible.</p>
          <p>🔄 <strong>Selección de período:</strong> Usa el selector superior para filtrar datos de un mes específico.</p>
          <p>🔍 <strong>Consultas avanzadas:</strong> Exporta datos filtrados en CSV, JSON o Excel para análisis externos.</p>
        </CardContent>
      </Card>
    </div>
  );
}
