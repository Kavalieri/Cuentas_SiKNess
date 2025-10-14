'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  Euro,
  HandHeart,
  Info,
  Settings,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

interface AlertsAndGuidanceProps {
  monthlyGoal: number;
  spent: number;
  pendingTransactions: number;
  autoMatched: number;
  totalTransactions: number;
  reimbursementsPending: number;
  hasMembers: boolean;
  currentMonth: string;
  daysInMonth: number;
  currentDay: number;
}

export default function AlertsAndGuidance({
  monthlyGoal,
  spent,
  pendingTransactions,
  autoMatched,
  totalTransactions,
  reimbursementsPending,
  hasMembers,
  currentMonth,
  daysInMonth,
  currentDay,
}: AlertsAndGuidanceProps) {
  const progressPercentage = monthlyGoal > 0 ? (spent / monthlyGoal) * 100 : 0;
  const remainingAmount = monthlyGoal - spent;
  const daysRemaining = daysInMonth - currentDay;
  const dailyBudgetRemaining =
    remainingAmount > 0 ? remainingAmount / Math.max(daysRemaining, 1) : 0;
  const dailySpendingAverage = currentDay > 0 ? spent / currentDay : 0;

  // Generar alertas dinámicas basadas en el estado actual
  const alerts = [];
  const nextSteps = [];
  const insights = [];

  // ============ ALERTAS CRÍTICAS ============
  if (monthlyGoal === 0) {
    alerts.push({
      type: 'critical',
      title: '⚠️ Objetivo mensual no configurado',
      description: 'Configura tu objetivo mensual para obtener un mejor control de gastos.',
      action: 'Configurar ahora',
      href: '/dual-flow/hogar',
      icon: Target,
    });
  }

  if (progressPercentage > 100) {
    const exceededAmount = spent - monthlyGoal;
    alerts.push({
      type: 'critical',
      title: '🚨 Presupuesto superado',
      description: `Te has pasado por €${exceededAmount.toFixed(
        2,
      )} este mes. Considera revisar tus gastos.`,
      action: 'Ver detalles',
      href: '/dual-flow/contribucion',
      icon: AlertTriangle,
    });
  }

  if (pendingTransactions > 5) {
    alerts.push({
      type: 'warning',
      title: `📋 ${pendingTransactions} transacciones pendientes`,
      description:
        'Tienes muchas transacciones esperando revisión. Procésalas para mantener tus cuentas al día.',
      action: 'Revisar ahora',
      href: '/dual-flow/contribucion',
      icon: Clock,
    });
  }

  if (reimbursementsPending > 50) {
    alerts.push({
      type: 'warning',
      title: '💸 Reembolsos pendientes altos',
      description: `Tienes €${reimbursementsPending.toFixed(2)} en reembolsos pendientes.`,
      action: 'Gestionar reembolsos',
      href: '/dual-flow/balance',
      icon: Euro,
    });
  }

  // ============ PRÓXIMOS PASOS SUGERIDOS ============
  if (totalTransactions === 0) {
    nextSteps.push({
      title: '📝 Registra tu primera transacción',
      description: 'Comienza agregando tus gastos del hogar para empezar a hacer seguimiento.',
      action: 'Agregar gasto',
      href: '/dual-flow/contribucion',
      priority: 'high',
      estimatedTime: '2 min',
    });
  }

  if (monthlyGoal > 0 && autoMatched === 0 && totalTransactions > 0) {
    nextSteps.push({
      title: '🤖 Configura emparejamiento automático',
      description:
        'Acelera tu workflow configurando reglas automáticas para transacciones recurrentes.',
      action: 'Configurar reglas',
      href: '/dual-flow/hogar',
      priority: 'medium',
      estimatedTime: '5 min',
    });
  }

  if (!hasMembers) {
    nextSteps.push({
      title: '👥 Invita a tu pareja',
      description:
        'El sistema funciona mejor cuando ambos miembros de la pareja participan activamente.',
      action: 'Enviar invitación',
      href: '/dual-flow/hogar',
      priority: 'high',
      estimatedTime: '1 min',
    });
  }

  if (progressPercentage > 80 && progressPercentage <= 100 && daysRemaining > 5) {
    nextSteps.push({
      title: '⚡ Optimiza gastos restantes',
      description: `Has usado el ${progressPercentage.toFixed(
        1,
      )}% del presupuesto. Planifica los ${daysRemaining} días restantes.`,
      action: 'Planificar gastos',
      href: '/dual-flow/periodos',
      priority: 'medium',
      estimatedTime: '3 min',
    });
  }

  // ============ INSIGHTS INTELIGENTES ============
  if (monthlyGoal > 0 && currentDay > 7) {
    const projectedMonthlySpending = dailySpendingAverage * daysInMonth;
    const savingsProjection = monthlyGoal - projectedMonthlySpending;

    if (savingsProjection > 0) {
      insights.push({
        type: 'positive',
        title: '📈 Vas por buen camino',
        description: `A este ritmo, podrías ahorrar €${savingsProjection.toFixed(2)} este mes.`,
        icon: TrendingUp,
      });
    } else {
      insights.push({
        type: 'warning',
        title: '📉 Ritmo de gasto elevado',
        description: `A este ritmo, podrías superar el presupuesto por €${Math.abs(
          savingsProjection,
        ).toFixed(2)}.`,
        icon: TrendingDown,
      });
    }
  }

  if (dailyBudgetRemaining > 0 && daysRemaining > 0) {
    insights.push({
      type: 'info',
      title: '💡 Presupuesto diario sugerido',
      description: `Para cumplir tu objetivo, puedes gastar hasta €${dailyBudgetRemaining.toFixed(
        2,
      )} por día los próximos ${daysRemaining} días.`,
      icon: Info,
    });
  }

  if (autoMatched > 0 && totalTransactions > 0) {
    const automationRate = (autoMatched / totalTransactions) * 100;
    insights.push({
      type: 'positive',
      title: '🤖 Automatización eficiente',
      description: `El ${automationRate.toFixed(
        1,
      )}% de tus transacciones se procesan automáticamente.`,
      icon: Zap,
    });
  }

  return (
    <div className="space-y-6">
      {/* Alertas Críticas y Warnings */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Alertas Importantes
          </h3>
          {alerts.map((alert, index) => (
            <Alert
              key={index}
              className={`animate-in fade-in-0 duration-500 slide-in-from-left-4 ${
                alert.type === 'critical'
                  ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                  : 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <alert.icon className="h-4 w-4" />
              <AlertTitle>{alert.title}</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>{alert.description}</span>
                <Button asChild size="sm" variant="outline" className="ml-4">
                  <Link href={alert.href}>
                    {alert.action}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Próximos Pasos Sugeridos */}
      {nextSteps.length > 0 && (
        <Card className="animate-in fade-in-0 duration-700 slide-in-from-bottom-4 delay-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Próximos Pasos Sugeridos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {nextSteps.map((step, index) => (
              <div
                key={index}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{step.title}</h4>
                    <Badge
                      variant={step.priority === 'high' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {step.priority === 'high' ? 'Prioritario' : 'Recomendado'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{step.estimatedTime}</span>
                  </div>
                </div>
                <Button asChild size="sm" className="ml-4">
                  <Link href={step.href}>
                    {step.action}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Insights Inteligentes */}
      {insights.length > 0 && (
        <Card className="animate-in fade-in-0 duration-700 slide-in-from-bottom-4 delay-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Insights Inteligentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  insight.type === 'positive'
                    ? 'bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800'
                    : insight.type === 'warning'
                    ? 'bg-orange-50 border border-orange-200 dark:bg-orange-950 dark:border-orange-800'
                    : 'bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800'
                }`}
              >
                <insight.icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-sm">{insight.title}</h4>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tips de Navegación Rápida */}
      <Card className="animate-in fade-in-0 duration-700 slide-in-from-bottom-4 delay-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandHeart className="h-5 w-5 text-purple-500" />
            Navegación Rápida
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button asChild variant="outline" size="sm" className="h-auto p-3">
              <Link href="/dual-flow/hogar" className="flex flex-col items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="text-xs">Configuración</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-auto p-3">
              <Link href="/dual-flow/periodos" className="flex flex-col items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Períodos</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-auto p-3">
              <Link href="/dual-flow/contribucion" className="flex flex-col items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Transacciones</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-auto p-3">
              <Link href="/dual-flow/balance" className="flex flex-col items-center gap-2">
                <Euro className="h-4 w-4" />
                <span className="text-xs">Balance</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progreso del Mes - Visual */}
      {monthlyGoal > 0 && (
        <Card className="animate-in fade-in-0 duration-700 slide-in-from-bottom-4 delay-900">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5 text-indigo-500" />
                Progreso {currentMonth}
              </span>
              <Badge variant="outline">
                Día {currentDay} de {daysInMonth}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso del presupuesto</span>
                <span className="font-medium">{progressPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(progressPercentage, 100)} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso del mes</span>
                <span className="font-medium">
                  {((currentDay / daysInMonth) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={(currentDay / daysInMonth) * 100} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center text-xs">
              <div>
                <div className="font-bold text-green-600">€{monthlyGoal.toFixed(0)}</div>
                <div className="text-muted-foreground">Objetivo</div>
              </div>
              <div>
                <div className="font-bold text-blue-600">€{spent.toFixed(0)}</div>
                <div className="text-muted-foreground">Gastado</div>
              </div>
              <div>
                <div
                  className={`font-bold ${
                    remainingAmount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  €{Math.abs(remainingAmount).toFixed(0)}
                </div>
                <div className="text-muted-foreground">
                  {remainingAmount >= 0 ? 'Disponible' : 'Excedido'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
