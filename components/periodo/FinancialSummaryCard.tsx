import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CALCULATION_TYPE_LABELS } from '@/lib/contributionTypes';

export interface MemberContribution {
  profile_id: string;
  email: string;
  expected_amount: number | null;
  paid_amount: number | null;
  status: string | null;
  calculation_method: string | null;
}

export interface FinancialSummaryCardProps {
  contributions: MemberContribution[];
  calculationType: string;
  monthlyBudget: number;
}

export function FinancialSummaryCard({ contributions, calculationType, monthlyBudget }: FinancialSummaryCardProps) {
  // Unificación de nombres de fases/estados para UI
  const getPhaseLabel = (phase?: string | null) => {
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
  };
  const totalPaid = contributions.reduce((acc, m) => acc + (m.paid_amount ?? 0), 0);
  const progress = monthlyBudget > 0 ? Math.round((totalPaid / monthlyBudget) * 100) : 0;

  return (
    <Card className="border-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20">
      <CardHeader>
        <CardTitle>Resumen Financiero</CardTitle>
        <div className="text-sm text-muted-foreground">
          Estado: <strong>{getPhaseLabel(contributions?.[0]?.status)}</strong>
          {' · '}Método: <strong>{CALCULATION_TYPE_LABELS[calculationType as keyof typeof CALCULATION_TYPE_LABELS]}</strong>
          {monthlyBudget > 0 && (
            <span className="ml-2">Presupuesto mensual: <span className="font-medium">{monthlyBudget.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span></span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-blue-200 dark:divide-blue-900">
          {contributions.map((m) => (
            <li key={m.profile_id} className="flex items-center justify-between py-2">
              <span className="truncate max-w-[120px]" title={m.email}>{m.email}</span>
              <span className="tabular-nums">
                {m.paid_amount?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) ?? '—'}
                {' / '}
                {m.expected_amount?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) ?? '—'}
              </span>
              <span className="flex items-center gap-1 min-w-[90px] justify-end">
                {m.paid_amount != null && m.expected_amount != null ? (
                  m.paid_amount >= m.expected_amount ? (
                    <>
                      <span className="text-green-600 font-semibold flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="inline w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Al día
                      </span>
                      <span className="text-xs text-muted-foreground">{Math.round((m.paid_amount / m.expected_amount) * 100)}%</span>
                    </>
                  ) : (
                    <>
                      <span className="text-amber-600 font-semibold flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="inline w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" /></svg>
                        Pendiente
                      </span>
                      <span className="text-xs text-muted-foreground">{Math.round((m.paid_amount / m.expected_amount) * 100)}%</span>
                    </>
                  )
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <Progress value={progress} className="h-2" />
          <div className="text-xs text-muted-foreground mt-1">Total aportado: <strong>{totalPaid.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</strong> ({progress}% de la meta)</div>
        </div>
      </CardContent>
    </Card>
  );
}
