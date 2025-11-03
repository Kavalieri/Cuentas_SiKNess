'use client';

import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { ColorType, createChart, LineSeries, LineStyle } from 'lightweight-charts';
import { Download, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
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
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [mounted, setMounted] = useState(false);

  const [data, setData] = useState<Array<{ date: string; amount: number }>>([]);
  const [average, setAverage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>(periodId ? 'daily' : 'monthly');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [closedPeriod, setClosedPeriod] = useState<{
    month: number;
    year: number;
    totalExpenses: number;
    totalIncome: number;
  } | null>(null);

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

        console.log('🔍 Fetching trend data:', {
          householdId,
          type,
          timeframe: periodId ? 'daily' : timeframe,
          periodId,
          url: `/api/sickness/statistics/trend?${params}`,
        });

        const response = await fetch(`/api/sickness/statistics/trend?${params}`);
        const result = await response.json();

        console.log('📊 Trend data received:', result);

        if (result.success) {
          setData(result.data || []);
          setAverage(result.average || 0);
          setClosedPeriod(null);
        } else if (result.periodType === 'closed') {
          // Periodo cerrado: Mostrar snapshot
          setData([]);
          setAverage(0);
          setClosedPeriod(result.snapshot);
        } else {
          console.error('❌ API returned error:', result.error);
          setClosedPeriod(null);
        }
      } catch (error) {
        console.error('❌ Error al cargar datos de tendencia:', error);
        setClosedPeriod(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [householdId, type, timeframe, periodId]);

  // Handlers para toolbar
  const handleZoomIn = () => {
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      const { from, to } = timeScale.getVisibleRange() || { from: 0, to: 0 };
      const range = (to as number) - (from as number);
      const newRange = range * 0.75; // Zoom 25%
      const center = ((from as number) + (to as number)) / 2;
      timeScale.setVisibleRange({
        from: (center - newRange / 2) as Time,
        to: (center + newRange / 2) as Time,
      });
    }
  };

  const handleZoomOut = () => {
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      const { from, to } = timeScale.getVisibleRange() || { from: 0, to: 0 };
      const range = (to as number) - (from as number);
      const newRange = range * 1.25; // Zoom out 25%
      const center = ((from as number) + (to as number)) / 2;
      timeScale.setVisibleRange({
        from: (center - newRange / 2) as Time,
        to: (center + newRange / 2) as Time,
      });
    }
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleExportCSV = () => {
    const csvLines = ['Fecha,Monto\n'];
    data.forEach((d) => csvLines.push(`${d.date},${d.amount}\n`));
    const blob = new Blob(csvLines, { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tendencia-${type}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  // Initialize and update chart
  useEffect(() => {
    if (!chartContainerRef.current || !mounted || data.length === 0) return;

    // Limpiar chart anterior si existe
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const containerWidth = chartContainerRef.current.clientWidth;
    const chartHeight = isFullscreen ? window.innerHeight - 200 : 400;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDark ? '#e5e7eb' : '#1f2937',
        fontSize: 12,
      },
      grid: {
        vertLines: {
          color: isDark ? '#374151' : '#e5e7eb',
          style: LineStyle.Solid,
          visible: true,
        },
        horzLines: {
          color: isDark ? '#374151' : '#e5e7eb',
          style: LineStyle.Solid,
          visible: true,
        },
      },
      width: containerWidth,
      height: chartHeight,
      rightPriceScale: {
        borderColor: isDark ? '#4b5563' : '#d1d5db',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
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
        const newHeight = isFullscreen ? window.innerHeight - 200 : 400;
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: newHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Guardar referencia y cleanup
    chartRef.current = chart;
    seriesRef.current = lineSeries;

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      seriesRef.current = null;
    };
  }, [data, average, type, isDark, mounted, isFullscreen]);

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

  // Mostrar mensaje para periodos cerrados
  if (closedPeriod) {
    const monthNames = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    const monthName = monthNames[closedPeriod.month - 1];
    const total =
      type === 'expense' ? closedPeriod.totalExpenses : closedPeriod.totalIncome;

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {title || `Tendencia de ${type === 'expense' ? 'Gastos' : 'Ingresos'}`}
        </h3>
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="rounded-full bg-amber-100 p-4 dark:bg-amber-900/20">
            <svg
              className="h-12 w-12 text-amber-600 dark:text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Periodo Cerrado
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md">
            El periodo de <span className="font-semibold">{monthName} {closedPeriod.year}</span> está
            cerrado. El detalle diario no está disponible.
          </p>
          <div className="mt-6 rounded-lg bg-gray-50 p-6 dark:bg-gray-900 w-full max-w-sm">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total del mes:</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              €{total.toFixed(2)}
            </p>
          </div>
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
    <div
      className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* Header con título y selector de escala */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title || `Tendencia de ${type === 'expense' ? 'Gastos' : 'Ingresos'}`}
        </h3>

        <div className="flex items-center gap-3">
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

          {/* Toolbar de controles */}
          <div className="flex gap-1 border rounded-md p-1 bg-gray-50 dark:bg-gray-900">
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
              title="Zoom In"
              aria-label="Acercar"
            >
              <ZoomIn className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
              title="Zoom Out"
              aria-label="Alejar"
            >
              <ZoomOut className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
              title="Ajustar Vista"
              aria-label="Ajustar vista"
            >
              <Maximize2 className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={handleFullscreen}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
              title={isFullscreen ? 'Salir de Pantalla Completa' : 'Pantalla Completa'}
              aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? (
                <svg
                  className="h-4 w-4 text-gray-700 dark:text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4 text-gray-700 dark:text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-5v4m0-4h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              )}
            </button>
            <button
              onClick={handleExportCSV}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
              title="Descargar CSV"
              aria-label="Descargar datos en CSV"
            >
              <Download className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </div>
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
            {data.length}{' '}
            {timeframe === 'daily' ? 'días' : timeframe === 'weekly' ? 'semanas' : 'meses'}
          </p>
        </div>
      </div>

      {/* Chart Container */}
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
