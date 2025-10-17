'use client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, Users, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Contribution {
  profile_id: string;
  email: string;
  income: number;
  share_percent: number;
  base_expected: number;
  direct_expenses: number;
  expected_after_direct: number;
  expected_amount: number | null;
  paid_amount: number | null;
  pending_amount: number;
  status: string | null;
  calculation_method: string | null;
}

interface ContributionsData {
  ok: boolean;
  contributions: Contribution[];
  period: {
    year: number;
    month: number;
    status: string | null;
    calculationType?: string | null;
    monthlyGoal?: number | null;
  };
}

export function ContributionsDisplay({ householdId, privacyMode }: { householdId: string; privacyMode: boolean }) {
  const [data, setData] = useState<ContributionsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/periods/contributions?householdId=${householdId}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error('Error loading contributions:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [householdId]);

  const formatCurrency = (amount: number) => {
    if (privacyMode) return '•••••';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contribuciones Calculadas
          </CardTitle>
          <CardDescription>Cargando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!data || !data.ok || data.contributions.length === 0) {
    return (
      <Alert>
        <AlertTitle>Sin contribuciones calculadas</AlertTitle>
        <AlertDescription>
          No hay contribuciones para este período. Usa &quot;Calcular contribuciones&quot; en Gestión de Periodo para ver el desglose y validar antes de bloquear.
        </AlertDescription>
      </Alert>
    );
  }

  const allPaid = data.contributions.every((c) => (c.pending_amount ?? 0) <= 0);
  const somePending = data.contributions.some((c) => (c.pending_amount ?? 0) > 0);

  return (
    <Card className={allPaid ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contribuciones y Desglose
          </CardTitle>
          {allPaid && (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completado
            </Badge>
          )}
          {somePending && (
            <Badge variant="secondary">
              <Clock className="h-3 w-3 mr-1" />
              Pendiente
            </Badge>
          )}
        </div>
        <CardDescription>
          Período {data.period.year}-{String(data.period.month).padStart(2, '0')} · Método {data.period?.calculationType ?? '—'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.contributions.map((contrib) => {
            const expected = contrib.expected_amount ?? contrib.expected_after_direct ?? 0;
            const paid = contrib.paid_amount ?? 0;
            const pending = Math.max(0, expected - paid);
            const isPaid = pending <= 0;
            const percent = Math.round((contrib.share_percent ?? 0) * 100);
            return (
              <div key={contrib.profile_id} className="p-3 rounded-lg border bg-card">
                <div className="flex items-center justify-between">
                  <p className="font-medium truncate">{contrib.email}</p>
                  <Badge variant="outline">{percent}%</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-2">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Ingreso</span>
                    <span>{formatCurrency(contrib.income ?? 0)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Base</span>
                    <span>{formatCurrency(contrib.base_expected ?? 0)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Gastos directos</span>
                    <span className="text-amber-700">{formatCurrency(contrib.direct_expenses ?? 0)}</span>
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
