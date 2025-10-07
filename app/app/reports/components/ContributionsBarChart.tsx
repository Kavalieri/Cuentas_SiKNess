'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';

type ContributionDataPoint = {
  name: string;
  expected: number;
  paid: number;
  percentage: number;
};

type Props = {
  data: ContributionDataPoint[];
};

export function ContributionsBarChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contribuciones por Miembro</CardTitle>
          <CardDescription>Comparación entre esperado y pagado</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No hay datos de contribuciones para este período.
            <br />
            <span className="text-xs">Genera las contribuciones del mes primero.</span>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contribuciones por Miembro</CardTitle>
        <CardDescription>Comparación entre esperado y pagado</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
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
            <Bar
              dataKey="expected"
              fill="hsl(var(--primary))"
              name="Esperado"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="paid"
              fill="hsl(var(--chart-2))"
              name="Pagado"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Resumen por miembro */}
        <div className="mt-6 space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">Detalle por Miembro:</p>
          {data.map((member) => {
            const isPaid = member.percentage >= 100;
            const isOverpaid = member.percentage > 100;
            const difference = member.paid - member.expected;

            return (
              <div
                key={member.name}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(member.paid)} de {formatCurrency(member.expected)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${
                      isPaid ? 'text-green-600' : 'text-amber-600'
                    }`}
                  >
                    {member.percentage.toFixed(1)}%
                  </p>
                  {difference !== 0 && (
                    <p
                      className={`text-xs ${
                        isOverpaid ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {isOverpaid ? '+' : ''}
                      {formatCurrency(difference)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
