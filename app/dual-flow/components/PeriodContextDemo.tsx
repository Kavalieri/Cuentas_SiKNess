'use client';

import { usePeriodContext } from '@/app/dual-flow/contexts/PeriodContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPeriodMonth } from '@/lib/periods';
import { Calendar, ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';

/**
 * Componente de prueba para mostrar el estado del PeriodContext
 * Muestra período seleccionado, datos cargados y controles de navegación
 */
export function PeriodContextDemo() {
  const {
    currentPeriod,
    selectedPeriod,
    periodData,
    loading,
    error,
    householdId,
    refresh,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
  } = usePeriodContext();

  const isCurrentMonth =
    selectedPeriod.year === currentPeriod.year && selectedPeriod.month === currentPeriod.month;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          PeriodContext Demo
        </CardTitle>
        <CardDescription>Estado del contexto de período conectado a PostgreSQL</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Información del hogar */}
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm">
            <strong>Hogar ID:</strong> {householdId || 'No disponible'}
          </p>
        </div>

        {/* Navegación de período */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={goToPreviousMonth} disabled={loading}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-center">
            <h3 className="text-lg font-semibold">
              {formatPeriodMonth(selectedPeriod.year, selectedPeriod.month)}
            </h3>
            <div className="flex items-center gap-2 justify-center mt-1">
              {isCurrentMonth && <Badge variant="default">Actual</Badge>}
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>

          <Button variant="outline" onClick={goToNextMonth} disabled={loading}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Botón para ir al mes actual */}
        {!isCurrentMonth && (
          <Button variant="outline" onClick={goToCurrentMonth} className="w-full">
            Ir al mes actual
          </Button>
        )}

        {/* Estado de carga */}
        {loading && (
          <div className="text-center py-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Cargando datos del período...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Datos del período */}
        {!loading && !error && (
          <div className="space-y-3">
            {periodData ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Período encontrado:</h4>
                <div className="space-y-1 text-sm text-green-700">
                  <p>
                    <strong>ID:</strong> {periodData.id}
                  </p>
                  <p>
                    <strong>Estado:</strong> {periodData.status}
                  </p>
                  <p>
                    <strong>Balance inicial:</strong> €{periodData.opening_balance || 0}
                  </p>
                  <p>
                    <strong>Balance final:</strong> €{periodData.closing_balance || 0}
                  </p>
                  <p>
                    <strong>Ingresos:</strong> €{periodData.total_income || 0}
                  </p>
                  <p>
                    <strong>Gastos:</strong> €{periodData.total_expenses || 0}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  No hay datos del período. Puede que no exista aún.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Botón de refrescar */}
        <Button variant="outline" onClick={refresh} disabled={loading} className="w-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refrescar datos
        </Button>
      </CardContent>
    </Card>
  );
}
