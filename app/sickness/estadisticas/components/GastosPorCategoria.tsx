'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCategoryColorByLevel } from '@/lib/categoryColors';
import { formatCurrency } from '@/lib/format';
import { ResponsivePie } from '@nivo/pie';
import { PieChart as PieIcon } from 'lucide-react';

interface ExpenseByCategory {
  category: string;
  amount: number;
  icon: string;
  groupName?: string; // Nombre del grupo para colores consistentes
  level?: 'group' | 'category' | 'subcategory'; // Nivel jerárquico
  index?: number; // Índice dentro del grupo
  total?: number; // Total de elementos en el nivel
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

  // Preparar datos para Nivo Pie con colores jerárquicos
  const pieData = data.map((item, index) => {
    const groupName = item.groupName || 'otros';
    const level = item.level || 'category'; // Por defecto categorías
    const itemIndex = item.index !== undefined ? item.index : index;
    const total = item.total || data.length;
    
    return {
      id: item.category,
      label: item.category,
      value: item.amount,
      icon: item.icon,
      groupName,
      // Usar sistema de colores jerárquico
      color: getCategoryColorByLevel(groupName, itemIndex, total, level),
    };
  });

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
            margin={{ top: 20, right: 20, bottom: 100, left: 20 }}
            innerRadius={0.6}
            padAngle={0.7}
            cornerRadius={3}
            activeOuterRadiusOffset={8}
            colors={(datum) => datum.data.color}
            borderWidth={2}
            borderColor={{
              from: 'color',
              modifiers: [['darker', 0.3]],
            }}
            // Deshabilitamos las etiquetas de enlaces y arcos
            enableArcLinkLabels={false}
            enableArcLabels={false}
            tooltip={(props) => {
              const datum = props.datum as { id: string; value: number; formattedValue: string; data: { icon: string; groupName: string } };
              return (
                <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{datum.data.icon}</span>
                    <span className="font-semibold text-foreground">{datum.id}</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Grupo:</span>
                      <span className="font-medium text-foreground capitalize">{datum.data.groupName}</span>
                    </div>
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
              );
            }}
            legends={[
              {
                anchor: 'bottom',
                direction: 'column',
                justify: false,
                translateX: 0,
                translateY: 90,
                itemsSpacing: 4,
                itemWidth: 150,
                itemHeight: 20,
                itemTextColor: 'hsl(var(--foreground))',
                itemDirection: 'left-to-right',
                itemOpacity: 1,
                symbolSize: 12,
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
