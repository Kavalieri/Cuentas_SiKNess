import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CALCULATION_TYPE_LABELS } from '@/lib/contributionTypes';
import { CheckCircle, XCircle } from 'lucide-react';

export type CombinedMemberContribution = {
  profile_id: string;
  email: string;
  display_name?: string | null;
  income?: number;
  share_percent?: number; // 0..1
  base_expected?: number;
  direct_expenses?: number;
  common_contributions?: number; // ingresos a 'Aportación Cuenta Conjunta' (flow common)
  expected_after_direct?: number;
  expected_amount?: number | null;
  paid_amount?: number | null;
  pending_amount?: number | null;
  overpaid_amount?: number | null;
  status?: string | null;
  calculation_method?: string | null;
};

export interface ContributionsOverviewProps {
  contributions: CombinedMemberContribution[];
  calculationType: string; // 'equal' | 'proportional' | ...
  monthlyGoal: number; // meta mensual del hogar
  phase?: string | null; // 'preparing' | 'validation' | 'active' | 'closing' | 'closed'
  privacyMode?: boolean;
  title?: string;
}

function getPhaseLabel(phase?: string | null) {
  switch (phase) {
    case 'preparing':
      return 'Configuración Inicial';
    case 'validation':
      return 'Validación Pendiente';
    case 'active':
      return 'Abierto (en uso)';
    case 'closing':
      return 'Cierre iniciado';
    case 'closed':
      return 'Cerrado';
    default:
      return 'Desconocido';
  }
}

function formatCurrency(amount: number, privacy?: boolean) {
  if (privacy) return '•••••';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function ContributionsOverview({
  contributions,
  calculationType,
  monthlyGoal,
  phase,
  privacyMode = false,
  title = 'Contribuciones: resumen y desglose',
}: ContributionsOverviewProps) {
  if (!Array.isArray(contributions) || contributions.length === 0) return null;

  const totalPaid = contributions.reduce((acc, m) => acc + (Number(m.paid_amount ?? 0)), 0);
  const progress = monthlyGoal > 0 ? Math.round((totalPaid / monthlyGoal) * 100) : 0;

  return (
    <Card className="border-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="text-sm text-muted-foreground">
          Estado: <strong>{getPhaseLabel(phase)}</strong>
          {' · '}Método: <strong>{CALCULATION_TYPE_LABELS[calculationType as keyof typeof CALCULATION_TYPE_LABELS]}</strong>
          {monthlyGoal > 0 && (
            <span className="ml-2">
              Meta mensual: <span className="font-medium">{formatCurrency(monthlyGoal, privacyMode)}</span>
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Resumen general */}
        <div className="mb-4">
          <Progress value={progress} className="h-2" />
          <div className="text-xs text-muted-foreground mt-1">
            Total aportado:{' '}
            <strong>{formatCurrency(totalPaid, privacyMode)}</strong>
            {monthlyGoal > 0 ? ` (${progress}% de la meta)` : ''}
          </div>
        </div>

        {/* Desglose por miembro (detallado) */}
        <div className="space-y-3">
          {contributions.map((contrib) => {
            const expectedBase = Number(contrib.base_expected ?? 0);
            const direct = Number(contrib.direct_expenses ?? 0);
            const expected = Number(
              (contrib.expected_amount ?? contrib.expected_after_direct ?? expectedBase - direct) ?? 0,
            );
            const paid = Number(contrib.paid_amount ?? 0);
            const pendingRaw = Number(expected - paid);
            const pendingCents = Math.round(pendingRaw * 100);
            const isSettled = pendingCents <= 0; // alcanzado 100% o más (tolerancia de céntimo)
            const pending = pendingCents > 0 ? pendingCents / 100 : 0;
            const overpaidCents = Math.max(0, -pendingCents);
            const overpaid = overpaidCents > 0 ? overpaidCents / 100 : 0;
            const percent = Math.round(((contrib.share_percent ?? 0) as number) * 100);

            return (
              <div key={contrib.profile_id} className="p-3 rounded-lg border bg-card">
                <div className="flex items-center justify-between">
                  <p className="font-medium truncate" title={contrib.email}>
                    {contrib.display_name || contrib.email}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(paid, privacyMode)} / {formatCurrency(expected, privacyMode)}
                    </span>
                    <Badge variant="outline">{percent}%</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-2">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Ingreso (declarado)</span>
                    <span>{formatCurrency(Number(contrib.income ?? 0), privacyMode)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Base</span>
                    <span>{formatCurrency(expectedBase, privacyMode)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Gastos directos</span>
                    <span className="text-amber-700">{formatCurrency(direct, privacyMode)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Esperado neto</span>
                    <span className="font-medium">{formatCurrency(expected, privacyMode)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 text-sm">
                  <div className="text-muted-foreground flex flex-col">
                    <span>Pagado total: {formatCurrency(paid, privacyMode)}</span>
                    <span className="text-xs">Aportación común: {formatCurrency(Number(contrib.common_contributions ?? 0), privacyMode)}</span>
                    {overpaid > 0 && (
                      <span className="text-xs text-green-700 font-medium">
                        A favor: +{formatCurrency(overpaid, privacyMode)}
                      </span>
                    )}
                  </div>
                  {isSettled ? (
                    <div className="flex items-center gap-1 text-green-600 font-medium">
                      <CheckCircle className="h-4 w-4" /> Saldado
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-orange-600 font-medium">
                      <XCircle className="h-4 w-4" /> Pendiente: {formatCurrency(pending, privacyMode)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default ContributionsOverview;
