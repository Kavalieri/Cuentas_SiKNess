'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Gráfico circular: Gastos por categoría
 * Estado: Estructura sin datos reales
 * TODO: Conectar con datos del servidor
 */
export function GastosPorCategoria() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📊 Gastos por Categoría
        </CardTitle>
        <CardDescription>Distribución de gastos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-64 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/20">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Gráfico circular: Gastos por categoría</p>
            <p className="text-xs mt-1">(Datos reales próximamente)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
