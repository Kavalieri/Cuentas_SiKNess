'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { ResponsiveBar } from '@nivo/bar';
import { BarChart3 } from 'lucide-react';

interface IncomeVsExpense {
  month: string;
  income: number;
  expense: number;
}

interface IngresosVsGastosNivoProps {
  title?: string;
  data: IncomeVsExpense[];
  isLoading?: boolean;
}

export function IngresosVsGastosNivo({
  title = 'Ingresos vs Gastos',
  data,
  isLoading = false,
}: IngresosVsGastosNivoProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
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
            <BarChart3 className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Sin datos de ingresos/gastos
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcular balance para cada mes (diferencia entre ingresos y gastos)
  const dataWithBalance = data.map((item) => ({
    ...item,
    balance: item.income - item.expense,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveBar
            data={dataWithBalance}
            keys={['income', 'expense']}
            indexBy="month"
            margin={{ top: 20, right: 130, bottom: 60, left: 80 }}
            padding={0.3}
            groupMode="grouped"
            valueScale={{ type: 'linear' }}
            indexScale={{ type: 'band', round: true }}
            colors={(bar) => {
              // Ingresos: verde, Gastos: rojo
              return bar.id === 'income' ? '#10b981' : '#ef4444';
            }}
            borderColor={{
              from: 'color',
              modifiers: [['darker', 0.3]],
            }}
            borderWidth={1}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -30,
              legend: 'Periodo',
              legendPosition: 'middle',
              legendOffset: 50,
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Monto (€)',
              legendPosition: 'middle',
              legendOffset: -60,
              format: (value) => `€${value}`,
            }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor={{
              from: 'color',
              modifiers: [['darker', 2.5]],
            }}
            legends={[
              {
                dataFrom: 'keys',
                anchor: 'bottom-right',
                direction: 'column',
                justify: false,
                translateX: 120,
                translateY: 0,
                itemsSpacing: 2,
                itemWidth: 100,
                itemHeight: 20,
                itemDirection: 'left-to-right',
                itemOpacity: 0.85,
                symbolSize: 14,
                symbolShape: 'square',
                effects: [
                  {
                    on: 'hover',
                    style: {
                      itemOpacity: 1,
                    },
                  },
                ],
                data: [
                  {
                    id: 'income',
                    label: 'Ingresos',
                    color: '#10b981',
                  },
                  {
                    id: 'expense',
                    label: 'Gastos',
                    color: '#ef4444',
                  },
                ],
              },
            ]}
            tooltip={({ id, value, indexValue, data: barData }) => (
              <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                <div className="font-semibold text-foreground mb-2">{indexValue}</div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">
                      {id === 'income' ? 'Ingresos:' : 'Gastos:'}
                    </span>
                    <span className="font-medium text-foreground">{formatCurrency(value)}</span>
                  </div>
                  <div className="flex justify-between gap-4 pt-1 border-t border-border">
                    <span className="text-muted-foreground">Balance:</span>
                    <span
                      className={`font-medium ${
                        (barData as { balance: number }).balance >= 0
                          ? 'text-emerald-500'
                          : 'text-red-500'
                      }`}
                    >
                      {formatCurrency((barData as { balance: number }).balance)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            animate={true}
            motionConfig="gentle"
            role="application"
            ariaLabel="Gráfico de barras comparando ingresos vs gastos"
          />
        </div>
      </CardContent>
    </Card>
  );
}
