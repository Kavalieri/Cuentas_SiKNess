'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { IChartApi, Time } from 'lightweight-charts';
import { ColorType, createChart, LineSeries, LineStyle } from 'lightweight-charts';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';

interface TrendDataPoint {
  date: string;
  amount: number;
}

interface TrendLineChartTVProps {
  householdId: string;
  type: 'expense' | 'income';
  months?: number;
}

export function TrendLineChartTV({ householdId, type, months = 6 }: TrendLineChartTVProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [average, setAverage] = useState<number>(0);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const [isLoading, setIsLoading] = useState(true);
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Esperar a que el componente esté montado para acceder al theme
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && (theme === 'dark' || resolvedTheme === 'dark');

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          householdId,
          type,
          months: months.toString(),
        });

        const response = await fetch(`/api/sickness/statistics/trend?${params}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
          setAverage(result.average);
          setTrend(result.trend);
        }
      } catch (error) {
        console.error('Error fetching trend data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [householdId, type, months]);

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
          color: isDark ? '#9ca3af' : '#6b7280',
          style: LineStyle.Dashed,
        },
        horzLine: {
          width: 1,
          color: isDark ? '#9ca3af' : '#6b7280',
          style: LineStyle.Dashed,
        },
      },
    });

    chartRef.current = chart;

    // Convertir datos a formato TradingView
    const chartData = data.map((point) => {
      const [monthName, year] = point.date.split(' ');
      const monthMap: Record<string, string> = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04',
        May: '05', Jun: '06', Jul: '07', Aug: '08',
        Sep: '09', Oct: '10', Nov: '11', Dec: '12',
      };
      const month = monthMap[monthName as keyof typeof monthMap] || '01';
      const dateString = `${year}-${month}-01`;

      return {
        time: dateString as Time,
        value: point.amount,
      };
    });

    // Crear serie de línea usando v5 API correcta
    const lineSeries = chart.addSeries(LineSeries, {
      color: type === 'expense' ? '#ef4444' : '#10b981',
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });

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
      <Card>
        <CardHeader>
          <CardTitle>Tendencia Temporal (TradingView)</CardTitle>
          <CardDescription>Cargando datos...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendencia Temporal (TradingView)</CardTitle>
          <CardDescription>No hay datos suficientes para mostrar tendencia</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No hay períodos cerrados con transacciones
          </div>
        </CardContent>
      </Card>
    );
  }

  const trendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const TrendIcon = trendIcon;
  const trendColor =
    trend === 'up'
      ? 'text-red-500'
      : trend === 'down'
        ? 'text-green-500'
        : 'text-muted-foreground';

  const trendText =
    trend === 'up'
      ? 'Tendencia al alza (+10%)'
      : trend === 'down'
        ? 'Tendencia a la baja (-10%)'
        : 'Tendencia estable';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Tendencia Temporal (TradingView)
          <TrendIcon className={`h-5 w-5 ${trendColor}`} />
        </CardTitle>
        <CardDescription>
          Evolución de {type === 'expense' ? 'gastos' : 'ingresos'} en los últimos {months} meses
          cerrados • Promedio: €{average.toFixed(2)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div ref={chartContainerRef} className="w-full" />

        {/* Footer con interpretación */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Tendencia:</span>
            <span className={trendColor}>{trendText}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            💡 <strong>TradingView Features:</strong> Usa el mouse para hacer zoom (scroll) y pan
            (arrastrar). El crosshair muestra valores exactos. La línea discontinua representa el
            promedio de {type === 'expense' ? 'gasto' : 'ingreso'}.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
