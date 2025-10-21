'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSiKness } from '@/contexts/SiKnessContext';
import { AlertCircle, BarChart3 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ExpenseByCategory, IncomeVsExpense, PeriodOption } from './actions';
import { getExpensesByCategory, getIncomeVsExpenses } from './actions';
import { GastosPorCategoria, IngresosVsGastos } from './components';

export default function EstadisticasPage() {
  const { activePeriod, selectedPeriod, periods, householdId } = useSiKness();

  // Datos globales
  const [globalExpenses, setGlobalExpenses] = useState<ExpenseByCategory[]>([]);
  const [globalIncomeVsExpenses, setGlobalIncomeVsExpenses] = useState<IncomeVsExpense[]>([]);

  // Datos del período seleccionado
  const [periodExpenses, setPeriodExpenses] = useState<ExpenseByCategory[]>([]);
  const [periodIncomeVsExpenses, setPeriodIncomeVsExpenses] = useState<IncomeVsExpense[]>([]);

  const [loading, setLoading] = useState(true);

  // Obtener período completo a partir del selectedPeriod
  const selectedPeriodFull = useMemo(() => {
    if (!selectedPeriod) return activePeriod;
    return periods.find((p: PeriodOption) => `${p.year}-${String(p.month).padStart(2, '0')}` === `${selectedPeriod.year}-${String(selectedPeriod.month).padStart(2, '0')}`) || activePeriod;
  }, [selectedPeriod, periods, activePeriod]);

  // Nombre del período en formato legible
  const periodName = useMemo(() => {
    if (!selectedPeriodFull) return 'Período actual';
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${months[selectedPeriodFull.month - 1]} ${selectedPeriodFull.year}`;
  }, [selectedPeriodFull]);

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

        // Cargar datos del período seleccionado
        if (selectedPeriodFull) {
          const periodExp = await getExpensesByCategory(householdId, selectedPeriodFull.year, selectedPeriodFull.month);
          const periodIncome = await getIncomeVsExpenses(householdId, selectedPeriodFull.year, selectedPeriodFull.month);

          setPeriodExpenses(periodExp);
          setPeriodIncomeVsExpenses(periodIncome);
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
          <IngresosVsGastos data={globalIncomeVsExpenses} isLoading={loading} title="Ingresos vs Gastos" />
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
          <IngresosVsGastos
            data={periodIncomeVsExpenses}
            isLoading={loading}
            title="Ingresos vs Gastos"
          />
        </div>
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
          <p>🔄 <strong>Selecciona un período:</strong> Usa la barra superior para filtrar datos de un mes específico.</p>
        </CardContent>
      </Card>
    </div>
  );
}
