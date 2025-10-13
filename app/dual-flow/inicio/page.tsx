import { getDualFlowBalanceAction, getDualFlowTransactionsAction } from '@/app/dual-flow/actions';
import { WorkflowManager } from '@/app/dual-flow/components/workflow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/format';
import { getCurrentUser, getUserHouseholdId } from '@/lib/supabaseServer';
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
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

/**
 * Dashboard principal del sistema dual-flow
 * Diseño mobile-first con animaciones fluidas para sensación de paz
 */
export default async function DualFlowInicioPage() {
  // Verificar autenticación
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  // Obtener household ID
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    redirect('/app/onboarding');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Suspense
        fallback={
          <div className="animate-pulse p-4 space-y-4">
            <div className="h-32 bg-muted rounded-lg"></div>
            <div className="h-48 bg-muted rounded-lg"></div>
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>
        }
      >
        <DashboardContent householdId={householdId} />
      </Suspense>
    </div>
  );
}

async function DashboardContent({ householdId }: { householdId: string }) {
  // Obtener datos reales del workflow y balance
  const [balanceResult, transactionsResult] = await Promise.all([
    getDualFlowBalanceAction(),
    getDualFlowTransactionsAction({ limit: 5 }),
  ]);

  // Si hay error, usar datos por defecto
  const balanceData = balanceResult.ok
    ? balanceResult.data
    : {
        household_id: householdId,
        fondo_comun: 0,
        gastos_personales_pendientes: 0,
        reembolsos_pendientes: 0,
        total_personal_to_common: 0,
        total_common_to_personal: 0,
        total_transacciones: 0,
        pendientes_revision: 0,
        auto_emparejadas: 0,
      };

  const transactionsData = transactionsResult.ok ? transactionsResult.data : [];

  // Calcular workflow progress basado en datos reales
  const totalSteps = 7;
  let currentStep = 1;

  // Lógica para determinar el paso actual basado en datos reales
  if (balanceData.total_transacciones > 0) currentStep = 2;
  if (balanceData.auto_emparejadas > 0) currentStep = 3;
  if (balanceData.pendientes_revision === 0 && balanceData.total_transacciones > 0) currentStep = 4;
  // Añadir más lógica según los estados del workflow

  const workflowProgress = (currentStep / totalSteps) * 100;

  // Obtener período actual
  const now = new Date();
  const currentPeriod = now.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
  });

  // Calcular objetivo mensual (ejemplo: podría venir de settings)
  const monthlyGoal = 2850; // TODO: Obtener de household_settings
  const spent = Math.abs(balanceData.fondo_comun);
  const remaining = Math.max(0, monthlyGoal - spent);

  // Función para describir cada paso del workflow
  const getStepDescription = (step: number): string => {
    const descriptions = [
      'Configurar período y objetivos',
      'Definir contribuciones mensuales',
      'Registrar gastos directos',
      'Revisar y aprobar transacciones',
      'Calcular descuentos y balances',
      'Aplicar liquidaciones',
      'Cerrar período mensual',
    ];
    return descriptions[step - 1] || 'Paso completado';
  };

  return (
    <>
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
                  <CardTitle className="text-lg">{currentPeriod}</CardTitle>
                  <p className="text-sm text-muted-foreground">Período activo</p>
                </div>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {currentStep < 4 ? 'Configuración' : currentStep < 7 ? 'En proceso' : 'Completado'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progreso del workflow</span>
                <span className="font-medium">{Math.round(workflowProgress)}%</span>
              </div>
              <Progress value={workflowProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Paso {currentStep} de {totalSteps} - {getStepDescription(currentStep)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Steps - Mobile Optimized con datos reales */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold px-1 animate-in fade-in-0 duration-700 slide-in-from-right-8 delay-300">
            Próximos Pasos
          </h2>

          {/* Step 1 - Configurar Contribuciones */}
          <Card
            className={`border-l-4 ${
              currentStep === 1 ? 'border-l-primary' : 'border-l-green-500'
            } animate-in fade-in-0 duration-700 slide-in-from-bottom-8 delay-400`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${currentStep === 1 ? 'bg-primary' : 'bg-green-500'}`}
                >
                  <HandHeart className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Configurar Contribuciones</h3>
                  <p className="text-sm text-muted-foreground">
                    Definir objetivo mensual e ingresos
                  </p>
                </div>
                {currentStep === 1 ? (
                  <Button size="sm" className="gap-2" asChild>
                    <Link href="/dual-flow/contribucion">
                      Continuar
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 2 - Registrar Gastos */}
          <Card
            className={`${
              currentStep < 2
                ? 'opacity-60'
                : currentStep === 2
                ? 'border-l-4 border-l-primary'
                : 'border-l-4 border-l-green-500'
            } animate-in fade-in-0 duration-700 slide-in-from-bottom-8 delay-500`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    currentStep < 2 ? 'bg-muted' : currentStep === 2 ? 'bg-primary' : 'bg-green-500'
                  }`}
                >
                  <Scale
                    className={`h-4 w-4 ${
                      currentStep < 2 ? 'text-muted-foreground' : 'text-white'
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <h3 className={`font-medium ${currentStep < 2 ? 'text-muted-foreground' : ''}`}>
                    Registrar Gastos Directos
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Gastos pagados de bolsillo personal ({transactionsData?.length || 0}{' '}
                    registrados)
                  </p>
                </div>
                {currentStep === 2 ? (
                  <Button size="sm" className="gap-2" asChild>
                    <Link href="/dual-flow/balance">
                      Continuar
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                ) : currentStep > 2 ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-muted flex items-center justify-center">
                    <span className="text-xs font-medium text-muted-foreground">2</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 3 - Revisar y Aprobar */}
          <Card
            className={`${
              currentStep < 3
                ? 'opacity-40'
                : currentStep === 3
                ? 'border-l-4 border-l-primary'
                : 'border-l-4 border-l-green-500'
            } animate-in fade-in-0 duration-700 slide-in-from-bottom-8 delay-600`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    currentStep < 3 ? 'bg-muted' : currentStep === 3 ? 'bg-primary' : 'bg-green-500'
                  }`}
                >
                  <TrendingUp
                    className={`h-4 w-4 ${
                      currentStep < 3 ? 'text-muted-foreground' : 'text-white'
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <h3 className={`font-medium ${currentStep < 3 ? 'text-muted-foreground' : ''}`}>
                    Revisar y Aprobar
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {balanceData.pendientes_revision} pendientes de revisión
                  </p>
                </div>
                {currentStep === 3 ? (
                  <Button size="sm" className="gap-2" asChild>
                    <Link href="/dual-flow/balance">
                      Revisar
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                ) : currentStep > 3 ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-muted flex items-center justify-center">
                    <span className="text-xs font-medium text-muted-foreground">3</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions - Mobile Friendly con navegación real */}
        <div className="space-y-3 pt-2">
          <h2 className="text-lg font-semibold px-1 animate-in fade-in-0 duration-700 slide-in-from-left-8 delay-700">
            Acciones Rápidas
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="lg"
              className="h-auto p-4 flex-col gap-2 animate-in fade-in-0 duration-700 slide-in-from-bottom-8 delay-800"
              asChild
            >
              <Link href="/dual-flow/contribucion">
                <HandHeart className="h-5 w-5" />
                <span className="text-sm">Contribución</span>
              </Link>
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="h-auto p-4 flex-col gap-2 animate-in fade-in-0 duration-700 slide-in-from-bottom-8 delay-900"
              asChild
            >
              <Link href="/dual-flow/balance">
                <Scale className="h-5 w-5" />
                <span className="text-sm">Balance</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Status Summary - Compact for Mobile con datos reales */}
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
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(monthlyGoal)}
                </div>
                <p className="text-xs text-muted-foreground">Objetivo mensual</p>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">{formatCurrency(spent)}</div>
                <p className="text-xs text-muted-foreground">Gastado hasta ahora</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-sm font-bold text-orange-600">
                  {balanceData.pendientes_revision}
                </div>
                <p className="text-xs text-muted-foreground">Pendientes revisión</p>
              </div>
              <div>
                <div className="text-sm font-bold text-purple-600">
                  {balanceData.auto_emparejadas}
                </div>
                <p className="text-xs text-muted-foreground">Auto-emparejadas</p>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estado del período</span>
                <Badge variant="outline" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {currentStep < 4
                    ? 'Configuración'
                    : currentStep < 7
                    ? 'En proceso'
                    : 'Completado'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Manager - Flujo transaccional con datos reales */}
        <div className="animate-in fade-in-0 duration-700 slide-in-from-bottom-8 delay-600">
          <div className="mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              Últimas Transacciones
            </h2>
            <p className="text-sm text-muted-foreground">
              Transacciones recientes del sistema dual-flow
            </p>
          </div>
          <WorkflowManager transactions={transactionsData} showActions={false} />
        </div>

        {/* Bottom Padding para evitar overlap con bottom nav */}
        <div className="h-20"></div>
      </div>
    </>
  );
}
