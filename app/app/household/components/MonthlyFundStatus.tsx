'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { PrivateAmount } from '@/components/shared/PrivateAmount';
import { toast } from 'sonner';
import { markContributionAsPaid, calculateAndCreateContributions } from '@/app/app/contributions/actions';
import { useRouter } from 'next/navigation';

interface Member {
  id: string;
  profile_id: string;
  email: string;
  role: 'owner' | 'member';
  currentIncome: number | null; // NULL si no está configurado
}

interface Contribution {
  id: string;
  profile_id: string;
  expected_amount: number | null; // NULL si income no configurado
  paid_amount: number;
  status: string;
  paid_at: string | null;
  adjustments_total: number | null;
}

interface MonthlyFundStatusProps {
  householdId: string;
  members: Member[];
  contributions: Contribution[];
  monthlyFund: number; // Meta configurada (SIEMPRE fija, ej: 1200€)
  currentUserId: string;
  selectedMonth: Date;
  currency: string;
  expenses: number; // Gastos del mes
  incomes: number; // Ingresos del mes (movimientos de ingreso)
}

export function MonthlyFundStatus({
  householdId,
  members,
  contributions,
  monthlyFund,
  currentUserId,
  selectedMonth,
  currency,
  expenses,
  incomes,
}: MonthlyFundStatusProps) {
  const router = useRouter();
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const isCurrentMonth = 
    selectedMonth.getFullYear() === new Date().getFullYear() &&
    selectedMonth.getMonth() === new Date().getMonth();

  // Verificar si hay configuración necesaria
  const hasIncomesConfigured = members.every(m => m.currentIncome !== null && m.currentIncome > 0);
  const hasGoalConfigured = monthlyFund > 0;
  const needsConfiguration = !hasIncomesConfigured || !hasGoalConfigured;

  // LÓGICA CORRECTA DE CÁLCULOS
  // ============================================
  
  // 1. El fondo objetivo SIEMPRE es el configurado (ej: 1200€)
  const fundGoal = monthlyFund;

  // 2. Calcular total aportado considerando:
  //    - paid_amount de cada miembro
  //    - adjustments_total (pre-pagos ya realizados)
  const totalContributed = contributions.reduce((sum, c) => {
    // paid_amount: lo que han marcado como pagado manualmente
    // adjustments_total: pre-pagos aprobados (valor negativo que suma al aporte)
    const adjustments = Math.abs(c.adjustments_total || 0);
    return sum + c.paid_amount + adjustments;
  }, 0);

  // 3. Balance del fondo = Aportado - Gastado
  const fundBalance = totalContributed - expenses;

  // 4. Progreso del fondo basado en la meta (NO en expected_amount reducido)
  const fundProgress = fundGoal > 0 ? (totalContributed / fundGoal) * 100 : 0;

  // 5. Proyección: ¿Cuánto falta para completar el fondo?
  const remainingToGoal = Math.max(0, fundGoal - totalContributed);

  const handleMarkAsPaid = async (contributionId: string, userId: string) => {
    setLoadingUserId(userId);

    const result = await markContributionAsPaid(contributionId);

    setLoadingUserId(null);

    if (!result.ok) {
      toast.error(result.message);
    } else {
      toast.success('✅ Aportación marcada como realizada');
      router.refresh();
    }
  };

  const handleCalculateContributions = async () => {
    setIsCalculating(true);

    const result = await calculateAndCreateContributions(
      householdId,
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() + 1
    );

    setIsCalculating(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success('✅ Contribuciones calculadas correctamente');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Mensaje de configuración necesaria */}
      {needsConfiguration && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-amber-900 dark:text-amber-100 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Configuración Incompleta
            </CardTitle>
            <CardDescription className="text-amber-800 dark:text-amber-200">
              Antes de poder calcular las contribuciones, necesitas:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              {!hasGoalConfigured && (
                <div className="flex items-start gap-2 text-amber-900 dark:text-amber-100">
                  <Circle className="w-4 h-4 mt-0.5" />
                  <p>
                    <strong>Configurar el fondo objetivo:</strong> Ve a la pestaña &quot;Contribuciones&quot; → 
                    &quot;Configuración&quot; y establece el monto mensual del fondo.
                  </p>
                </div>
              )}
              {!hasIncomesConfigured && (
                <div className="flex items-start gap-2 text-amber-900 dark:text-amber-100">
                  <Circle className="w-4 h-4 mt-0.5" />
                  <p>
                    <strong>Configurar ingresos de los miembros:</strong> Todos los miembros deben tener 
                    sus ingresos configurados en la pestaña &quot;Contribuciones&quot; → &quot;Configuración&quot;.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensaje cuando no hay contribuciones calculadas */}
      {!needsConfiguration && contributions.length === 0 && (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
              🧮 Contribuciones No Calculadas
            </CardTitle>
            <CardDescription className="text-blue-800 dark:text-blue-200">
              Las contribuciones para este mes aún no han sido calculadas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              Ya tienes todo configurado. Haz clic en el botón para calcular cuánto debe aportar 
              cada miembro al fondo común de <PrivateAmount amount={monthlyFund} /> basado en sus ingresos.
            </p>
            <Button 
              onClick={handleCalculateContributions} 
              disabled={isCalculating}
              className="w-full"
            >
              {isCalculating ? 'Calculando...' : '🧮 Calcular Contribuciones del Mes'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Resumen del Fondo Mensual (solo si hay contribuciones) */}
      {contributions.length > 0 && (
        <Card className="border-2">
          <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💰 Fondo Mensual del Hogar
            {fundProgress === 100 && (
              <Badge variant="default" className="ml-auto">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Fondo Completo
              </Badge>
            )}
            {fundProgress > 0 && fundProgress < 100 && (
              <Badge variant="secondary" className="ml-auto">
                En Progreso {fundProgress.toFixed(0)}%
              </Badge>
            )}
            {fundProgress === 0 && (
              <Badge variant="destructive" className="ml-auto">
                <AlertCircle className="w-4 h-4 mr-1" />
                Pendiente
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Fondo de partida para gastos del mes • <PrivateAmount amount={totalContributed} currency={currency} /> de <PrivateAmount amount={fundGoal} currency={currency} /> aportados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Indicadores principales */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Aportado</p>
              <p className="text-2xl font-bold"><PrivateAmount amount={totalContributed} currency={currency} /></p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Gastos Realizados</p>
              <p className="text-2xl font-bold text-red-600"><PrivateAmount amount={expenses} currency={currency} /></p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className={`text-2xl font-bold ${fundBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <PrivateAmount amount={fundBalance} currency={currency} />
              </p>
            </div>
          </div>

          {/* Información adicional */}
          {remainingToGoal > 0 && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Faltan <PrivateAmount amount={remainingToGoal} currency={currency} /> para completar el fondo objetivo
              </p>
            </div>
          )}

          {incomes > 0 && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <p className="text-sm text-green-900 dark:text-green-100">
                + <PrivateAmount amount={incomes} currency={currency} /> en ingresos registrados este mes
              </p>
            </div>
          )}

          {/* Barra de progreso */}
          <div className="w-full bg-muted rounded-full h-3 mb-6">
            <div
              className="bg-green-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(fundProgress, 100)}%` }}
            />
          </div>

          {/* Estado por miembro */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">
              Aportaciones Individuales
            </h3>
            {members.map((member) => {
              const contribution = contributions.find(c => c.profile_id === member.profile_id);
              const isCurrentUser = member.profile_id === currentUserId;

              if (!contribution) {
                return (
                  <div
                    key={`${member.profile_id}-no-contrib`}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {member.email}
                        {isCurrentUser && <span className="text-primary ml-2">(Tú)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">Sin configurar</p>
                    </div>
                    <Badge variant="outline">No configurado</Badge>
                  </div>
                );
              }

              // Cálculos por miembro
              const adjustments = Math.abs(contribution.adjustments_total || 0);
              const totalPaidByMember = contribution.paid_amount + adjustments;
              const expectedAmount = contribution.expected_amount ?? 0; // Usar 0 si NULL
              const originalExpected = expectedAmount + adjustments; // Expected sin ajustes
              const percentageOfFund = fundGoal > 0 ? (originalExpected / fundGoal) * 100 : 0;
              
              // ⚠️ FIX: Si expected_amount es NULL (sin configurar), NUNCA marcar como aportado
              // aunque paid_amount sea 0. Solo marcar como aportado si está configurado Y pagado.
              const isPaid = contribution.expected_amount !== null && 
                (contribution.status === 'paid' || contribution.paid_amount >= expectedAmount);

              return (
                <div
                  key={`${member.profile_id}-contrib`}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                    isPaid ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-background'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {isPaid ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">
                        {member.email}
                        {isCurrentUser && <span className="text-primary ml-2">(Tú)</span>}
                        {member.role === 'owner' && (
                          <Badge variant="outline" className="ml-2 text-xs">Owner</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {percentageOfFund.toFixed(1)}% del fondo • Aportado: <PrivateAmount amount={totalPaidByMember} currency={currency} />
                      </p>
                      {contribution.paid_at && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          ✓ Aportado el {new Date(contribution.paid_at).toLocaleDateString('es-ES')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isPaid && isCurrentUser && isCurrentMonth && (
                      <Button
                        size="sm"
                        onClick={() => handleMarkAsPaid(contribution.id, member.profile_id)}
                        disabled={loadingUserId === member.profile_id}
                      >
                        {loadingUserId === member.profile_id ? 'Guardando...' : 'Marcar como Aportado'}
                      </Button>
                    )}
                    {isPaid && (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Aportado
                      </Badge>
                    )}
                    {!isPaid && !isCurrentUser && (
                      <Badge variant="secondary" className="text-xs">
                        Pendiente
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📊 ¿Cómo funciona?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div className="flex items-start gap-2">
            <span className="font-bold text-primary">1.</span>
            <p>
              <strong>Inicio del mes:</strong> Cada miembro aporta su parte proporcional según sus ingresos para formar el fondo común de <PrivateAmount amount={monthlyFund} />.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-primary">2.</span>
            <p>
              <strong>Durante el mes:</strong> Los gastos se descuentan del fondo. El fondo muestra cuánto queda disponible.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-primary">3.</span>
            <p>
              <strong>Fin del mes:</strong> Lo que sobra del fondo es vuestro ahorro mensual conjunto.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
