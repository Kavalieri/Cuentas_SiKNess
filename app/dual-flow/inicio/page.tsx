import { WorkflowManager } from '@/app/dual-flow/components/workflow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  HandHeart,
  Home,
  Scale,
  TrendingUp,
  Zap,
} from 'lucide-react';

/**
 * Dashboard principal del sistema dual-flow
 * Diseño mobile-first con animaciones fluidas para sensación de paz
 */
export default function DualFlowInicioPage() {
  // TODO: Obtener datos reales del workflow y período activo
  const currentStep = 1;
  const totalSteps = 7;
  const workflowProgress = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Hero Section - Mobile Optimized */}
      <div className="px-4 pt-6 pb-8">
        <div className="text-center space-y-4">
          <div className="animate-in fade-in-0 duration-700 slide-in-from-top-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Sistema Dual-Flow</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Dashboard Inteligente
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Gestión simplificada de contribuciones con workflows guiados paso a paso
            </p>
          </div>
        </div>
      </div>

      {/* Período y Progress - Mobile First */}
      <div className="px-4 space-y-4">
        {/* Período Activo Card */}
        <Card className="overflow-hidden animate-in fade-in-0 duration-700 slide-in-from-left-8 delay-200">
          <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Octubre 2025</CardTitle>
                  <p className="text-sm text-muted-foreground">Período activo</p>
                </div>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Configuración
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progreso del mes</span>
                <span className="font-medium">{Math.round(workflowProgress)}%</span>
              </div>
              <Progress value={workflowProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Paso {currentStep} de {totalSteps} - Configurar período y objetivos
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Steps - Mobile Optimized */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold px-1 animate-in fade-in-0 duration-700 slide-in-from-right-8 delay-300">
            Próximos Pasos
          </h2>

          {/* Step 1 - Activo */}
          <Card className="border-l-4 border-l-primary animate-in fade-in-0 duration-700 slide-in-from-bottom-8 delay-400">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary rounded-lg">
                  <HandHeart className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Configurar Contribuciones</h3>
                  <p className="text-sm text-muted-foreground">
                    Definir objetivo mensual e ingresos
                  </p>
                </div>
                <Button size="sm" className="gap-2">
                  Continuar
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step 2 - Pendiente */}
          <Card className="opacity-60 animate-in fade-in-0 duration-700 slide-in-from-bottom-8 delay-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-muted-foreground">Registrar Gastos Directos</h3>
                  <p className="text-sm text-muted-foreground">
                    Gastos pagados de bolsillo personal
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-muted flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">2</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 3 - Pendiente */}
          <Card className="opacity-40 animate-in fade-in-0 duration-700 slide-in-from-bottom-8 delay-600">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-muted-foreground">Calcular y Bloquear</h3>
                  <p className="text-sm text-muted-foreground">
                    Aplicar descuentos y confirmar montos
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-muted flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">3</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions - Mobile Friendly */}
        <div className="space-y-3 pt-2">
          <h2 className="text-lg font-semibold px-1 animate-in fade-in-0 duration-700 slide-in-from-left-8 delay-700">
            Acciones Rápidas
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="lg"
              className="h-auto p-4 flex-col gap-2 animate-in fade-in-0 duration-700 slide-in-from-bottom-8 delay-800"
            >
              <HandHeart className="h-5 w-5" />
              <span className="text-sm">Contribución</span>
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="h-auto p-4 flex-col gap-2 animate-in fade-in-0 duration-700 slide-in-from-bottom-8 delay-900"
            >
              <Scale className="h-5 w-5" />
              <span className="text-sm">Balance</span>
            </Button>
          </div>
        </div>

        {/* Status Summary - Compact for Mobile */}
        <Card className="animate-in fade-in-0 duration-700 slide-in-from-bottom-8 delay-1000">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="h-4 w-4" />
              Resumen del Hogar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-green-600">€2,850</div>
                <p className="text-xs text-muted-foreground">Objetivo mensual</p>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">€0</div>
                <p className="text-xs text-muted-foreground">Gastado hasta ahora</p>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estado del período</span>
                <Badge variant="outline" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Iniciado
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Manager - Flujo transaccional */}
        <div className="animate-in fade-in-0 duration-700 slide-in-from-bottom-8 delay-600">
          <div className="mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              Workflow Transaccional
            </h2>
            <p className="text-sm text-muted-foreground">
              Gestión avanzada de transacciones dual-flow con emparejamiento automático
            </p>
          </div>
          <WorkflowManager showActions={false} />
        </div>

        {/* Bottom Padding para evitar overlap con bottom nav */}
        <div className="h-20"></div>
      </div>
    </div>
  );
}
