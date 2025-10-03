'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { TooltipProps } from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { getChartColor } from '@/lib/charts/theme';
import { TrendingDown } from 'lucide-react';

interface ExpensesByCategoryChartProps {
  data: Array<{
    category_id: string | null;
    category_name: string;
    category_icon: string;
    total: number;
    percentage: number;
  }>;
  currency?: string;
  className?: string;
}

export function ExpensesByCategoryChart({
  data,
  currency = 'EUR',
  className,
}: ExpensesByCategoryChartProps) {
  // Si no hay datos, mostrar empty state
  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Gastos por Categoría
          </CardTitle>
          <CardDescription>Distribución de tus gastos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">No hay gastos en este período</p>
              <p className="text-xs mt-1">Añade tu primer gasto para ver el análisis</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Preparar datos para el gráfico
  const chartData = data.map((item, index) => ({
    name: item.category_name,
    value: item.total,
    percentage: item.percentage,
    icon: item.category_icon,
    color: getChartColor(index),
  }));

  const totalExpenses = data.reduce((sum, item) => sum + item.total, 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload as { name: string; value: number; percentage: number; icon: string };
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{data.icon}</span>
            <p className="font-semibold">{data.name}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.value, currency)}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.percentage.toFixed(1)}% del total
          </p>
        </div>
      );
    }
    return null;
  };

  // Label para el centro del donut
  const renderCenterLabel = ({ viewBox }: { viewBox?: { cx?: number; cy?: number } }) => {
    if (!viewBox?.cx || !viewBox?.cy) return null;
    
    const { cx, cy } = viewBox;
    return (
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
        <tspan
          x={cx}
          y={cy - 10}
          className="fill-foreground text-2xl font-bold"
        >
          {formatCurrency(totalExpenses, currency)}
        </tspan>
        <tspan
          x={cx}
          y={cy + 15}
          className="fill-muted-foreground text-sm"
        >
          Total gastado
        </tspan>
      </text>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          Gastos por Categoría
        </CardTitle>
        <CardDescription>
          Distribución de tus {data.length} categoría{data.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              label={renderCenterLabel}
              labelLine={false}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
