'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';

type CategoryDataPoint = {
  name: string;
  value: number;
  percentage: number;
  icon: string | null;
};

type Props = {
  data: CategoryDataPoint[];
  title?: string;
  description?: string;
};

// Colores para las categorías
const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7c7c',
  '#8dd1e1',
];

export function CategoryPieChart({ data, title, description }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title || 'Distribución por Categoría'}</CardTitle>
          <CardDescription>
            {description || 'Porcentaje de gastos por categoría'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No hay datos de categorías para este período.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Tomar solo top 8 para mejor visualización
  const topData = data.slice(0, 8);
  const othersTotal = data.slice(8).reduce((sum, item) => sum + item.value, 0);

  const chartData =
    othersTotal > 0
      ? [
          ...topData,
          {
            name: 'Otros',
            value: othersTotal,
            percentage: (othersTotal / data.reduce((sum, item) => sum + item.value, 0)) * 100,
            icon: '📦',
          },
        ]
      : topData;

  const CustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // No mostrar labels < 5%

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || 'Distribución por Categoría'}</CardTitle>
        <CardDescription>
          {description || 'Porcentaje de gastos por categoría'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Top 3 categorías como lista */}
        <div className="mt-6 space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">Top 3 Categorías:</p>
          {data.slice(0, 3).map((item, index) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index] }}
                />
                <span className="text-sm">
                  {item.icon} {item.name}
                </span>
              </div>
              <span className="text-sm font-semibold">
                {formatCurrency(item.value)} ({item.percentage.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
