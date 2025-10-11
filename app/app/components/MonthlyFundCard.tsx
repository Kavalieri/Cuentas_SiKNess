'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, CheckCircle2, Percent } from 'lucide-react';
import { PrivateAmount } from '@/components/shared/PrivateAmount';
import Link from 'next/link';

interface Member {
  profile_id: string;
  email: string;
  current_income: number | null;
}

interface Contribution {
  id: string;
  profile_id: string;
  expected_amount: number | null;
  paid_amount: number;
  adjustments_paid_amount?: number | null;
  status: string;
  adjustments_total?: number | null;
  calculation_method?: string | null;
}

interface MonthlyFundCardProps {
  householdId: string;
  members: Member[];
  contributions: Contribution[];
  monthlyFund: number; // Meta configurada
  totalIncome: number; // Total recaudado del mes (desde transactions)
  expenses: number; // Gastos del mes
  currency: string;
  distributionType?: string; // 'equal' | 'proportional' | 'custom'
}

export function MonthlyFundCard({
  householdId,
  members,
  contributions,
  monthlyFund,
  totalIncome,
  expenses,
  currency = 'EUR',
  distributionType = 'proportional',
}: MonthlyFundCardProps) {
  // Validar configuración
  const hasIncomesConfigured = members.length > 0 && contributions.length > 0;
  const hasGoalConfigured = monthlyFund > 0;
  const needsConfiguration = !hasIncomesConfigured || !hasGoalConfigured;

  // ===== CÁLCULO SIMPLE =====
  // totalIncome YA incluye todos los ingresos (pagos directos + ajustes)
  // Capamos a monthlyFund para no mostrar más de la meta
  const totalContributed = Math.min(totalIncome, monthlyFund);

  // Progreso hacia la meta configurada
  const fundProgress = monthlyFund > 0 ? (totalContributed / monthlyFund) * 100 : 0;
  const remainingToGoal = Math.max(0, monthlyFund - totalContributed);

  // Contadores y datos por usuario
  const contributionsWithStatus = contributions.map(c => {
    const expected = c.expected_amount || 0;
    const paid = c.paid_amount + Math.abs(c.adjustments_total || 0);
    const isPaid = paid >= expected && expected > 0;
    // Porcentaje: capado a 100% para visualización
    const percentage = expected > 0 ? Math.min(100, (paid / expected) * 100) : 0;

    return {
      ...c,
      isPaid,
      totalPaid: paid,
      percentage,
    };
  });

  const paidCount = contributionsWithStatus.filter(c => c.isPaid).length;
  const pendingCount = contributionsWithStatus.length - paidCount;

  // Tipo de reparto
  const distributionLabel = {
    equal: 'Igual',
    proportional: 'Proporcional',
    custom: 'Personalizado',
  }[distributionType] || distributionType;  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">💰 Fondo Mensual</CardTitle>
          {fundProgress === 100 && (
            <Badge variant="default" className="text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Completo
            </Badge>
          )}
          {fundProgress > 0 && fundProgress < 100 && (
            <Badge variant="secondary" className="text-xs">
              {fundProgress.toFixed(0)}%
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {needsConfiguration ? (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                Configuración incompleta
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                {!hasIncomesConfigured && 'Configura ingresos de miembros. '}
                {!hasGoalConfigured && 'Establece meta mensual.'}
              </p>
              <Link
                href="/app/contributions?tab=config"
                className="text-xs text-yellow-800 dark:text-yellow-200 underline mt-1 inline-block"
              >
                Configurar →
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Métricas compactas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <DollarSign className="h-3 w-3" />
                  <span className="text-[10px] uppercase">Saldado</span>
                </div>
                <p className="text-xl font-bold leading-none">
                  <PrivateAmount amount={totalContributed} currency={currency} />
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-[10px] uppercase">Meta</span>
                </div>
                <p className="text-xl font-bold text-primary leading-none">
                  <PrivateAmount amount={monthlyFund} currency={currency} />
                </p>
              </div>
            </div>

            {/* Tipo de reparto */}
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-muted-foreground">Reparto:</span>
              <Badge variant="outline" className="text-xs">
                <Percent className="h-3 w-3 mr-1" />
                {distributionLabel}
              </Badge>
            </div>

            {/* Barra de progreso */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progreso</span>
                <span className="font-medium">{fundProgress.toFixed(0)}%</span>
              </div>
              <Progress
                value={Math.min(100, fundProgress)}
                className={`h-2 ${fundProgress >= 100 ? '[&>div]:bg-green-500' : ''}`}
              />
              {remainingToGoal > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Faltan <PrivateAmount amount={remainingToGoal} currency={currency} /> para la meta
                </p>
              )}
            </div>

            {/* Lista de contribuciones compacta */}
            {contributions.length > 0 && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium">Aportaciones</h4>
                  <div className="flex gap-1">
                    {paidCount > 0 && (
                      <Badge variant="default" className="text-[10px] h-4 px-1">
                        {paidCount} ✓
                      </Badge>
                    )}
                    {pendingCount > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                        {pendingCount} ⏳
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {contributionsWithStatus.map((contribution) => {
                    const member = members.find(m => m.profile_id === contribution.profile_id);
                    const expected = contribution.expected_amount || 0;
                    const displayName = member?.email?.split('@')[0] || 'Usuario';

                    // Desglose del cálculo: base - ajuste = expected
                    // expected = base + adjustments_total (adjustments_total es negativo)
                    // Entonces: base = expected - adjustments_total
                    const adjustmentsTotal = contribution.adjustments_total || 0;
                    const baseAmount = expected - adjustmentsTotal;
                    const hasAdjustment = adjustmentsTotal !== 0;

                    return (
                      <div
                        key={contribution.id}
                        className={`flex items-center gap-2 p-2 rounded text-xs ${
                          contribution.isPaid
                            ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800'
                            : 'bg-muted/50'
                        }`}
                      >
                        {contribution.isPaid ? (
                          <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate leading-tight">
                            {displayName}
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            <PrivateAmount amount={expected} currency={currency} />
                            {' '}
                            <span className={contribution.isPaid ? 'text-green-600' : 'text-orange-600'}>
                              ({contribution.percentage.toFixed(0)}%)
                            </span>
                          </p>
                          {hasAdjustment && (
                            <p className="text-[9px] text-muted-foreground/80 leading-tight mt-0.5">
                              <PrivateAmount amount={baseAmount} currency={currency} /> - <PrivateAmount amount={Math.abs(adjustmentsTotal)} currency={currency} /> ajuste
                            </p>
                          )}
                        </div>

                        {expected > 0 && (
                          <div className="w-12 flex-shrink-0">
                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  contribution.isPaid ? 'bg-green-500' : 'bg-yellow-500'
                                }`}
                                style={{ width: `${contribution.percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Link a detalles */}
            <Link
              href="/app/contributions"
              className="block text-center text-xs text-primary hover:underline pt-1"
            >
              Ver detalles completos →
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
