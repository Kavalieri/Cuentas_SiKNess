'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSiKness } from '@/contexts/SiKnessContext';
import { BarChart3, PieChart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { GastosPorCategoria, IngresosVsGastos } from './components';

export default function EstadisticasPage() {
  const { activePeriod, selectedPeriod, periods, householdId } = useSiKness();
  const [loading, setLoading] = useState(true);

  // Determinar período seleccionado completo
  const selectedPeriodFull = useMemo(() => {
    if (!selectedPeriod) return activePeriod;
    return periods.find((p) => p.year === selectedPeriod.year && p.month === selectedPeriod.month) || activePeriod;
  }, [selectedPeriod, periods, activePeriod]);

  // Formatear nombre del período para mostrar
  const periodName = useMemo(() => {
    if (!selectedPeriodFull) return 'Período actual';
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${months[selectedPeriodFull.month - 1]} ${selectedPeriodFull.year}`;
  }, [selectedPeriodFull]);

  useEffect(() => {
    // Simular carga de datos
    setLoading(false);
  }, [householdId, selectedPeriodFull]);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-12 text-muted-foreground">Cargando estadísticas...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Estadísticas
        </h1>
        <p className="text-sm text-muted-foreground">Análisis y visualización de gastos e ingresos</p>
      </div>

      {/* BLOQUE 1: Datos Globales (todos los períodos) */}
      <div className="space-y-4">
        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <PieChart className="h-5 w-5 text-blue-500" />
            Datos Globales
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Visualización de todos los períodos sin filtro
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Gráfico 1: Gastos por categoría (global) */}
          <GastosPorCategoria />

          {/* Gráfico 2: Ingresos vs Gastos (global) */}
          <IngresosVsGastos />
        </div>
      </div>

      {/* BLOQUE 2: Datos del Período Seleccionado */}
      <div className="space-y-4">
        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <PieChart className="h-5 w-5 text-green-500" />
            Período: {periodName}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Estadísticas del período seleccionado en la barra superior
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Gráfico 1: Gastos por categoría (período) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 Gastos por Categoría
              </CardTitle>
              <CardDescription>Distribución en {periodName}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/20">
                <div className="text-center text-muted-foreground">
                  <p className="text-sm">Gráfico circular: Gastos por categoría</p>
                  <p className="text-xs mt-1">(Datos reales próximamente)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico 2: Ingresos vs Gastos (período) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📈 Ingresos vs Gastos
              </CardTitle>
              <CardDescription>Comparativa en {periodName}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/20">
                <div className="text-center text-muted-foreground">
                  <p className="text-sm">Gráfico de barras: Ingresos vs Gastos</p>
                  <p className="text-xs mt-1">(Datos reales próximamente)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Nota informativa */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <CardHeader>
          <CardTitle className="text-sm">ℹ️ Estado actual</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Los gráficos están listos para recibir datos. Los placeholders muestran dónde irán:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>Gráfico circular:</strong> Gastos distribuidos por categoría</li>
            <li><strong>Gráfico de barras:</strong> Comparativa ingresos vs gastos</li>
          </ul>
          <p className="mt-3">Próximos pasos: Conectar con APIs para datos reales</p>
        </CardContent>
      </Card>
    </div>
  );
}
