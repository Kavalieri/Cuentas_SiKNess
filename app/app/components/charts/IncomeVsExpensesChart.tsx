'use client';

import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { TooltipProps } from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { CHART_COLORS } from '@/lib/charts/theme';
import { TrendingUp, TrendingDown, ArrowUpIcon, ArrowDownIcon } from 'lucide-react';

interface IncomeVsExpensesChartProps {
  current: {
    income: number;
    expenses: number;
    balance: number;
  };
  previous?: {
    income: number;
    expenses: number;
    balance: number;
  };
  change?: {
    income: number;
    expenses: number;
    balance: number;
  };
  currency?: string;
  className?: string;
}

export function IncomeVsExpensesChart({
  current,
  previous,
  change,
  currency = 'EUR',
  className,
}: IncomeVsExpensesChartProps) {
  // Preparar datos para el gráfico
  const data = [
    {
      name: 'Ingresos',
      current: current.income,
      previous: previous?.income || 0,
      color: CHART_COLORS.income,
    },
    {
      name: 'Gastos',
      current: current.expenses,
      previous: previous?.expenses || 0,
      color: CHART_COLORS.expense,
    },
  ];

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload as { name: string; current: number; previous?: number };
      const currentValue = payload[0]?.value as number;
      const previousValue = payload[1]?.value as number | undefined;
      
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="font-semibold mb-2">{data.name}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Este mes: </span>
              <span className="font-medium">{formatCurrency(currentValue, currency)}</span>
            </p>
            {previousValue !== undefined && previousValue > 0 && (
              <p className="text-sm">
                <span className="text-muted-foreground">Mes anterior: </span>
                <span className="font-medium">{formatCurrency(previousValue, currency)}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Cambio con indicador
  const ChangeIndicator = ({ value, label }: { value: number; label: string }) => {
    const isPositive = value > 0;
    const isNegative = value < 0;
    
    if (!isPositive && !isNegative) return null;

    return (
      <div className="flex items-center gap-1 text-xs">
        {isPositive && <ArrowUpIcon className="h-3 w-3 text-green-600" />}
        {isNegative && <ArrowDownIcon className="h-3 w-3 text-red-600" />}
        <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
          {Math.abs(value).toFixed(1)}%
        </span>
        <span className="text-muted-foreground">{label}</span>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Ingresos vs Gastos
        </CardTitle>
        <CardDescription>
          Comparativa{previous ? ' con el mes anterior' : ' del mes actual'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Indicadores de cambio */}
        {change && previous && (
          <div className="mb-4 flex flex-wrap gap-4">
            <ChangeIndicator value={change.income} label="ingresos" />
            <ChangeIndicator value={change.expenses} label="gastos" />
          </div>
        )}

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `€${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={0}
              stroke="hsl(var(--border))"
              strokeDasharray="3 3"
            />
            
            {/* Barra del mes actual */}
            <Bar
              dataKey="current"
              fill="hsl(var(--primary))"
              radius={[8, 8, 0, 0]}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>

            {/* Barra del mes anterior (si existe) */}
            {previous && (
              <Bar
                dataKey="previous"
                fill="hsl(var(--muted))"
                radius={[8, 8, 0, 0]}
                opacity={0.3}
                animationDuration={800}
                animationEasing="ease-out"
              />
            )}
          </BarChart>
        </ResponsiveContainer>

        {/* Balance del mes */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Balance del mes:</span>
            <div className="flex items-center gap-2">
              {current.balance >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span
                className={`text-lg font-bold ${
                  current.balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(current.balance, currency)}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {current.balance >= 0 ? 'Superávit' : 'Déficit'} del período
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
