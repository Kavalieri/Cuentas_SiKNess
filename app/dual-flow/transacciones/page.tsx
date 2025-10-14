'use client';

import { usePeriodContext } from '@/app/dual-flow/contexts/PeriodContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUpDown, Calculator } from 'lucide-react';
import { useState } from 'react';

/**
 * Página de Transacciones - Unifica contribuciones y balance del período seleccionado
 * Muestra datos reales del hogar activo en el período seleccionado
 */
export default function TransaccionesPage() {
  const { selectedPeriod, periodData, loading, error } = usePeriodContext();
  const [activeTab, setActiveTab] = useState('contribuciones');

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Cargando datos del período...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8 text-destructive">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header con contexto del período */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ArrowUpDown className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Transacciones</h1>
            <p className="text-muted-foreground">
              {selectedPeriod.month}/{selectedPeriod.year} • Balance: €
              {periodData?.closing_balance || 0}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="contribuciones" className="flex-1">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Contribuciones
          </TabsTrigger>
          <TabsTrigger value="balance" className="flex-1">
            <Calculator className="h-4 w-4 mr-2" />
            Balance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contribuciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contribuciones del Período</CardTitle>
              <CardDescription>
                Gastos y contribuciones para {selectedPeriod.month}/{selectedPeriod.year}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                {periodData ? (
                  <div>
                    <p>Período: {periodData.status}</p>
                    <p>Balance inicial: €{periodData.opening_balance}</p>
                    <p>Balance actual: €{periodData.closing_balance}</p>
                    <p className="mt-4 text-sm">Integración con contribuciones en desarrollo</p>
                  </div>
                ) : (
                  <p>No hay datos para este período</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Balance del Período</CardTitle>
              <CardDescription>
                Ajustes y reembolsos pendientes para {selectedPeriod.month}/{selectedPeriod.year}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Balance de cierre: €{periodData?.closing_balance || 0}</p>
                <p className="mt-4 text-sm">Funcionalidad de balance detallado en desarrollo</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
