'use client';

import { useState } from 'react';
import { TrendLineChart } from './TrendLineChart';
import { TrendLineChartTV } from './TrendLineChartTV';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp } from 'lucide-react';

interface TrendChartComparatorProps {
  householdId: string;
  type: 'expense' | 'income';
  months?: number;
}

export function TrendChartComparator({
  householdId,
  type,
  months = 6,
}: TrendChartComparatorProps) {
  const [view, setView] = useState<'recharts' | 'tradingview' | 'both'>('both');

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>🧪 Comparador de Gráficos A/B Testing</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={view === 'recharts' ? 'default' : 'outline'}
                onClick={() => setView('recharts')}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Recharts
              </Button>
              <Button
                size="sm"
                variant={view === 'tradingview' ? 'default' : 'outline'}
                onClick={() => setView('tradingview')}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                TradingView
              </Button>
              <Button
                size="sm"
                variant={view === 'both' ? 'default' : 'outline'}
                onClick={() => setView('both')}
              >
                Ambos
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Compara Recharts (actual) vs TradingView Lightweight Charts (propuesto). Valora:
            rendimiento, UX, zoom/pan, crosshair, y experiencia general.
          </p>
        </CardContent>
      </Card>

      {/* Charts Display */}
      {(view === 'recharts' || view === 'both') && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Recharts (Actual)</h3>
          </div>
          <TrendLineChart householdId={householdId} type={type} defaultMonths={months} />
        </div>
      )}

      {(view === 'tradingview' || view === 'both') && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">TradingView Lightweight Charts (Propuesto)</h3>
          </div>
          <TrendLineChartTV householdId={householdId} type={type} months={months} />
        </div>
      )}

      {/* Comparison Table */}
      {view === 'both' && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Comparación de Características</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Característica</th>
                    <th className="p-2 text-center">Recharts</th>
                    <th className="p-2 text-center">TradingView</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2">Zoom con scroll</td>
                    <td className="p-2 text-center">❌</td>
                    <td className="p-2 text-center">✅</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Pan (arrastrar)</td>
                    <td className="p-2 text-center">❌</td>
                    <td className="p-2 text-center">✅</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Crosshair preciso</td>
                    <td className="p-2 text-center">⚠️ Básico</td>
                    <td className="p-2 text-center">✅ Profesional</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Rendimiento (60fps)</td>
                    <td className="p-2 text-center">⚠️ SVG</td>
                    <td className="p-2 text-center">✅ Canvas</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Bundle size</td>
                    <td className="p-2 text-center">✅ ~50KB</td>
                    <td className="p-2 text-center">⚠️ ~200KB</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Soporte TreeMap</td>
                    <td className="p-2 text-center">✅ (Nivo)</td>
                    <td className="p-2 text-center">❌</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Línea de promedio</td>
                    <td className="p-2 text-center">✅</td>
                    <td className="p-2 text-center">✅</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Experiencia financiera</td>
                    <td className="p-2 text-center">⚠️ Genérico</td>
                    <td className="p-2 text-center">✅ Profesional</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <p>
                <strong>📝 Conclusiones iniciales:</strong>
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li>
                  <strong>TradingView</strong> ofrece mejor UX para análisis temporal (zoom, pan,
                  crosshair)
                </li>
                <li>
                  <strong>Recharts/Nivo</strong> necesarios para TreeMap y Pareto (TradingView no
                  los soporta)
                </li>
                <li>
                  <strong>Bundle size</strong>: +150KB si mezclamos ambas librerías
                </li>
                <li>
                  <strong>Recomendación</strong>: Solo migrar TrendLineChart, mantener
                  Recharts/Nivo para resto
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
