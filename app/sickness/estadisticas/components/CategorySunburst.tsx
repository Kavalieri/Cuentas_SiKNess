'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getGroupColor } from '@/lib/categoryColors';
import { ResponsiveSunburst } from '@/node_modules/@nivo/sunburst';
import type { HierarchicalExpense } from '../actions';

interface CategorySunburstProps {
  data: HierarchicalExpense[];
  isLoading?: boolean;
  title?: string;
}

export function CategorySunburst({ data, isLoading, title = 'Gastos por Categoría (Jerárquico)' }: CategorySunburstProps) {
  if (isLoading) {
    return (
      <Card className="h-[500px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🌅</span>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-muted-foreground">Cargando datos jerárquicos...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="h-[500px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🌅</span>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-muted-foreground">No hay datos disponibles</div>
        </CardContent>
      </Card>
    );
  }

  // Función recursiva para calcular el valor total de un nodo sumando sus hijos
  const calculateNodeValue = (node: HierarchicalExpense): number => {
    if (!node.children || node.children.length === 0) {
      return node.value;
    }
    // El valor del padre es la SUMA de los valores de sus hijos
    return node.children.reduce((sum, child) => sum + calculateNodeValue(child), 0);
  };

  // Transformar datos al formato que Nivo espera con valores correctos
  const transformNode = (node: HierarchicalExpense): any => {
    const transformedChildren = node.children
      ?.filter(child => child.value > 0 || (child.children && child.children.length > 0))
      .map(child => transformNode(child));

    // Calcular el valor correcto (suma de hijos si los hay)
    const correctValue = transformedChildren && transformedChildren.length > 0
      ? transformedChildren.reduce((sum: number, child: any) => sum + child.value, 0)
      : node.value;

    return {
      id: node.id,
      label: node.label,
      value: correctValue,
      icon: node.icon,
      groupName: node.groupName,
      children: transformedChildren,
    };
  };

  const sunburstData = {
    id: 'root',
    label: 'Todos los Gastos',
    children: data.map(group => transformNode(group)),
  };

  return (
    <Card className="h-[600px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🌅</span>
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Haz clic en las secciones para explorar grupos → categorías → subcategorías
        </p>
      </CardHeader>
      <CardContent className="h-[500px]">
        <ResponsiveSunburst
          data={sunburstData}
          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          id="label"
          value="value"
          cornerRadius={2}
          borderWidth={2}
          borderColor={{ theme: 'background' }}
          colors={(node: any) => {
            // Obtener el grupo desde los ancestros
            const ancestors = node.path || [];
            const depth = ancestors.length;

            // El root no tiene color
            if (depth === 0) return '#333333';

            // Nivel 1: Grupos (usar color base)
            if (depth === 1) {
              const groupName = node.data.groupName || node.data.label;
              return getGroupColor(groupName, 'base');
            }

            // Nivel 2: Categorías (usar color light)
            if (depth === 2) {
              const groupName = node.data.groupName;
              return getGroupColor(groupName, 'light');
            }

            // Nivel 3+: Subcategorías (usar color light)
            const groupName = node.data.groupName;
            return getGroupColor(groupName, 'light');
          }}
          childColor={{
            from: 'color',
            modifiers: [['brighter', 0.1]],
          }}
          enableArcLabels
          arcLabel={(d: any) => {
            // Solo mostrar label si el arco es suficientemente grande
            if (d.percentage < 5) return '';
            return `${d.data.icon || ''} ${d.data.label}`;
          }}
          arcLabelsSkipAngle={10}
          arcLabelsTextColor={{
            from: 'color',
            modifiers: [['darker', 2]],
          }}
          tooltip={(node: any) => (
            <div className="bg-background border border-border rounded-lg shadow-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{node.data.icon}</span>
                <span className="font-semibold">{node.data.label}</span>
              </div>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Monto: </span>
                  <span className="font-mono">
                    {new Intl.NumberFormat('es-ES', {
                      style: 'currency',
                      currency: 'EUR',
                    }).format(node.value)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Porcentaje: </span>
                  <span className="font-semibold">{node.percentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}
          theme={{
            text: {
              fontSize: 11,
              fontWeight: 600,
            },
            tooltip: {
              container: {
                background: 'transparent',
                padding: 0,
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
