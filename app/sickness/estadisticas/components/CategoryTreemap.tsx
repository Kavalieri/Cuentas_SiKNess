'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getHierarchicalColor } from '@/lib/categoryColors';
import { formatCurrency } from '@/lib/format';
import { ResponsiveTreeMap } from '@nivo/treemap';
import { useCallback, useEffect, useState } from 'react';

interface TreemapNode {
  name: string;
  id?: string; // ID único generado
  value?: number;
  children?: TreemapNode[];
  color?: string;
  icon?: string;
  parentName?: string;
}

interface TreemapData {
  name: string;
  id?: string; // ID único generado
  color?: string;
  icon?: string;
  parentName?: string;
  children: TreemapNode[];
}

interface CategoryTreemapProps {
  householdId: string;
  startDate?: string;
  endDate?: string;
  type?: 'expense' | 'income' | 'all';
}

export function CategoryTreemap({ householdId, startDate, endDate, type = 'expense' }: CategoryTreemapProps) {
  const [data, setData] = useState<TreemapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generar IDs únicos recursivamente para evitar colisiones con nombres duplicados
  const generateUniqueIds = (node: TreemapNode, parentPath = ''): TreemapNode => {
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    const nodeWithId: TreemapNode = {
      ...node,
      id: currentPath,
    };

    if (node.children) {
      nodeWithId.children = node.children.map(child => generateUniqueIds(child, currentPath));
    }

    return nodeWithId;
  };

  const loadTreemapData = useCallback(async () => {
    if (!householdId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        householdId,
        type: type === 'all' ? '' : type,
      });

      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/sickness/statistics/treemap?${params}`);
      if (!response.ok) throw new Error('Error al cargar datos del treemap');

      const result = await response.json();

      // Generar IDs únicos para todos los nodos
      const dataWithIds: TreemapData = {
        ...result.data,
        id: 'root',
        children: result.data.children?.map((child: TreemapNode) => generateUniqueIds(child)) || [],
      };

      setData(dataWithIds);
    } catch (err) {
      console.error('Error loading treemap data:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [householdId, startDate, endDate, type]);

  useEffect(() => {
    loadTreemapData();
  }, [loadTreemapData]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribución por Categorías</CardTitle>
          <CardDescription>Análisis jerárquico de {type === 'expense' ? 'gastos' : type === 'income' ? 'ingresos' : 'transacciones'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">Cargando datos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribución por Categorías</CardTitle>
          <CardDescription>Análisis jerárquico de {type === 'expense' ? 'gastos' : type === 'income' ? 'ingresos' : 'transacciones'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-red-500">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.children || data.children.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribución por Categorías</CardTitle>
          <CardDescription>Análisis jerárquico de {type === 'expense' ? 'gastos' : type === 'income' ? 'ingresos' : 'transacciones'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">No hay datos disponibles para el período seleccionado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Distribución por Categorías</CardTitle>
        <CardDescription>
          Análisis jerárquico de {type === 'expense' ? 'gastos' : type === 'income' ? 'ingresos' : 'transacciones'}
          {' • '}Haz clic para explorar subcategorías
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveTreeMap
            data={data}
            identity="id"
            value="value"
            valueFormat={(value) => formatCurrency(value)}
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
            labelSkipSize={20}
            labelTextColor={{
              from: 'color',
              modifiers: [['darker', 2.5]],
            }}
            parentLabelPosition="left"
            parentLabelTextColor={{
              from: 'color',
              modifiers: [['darker', 2.5]],
            }}
            borderColor={{
              from: 'color',
              modifiers: [['darker', 1.5]],
            }}
            colors={(node) => {
              const pathParts = node.pathComponents || [];
              const depth = pathParts.length;

              // Si es el nodo raíz (root), usar color por defecto
              if (node.id === 'root') {
                return '#1e293b'; // slate-800 para el fondo
              }

              // Nivel 1 = grupos
              if (depth === 1) {
                return getHierarchicalColor(node.id as string, 1);
              }

              // Nivel 2+ = categorías/subcategorías
              // Extraer nombre del grupo del path
              const groupName = pathParts[1] ? String(pathParts[1]) : undefined;
              return getHierarchicalColor(groupName, depth);
            }}
            nodeOpacity={0.95}
            borderWidth={3}
            enableParentLabel={true}
            parentLabelSize={16}
            label={(node) => {
              // Mostrar icono + solo el nombre (no el path completo)
              const icon = node.data.icon || '';
              const name = node.data.name || node.id?.split('/').pop() || node.id;
              return `${icon} ${name}`.trim();
            }}
            tooltip={({ node }) => {
              // Calcular profundidad del nodo
              const pathParts = node.pathComponents || [];
              const depth = pathParts.length;

              return (
                <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {node.data.icon && <span className="text-xl">{node.data.icon}</span>}
                    <span className="font-semibold">{node.id}</span>
                  </div>
                  <div className="text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Monto:</span>
                      <span className="font-medium">{formatCurrency(node.value)}</span>
                    </div>
                    {node.data.parentName && (
                      <div className="flex justify-between gap-4 mt-1">
                        <span className="text-muted-foreground">Categoría:</span>
                        <span className="text-sm">{node.data.parentName}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-4 mt-1">
                      <span className="text-muted-foreground">Nivel:</span>
                      <span className="text-sm">
                        {depth === 0 ? 'Raíz' : depth === 1 ? 'Grupo' : depth === 2 ? 'Categoría' : 'Subcategoría'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
            animate={true}
            motionConfig="gentle"
          />
        </div>
      </CardContent>
    </Card>
  );
}
