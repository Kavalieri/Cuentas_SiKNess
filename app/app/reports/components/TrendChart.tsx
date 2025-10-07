'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { TrendingUp, TrendingDown } from 'lucide-react';

type TrendDataPoint = {
  month: string;
  monthLabel: string;
  expenses: number;
  income: number;
  net: number;
};

type Props = {
  data: TrendDataPoint[];
};

export function TrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendencia Mensual</CardTitle>
          <CardDescription>Evolución de gastos e ingresos</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No hay datos suficientes para mostrar la tendencia.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calcular estadísticas
  const latestMonth = data[data.length - 1];
  const previousMonth = data.length > 1 ? data[data.length - 2] : null;
  const netChange = previousMonth && latestMonth ? latestMonth.net - previousMonth.net : 0;
  const isPositiveTrend = netChange >= 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tendencia Mensual</CardTitle>
            <CardDescription>Evolución de gastos e ingresos</CardDescription>
          </div>
          {previousMonth && latestMonth && (
            <div className="flex items-center gap-2">
              {isPositiveTrend ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Balance neto</p>
                <p
                  className={`text-lg font-bold ${
                    isPositiveTrend ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(latestMonth.net)}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="monthLabel"
              className="text-xs"
              tick={{ fill: 'currentColor' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'currentColor' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="income"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              name="Ingresos"
              dot={{ fill: 'hsl(var(--chart-2))' }}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              name="Gastos"
              dot={{ fill: 'hsl(var(--destructive))' }}
            />
            <Line
              type="monotone"
              dataKey="net"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              name="Neto"
              dot={{ fill: 'hsl(var(--primary))' }}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
