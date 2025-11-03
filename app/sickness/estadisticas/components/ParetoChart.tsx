'use client';

import type { ExpenseByCategory } from '@/app/sickness/estadisticas/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getGroupColor } from '@/lib/categoryColors';
import { ResponsiveBar } from '@nivo/bar';

interface ParetoChartProps {
  data: ExpenseByCategory[];
  isLoading?: boolean;
  title?: string;
}

export function ParetoChart({ data, isLoading, title = 'Análisis de Pareto (80/20)' }: ParetoChartProps) {
  if (isLoading) {
    return (
      <Card className="h-[500px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-muted-foreground">Cargando análisis de Pareto...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="h-[500px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-muted-foreground">No hay datos disponibles</div>
        </CardContent>
      </Card>
    );
  }

  // Ordenar por monto descendente
  const sortedData = [...data].sort((a, b) => b.amount - a.amount);

  // Calcular total y porcentajes acumulativos
  const total = sortedData.reduce((sum, item) => sum + item.amount, 0);
  let cumulative = 0;

  const paretoData = sortedData.map((item) => {
    cumulative += item.amount;
    const percentage = (item.amount / total) * 100;
    const cumulativePercentage = (cumulative / total) * 100;

    return {
      category: item.icon ? `${item.icon} ${item.category}` : item.category,
      categoryName: item.category,
      groupName: item.groupName || 'otros',
      amount: item.amount,
      percentage: parseFloat(percentage.toFixed(1)),
      cumulative: parseFloat(cumulativePercentage.toFixed(1)),
    };
  });

  return (
    <Card className="h-[600px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Principio de Pareto: ~80% del gasto proviene del ~20% de las categorías
        </p>
      </CardHeader>
      <CardContent className="h-[500px]">
        <ResponsiveBar
          data={paretoData}
          keys={['amount']}
          indexBy="category"
          margin={{ top: 20, right: 80, bottom: 100, left: 80 }}
          padding={0.3}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={(bar) => {
            const groupName = bar.data.groupName as string;
            return getGroupColor(groupName, 'base');
          }}
          borderRadius={4}
          borderWidth={1}
          borderColor={{
            from: 'color',
            modifiers: [['darker', 0.3]],
          }}
          axisTop={null}
          axisRight={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Acumulado (%)',
            legendPosition: 'middle',
            legendOffset: 60,
            format: (v) => `${v}%`,
          }}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: '',
            legendPosition: 'middle',
            legendOffset: 80,
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Monto (€)',
            legendPosition: 'middle',
            legendOffset: -60,
            format: (v) => `${v.toLocaleString()}€`,
          }}
          labelSkipWidth={12}
          labelSkipHeight={12}
          labelTextColor={{
            from: 'color',
            modifiers: [['darker', 2]],
          }}
          label={(d) => `${(d.value || 0).toLocaleString()}€`}
          tooltip={({ indexValue, value, data }) => (
            <div className="bg-background border border-border rounded-lg shadow-lg p-3">
              <div className="font-semibold mb-2">{indexValue}</div>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Monto: </span>
                  <span className="font-mono">
                    {new Intl.NumberFormat('es-ES', {
                      style: 'currency',
                      currency: 'EUR',
                    }).format(value)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">% Individual: </span>
                  <span className="font-semibold">{data.percentage}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">% Acumulado: </span>
                  <span className="font-semibold text-orange-500">{data.cumulative}%</span>
                </div>
              </div>
            </div>
          )}
          layers={[
            'grid',
            'axes',
            'bars',
            'markers',
            'legends',
            (props) => {
              const { xScale, yScale, innerHeight } = props as {
                xScale: { (val: string): number; bandwidth(): number; range(): number[] };
                yScale: { (val: number): number; range(): number[] };
                innerHeight: number
              };

              if (!xScale || !yScale) return null;

              const points = paretoData.map((d) => {
                const x = xScale(d.category) + xScale.bandwidth() / 2;
                const y = innerHeight - (innerHeight * d.cumulative) / 100;
                return { x, y, cumulative: d.cumulative };
              });

              const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
              const xRange = xScale.range();
              const maxX = xRange[1] || 0;

              return (
                <g>
                  <line
                    x1={0}
                    y1={innerHeight * 0.2}
                    x2={maxX}
                    y2={innerHeight * 0.2}
                    stroke="#f97316"
                    strokeWidth={2}
                    strokeDasharray="5,5"
                    opacity={0.7}
                  />
                  <text
                    x={maxX - 10}
                    y={innerHeight * 0.2 - 5}
                    textAnchor="end"
                    style={{ fontSize: 12, fill: '#f97316', fontWeight: 600 }}
                  >
                    80% Acumulado
                  </text>
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#f97316"
                    strokeWidth={3}
                    opacity={0.8}
                  />
                  {points.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={4}
                      fill="#f97316"
                      stroke="white"
                      strokeWidth={2}
                    />
                  ))}
                </g>
              );
            },
          ]}
          theme={{
            axis: {
              ticks: {
                text: {
                  fontSize: 11,
                },
              },
              legend: {
                text: {
                  fontSize: 12,
                  fontWeight: 600,
                },
              },
            },
            labels: {
              text: {
                fontSize: 11,
                fontWeight: 600,
              },
            },
          }}
          animate={true}
          motionConfig="gentle"
        />
      </CardContent>
    </Card>
  );
}
