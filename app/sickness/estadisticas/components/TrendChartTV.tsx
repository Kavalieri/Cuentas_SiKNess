'use client';

import type { IChartApi } from 'lightweight-charts';
import { ColorType, createChart, LineSeries, LineStyle } from 'lightweight-charts';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';

interface TrendChartTVProps {
  householdId: string;
  type?: 'expense' | 'income';
  periodId?: string; // Si se especifica, muestra solo ese periodo (diario)
  title?: string;
  showTimeframeSelector?: boolean; // Mostrar selector de escala temporal
}

type Timeframe = 'daily' | 'weekly' | 'monthly';

export default function TrendChartTV({
  householdId,
  type = 'expense',
  periodId,
  title,
  showTimeframeSelector = true,
}: TrendChartTVProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [mounted, setMounted] = useState(false);

  const [data, setData] = useState<Array<{ date: string; amount: number }>>([]);
  const [average, setAverage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>(periodId ? 'daily' : 'monthly');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      if (!householdId) return;

      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          householdId,
          type,
          timeframe: periodId ? 'daily' : timeframe,
        });

        if (periodId) {
          params.append('periodId', periodId);
        }

        const response = await fetch(`/api/sickness/statistics/trend?${params}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data || []);
          setAverage(result.average || 0);
        }
      } catch (error) {
        console.error('Error al cargar datos de tendencia:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [householdId, type, timeframe, periodId]);

  // Initialize and update chart
  useEffect(() => {
    if (!chartContainerRef.current || !mounted || data.length === 0) return;

    // Limpiar chart anterior si existe
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDark ? '#e5e7eb' : '#1f2937',
      },
      grid: {
        vertLines: { color: isDark ? '#374151' : '#e5e7eb' },
        horzLines: { color: isDark ? '#374151' : '#e5e7eb' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      rightPriceScale: {
        borderColor: isDark ? '#4b5563' : '#d1d5db',
      },
      timeScale: {
        borderColor: isDark ? '#4b5563' : '#d1d5db',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: isDark ? '#6b7280' : '#9ca3af',
          style: LineStyle.Dashed,
        },
        horzLine: {
          width: 1,
          color: isDark ? '#6b7280' : '#9ca3af',
          style: LineStyle.Dashed,
        },
      },
    });

    // Añadir serie de línea
    const lineSeries = chart.addSeries(LineSeries, {
      color: type === 'expense' ? '#ef4444' : '#10b981',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 6,
      lastValueVisible: true,
      priceLineVisible: true,
    });

    // Convertir datos al formato de TradingView
    const chartData = data.map((d) => ({
      time: d.date,
      value: d.amount,
    }));

    lineSeries.setData(chartData);

    // Añadir línea de promedio
    if (average > 0) {
      lineSeries.createPriceLine({
        price: average,
        color: type === 'expense' ? '#f59e0b' : '#3b82f6',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `Promedio: €${average.toFixed(2)}`,
      });
    }

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Guardar referencia y cleanup
    chartRef.current = chart;

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, average, type, isDark, mounted]);

  if (!mounted) {
    return null; // Evitar hydration mismatch
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-gray-500 dark:text-gray-400">Cargando datos...</div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-gray-500 dark:text-gray-400">No hay datos disponibles</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      {/* Header con título y selector de escala */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title || `Tendencia de ${type === 'expense' ? 'Gastos' : 'Ingresos'}`}
        </h3>

        {/* Selector de escala temporal (solo si no es periodo específico) */}
        {showTimeframeSelector && !periodId && (
          <div className="flex gap-2">
            <button
              onClick={() => setTimeframe('daily')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                timeframe === 'daily'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              Diario
            </button>
            <button
              onClick={() => setTimeframe('weekly')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                timeframe === 'weekly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              Semanal
            </button>
            <button
              onClick={() => setTimeframe('monthly')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                timeframe === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              Mensual
            </button>
          </div>
        )}
      </div>

      {/* Stats rápidas */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Promedio</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            €{average.toFixed(2)}
          </p>
        </div>
        <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Datos</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {data.length} {timeframe === 'daily' ? 'días' : timeframe === 'weekly' ? 'semanas' : 'meses'}
          </p>
        </div>
      </div>

      {/* Chart Container */}
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
