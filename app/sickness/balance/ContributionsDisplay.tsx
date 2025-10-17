'use client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, Users, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Contribution {
  profile_id: string;
  email: string;
  expected_amount: number | null;
  paid_amount: number | null;
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
          No hay contribuciones calculadas para este período. El owner debe bloquear el período para calcular las contribuciones.
        </AlertDescription>
      </Alert>
    );
  }

  const allPaid = data.contributions.every((c) => c.status === 'paid');
  const somePending = data.contributions.some((c) => c.status === 'pending');

  return (
    <Card className={allPaid ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contribuciones Calculadas
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
          Validación de contribuciones para{' '}
          {data.period.year}-{String(data.period.month).padStart(2, '0')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.contributions.map((contrib) => {
            const expected = contrib.expected_amount || 0;
            const paid = contrib.paid_amount || 0;
            const pending = expected - paid;
            const isPaid = pending <= 0;

            return (
              <div
                key={contrib.profile_id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{contrib.email}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span>Esperado: {formatCurrency(expected)}</span>
                    <span>Pagado: {formatCurrency(paid)}</span>
                    {!isPaid && <span className="text-orange-600 font-medium">Pendiente: {formatCurrency(pending)}</span>}
                  </div>
                </div>
                <div className="ml-4">
                  {isPaid ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-orange-500" />
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
