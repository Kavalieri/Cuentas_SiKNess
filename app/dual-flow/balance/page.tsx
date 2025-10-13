import { getDualFlowBalanceAction, getDualFlowTransactionsAction } from '@/app/dual-flow/actions';
import { WorkflowManager } from '@/app/dual-flow/components/workflow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { getCurrentUser, getUserHouseholdId } from '@/lib/supabaseServer';
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle,
  Clock,
  CreditCard,
  Eye,
  Plus,
  Scale,
  Wallet,
} from 'lucide-react';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export default async function BalancePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const householdId = await getUserHouseholdId();
  if (!householdId) {
    redirect('/app/onboarding');
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Balance Unificado</h1>
        <p className="text-muted-foreground">
          Sistema dual-flow: gastos del fondo común + gastos personales con emparejamiento
          automático
        </p>
      </div>

      <Suspense fallback={<div>Cargando balance dual-flow...</div>}>
        <BalanceContent householdId={householdId} />
      </Suspense>

      <div className="h-20"></div>
    </div>
  );
}

async function BalanceContent({ householdId }: { householdId: string }) {
  // Obtener datos reales de la base de datos dual-flow
  const [balanceResult, transactionsResult] = await Promise.all([
    getDualFlowBalanceAction(),
    getDualFlowTransactionsAction({ limit: 20 }),
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

  // Calcular balance neto
  const balanceNeto =
    balanceData.fondo_comun -
    balanceData.gastos_personales_pendientes +
    balanceData.reembolsos_pendientes;

  // Calcular flujo neto
  const flujoNeto = balanceData.total_personal_to_common - balanceData.total_common_to_personal;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Balance General</CardTitle>
          <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Fondo Común</div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(balanceData.fondo_comun)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Gastos Pendientes</div>
              <div className="text-lg font-bold text-orange-600">
                {formatCurrency(balanceData.gastos_personales_pendientes)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Créditos</div>
              <div className="text-lg font-bold text-blue-600">
                {formatCurrency(balanceData.reembolsos_pendientes)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Balance Neto</div>
              <div className="text-xl font-bold">{formatCurrency(balanceNeto)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Personal → Común</CardTitle>
          <Wallet className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(balanceData.total_personal_to_common)}
            </div>
            <p className="text-xs text-muted-foreground">Gastos out-of-pocket pendientes</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Común → Personal</CardTitle>
          <CreditCard className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(balanceData.total_common_to_personal)}
            </div>
            <p className="text-xs text-muted-foreground">Reembolsos del fondo común</p>
          </div>
        </CardContent>
      </Card>

      {/* Acciones Rápidas */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Acciones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="w-full justify-start gap-2" size="sm">
              <Plus className="h-4 w-4" />
              Gasto Común
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" size="sm">
              <Wallet className="h-4 w-4" />
              Gasto Personal
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" size="sm">
              <Eye className="h-4 w-4" />
              Revisar Pendientes
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" size="sm">
              <ArrowUpDown className="h-4 w-4" />
              Liquidar Mes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transacciones Recientes */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            Transacciones Dual-Flow Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(transactionsData || []).map((transaccion) => (
              <div
                key={transaccion.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{transaccion.concepto}</div>
                    <Badge
                      variant={
                        transaccion.estado === 'completed'
                          ? 'default'
                          : transaccion.estado === 'auto_paired'
                          ? 'secondary'
                          : transaccion.estado === 'pending_review'
                          ? 'destructive'
                          : 'outline'
                      }
                      className="text-xs"
                    >
                      {transaccion.estado === 'completed'
                        ? 'Completado'
                        : transaccion.estado === 'auto_paired'
                        ? 'Emparejado'
                        : transaccion.estado === 'pending_review'
                        ? 'Revisión'
                        : 'Pendiente'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {transaccion.categoria} • {transaccion.pagadoPor} • {transaccion.fecha}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Flujo:{' '}
                    {transaccion.tipoFlujo === 'personal_to_common'
                      ? 'Personal → Común'
                      : transaccion.tipoFlujo === 'common_to_personal'
                      ? 'Común → Personal'
                      : 'Fondo Común'}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div
                    className={`font-semibold ${
                      transaccion.tipo.includes('gasto') ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {transaccion.tipo.includes('gasto') ? '-' : '+'}
                    {formatCurrency(transaccion.importe)}
                  </div>
                  <div className="flex items-center gap-1">
                    {transaccion.estado === 'auto_paired' ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : transaccion.estado === 'pending_review' ? (
                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                    ) : (
                      <Clock className="h-3 w-3 text-gray-500" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Workflow Transaccional Avanzado */}
      <div className="md:col-span-2 lg:col-span-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-primary" />
            Workflow de Aprobación
          </h3>
          <p className="text-sm text-muted-foreground">
            Gestión completa del flujo transaccional con revisión y aprobación
          </p>
        </div>
        <WorkflowManager showActions={true} />
      </div>

      {/* Sistema Dual-Flow Info */}
      <Card className="md:col-span-2 lg:col-span-4 border-dashed border-primary/50">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <div className="text-sm font-medium">🔄 Sistema Dual-Flow Activo</div>
            <p className="text-xs text-muted-foreground">
              Emparejamiento automático de gastos out-of-pocket con reembolsos del fondo común.
              Review/approval workflow para transacciones complejas y liquidación mensual
              automática.
            </p>
            <div className="flex justify-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Personal → Común
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Común → Personal
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Emparejado Auto
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
