'use client';

import {
    AreaSeries,
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
import { useEffect, useRef, useState } from 'react';

interface BalanceEvolutionChartProps {
  householdId: string;
  periodId?: string;
  title?: string;
}

type Timeframe = 'hourly' | 'daily' | 'weekly' | 'monthly';
type ChartType = 'line' | 'area';

// Indicadores técnicos disponibles
type TechnicalIndicator = 'sma7' | 'sma30' | 'ema7' | 'bollinger' | 'trend' | 'none';

// Helper: Calcular SMA (Simple Moving Average)
function calculateSMA(data: LineData[], period: number): LineData[] {
  const sma: LineData[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 || !data[i]) continue;
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + (d.value as number), 0);
    const time = data[i]?.time;
    if (time) {
      sma.push({ time, value: sum / period });
    }
  }
  return sma;
}

// Helper: Calcular EMA (Exponential Moving Average)
function calculateEMA(data: LineData[], period: number): LineData[] {
  const ema: LineData[] = [];
  const multiplier = 2 / (period + 1);
  
  // Primer valor es SMA
  const firstSMA = data.slice(0, period).reduce((acc, d) => acc + (d.value as number), 0) / period;
  const firstTime = data[period - 1]?.time;
  if (!firstTime) return [];
  ema.push({ time: firstTime, value: firstSMA });
  
  // Resto son EMA
  for (let i = period; i < data.length; i++) {
    const prevEma = ema[ema.length - 1]?.value;
    const currentValue = data[i]?.value;
    const currentTime = data[i]?.time;
    if (prevEma !== undefined && currentValue !== undefined && currentTime) {
      const emaValue = ((currentValue as number) - (prevEma as number)) * multiplier + (prevEma as number);
      ema.push({ time: currentTime, value: emaValue });
    }
  }
  
  return ema;
}

