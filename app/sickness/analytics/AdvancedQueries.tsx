'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, CalendarDays, Copy, Download, FileJson, Loader2, PieChart, Play, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { executeQuery, type QueryResult } from './queries-actions';
import { QUERY_CATALOG } from './query-catalog';

interface AdvancedQueriesProps {
  householdId: string | null;
  periods: Array<{ year: number; month: number; id: string }>;
  selectedPeriod: { year: number; month: number } | null;
}

const CATEGORY_CONFIG = {
  gastos: {
    label: 'Gastos',
    icon: TrendingDown,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
    description: 'Analiza patrones de gasto por categoría y período'
  },
  ingresos: {
    label: 'Ingresos',
    icon: TrendingUp,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    description: 'Revisa ingresos y compara con presupuesto'
  },
  balance: {
    label: 'Balance',
    icon: PieChart,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    description: 'Visualiza balances y proyecciones financieras'
  },
  comparativa: {
    label: 'Comparativas',
    icon: CalendarDays,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    description: 'Compara datos entre diferentes períodos'
  },
  tendencias: {
    label: 'Tendencias',
    icon: BarChart3,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    description: 'Identifica patrones temporales y estacionales'
  },
  miembros: {
    label: 'Miembros',
    icon: Users,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/20',
    description: 'Analiza contribuciones por miembro del hogar'
  },
};

export function AdvancedQueries({ householdId, periods, selectedPeriod }: AdvancedQueriesProps) {
  const [activeCategory, setActiveCategory] = useState<keyof typeof CATEGORY_CONFIG>('gastos');
  const [selectedQueryId, setSelectedQueryId] = useState<string>('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    selectedPeriod ? `${selectedPeriod.year}-${selectedPeriod.month}` : ''
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);

  const availableQueries = QUERY_CATALOG.filter(q => q.category === activeCategory);
  const selectedQuery = availableQueries.find((q) => q.id === selectedQueryId);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category as keyof typeof CATEGORY_CONFIG);
    setSelectedQueryId('');
    setResult(null);
  };

  const handleExecuteQuery = async () => {
    if (!householdId || !selectedQueryId) return;
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (selectedQuery?.requiresPeriod && selectedPeriodId && selectedPeriodId !== 'all') {
        const [year, month] = selectedPeriodId.split('-').map(Number);
        params.year = year;
        params.month = month;
      }
      // Si selectedPeriodId === 'all', no pasamos year/month (quedará undefined)
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
        data: result.rows.map((row: Record<string, unknown>) =>
          result.columns.map((col) => row[col.toLowerCase().replace(/ /g, '_')])
        ),
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
      const json = JSON.stringify(result, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
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

  const handleCopyResults = () => {
    if (!result) return;
    try {
      const text = result.rows
        .map((row: Record<string, unknown>) =>
          result.columns.map((col) => row[col.toLowerCase().replace(/ /g, '_')]).join('\t')
        )
        .join('\n');
      navigator.clipboard.writeText(text);
      toast.success('Resultados copiados al portapapeles');
    } catch (error) {
      console.error('Error copying results:', error);
      toast.error('Error al copiar resultados');
    }
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Consultas Avanzadas
        </CardTitle>
        <CardDescription>
          Ejecuta consultas predefinidas organizadas por categorías para análisis detallado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeCategory} onValueChange={handleCategoryChange} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              const queriesCount = QUERY_CATALOG.filter(q => q.category === key).length;
              return (
                <TabsTrigger key={key} value={key} className="gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{config.label}</span>
                  <Badge variant="secondary" className="ml-1 hidden md:inline">
                    {queriesCount}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
            <TabsContent key={key} value={key} className="space-y-4 mt-6">
              <div className={`p-4 rounded-lg border ${config.bgColor}`}>
                <p className={`text-sm ${config.color} font-medium`}>
                  {config.description}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Consulta</label>
                  <Select value={selectedQueryId} onValueChange={setSelectedQueryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una consulta..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableQueries.map((query) => (
                        <SelectItem key={query.id} value={query.id}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{query.label}</span>
                            <span className="text-xs text-muted-foreground">{query.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedQuery?.requiresPeriod && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Período</label>
                    <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona período..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <span className="font-medium">📊 Todos los períodos</span>
                        </SelectItem>
                        {periods.map((period) => (
                          <SelectItem key={period.id} value={`${period.year}-${period.month}`}>
                            {new Date(period.year, period.month - 1).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'long',
                            })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleExecuteQuery}
                  disabled={!selectedQueryId || loading || (selectedQuery?.requiresPeriod && !selectedPeriodId)}
                  className="gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {loading ? 'Ejecutando...' : 'Ejecutar Consulta'}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {result && (
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Resultados</h3>
                <p className="text-sm text-muted-foreground">
                  {result.rows.length} {result.rows.length === 1 ? 'resultado' : 'resultados'} encontrados
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyResults} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportJSON} className="gap-2">
                  <FileJson className="h-4 w-4" />
                  JSON
                </Button>
              </div>
            </div>

            {result.summary && (
              <div className="grid gap-4 md:grid-cols-5">
                {result.summary.total !== undefined && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{result.summary.total.toLocaleString('es-ES')}</p>
                    </CardContent>
                  </Card>
                )}
                {result.summary.average !== undefined && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Promedio</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{result.summary.average.toLocaleString('es-ES')}</p>
                    </CardContent>
                  </Card>
                )}
                {result.summary.count !== undefined && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Cantidad</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{result.summary.count}</p>
                    </CardContent>
                  </Card>
                )}
                {result.summary.max !== undefined && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Máximo</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{result.summary.max.toLocaleString('es-ES')}</p>
                    </CardContent>
                  </Card>
                )}
                {result.summary.min !== undefined && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Mínimo</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{result.summary.min.toLocaleString('es-ES')}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      {result.columns.map((column) => (
                        <TableHead key={column} className="font-semibold">
                          {column}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.map((row: Record<string, unknown>, index: number) => (
                      <TableRow key={index}>
                        {result.columns.map((column) => {
                          const key = column.toLowerCase().replace(/ /g, '_');
                          const value = row[key];
                          return (
                            <TableCell key={column}>
                              {typeof value === 'number' ? value.toLocaleString('es-ES') : String(value ?? '')}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {!result && !loading && selectedQueryId && (
          <div className="text-center py-12 text-muted-foreground">
            <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Haz clic en &quot;Ejecutar Consulta&quot; para ver los resultados</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
