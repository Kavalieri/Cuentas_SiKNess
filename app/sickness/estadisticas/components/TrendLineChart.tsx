'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/format';
import { Info } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface TrendDataPoint {
  date: string;
  amount: number;
  average?: number;
}

interface TrendLineChartProps {
  householdId: string;
  type?: 'expense' | 'income';
  defaultMonths?: number;
}

export function TrendLineChart({ householdId, type = 'expense', defaultMonths = 6 }: TrendLineChartProps) {
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState<number>(defaultMonths);
  const [average, setAverage] = useState<number>(0);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');

  const loadTrendData = useCallback(async () => {
    if (!householdId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        householdId,
        type,
        months: months.toString(),
      });

      const response = await fetch(`/api/sickness/statistics/trend?${params}`);
      if (!response.ok) throw new Error('Error al cargar datos de tendencia');

      const result = await response.json();
      setData(result.data);
      setAverage(result.average || 0);
      setTrend(result.trend || 'stable');
    } catch (err) {
      console.error('Error loading trend data:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [householdId, type, months]);

  useEffect(() => {
    loadTrendData();
  }, [loadTrendData]);

  const getTrendIcon = () => {
    if (trend === 'up') return type === 'expense' ? '📈 ⚠️' : '📈 ✅';
    if (trend === 'down') return type === 'expense' ? '📉 ✅' : '📉 ⚠️';
    return '➡️';
  };

  const getTrendText = () => {
    if (trend === 'up') {
      return type === 'expense'
        ? 'Tendencia al alza - considera revisar tus gastos'
        : 'Tendencia al alza - tus ingresos están creciendo';
    }
    if (trend === 'down') {
      return type === 'expense'
        ? 'Tendencia a la baja - vas por buen camino'
        : 'Tendencia a la baja - tus ingresos están disminuyendo';
    }
    return 'Tendencia estable';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendencia Temporal</CardTitle>
          <CardDescription>
            Evolución de {type === 'expense' ? 'gastos' : 'ingresos'} con línea de promedio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">Cargando datos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendencia Temporal</CardTitle>
          <CardDescription>
            Evolución de {type === 'expense' ? 'gastos' : 'ingresos'} con línea de promedio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-red-500">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendencia Temporal</CardTitle>
          <CardDescription>
            Evolución de {type === 'expense' ? 'gastos' : 'ingresos'} con línea de promedio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">No hay datos disponibles para el período seleccionado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Tendencia Temporal</CardTitle>
            <CardDescription>
              Visualiza la evolución de tus {type === 'expense' ? 'gastos' : 'ingresos'} mes a mes.
              La línea naranja punteada muestra el promedio del período, ayudándote a identificar meses
              atípicos y patrones estacionales en tu presupuesto.
            </CardDescription>
          </div>
          <Select value={months.toString()} onValueChange={(value) => setMonths(parseInt(value, 10))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
              <SelectItem value="24">24 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                label={{
                  value: 'Mes',
                  position: 'insideBottom',
                  offset: -10,
                }}
              />
              <YAxis
                label={{
                  value: 'Monto (€)',
                  angle: -90,
                  position: 'insideLeft',
                }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length && payload[0]) {
                    const data = payload[0].payload as TrendDataPoint;
                    return (
                      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                        <div className="font-semibold mb-2">{data.date}</div>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Monto:</span>
                            <span className="font-medium">{formatCurrency(data.amount)}</span>
                          </div>
                          {average > 0 && (
                            <>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Promedio:</span>
                                <span className="font-medium">{formatCurrency(average)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Diferencia:</span>
                                <span
                                  className={`font-medium ${
                                    data.amount > average
                                      ? type === 'expense'
                                        ? 'text-red-500'
                                        : 'text-green-500'
                                      : type === 'expense'
                                        ? 'text-green-500'
                                        : 'text-red-500'
                                  }`}
                                >
                                  {data.amount > average ? '+' : ''}
                                  {formatCurrency(data.amount - average)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
              <Line
                type="monotone"
                dataKey="amount"
                stroke={type === 'expense' ? '#ef4444' : '#10b981'}
                strokeWidth={2}
                name={type === 'expense' ? 'Gastos' : 'Ingresos'}
                dot={{ r: 4, fill: type === 'expense' ? '#ef4444' : '#10b981' }}
                activeDot={{ r: 6 }}
              />
              {average > 0 && (
                <ReferenceLine
                  y={average}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{
                    value: `Promedio: ${formatCurrency(average)}`,
                    position: 'insideTopRight',
                    fill: '#f59e0b',
                    fontSize: 12,
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Guía de interpretación */}
        <Alert className="mt-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Cómo interpretar este gráfico</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
              <li>
                <strong>Línea {type === 'expense' ? 'roja' : 'verde'}:</strong> Muestra el total mensual de {type === 'expense' ? 'gastos' : 'ingresos'}
              </li>
              <li>
                <strong>Línea naranja punteada:</strong> Representa el promedio del período seleccionado
              </li>
              <li>
                <strong>Tendencia {getTrendIcon()}:</strong> {getTrendText()}
              </li>
              <li>
                {type === 'expense' 
                  ? 'Meses por encima del promedio requieren atención para identificar gastos extraordinarios'
                  : 'Meses por debajo del promedio pueden indicar necesidad de diversificar fuentes de ingreso'}
              </li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Promedio {months} meses</p>
              <p className="text-lg font-semibold">{formatCurrency(average)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Máximo</p>
              <p className="text-lg font-semibold">
                {formatCurrency(Math.max(...data.map((d) => d.amount)))}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Mínimo</p>
              <p className="text-lg font-semibold">
                {formatCurrency(Math.min(...data.map((d) => d.amount)))}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
