'use client';

import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';

interface SavingsEvolutionChartProps {
  data: Array<{
    date: string; // 'YYYY-MM' format
    balance: number;
  }>;
  goalAmount?: number | null;
}

export function SavingsEvolutionChart({ data, goalAmount }: SavingsEvolutionChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolución del Fondo de Ahorro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            <p>No hay datos de ahorro para mostrar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolución del Fondo de Ahorro</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => {
                const d = new Date(date + '-01'); // Add day to make valid date
                return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
              }}
              className="text-xs"
            />
            <YAxis
              tickFormatter={(value: number) => {
                // Formato corto para el eje Y
                if (value >= 1000) {
                  return `${(value / 1000).toFixed(1)}k€`;
                }
                return `${value}€`;
              }}
              className="text-xs"
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'Balance']}
              labelFormatter={(label) => {
                const d = new Date(label + '-01');
                return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
              }}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />

            {/* Área sombreada debajo de la línea */}
            <Area
              type="monotone"
              dataKey="balance"
              fill="hsl(var(--primary))"
              fillOpacity={0.1}
              stroke="none"
            />

            {/* Línea principal */}
            <Line
              type="monotone"
              dataKey="balance"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 4, fill: 'hsl(var(--primary))' }}
              activeDot={{ r: 6 }}
              name="Balance"
            />

            {/* Línea punteada meta (si existe) */}
            {goalAmount && goalAmount > 0 && (
              <ReferenceLine
                y={goalAmount}
                stroke="hsl(var(--destructive))"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: `Meta: ${formatCurrency(goalAmount)}`,
                  position: 'insideTopRight',
                  fill: 'hsl(var(--destructive))',
                  fontSize: 12,
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
