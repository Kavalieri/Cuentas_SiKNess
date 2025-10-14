'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, CheckCircle, Clock, Info, Sparkles, TrendingUp, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface LiveNotificationsProps {
  currentPeriod: string;
  workflowProgress: number;
  currentStep: number;
  totalSteps: number;
  nextActionTitle: string;
  nextActionHref: string;
}

interface NotificationStats {
  activeMembers: number;
  lastActivity: string;
  recentTransactions: number;
  currentPeriodBalance: number;
  currentPeriodStatus: string;
  systemHealth: string;
}

export default function LiveNotifications({
  currentPeriod,
  workflowProgress,
  currentStep,
  totalSteps,
  nextActionTitle,
  nextActionHref,
}: LiveNotificationsProps) {
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dual-flow/notifications/stats');
        if (response.ok) {
          const result = await response.json();
          if (result.ok) {
            setStats(result.data);
          }
        }
      } catch (error) {
        console.error('Error fetching notification stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);
  const getStepTitle = (step: number): string => {
    const steps = [
      'Configuración inicial',
      'Definir contribuciones',
      'Registrar gastos',
      'Revisar transacciones',
      'Calcular balances',
      'Aplicar liquidaciones',
      'Cerrar período',
    ];
    return steps[step - 1] || 'Proceso completado';
  };

  const getMotivationalMessage = (): string => {
    if (workflowProgress < 20)
      return '¡Excelente comienzo! Cada paso te acerca más al control financiero.';
    if (workflowProgress < 50)
      return '¡Vas por buen camino! Mantén el ritmo para obtener mejores resultados.';
    if (workflowProgress < 80)
      return '¡Impresionante progreso! Estás dominando el sistema dual-flow.';
    return '¡Casi completado! Eres un experto en gestión financiera colaborativa.';
  };

  const getProgressColor = (): string => {
    if (workflowProgress < 25) return 'text-red-600';
    if (workflowProgress < 50) return 'text-orange-600';
    if (workflowProgress < 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressBadge = () => {
    if (workflowProgress < 25) return { variant: 'destructive' as const, text: 'Iniciando' };
    if (workflowProgress < 50) return { variant: 'secondary' as const, text: 'En progreso' };
    if (workflowProgress < 75) return { variant: 'default' as const, text: 'Avanzado' };
    return { variant: 'default' as const, text: 'Casi completo' };
  };

  return (
    <div className="space-y-4">
      {/* Notificación principal del período */}
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <Sparkles className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            <strong>Período activo:</strong> {currentPeriod} •
            <span className="ml-1">Progreso: {workflowProgress.toFixed(1)}%</span>
          </span>
          <Badge {...getProgressBadge()}>{getProgressBadge().text}</Badge>
        </AlertDescription>
      </Alert>

      {/* Progreso del workflow actual */}
      <Card className="animate-in fade-in-0 duration-500 slide-in-from-top-4">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Progreso del Workflow
            </span>
            <Badge variant="outline">
              Paso {currentStep} de {totalSteps}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barra de progreso visual */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{getStepTitle(currentStep)}</span>
              <span className={`font-bold ${getProgressColor()}`}>
                {workflowProgress.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${workflowProgress}%` }}
              />
            </div>
          </div>

          {/* Mensaje motivacional */}
          <div className="p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">{getMotivationalMessage()}</p>
            </div>
          </div>

          {/* Próxima acción sugerida */}
          <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Próximo paso:</span>
              <span className="text-sm text-muted-foreground">{nextActionTitle}</span>
            </div>
            <Button asChild size="sm">
              <Link href={nextActionHref}>Continuar</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notificaciones en tiempo real */}
      <Card className="animate-in fade-in-0 duration-500 slide-in-from-top-4 delay-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-purple-500" />
            Notificaciones Recientes
            <Badge variant="outline" className="ml-auto">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
              En vivo
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Notificaciones contextuales */}
          <div className="space-y-2">
            {stats && stats.recentTransactions > 0 && (
              <div className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <p className="text-sm">
                    {stats.recentTransactions} transacción{stats.recentTransactions > 1 ? 'es' : ''}{' '}
                    en las últimas 24h
                  </p>
                  <p className="text-xs text-muted-foreground">hace unos minutos</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div className="flex-1">
                <p className="text-sm">Sistema sincronizado correctamente</p>
                <p className="text-xs text-muted-foreground">hace 3 minutos</p>
              </div>
            </div>

            {stats && stats.activeMembers > 1 && (
              <div className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <p className="text-sm">{stats.activeMembers} miembros colaborando activamente</p>
                  <p className="text-xs text-muted-foreground">hace 1 hora</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
              <div className="flex-1">
                <p className="text-sm">Recordatorio: Revisar transacciones pendientes</p>
                <p className="text-xs text-muted-foreground">hace 2 horas</p>
              </div>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="pt-3 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="h-3 w-3 text-blue-500" />
                  <span className="text-sm font-bold">{stats ? stats.activeMembers : '...'}</span>
                </div>
                <p className="text-xs text-muted-foreground">Miembros activos</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="h-3 w-3 text-orange-500" />
                  <span className="text-sm font-bold">{stats ? stats.lastActivity : '...'}</span>
                </div>
                <p className="text-xs text-muted-foreground">Última actividad</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Info className="h-3 w-3 text-green-500" />
                  <span className="text-sm font-bold">{stats ? stats.systemHealth : '...'}</span>
                </div>
                <p className="text-xs text-muted-foreground">Sistema operativo</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
