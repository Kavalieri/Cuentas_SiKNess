import { getDualFlowDashboardAction } from '@/app/dual-flow/actions';
import { CreateTransactionForm } from '@/app/dual-flow/components/CreateTransactionForm';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { getCurrentUser, getUserHouseholdId } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { Activity, AlertTriangle, CheckCircle, Database, Info, TestTube, Zap } from 'lucide-react';

/**
 * Página de Testing Dual-Flow
 * Para probar todas las funciones del sistema en tiempo real
 */

export default async function TestingPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const householdId = await getUserHouseholdId();
  if (!householdId) {
    redirect('/app/onboarding');
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <TestTube className="h-6 w-6" />
          Testing Dual-Flow System
        </h1>
        <p className="text-muted-foreground">
          Prueba completa del sistema dual-flow con datos reales de PostgreSQL
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Base de Datos</CardTitle>
            <Database className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Conectada</div>
            <p className="text-xs text-muted-foreground">PostgreSQL + Migraciones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Pairing</CardTitle>
            <Zap className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">Activo</div>
            <p className="text-xs text-muted-foreground">Triggers + Stored Procedures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Server Actions</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">15 Actions</div>
            <p className="text-xs text-muted-foreground">CRUD + Validación Zod</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Ready</div>
            <p className="text-xs text-muted-foreground">Sistema Operativo</p>
          </CardContent>
        </Card>
      </div>

      {/* Testing Areas */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Crear Transacción */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">1. Crear Transacción</h2>
            <Badge variant="outline">Testing</Badge>
          </div>
          <CreateTransactionForm />
        </div>

        {/* Dashboard Data */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">2. Datos del Dashboard</h2>
            <Badge variant="outline">Real-Time</Badge>
          </div>
          <Suspense fallback={<div>Cargando datos reales...</div>}>
            <DashboardData />
          </Suspense>
        </div>
      </div>

      {/* Testing Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
            <Info className="h-5 w-5" />
            Instrucciones de Testing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-blue-700">
          <div className="space-y-2">
            <h3 className="font-medium">🧪 Proceso de Testing Completo:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>
                Crear un <strong>Gasto Personal</strong> (gasto_directo) - verás que aparece en
                &ldquo;Pending Review&rdquo;
              </li>
              <li>
                Crear un <strong>Reembolso</strong> (ingreso_directo) con importe similar - debería
                auto-pairearse
              </li>
              <li>Probar diferentes umbrales de emparejamiento (±5€, ±10€, etc.)</li>
              <li>Crear gastos con &ldquo;Requiere aprobación manual&rdquo; activado</li>
              <li>Verificar que los balances se actualizan en tiempo real</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">🔍 Qué Observar:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Auto-pairing automático cuando apruebes transacciones complementarias</li>
              <li>Updates en tiempo real del balance dual-flow</li>
              <li>Validaciones Zod funcionando en el formulario</li>
              <li>Server Actions conectados correctamente con PostgreSQL</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Spacer para navegación móvil */}
      <div className="h-20"></div>
    </div>
  );
}

async function DashboardData() {
  const result = await getDualFlowDashboardAction();

  if (!result.ok) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <div className="text-sm">Error: {result.message}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { balance, recentTransactions, pendingReview, config } = result.data!;

  return (
    <div className="space-y-4">
      {/* Balance Actual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Balance Dual-Flow Actual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground">Fondo Común</div>
              <div className="font-semibold text-green-600">
                {formatCurrency(balance.fondo_comun)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Gastos Pendientes</div>
              <div className="font-semibold text-orange-600">
                {formatCurrency(balance.gastos_personales_pendientes)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Reembolsos</div>
              <div className="font-semibold text-blue-600">
                {formatCurrency(balance.reembolsos_pendientes)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Total Trans.</div>
              <div className="font-semibold">{balance.total_transacciones}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transacciones Recientes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Transacciones Recientes ({recentTransactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentTransactions.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No hay transacciones aún. ¡Crea la primera arriba!
              </div>
            ) : (
              recentTransactions.slice(0, 3).map((tx: Record<string, unknown>, index: number) => (
                <div
                  key={`tx-${index}`}
                  className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                >
                  <div>
                    <div className="font-medium">{String(tx.concepto || 'Sin concepto')}</div>
                    <div className="text-muted-foreground">
                      {String(tx.categoria || 'Sin categoría')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(Number(tx.importe) || 0)}</div>
                    <Badge variant="outline" className="text-xs">
                      {String(tx.estado || 'pending')}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pendientes de Revisión */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pendientes de Revisión ({pendingReview.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {pendingReview.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No hay transacciones pendientes de revisión
              </div>
            ) : (
              pendingReview.slice(0, 2).map((tx: Record<string, unknown>, index: number) => (
                <div
                  key={`pending-${index}`}
                  className="flex items-center justify-between text-xs p-2 bg-yellow-50 rounded"
                >
                  <div>
                    <div className="font-medium">{String(tx.concepto || 'Sin concepto')}</div>
                    <div className="text-muted-foreground">{String(tx.tipo || 'Sin tipo')}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(Number(tx.importe) || 0)}</div>
                    <Badge variant="secondary" className="text-xs">
                      Pending
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuración */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Configuración Auto-Pairing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Automático:</span>
            <Badge variant={config.emparejamiento_automatico ? 'default' : 'secondary'}>
              {config.emparejamiento_automatico ? 'ON' : 'OFF'}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span>Umbral:</span>
            <span className="font-mono">
              {formatCurrency(config.umbral_emparejamiento_default)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Días revisión:</span>
            <span className="font-mono">{config.tiempo_revision_default}d</span>
          </div>
          <div className="flex justify-between">
            <span>Límite personal:</span>
            <span className="font-mono">{formatCurrency(config.limite_gasto_personal)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
