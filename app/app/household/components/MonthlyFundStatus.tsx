'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { markContributionAsPaid } from '@/app/app/contributions/actions';

interface Member {
  id: string;
  user_id: string;
  email: string;
  role: 'owner' | 'member';
  currentIncome: number;
}

interface Contribution {
  id: string;
  user_id: string;
  expected_amount: number;
  paid_amount: number;
  status: string;
  paid_at: string | null;
}

interface MonthlyFundStatusProps {
  householdId: string;
  members: Member[];
  contributions: Contribution[];
  monthlyFund: number;
  currentUserId: string;
  selectedMonth: Date;
}

export function MonthlyFundStatus({
  // householdId, // No usado actualmente, pero puede ser necesario en futuras features
  members,
  contributions,
  monthlyFund,
  currentUserId,
  selectedMonth,
}: MonthlyFundStatusProps) {
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const isCurrentMonth = 
    selectedMonth.getFullYear() === new Date().getFullYear() &&
    selectedMonth.getMonth() === new Date().getMonth();

  // Calcular totales
  const totalExpected = contributions.reduce((sum, c) => sum + c.expected_amount, 0);
  const totalPaid = contributions.reduce((sum, c) => sum + c.paid_amount, 0);
  const fundProgress = (totalPaid / totalExpected) * 100;

  const handleMarkAsPaid = async (contributionId: string, userId: string) => {
    setLoadingUserId(userId);

    const result = await markContributionAsPaid(contributionId);

    setLoadingUserId(null);

    if (!result.ok) {
      toast.error(result.message);
    } else {
      toast.success('✅ Aportación marcada como realizada');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumen del Fondo Mensual */}
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
            Fondo de partida para gastos del mes • {formatCurrency(totalPaid)} de {formatCurrency(totalExpected)} aportados
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              const contribution = contributions.find(c => c.user_id === member.user_id);
              const isCurrentUser = member.user_id === currentUserId;

              if (!contribution) {
                return (
                  <div
                    key={member.id}
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

              const percentage = totalExpected > 0 
                ? (contribution.expected_amount / totalExpected) * 100 
                : 0;
              const isPaid = contribution.status === 'paid' || contribution.paid_amount >= contribution.expected_amount;

              return (
                <div
                  key={member.id}
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
                      <p className="font-medium text-sm">
                        {member.email}
                        {isCurrentUser && <span className="text-primary ml-2">(Tú)</span>}
                        {member.role === 'owner' && (
                          <Badge variant="outline" className="ml-2 text-xs">Owner</Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {percentage.toFixed(1)}% del fondo • {formatCurrency(contribution.expected_amount)}
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
                        onClick={() => handleMarkAsPaid(contribution.id, member.user_id)}
                        disabled={loadingUserId === member.user_id}
                      >
                        {loadingUserId === member.user_id ? 'Guardando...' : 'Marcar como Aportado'}
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

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📊 ¿Cómo funciona?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div className="flex items-start gap-2">
            <span className="font-bold text-primary">1.</span>
            <p>
              <strong>Inicio del mes:</strong> Cada miembro aporta su parte proporcional según sus ingresos para formar el fondo común de {formatCurrency(monthlyFund)}.
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