// Helper: Calcular Bandas de Bollinger
function calculateBollingerBands(data: LineData[], period: number = 20, stdDev: number = 2) {
  const sma = calculateSMA(data, period);
  const upper: LineData[] = [];
  const lower: LineData[] = [];
  
  for (let i = 0; i < sma.length; i++) {
    const dataSlice = data.slice(i, i + period);
    const smaPoint = sma[i];
    const mean = smaPoint?.value as number;
    const time = smaPoint?.time;
    if (!time || mean === undefined) continue;
    
    const variance = dataSlice.reduce((acc, d) => acc + Math.pow((d.value as number) - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    
    upper.push({ time, value: mean + (stdDev * std) });
    lower.push({ time, value: mean - (stdDev * std) });
  }
  
  return { middle: sma, upper, lower };
}

// Helper: Calcular línea de tendencia (regresión lineal)
function calculateTrendLine(data: LineData[]): LineData[] {
  const n = data.length;
  if (n < 2) return [];
  
  // Convertir timestamps a números secuenciales
  const x = data.map((_, i) => i);
  const y = data.map(d => d.value as number);
  
  // Calcular regresión lineal: y = mx + b
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * (y[i] ?? 0), 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  
  const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const b = (sumY - m * sumX) / n;
  
  // Generar puntos de la línea
  return data.map((d, i) => {
    const time = d.time;
    if (!time) return null;
    return {
      time,
      value: m * i + b,
    };
  }).filter((p): p is LineData => p !== null);
}export default function BalanceEvolutionChart({
  householdId,
  periodId,
  title = 'Evolución del Balance',
}: BalanceEvolutionChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<'Line' | 'Area'> | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [mounted, setMounted] = useState(false);

  const [data, setData] = useState<LineData[]>([]);
  const [finalBalance, setFinalBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>(periodId ? 'daily' : 'monthly');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<Set<TechnicalIndicator>>(new Set());

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
          timeframe,
        });

        if (periodId) {
          params.append('periodId', periodId);
        }

        const response = await fetch(`/api/sickness/statistics/balance-evolution?${params}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data || []);
          setFinalBalance(result.finalBalance || 0);
        }
      } catch (error) {
        console.error('Error al cargar evolución de balance:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [householdId, timeframe, periodId]);

  // Initialize and update chart
  useEffect(() => {
    if (!chartContainerRef.current || !mounted || data.length === 0) return;

    // Limpiar chart anterior
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
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
          color: isDark ? '#6b7280' : '#9ca3af',
          labelBackgroundColor: isDark ? '#374151' : '#f3f4f6',
        },
        horzLine: {
          color: isDark ? '#6b7280' : '#9ca3af',
          labelBackgroundColor: isDark ? '#374151' : '#f3f4f6',
        },
      },
    });

    chartRef.current = chart;

    // Crear serie según tipo
    let series: ISeriesApi<'Line' | 'Area'>;

    if (chartType === 'area') {
      series = chart.addSeries(AreaSeries, {
        topColor: finalBalance >= 0
          ? (isDark ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.3)')
          : (isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.3)'),
        bottomColor: finalBalance >= 0
          ? (isDark ? 'rgba(34, 197, 94, 0.0)' : 'rgba(34, 197, 94, 0.0)')
          : (isDark ? 'rgba(239, 68, 68, 0.0)' : 'rgba(239, 68, 68, 0.0)'),
        lineColor: finalBalance >= 0
          ? (isDark ? '#22c55e' : '#16a34a')
          : (isDark ? '#ef4444' : '#dc2626'),
        lineWidth: 2,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      });
    } else {
      series = chart.addSeries(LineSeries, {
        color: finalBalance >= 0
          ? (isDark ? '#22c55e' : '#16a34a')
          : (isDark ? '#ef4444' : '#dc2626'),
        lineWidth: 2,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      });
    }

    mainSeriesRef.current = series;
    series.setData(data);

    // Línea de referencia en 0
    const zeroLine = chart.addSeries(LineSeries, {
      color: isDark ? '#6b7280' : '#9ca3af',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    zeroLine.setData(data.map(d => ({ time: d.time, value: 0 })));

    // Aplicar indicadores técnicos activos
    if (activeIndicators.has('sma7') && data.length >= 7) {
      const sma7Data = calculateSMA(data, 7);
      const sma7Series = chart.addSeries(LineSeries, {
        color: isDark ? '#3b82f6' : '#2563eb',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: true,
        title: 'SMA 7',
      });
      sma7Series.setData(sma7Data);
    }

    if (activeIndicators.has('sma30') && data.length >= 30) {
      const sma30Data = calculateSMA(data, 30);
      const sma30Series = chart.addSeries(LineSeries, {
        color: isDark ? '#8b5cf6' : '#7c3aed',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: true,
        title: 'SMA 30',
      });
      sma30Series.setData(sma30Data);
    }

    if (activeIndicators.has('ema7') && data.length >= 7) {
      const ema7Data = calculateEMA(data, 7);
      const ema7Series = chart.addSeries(LineSeries, {
        color: isDark ? '#06b6d4' : '#0891b2',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: true,
        title: 'EMA 7',
      });
      ema7Series.setData(ema7Data);
    }

    if (activeIndicators.has('bollinger') && data.length >= 20) {
      const { middle, upper, lower } = calculateBollingerBands(data, 20, 2);

      // Banda superior
      const upperBand = chart.addSeries(LineSeries, {
        color: isDark ? '#f59e0b80' : '#f59e0b80',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        priceLineVisible: false,
        lastValueVisible: false,
        title: 'BB Superior',
      });
      upperBand.setData(upper);

      // Banda media (SMA)
      const middleBand = chart.addSeries(LineSeries, {
        color: isDark ? '#f59e0b' : '#d97706',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: true,
        title: 'BB Media',
      });
      middleBand.setData(middle);

      // Banda inferior
      const lowerBand = chart.addSeries(LineSeries, {
        color: isDark ? '#f59e0b80' : '#f59e0b80',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        priceLineVisible: false,
        lastValueVisible: false,
        title: 'BB Inferior',
      });
      lowerBand.setData(lower);
    }

    if (activeIndicators.has('trend') && data.length >= 2) {
      const trendData = calculateTrendLine(data);
      const trendSeries = chart.addSeries(LineSeries, {
        color: isDark ? '#ec4899' : '#db2777',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: true,
        title: 'Tendencia',
      });
      trendSeries.setData(trendData);
    }

    chart.timeScale().fitContent();

    // Resize handler
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const newWidth = chartContainerRef.current.clientWidth;
        const newHeight = isFullscreen ? window.innerHeight - 200 : 500;
        chartRef.current.applyOptions({
          width: newWidth,
          height: newHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        mainSeriesRef.current = null;
      }
    };
  }, [data, mounted, isDark, timeframe, chartType, isFullscreen, finalBalance, activeIndicators]);

  // Toggle de indicadores
  const toggleIndicator = (indicator: TechnicalIndicator) => {
    setActiveIndicators(prev => {
      const newSet = new Set(prev);
      if (newSet.has(indicator)) {
        newSet.delete(indicator);
      } else {
        newSet.add(indicator);
      }
      return newSet;
    });
  };

  // Export to CSV
  const exportToCSV = () => {
    const csv = ['Time,Balance']
      .concat(data.map((d) => `${d.time},${d.value}`))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-evolution-${timeframe}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!mounted) {
    return <div className="h-[500px] flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background p-8' : ''}`}>
      <div className="bg-card rounded-lg border shadow-sm">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">{title}</h3>
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  Cargando...
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 hover:bg-accent rounded-md transition-colors"
                title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={exportToCSV}
                className="p-2 hover:bg-accent rounded-md transition-colors"
                title="Exportar CSV"
                disabled={data.length === 0}
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Balance Final */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Balance Final:</span>
              <span className={`text-xl font-bold ${finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {finalBalance.toFixed(2)} €
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              {data.length} puntos de datos
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            {/* Timeframe selector */}
            <div className="flex gap-1 bg-accent/50 rounded-md p-1">
              {(['hourly', 'daily', 'weekly', 'monthly'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    timeframe === tf
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  {tf === 'hourly' && '1H'}
                  {tf === 'daily' && '1D'}
                  {tf === 'weekly' && '1W'}
                  {tf === 'monthly' && '1M'}
                </button>
              ))}
            </div>

            {/* Chart type */}
            <div className="flex gap-1 bg-accent/50 rounded-md p-1">
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                  chartType === 'line'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                }`}
              >
                <LineChart className="h-3 w-3" />
                Línea
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                  chartType === 'area'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                }`}
              >
                <TrendingUp className="h-3 w-3" />
                Área
              </button>
            </div>
          </div>

          {/* Indicadores Técnicos */}
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Indicadores Técnicos:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleIndicator('sma7')}
                disabled={data.length < 7}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors border ${
                  activeIndicators.has('sma7')
                    ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-border hover:bg-accent'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Media Móvil Simple de 7 periodos"
              >
                SMA 7
              </button>
              <button
                onClick={() => toggleIndicator('sma30')}
                disabled={data.length < 30}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors border ${
                  activeIndicators.has('sma30')
                    ? 'bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-border hover:bg-accent'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Media Móvil Simple de 30 periodos"
              >
                SMA 30
              </button>
              <button
                onClick={() => toggleIndicator('ema7')}
                disabled={data.length < 7}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors border ${
                  activeIndicators.has('ema7')
                    ? 'bg-cyan-500/10 border-cyan-500 text-cyan-600 dark:text-cyan-400'
                    : 'border-border hover:bg-accent'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Media Móvil Exponencial de 7 periodos"
              >
                EMA 7
              </button>
              <button
                onClick={() => toggleIndicator('bollinger')}
                disabled={data.length < 20}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors border ${
                  activeIndicators.has('bollinger')
                    ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-border hover:bg-accent'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Bandas de Bollinger (20, 2σ)"
              >
                Bollinger
              </button>
              <button
                onClick={() => toggleIndicator('trend')}
                disabled={data.length < 2}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors border ${
                  activeIndicators.has('trend')
                    ? 'bg-pink-500/10 border-pink-500 text-pink-600 dark:text-pink-400'
                    : 'border-border hover:bg-accent'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Línea de tendencia (regresión lineal)"
              >
                Tendencia
              </button>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="p-4">
          {data.length > 0 ? (
            <div ref={chartContainerRef} className="w-full" />
          ) : (
            <div className="h-[500px] flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Activity className="h-12 w-12 opacity-30" />
              <p>No hay datos disponibles para este periodo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
