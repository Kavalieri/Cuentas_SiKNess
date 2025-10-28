'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, CalendarDays, Copy, Download, FileJson, Loader2, PieChart, Play, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { executeQuery, QUERY_CATALOG, type QueryResult } from './queries-actions';

interface AdvancedQueriesProps {
  householdId: string | null;
  periods: Array<{ year: number; month: number; id: string }>;
  selectedPeriod: { year: number; month: number } | null;
}

const CATEGORY_LABELS = {
  gastos: 'Análisis de Gastos',
  ingresos: 'Análisis de Ingresos',
  balance: 'Balance y Resumen',
  comparativa: 'Análisis Comparativo',
  tendencias: 'Tendencias Temporales',
  miembros: 'Análisis por Miembro',
};

const CATEGORY_ICONS = {
  gastos: TrendingUp,
  ingresos: BarChart3,
  balance: PieChart,
  comparativa: CalendarDays,
  tendencias: TrendingUp,
  miembros: TrendingUp,
};

export function AdvancedQueries({ householdId, periods, selectedPeriod }: AdvancedQueriesProps) {
  const [selectedQueryId, setSelectedQueryId] = useState<string>('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    selectedPeriod ? `${selectedPeriod.year}-${selectedPeriod.month}` : ''
  );
  const [topN, setTopN] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);

  const selectedQuery = QUERY_CATALOG.find((q) => q.id === selectedQueryId);

  const handleExecuteQuery = async () => {
    if (!householdId || !selectedQueryId) return;

    setLoading(true);
    try {
      const params: Record<string, unknown> = {};

      if (selectedQuery?.requiresPeriod && selectedPeriodId) {
        const [year, month] = selectedPeriodId.split('-').map(Number);
        params.year = year;
        params.month = month;
      }

      if (selectedQuery?.id.includes('top')) {
        params.topN = topN;
      }

      const queryResult = await executeQuery(selectedQueryId, householdId, params);
      setResult(queryResult);
      toast.success('Consulta ejecutada correctamente');
    } catch (error) {
      console.error('Error executing query:', error);
      toast.error('Error al ejecutar la consulta');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!result || !selectedQuery) return;

    try {
      const Papa = await import('papaparse');
      const csv = Papa.default.unparse({
        fields: result.columns,
        data: result.rows.map((row: Record<string, unknown>) => result.columns.map((col) => row[col.toLowerCase().replace(/ /g, '_')])),
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${selectedQueryId}_${Date.now()}.csv`;
      link.click();
      toast.success('CSV exportado correctamente');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Error al exportar CSV');
    }
  };

  const handleExportJSON = () => {
    if (!result || !selectedQuery) return;

    try {
      const jsonData = {
        query: selectedQuery.label,
        executedAt: new Date().toISOString(),
        data: result,
      };

      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${selectedQueryId}_${Date.now()}.json`;
      link.click();
      toast.success('JSON exportado correctamente');
    } catch (error) {
      console.error('Error exporting JSON:', error);
      toast.error('Error al exportar JSON');
    }
  };

  const handleCopyToClipboard = async () => {
    if (!result || !selectedQuery) return;

    try {
      const Papa = await import('papaparse');
      const csv = Papa.default.unparse({
        fields: result.columns,
        data: result.rows.map((row: Record<string, unknown>) => result.columns.map((col) => row[col.toLowerCase().replace(/ /g, '_')])),
      });

      await navigator.clipboard.writeText(csv);
      toast.success('Datos copiados al portapapeles');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Error al copiar al portapapeles');
    }
  };

  const formatCurrency = (value: unknown) => {
    if (typeof value !== 'number') return String(value);
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number' && value % 1 !== 0) {
      return formatCurrency(value);
    }
    return String(value);
  };

  // Agrupar consultas por categoría
  const groupedQueries: Record<string, typeof QUERY_CATALOG> = {};
  QUERY_CATALOG.forEach((query) => {
    if (!groupedQueries[query.category]) {
      groupedQueries[query.category] = [];
    }
    groupedQueries[query.category]!.push(query);
  });

  const canExecute = Boolean(
    householdId &&
      selectedQueryId &&
      (!selectedQuery?.requiresPeriod || selectedPeriodId)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Configuración de Consulta
          </CardTitle>
          <CardDescription>Selecciona el tipo de análisis y ajusta los parámetros</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de Consulta */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Consulta</label>
            <Select value={selectedQueryId} onValueChange={setSelectedQueryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una consulta..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedQueries).map(([category, queries]) => {
                  const Icon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS];
                  return (
                    <SelectGroup key={category}>
                      <SelectLabel className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                      </SelectLabel>
                      {queries.map((query) => (
                        <SelectItem key={query.id} value={query.id}>
                          {query.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedQuery && (
              <p className="text-sm text-muted-foreground">{selectedQuery.description}</p>
            )}
          </div>

          {/* Filtros dinámicos */}
          {selectedQuery && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="text-sm font-medium">Parámetros</h4>

              {/* Filtro de período */}
              {selectedQuery.requiresPeriod && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Período</label>
                  <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un período..." />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map((period) => {
                        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                        const label = `${months[period.month - 1]} ${period.year}`;
                        return (
                          <SelectItem key={period.id} value={`${period.year}-${period.month}`}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Filtro Top N */}
              {selectedQuery && selectedQuery.id.includes('top') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Número de resultados (Top N)</label>
                  <Select value={String(topN)} onValueChange={(value) => setTopN(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 5, 10, 15, 20].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          Top {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Botón Ejecutar */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleExecuteQuery} disabled={!canExecute || loading} size="lg">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ejecutando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Ejecutar Consulta
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Resultados</CardTitle>
                <CardDescription>
                  {result.rows.length} resultado(s) encontrado(s)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportJSON}>
                  <FileJson className="h-4 w-4 mr-2" />
                  JSON
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Resumen */}
            {result.summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {Object.entries(result.summary).map(([key, value]) => (
                  <Card key={key}>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{formatValue(value)}</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Tabla de Resultados */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {result.columns.map((column) => (
                      <TableHead key={column}>{column}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((row: Record<string, unknown>, index: number) => (
                    <TableRow key={index}>
                      {result.columns.map((column) => {
                        const key = column.toLowerCase().replace(/ /g, '_');
                        return <TableCell key={column}>{formatValue(row[key])}</TableCell>;
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensaje cuando no hay resultados */}
      {!result && !loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay resultados</p>
              <p className="text-sm">Selecciona una consulta y haz clic en "Ejecutar Consulta"</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
