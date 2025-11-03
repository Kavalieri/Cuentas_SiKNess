'use client';

import type { HierarchicalExpense } from '@/app/sickness/estadisticas/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getGroupColor } from '@/lib/categoryColors';
import { ResponsiveSunburst } from '@/node_modules/@nivo/sunburst';

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

  interface TransformedNode {
    id: string;
    label: string;
    icon: string;
    groupName: string;
    value?: number;
    children?: TransformedNode[];
  }

  // Transformar datos al formato que Nivo espera
  // REGLA: Solo las HOJAS tienen 'value', los contenedores NO
  // Nivo calcula automáticamente el valor de los padres sumando sus hijos
  const transformNode = (node: HierarchicalExpense): TransformedNode | null => {
    // Filtrar y transformar hijos válidos recursivamente
    const transformedChildren = node.children
      ?.map(child => transformNode(child))
      .filter((child): child is TransformedNode => child !== null); // Eliminar nulos

    const hasChildren = transformedChildren && transformedChildren.length > 0;

    // Si tiene hijos, NO poner value (Nivo lo calcula)
    // Si NO tiene hijos (es hoja), poner el value
    const result: TransformedNode = {
      id: node.id,
      label: node.label,
      icon: node.icon,
      groupName: node.groupName,
    };

    if (hasChildren) {
      // Contenedor: tiene children, NO tiene value
      result.children = transformedChildren;
    } else {
      // Hoja: tiene value, NO tiene children
      if (node.value > 0) {
        result.value = node.value;
      } else {
        return null; // Hoja sin valor, eliminar
      }
    }

    return result;
  };

  const sunburstData = {
    id: 'root',
    label: 'Todos los Gastos',
    icon: '📊',
    groupName: 'root',
    children: data.map(group => transformNode(group)).filter((g): g is TransformedNode => g !== null),
  };

  // Debug: verificar estructura de datos
  if (process.env.NODE_ENV === 'development') {
    console.log('Sunburst data:', JSON.stringify(sunburstData, null, 2));
  }

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
          colors={(node: unknown) => {
            const typedNode = node as { depth: number; data: TransformedNode; path?: { data: TransformedNode }[] };
            // El root no tiene color
            if (typedNode.depth === 0) return '#1a1a1a';

            // Obtener el groupName del nodo o de sus ancestros
            let groupName = typedNode.data.groupName;

            // Si no tiene groupName, buscar en el path
            if (!groupName && typedNode.path) {
              // El nivel 1 (primer hijo de root) es el grupo
              const groupNode = typedNode.path[1];
              if (groupNode && groupNode.data) {
                groupName = groupNode.data.groupName || groupNode.data.label;
              }
            }

            // Si aún no tenemos groupName, usar el label del nodo en nivel 1
            if (!groupName && typedNode.depth === 1) {
              groupName = typedNode.data.label;
            }

            // Fallback a color genérico si no hay groupName
            if (!groupName) {
              console.warn('No groupName found for node:', typedNode);
              return '#666666';
            }

            // Nivel 1: Grupos (usar color base más saturado)
            if (typedNode.depth === 1) {
              return getGroupColor(groupName, 'base');
            }

            // Nivel 2: Categorías (usar color medium)
            if (typedNode.depth === 2) {
              return getGroupColor(groupName, 'light');
            }

            // Nivel 3+: Subcategorías (usar color light)
            return getGroupColor(groupName, 'dark');
          }}
          childColor={{
            from: 'color',
            modifiers: [['brighter', 0.1]],
          }}
          enableArcLabels
          arcLabel={(d: { percentage: number; data: TransformedNode }) => {
            // Solo mostrar label si el arco es suficientemente grande
            if (d.percentage < 5) return '';
            return `${d.data.icon || ''} ${d.data.label}`;
          }}
          arcLabelsSkipAngle={10}
          arcLabelsTextColor={{
            from: 'color',
            modifiers: [['darker', 2]],
          }}
          tooltip={(node: { data: TransformedNode; value: number; percentage: number; color: string }) => (
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
