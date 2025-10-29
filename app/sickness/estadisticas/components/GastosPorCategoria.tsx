'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as PieIcon } from 'lucide-react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface ExpenseByCategory {
  category: string;
  amount: number;
  icon: string;
}

interface GastosPorCategoriaProps {
  title?: string;
  data: ExpenseByCategory[];
  isLoading?: boolean;
}

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#14b8a6', '#6366f1', '#f97316', '#84cc16', '#0ea5e9',
];

// Función para renderizar etiquetas con porcentajes
const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  percent: number;
}) => {
  // Solo mostrar etiquetas para porciones mayores al 5%
  if (percent < 0.05) return null;

  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 25;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#666"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

// Función para renderizar leyenda personalizada con porcentajes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderCustomLegend = (props: any) => {
  const { payload } = props;
  
  if (!payload) return null;
  
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
      {payload.map((entry: { value: string; color: string; payload: { percent: string } }, index: number) => (
        <li key={`legend-${index}`} className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-700 dark:text-gray-300">
            {entry.value}
          </span>
          <span className="text-gray-500 dark:text-gray-400 font-medium">
            ({entry.payload.percent}%)
          </span>
        </li>
      ))}
    </ul>
  );
};

export function GastosPorCategoria({
  title = 'Gastos por Categoría',
  data,
  isLoading = false,
}: GastosPorCategoriaProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieIcon className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Cargando...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieIcon className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Sin datos de gastos
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcular total para los porcentajes
  const total = data.reduce((sum, item) => sum + item.amount, 0);

  // Preparar datos con porcentajes para la leyenda
  const dataWithPercentages = data.map((item, index) => ({
    ...item,
    percent: ((item.amount / total) * 100).toFixed(1),
    color: COLORS[index % COLORS.length],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieIcon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={dataWithPercentages}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="45%"
              outerRadius={90}
              label={renderCustomLabel}
              labelLine={{
                stroke: '#999',
                strokeWidth: 1,
              }}
            >
              {dataWithPercentages.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => `${value.toFixed(2)} €`}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '8px',
              }}
            />
            <Legend
              content={renderCustomLegend}
              verticalAlign="bottom"
              height={60}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
