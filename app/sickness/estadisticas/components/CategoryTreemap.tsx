'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getGroupColor } from '@/lib/categoryColors';
import { formatCurrency } from '@/lib/format';
import { ResponsiveTreeMap } from '@nivo/treemap';
import { useCallback, useEffect, useState } from 'react';

interface TreemapNode {
  name: string;
  value?: number;
  children?: TreemapNode[];
  color?: string;
  icon?: string;
  parentName?: string;
}

interface TreemapData {
  name: string;
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
      setData(result.data);
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
    <Card>
      <CardHeader>
        <CardTitle>Distribución por Categorías</CardTitle>
        <CardDescription>
          Análisis jerárquico de {type === 'expense' ? 'gastos' : type === 'income' ? 'ingresos' : 'transacciones'}
          {' • '}Haz clic para explorar subcategorías
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveTreeMap
            data={data}
            identity="name"
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
              modifiers: [['darker', 0.3]],
            }}
            colors={(node) => {
              // Usar el color del nodo si está definido explícitamente
              if (node.data.color) return node.data.color;

              // Determinar el nivel basado en el path del nodo
              const pathParts = node.pathComponents || [];
              const depth = pathParts.length;

              // Nivel 0: Raíz (no se muestra normalmente)
              if (depth === 0 || depth === 1) {
                return type === 'expense' ? '#ef4444' : '#10b981';
              }

              // Para niveles 2+: extraer el nombre del grupo
              // Nivel 2 es el grupo mismo, niveles 3+ son hijos del grupo
              let groupName: string;

              if (depth === 2) {
                // Nivel 2: Este ES el grupo (pathParts[1])
                groupName = pathParts[1] as string;
                return getGroupColor(groupName, 'base');
              } else {
                // Nivel 3+: Categorías y subcategorías - usar parentName del dato
                groupName = node.data.parentName || pathParts[1] as string;

                if (!groupName) {
                  return type === 'expense' ? '#ef4444' : '#10b981';
                }

                // Nivel 3: Categorías - Color medium
                if (depth === 3) {
                  return getGroupColor(groupName, 'light');
                }

                // Nivel 4+: Subcategorías - Color light
                return getGroupColor(groupName, 'dark');
              }
            }}
            nodeOpacity={0.9}
            borderWidth={2}
            enableParentLabel={true}
            parentLabelSize={16}
            label={(node) => {
              // Mostrar icono + nombre si está disponible
              const icon = node.data.icon || '';
              return `${icon} ${node.id}`.trim();
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
