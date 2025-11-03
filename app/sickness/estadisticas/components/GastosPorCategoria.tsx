'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getGroupColor } from '@/lib/categoryColors';
import { formatCurrency } from '@/lib/format';
import { ResponsivePie } from '@nivo/pie';
import { PieChart as PieIcon } from 'lucide-react';

interface ExpenseByCategory {
  category: string;
  amount: number;
  icon: string;
  groupName?: string; // Nombre del grupo para colores consistentes
}

interface GastosPorCategoriaProps {
  title?: string;
  data: ExpenseByCategory[];
  isLoading?: boolean;
}

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
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
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
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            Sin datos de gastos
          </div>
        </CardContent>
      </Card>
    );
  }

  // Preparar datos para Nivo Pie
  const pieData = data.map((item, index) => ({
    id: item.category,
    label: item.category,
    value: item.amount,
    icon: item.icon,
    groupName: item.groupName || 'otros',
    // Usar color del grupo si está disponible, sino fallback por índice
    color: item.groupName ? getGroupColor(item.groupName, 'base') : `hsl(${(index * 360) / data.length}, 70%, 50%)`,
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
        <div className="h-[400px]">
          <ResponsivePie
            data={pieData}
            margin={{ top: 20, right: 20, bottom: 80, left: 20 }}
            innerRadius={0.5}
            padAngle={0.7}
            cornerRadius={3}
            activeOuterRadiusOffset={8}
            colors={(d: { data: { color: string } }) => d.data.color}
            borderWidth={2}
            borderColor={{
              from: 'color',
              modifiers: [['darker', 0.2]],
            }}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor="hsl(var(--foreground))"
            arcLinkLabelsThickness={2}
            arcLinkLabelsColor={{ from: 'color' }}
            arcLabelsSkipAngle={10}
            arcLabelsTextColor={{
              from: 'color',
              modifiers: [['darker', 2.5]],
            }}
            arcLabel={(d: { data: { icon: string } }) => `${d.data.icon}`}
            tooltip={({ datum }: { datum: { id: string; value: number; formattedValue: string; data: { icon: string } } }) => (
              <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{datum.data.icon}</span>
                  <span className="font-semibold text-foreground">{datum.id}</span>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Monto:</span>
                    <span className="font-medium text-foreground">{formatCurrency(datum.value)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Porcentaje:</span>
                    <span className="font-medium text-foreground">{datum.formattedValue}</span>
                  </div>
                </div>
              </div>
            )}
            legends={[
              {
                anchor: 'bottom',
                direction: 'row',
                justify: false,
                translateX: 0,
                translateY: 70,
                itemsSpacing: 8,
                itemWidth: 100,
                itemHeight: 18,
                itemTextColor: 'hsl(var(--foreground))',
                itemDirection: 'left-to-right',
                itemOpacity: 1,
                symbolSize: 14,
                symbolShape: 'circle',
                effects: [
                  {
                    on: 'hover',
                    style: {
                      itemTextColor: 'hsl(var(--foreground))',
                      itemOpacity: 0.8,
                    },
                  },
                ],
              },
            ]}
            animate={true}
            motionConfig="gentle"
          />
        </div>
      </CardContent>
    </Card>
  );
}
