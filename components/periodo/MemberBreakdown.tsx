import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';

export type MemberBreakdownContribution = {
  profile_id: string;
  email: string;
  income?: number;
  share_percent?: number; // 0..1
  base_expected?: number;
  direct_expenses?: number;
  expected_after_direct?: number;
  expected_amount?: number | null;
  paid_amount?: number | null;
};

export function MemberBreakdown({
  contributions,
  privacyMode = false,
  title = 'Desglose por miembro',
}: {
  contributions: MemberBreakdownContribution[];
  privacyMode?: boolean;
  title?: string;
}) {
  const formatCurrency = (amount: number) => {
    if (privacyMode) return '•••••';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  if (!Array.isArray(contributions) || contributions.length === 0) return null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {contributions.map((contrib) => {
            const expected = (contrib.expected_amount ?? contrib.expected_after_direct ?? 0) as number;
            const paid = (contrib.paid_amount ?? 0) as number;
            const pending = Math.max(0, expected - paid);
            const isPaid = pending <= 0;
            const percent = Math.round(((contrib.share_percent ?? 0) as number) * 100);

            return (
              <div key={contrib.profile_id} className="p-3 rounded-lg border bg-card">
                <div className="flex items-center justify-between">
                  <p className="font-medium truncate">{contrib.email}</p>
                  <Badge variant="outline">{percent}%</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-2">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Ingreso</span>
                    <span>{formatCurrency((contrib.income ?? 0) as number)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Base</span>
                    <span>{formatCurrency((contrib.base_expected ?? 0) as number)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Gastos directos</span>
                    <span className="text-amber-700">{formatCurrency((contrib.direct_expenses ?? 0) as number)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Esperado neto</span>
                    <span className="font-medium">{formatCurrency(expected)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <div className="text-muted-foreground">Pagado: {formatCurrency(paid)}</div>
                  {isPaid ? (
                    <div className="flex items-center gap-1 text-green-600 font-medium">
                      <CheckCircle className="h-4 w-4" /> Al día
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-orange-600 font-medium">
                      <XCircle className="h-4 w-4" /> Pendiente: {formatCurrency(pending)}
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
