'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PrivateAmount } from '@/components/shared/PrivateAmount';
import { getBalanceBreakdown } from '@/app/app/contributions/actions';
import { Info, TrendingUp, Users, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface BalanceBreakdownCardProps {
  householdId: string;
}

export function BalanceBreakdownCard({ householdId }: BalanceBreakdownCardProps) {
  const [data, setData] = useState<{
    totalBalance: number;
    freeBalance: number;
    activeCredits: number;
    reservedCredits: number;
    members: Array<{
      profileId: string;
      displayName: string;
      activeCredits: number;
      reservedCredits: number;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const result = await getBalanceBreakdown(householdId);
      
      if (result.ok && result.data) {
        setData(result.data);
      } else {
        toast.error('Error al cargar desglose de balance');
      }
      
      setLoading(false);
    }

    fetchData();
  }, [householdId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Desglose del Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-6 bg-muted rounded"></div>
            <div className="h-6 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const hasActiveCredits = data.activeCredits > 0;
  const hasReservedCredits = data.reservedCredits > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Desglose del Balance
        </CardTitle>
        <CardDescription>
          Balance total dividido en: dinero común + créditos de miembros
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Total */}
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary"></div>
            <span className="font-semibold">Balance Total</span>
          </div>
          <div className={`text-xl font-bold ${data.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <PrivateAmount amount={data.totalBalance} />
          </div>
        </div>

        {/* Desglose en 3 líneas */}
        <div className="space-y-2 pl-4 border-l-2 border-muted">
          {/* Balance Libre */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
              <span className="text-sm">Balance Libre (común)</span>
            </div>
            <span className="text-sm font-semibold text-green-600">
              <PrivateAmount amount={data.freeBalance} />
            </span>
          </div>

          {/* Créditos Activos */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
              <span className="text-sm">Créditos Activos</span>
              <Users className="h-3 w-3" />
            </div>
            <span className="text-sm font-semibold text-blue-600">
              <PrivateAmount amount={data.activeCredits} />
            </span>
          </div>

          {/* Créditos Reservados */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-orange-500"></div>
              <span className="text-sm">Créditos Reservados</span>
              <Lock className="h-3 w-3" />
            </div>
            <span className="text-sm font-semibold text-orange-600">
              <PrivateAmount amount={data.reservedCredits} />
            </span>
          </div>
        </div>

        {/* Alerta informativa si hay créditos activos */}
        {hasActiveCredits && (
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
              Los <strong>créditos activos</strong> pueden gastarse en expenses comunes, pero pertenecen a miembros específicos.
              {data.members.filter(m => m.activeCredits > 0).length > 0 && (
                <span className="block mt-1">
                  Dueños: {data.members.filter(m => m.activeCredits > 0).map(m => m.displayName).join(', ')}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Alerta informativa si hay créditos reservados */}
        {hasReservedCredits && (
          <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
            <Lock className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-xs text-orange-800 dark:text-orange-200">
              Los <strong>créditos reservados</strong> están bloqueados para aplicarse al mes siguiente y NO forman parte del balance disponible.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
