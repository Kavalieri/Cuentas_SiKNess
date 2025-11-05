'use client';

import {
  ColorType,
  createChart,
  CrosshairMode,
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type LineData,
} from 'lightweight-charts';
import {
  Activity,
  BarChart3,
  Download,
  LineChart,
  Maximize2,
  Minimize2,
  TrendingUp,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useRef, useState } from 'react';

interface TrendChartProProps {
  householdId: string;
  type?: 'expense' | 'income';
  periodId?: string;
  title?: string;
  showTimeframeSelector?: boolean;
}

type Timeframe = 'hourly' | 'daily' | 'weekly' | 'monthly';
type ChartType = 'line' | 'area' | 'histogram';
type Indicator = 'none' | 'sma' | 'ema' | 'bb';

export default function TrendChartPro({
  householdId,
  type = 'expense',
  periodId,
  title,
  showTimeframeSelector = true,
}: TrendChartProProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const indicatorSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [mounted, setMounted] = useState(false);

  const [data, setData] = useState<Array<{ time: string; value: number }>>([]);
  const [average, setAverage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>(periodId ? 'daily' : 'monthly');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [indicator, setIndicator] = useState<Indicator>('none');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAvgLine, setShowAvgLine] = useState(true);

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
          timeframe,
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

  // Calculate indicators (memoized to avoid recreating in every render)
  const calculateSMA = useCallback((data: LineData[], period: number): LineData[] => {
    const sma: LineData[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.value, 0);
      const point = data[i];
      if (point) {
        sma.push({ time: point.time, value: sum / period });
      }
    }
    return sma;
  }, []);

  const calculateEMA = useCallback((data: LineData[], period: number): LineData[] => {
    if (data.length === 0) return [];
    const multiplier = 2 / (period + 1);
    const ema: LineData[] = [];

    // Primer valor es SMA
    let previousEMA = data.slice(0, period).reduce((acc, d) => acc + d.value, 0) / period;
    const firstPoint = data[period - 1];
    if (firstPoint) {
      ema.push({ time: firstPoint.time, value: previousEMA });
    }

    for (let i = period; i < data.length; i++) {
      const point = data[i];
      if (point) {
        const currentEMA = (point.value - previousEMA) * multiplier + previousEMA;
        ema.push({ time: point.time, value: currentEMA });
        previousEMA = currentEMA;
      }
    }
    return ema;
  }, []);

  const calculateBollingerBands = useCallback((data: LineData[], period: number, stdDev: number) => {
    const sma = calculateSMA(data, period);
    const bands = sma.map((s, i) => {
      const slice = data.slice(i, i + period);
      const mean = s.value;
      const variance = slice.reduce((acc, d) => acc + Math.pow(d.value - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      return {
        time: s.time,
        upper: mean + std * stdDev,
        middle: mean,
        lower: mean - std * stdDev,
      };
    });
    return bands;
  }, [calculateSMA]);

  // Initialize and update chart
  useEffect(() => {
    if (!chartContainerRef.current || !mounted || data.length === 0) return;

    // Limpiar chart anterior
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      indicatorSeriesRef.current = null;
    }

    const containerWidth = chartContainerRef.current.clientWidth;
    const chartHeight = isFullscreen ? window.innerHeight - 200 : 500;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDark ? '#e5e7eb' : '#1f2937',
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
        timeVisible: timeframe === 'hourly',
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 10,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: isDark ? '#6b7280' : '#9ca3af',
          style: LineStyle.Dashed,
          labelBackgroundColor: type === 'expense' ? '#ef4444' : '#10b981',
        },
        horzLine: {
          width: 1,
          color: isDark ? '#6b7280' : '#9ca3af',
          style: LineStyle.Dashed,
          labelBackgroundColor: type === 'expense' ? '#ef4444' : '#10b981',
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
    });

    // Convertir datos al formato de TradingView
    const chartData: LineData[] = data.map((d) => ({
      time: d.time,
      value: d.value,
    }));

    // Crear serie principal según tipo de gráfico
    let mainSeries: ISeriesApi<'Line'>;

    if (chartType === 'area') {
      mainSeries = chart.addSeries(LineSeries, {
        color: type === 'expense' ? '#ef4444' : '#10b981',
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 6,
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBackgroundColor: type === 'expense' ? '#ef4444' : '#10b981',
        lastValueVisible: true,
        priceLineVisible: true,
        lineType: 2, // Curved
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      });
    } else {
      mainSeries = chart.addSeries(LineSeries, {
        color: type === 'expense' ? '#ef4444' : '#10b981',
        lineWidth: 3,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 6,
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBackgroundColor: type === 'expense' ? '#ef4444' : '#10b981',
        lastValueVisible: true,
        priceLineVisible: true,
        lineType: 0, // Simple
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      });
    }

    mainSeries.setData(chartData);
    mainSeriesRef.current = mainSeries;

    // Añadir línea de promedio
    if (showAvgLine && average > 0) {
      mainSeries.createPriceLine({
        price: average,
        color: type === 'expense' ? '#f59e0b' : '#3b82f6',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `Avg: €${average.toFixed(2)}`,
      });
    }

    // Añadir indicadores
    if (indicator === 'sma' && chartData.length >= 20) {
      const smaData = calculateSMA(chartData, 20);
      const smaSeries = chart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        lastValueVisible: false,
        priceLineVisible: false,
        title: 'SMA(20)',
      });
      smaSeries.setData(smaData);
      indicatorSeriesRef.current = smaSeries;
    } else if (indicator === 'ema' && chartData.length >= 20) {
      const emaData = calculateEMA(chartData, 20);
      const emaSeries = chart.addSeries(LineSeries, {
        color: '#8b5cf6',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        lastValueVisible: false,
        priceLineVisible: false,
        title: 'EMA(20)',
      });
      emaSeries.setData(emaData);
      indicatorSeriesRef.current = emaSeries;
    } else if (indicator === 'bb' && chartData.length >= 20) {
      const bbData = calculateBollingerBands(chartData, 20, 2);

      // Banda superior
      const upperSeries = chart.addSeries(LineSeries, {
        color: '#ec4899',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        lastValueVisible: false,
        priceLineVisible: false,
        title: 'BB Upper',
      });
      upperSeries.setData(bbData.map(b => ({ time: b.time, value: b.upper })));

      // Banda media
      const middleSeries = chart.addSeries(LineSeries, {
        color: '#8b5cf6',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        lastValueVisible: false,
        priceLineVisible: false,
        title: 'BB Middle',
      });
      middleSeries.setData(bbData.map(b => ({ time: b.time, value: b.middle })));

      // Banda inferior
      const lowerSeries = chart.addSeries(LineSeries, {
        color: '#ec4899',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        lastValueVisible: false,
        priceLineVisible: false,
        title: 'BB Lower',
      });
      lowerSeries.setData(bbData.map(b => ({ time: b.time, value: b.lower })));
    }

    // Añadir marcadores para valores máximos y mínimos (commented out - setMarkers no disponible en v5)
    // const maxValue = Math.max(...chartData.map(d => d.value));
    // const minValue = Math.min(...chartData.map(d => d.value));
    // const maxPoint = chartData.find(d => d.value === maxValue);
    // const minPoint = chartData.find(d => d.value === minValue);

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        const newWidth = chartContainerRef.current.clientWidth;
        const newHeight = isFullscreen ? window.innerHeight - 200 : 500;
        chart.applyOptions({
          width: newWidth,
          height: newHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Guardar referencia
    chartRef.current = chart;

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        mainSeriesRef.current = null;
        indicatorSeriesRef.current = null;
      }
    };
  }, [data, average, type, isDark, mounted, chartType, indicator, isFullscreen, showAvgLine, timeframe, calculateSMA, calculateEMA, calculateBollingerBands]);

  // Export chart as image
  const handleExport = () => {
    if (!chartRef.current) return;

    const canvas = chartContainerRef.current?.querySelector('canvas');
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'chart'}-${new Date().toISOString()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if (!range) return;
    const delta = (range.to - range.from) * 0.2;
    timeScale.setVisibleLogicalRange({
      from: range.from + delta,
      to: range.to - delta,
    });
  };

  const handleZoomOut = () => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if (!range) return;
    const delta = (range.to - range.from) * 0.2;
    timeScale.setVisibleLogicalRange({
      from: range.from - delta,
      to: range.to + delta,
    });
  };

  const handleResetZoom = () => {
    if (!chartRef.current) return;
    chartRef.current.timeScale().fitContent();
  };

  if (!mounted) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-center h-[500px]">
          <div className="text-gray-500 dark:text-gray-400">Cargando datos...</div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-center h-[500px]">
          <div className="text-gray-500 dark:text-gray-400">No hay datos disponibles</div>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const totalValue = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 ${
      isFullscreen ? 'fixed inset-0 z-50 m-4' : ''
    }`}>
      {/* Header con título y controles */}
      <div className="mb-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {title || `Tendencia de ${type === 'expense' ? 'Gastos' : 'Ingresos'}`}
          </h3>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              title="Exportar como imagen"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Toolbar de controles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de escala temporal */}
          {showTimeframeSelector && !periodId && (
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-md">
              <button
                onClick={() => setTimeframe('hourly')}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  timeframe === 'hourly'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Horario
              </button>
              <button
                onClick={() => setTimeframe('daily')}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  timeframe === 'daily'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Diario
              </button>
              <button
                onClick={() => setTimeframe('weekly')}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  timeframe === 'weekly'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Semanal
              </button>
              <button
                onClick={() => setTimeframe('monthly')}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  timeframe === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Mensual
              </button>
            </div>
          )}

          {/* Selector de tipo de gráfico */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-md">
            <button
              onClick={() => setChartType('line')}
              className={`p-1.5 rounded transition-colors ${
                chartType === 'line'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
              title="Línea"
            >
              <LineChart className="h-4 w-4" />
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`p-1.5 rounded transition-colors ${
                chartType === 'area'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
              title="Área"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>

          {/* Selector de indicadores */}
          <select
            value={indicator}
            onChange={(e) => setIndicator(e.target.value as Indicator)}
            className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 border-0 rounded-md text-gray-700 dark:text-gray-300"
          >
            <option value="none">Sin Indicador</option>
            <option value="sma">SMA (20)</option>
            <option value="ema">EMA (20)</option>
            <option value="bb">Bollinger Bands</option>
          </select>

          {/* Toggle línea de promedio */}
          <button
            onClick={() => setShowAvgLine(!showAvgLine)}
            className={`px-2 py-1.5 text-xs font-medium rounded transition-colors ${
              showAvgLine
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            Promedio
          </button>

          {/* Zoom controls */}
          <div className="flex gap-1 ml-auto">
            <button
              onClick={handleZoomIn}
              className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              +
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Reset
            </button>
            <button
              onClick={handleZoomOut}
              className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              −
            </button>
          </div>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        <div className="rounded-md bg-blue-50 p-3 dark:bg-blue-950/30">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Promedio</p>
          <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
            €{average.toFixed(2)}
          </p>
        </div>
        <div className="rounded-md bg-green-50 p-3 dark:bg-green-950/30">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Mínimo</p>
          <p className="text-lg font-bold text-green-900 dark:text-green-100">
            €{minValue.toFixed(2)}
          </p>
        </div>
        <div className="rounded-md bg-red-50 p-3 dark:bg-red-950/30">
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">Máximo</p>
          <p className="text-lg font-bold text-red-900 dark:text-red-100">
            €{maxValue.toFixed(2)}
          </p>
        </div>
        <div className="rounded-md bg-purple-50 p-3 dark:bg-purple-950/30">
          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Total</p>
          <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
            €{totalValue.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Chart Container */}
      <div ref={chartContainerRef} className="w-full" />

      {/* Info footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{data.length} puntos de datos</span>
        <span className="flex items-center gap-2">
          <TrendingUp className="h-3 w-3" />
          {timeframe === 'hourly' && 'Últimas 48 horas'}
          {timeframe === 'daily' && (periodId ? 'Todo el periodo' : 'Histórico completo')}
          {timeframe === 'weekly' && (periodId ? 'Todo el periodo' : 'Histórico completo')}
          {timeframe === 'monthly' && (periodId ? 'Todo el periodo' : 'Histórico completo')}
        </span>
      </div>
    </div>
  );
}
