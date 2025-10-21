'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Gráfico de barras: Ingresos vs Gastos
 * Estado: Estructura sin datos reales
 * TODO: Conectar con datos del servidor
 */
export function IngresosVsGastos() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📈 Ingresos vs Gastos
        </CardTitle>
        <CardDescription>Comparativa mensual</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-64 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/20">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Gráfico de barras: Ingresos vs Gastos</p>
            <p className="text-xs mt-1">(Datos reales próximamente)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
