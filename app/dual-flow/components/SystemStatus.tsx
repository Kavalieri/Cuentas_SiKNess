'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Activity,
  CheckCircle2,
  Clock,
  Database,
  RefreshCw,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

interface SystemStatusProps {
  totalTransactions: number;
  pendingTransactions: number;
  autoMatched: number;
  processingRate: number;
  lastSyncTime: string;
  householdMembers: number;
  periodsManaged: number;
}

export default function SystemStatus({
  totalTransactions,
  pendingTransactions,
  autoMatched,
  processingRate,
  lastSyncTime,
  householdMembers,
  periodsManaged,
}: SystemStatusProps) {
  const automationRate = totalTransactions > 0 ? (autoMatched / totalTransactions) * 100 : 0;
  const completionRate =
    totalTransactions > 0
      ? ((totalTransactions - pendingTransactions) / totalTransactions) * 100
      : 0;

  const getStatusColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (rate: number) => {
    if (rate >= 90) return { variant: 'default' as const, text: 'Excelente' };
    if (rate >= 70) return { variant: 'secondary' as const, text: 'Bueno' };
    return { variant: 'destructive' as const, text: 'Necesita atención' };
  };

  return (
    <Card className="animate-in fade-in-0 duration-700 slide-in-from-right-4 delay-400">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          Estado del Sistema
          <Badge variant="outline" className="ml-auto">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
            En línea
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Métricas principales */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Database className="h-4 w-4 text-blue-500" />
              <span className="text-lg font-bold">{totalTransactions}</span>
            </div>
            <p className="text-xs text-muted-foreground">Transacciones totales</p>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-4 w-4 text-purple-500" />
              <span className="text-lg font-bold">{householdMembers}</span>
            </div>
            <p className="text-xs text-muted-foreground">Miembros activos</p>
          </div>
        </div>

        {/* Indicadores de rendimiento */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Automatización</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${getStatusColor(automationRate)}`}>
                {automationRate.toFixed(1)}%
              </span>
              <Badge {...getStatusBadge(automationRate)} className="text-xs">
                {getStatusBadge(automationRate).text}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Procesamiento</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${getStatusColor(completionRate)}`}>
                {completionRate.toFixed(1)}%
              </span>
              <Badge {...getStatusBadge(completionRate)} className="text-xs">
                {getStatusBadge(completionRate).text}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium">Rendimiento</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${getStatusColor(processingRate)}`}>
                {processingRate.toFixed(1)}%
              </span>
              <Badge {...getStatusBadge(processingRate)} className="text-xs">
                {getStatusBadge(processingRate).text}
              </Badge>
            </div>
          </div>
        </div>

        {/* Estado de transacciones pendientes */}
        {pendingTransactions > 0 && (
          <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                {pendingTransactions} transacciones esperando
              </span>
            </div>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              Estas transacciones necesitan tu revisión para completar el procesamiento.
            </p>
          </div>
        )}

        {/* Información de sincronización */}
        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            <span>Última actualización</span>
          </div>
          <span>{lastSyncTime}</span>
        </div>

        {/* Estadísticas adicionales */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <div className="text-sm font-bold text-green-600">{autoMatched}</div>
            <div className="text-xs text-muted-foreground">Auto-procesadas</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-blue-600">{periodsManaged}</div>
            <div className="text-xs text-muted-foreground">Períodos gestionados</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-purple-600">
              {totalTransactions > 0
                ? Math.round(totalTransactions / Math.max(periodsManaged, 1))
                : 0}
            </div>
            <div className="text-xs text-muted-foreground">Trans./período</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
