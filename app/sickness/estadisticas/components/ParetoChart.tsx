'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { useEffect, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ParetoDataPoint {
  name: string;
  amount: number;
  cumulative: number;
  percentage: number;
  icon?: string;
}

interface ParetoChartProps {
  householdId: string;
  startDate?: string;
  endDate?: string;
  type?: 'expense' | 'income';
  limit?: number;
}

export function ParetoChart({ householdId, startDate, endDate, type = 'expense', limit = 10 }: ParetoChartProps) {
  const [data, setData] = useState<ParetoDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threshold80, setThreshold80] = useState<number | null>(null);

  useEffect(() => {
    loadParetoData();
  }, [householdId, startDate, endDate, type, limit]);

  const loadParetoData = async () => {
    if (!householdId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        householdId,
        type,
        limit: limit.toString(),
      });

      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/sickness/statistics/pareto?${params}`);
      if (!response.ok) throw new Error('Error al cargar datos del Pareto');

      const result = await response.json();
      setData(result.data);

      // Encontrar el punto donde se cruza el 80%
      const threshold = result.data.find((d: ParetoDataPoint) => d.cumulative >= 80);
      if (threshold) {
        setThreshold80(result.data.indexOf(threshold));
      }
    } catch (err) {
      console.error('Error loading Pareto data:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Pareto (80/20)</CardTitle>
          <CardDescription>
            Identifica las categorías que representan el 80% de tus {type === 'expense' ? 'gastos' : 'ingresos'}
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
          <CardTitle>Análisis de Pareto (80/20)</CardTitle>
          <CardDescription>
            Identifica las categorías que representan el 80% de tus {type === 'expense' ? 'gastos' : 'ingresos'}
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
          <CardTitle>Análisis de Pareto (80/20)</CardTitle>
          <CardDescription>
            Identifica las categorías que representan el 80% de tus {type === 'expense' ? 'gastos' : 'ingresos'}
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
        <CardTitle>Análisis de Pareto (80/20)</CardTitle>
        <CardDescription>
          Las primeras {threshold80 !== null ? threshold80 + 1 : '?'} categorías representan el 80% del total
          {' • '}
          Principio de Pareto aplicado
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 60,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 12 }}
                label={{
                  value: 'Categorías',
                  position: 'insideBottom',
                  offset: -50,
                }}
              />
              <YAxis
                yAxisId="left"
                label={{
                  value: 'Monto (€)',
                  angle: -90,
                  position: 'insideLeft',
                }}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                label={{
                  value: '% Acumulado',
                  angle: 90,
                  position: 'insideRight',
                }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length && payload[0]) {
                    const data = payload[0].payload as ParetoDataPoint;
                    return (
                      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          {data.icon && <span className="text-xl">{data.icon}</span>}
                          <span className="font-semibold">{data.name}</span>
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Monto:</span>
                            <span className="font-medium">{formatCurrency(data.amount)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">% del total:</span>
                            <span className="font-medium">{data.percentage.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">% Acumulado:</span>
                            <span className="font-medium">{data.cumulative.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Bar
                yAxisId="left"
                dataKey="amount"
                fill={type === 'expense' ? '#ef4444' : '#10b981'}
                name="Monto"
                radius={[8, 8, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulative"
                stroke="#f59e0b"
                strokeWidth={2}
                name="% Acumulado"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              {/* Línea de referencia en 80% */}
              {threshold80 !== null && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  data={data.map((d, i) => ({
                    ...d,
                    threshold: i === threshold80 ? 80 : null,
                  }))}
                  dataKey="threshold"
                  stroke="#6366f1"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Umbral 80%"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {threshold80 !== null && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Principio de Pareto:</strong> Las primeras{' '}
              <span className="font-semibold text-foreground">{threshold80 + 1}</span> categorías (
              {((threshold80 + 1) / data.length * 100).toFixed(0)}% del total) representan el 80% de tus{' '}
              {type === 'expense' ? 'gastos' : 'ingresos'}. Enfócate en estas para optimizar tu presupuesto.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
