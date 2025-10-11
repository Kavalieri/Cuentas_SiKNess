'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PrivateAmount } from '@/components/shared/PrivateAmount';
import { getPersonalBalance } from '@/app/app/contributions/actions';
import { User, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PersonalBalanceCardProps {
  householdId: string;
}

export function PersonalBalanceCard({ householdId }: PersonalBalanceCardProps) {
  const [data, setData] = useState<{
    expectedContribution: number;
    paidAmount: number;
    adjustmentsPaid: number;
    baseAmount: number;
    totalContributed: number;
    pendingAmount: number;
    creditGenerated: number;
    status: string;
    myActiveCredits: number;
    myReservedCredits: number;
    contributionId: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const result = await getPersonalBalance(householdId);

      if (result.ok && result.data) {
        // Debug en development
        if (process.env.NODE_ENV === 'development') {
          console.log('[PersonalBalanceCard] Data received:', result.data);
        }
        setData(result.data);
      } else {
        toast.error('Error al cargar balance personal');
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
            <User className="h-5 w-5" />
            Mi Contribución
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-6 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const progressPercentage = data.baseAmount > 0
    ? Math.min((data.totalContributed / data.baseAmount) * 100, 100)
    : 0;

  const statusConfig = {
    pending_configuration: {
      label: 'Sin configurar',
      color: 'bg-gray-500',
      icon: AlertCircle,
    },
    pending: {
      label: 'Pendiente',
      color: 'bg-yellow-500',
      icon: AlertCircle,
    },
    partial: {
      label: 'Parcial',
      color: 'bg-blue-500',
      icon: TrendingUp,
    },
    paid: {
      label: 'Pagado',
      color: 'bg-green-500',
      icon: CheckCircle2,
    },
    overpaid: {
      label: 'Sobrepagado',
      color: 'bg-purple-500',
      icon: CheckCircle2,
    },
  };

  const currentStatus = statusConfig[data.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = currentStatus.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Mi Contribución del Mes
        </CardTitle>
        <CardDescription>
          Tracking de tu aporte mensual al hogar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estado */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Estado:</span>
          <Badge variant="outline" className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {currentStatus.label}
          </Badge>
        </div>

        {/* Montos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Base esperada:</span>
            <span className="font-semibold">
              <PrivateAmount amount={data.baseAmount} />
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Ajustes (prepagos):</span>
            <span className="font-semibold text-blue-600">
              <PrivateAmount amount={data.adjustmentsPaid} />
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-medium">Total aportado:</span>
            <span className="font-bold text-green-600">
              <PrivateAmount amount={data.totalContributed} />
            </span>
          </div>

          {data.pendingAmount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pendiente:</span>
              <span className="font-semibold text-orange-600">
                <PrivateAmount amount={data.pendingAmount} />
              </span>
            </div>
          )}

          {data.creditGenerated > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Crédito generado:</span>
              <span className="font-semibold text-purple-600">
                <PrivateAmount amount={data.creditGenerated} />
              </span>
            </div>
          )}
        </div>

        {/* Barra de progreso */}
        {data.baseAmount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progreso</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress
              value={progressPercentage}
              className={`h-2 ${progressPercentage >= 100 ? '[&>div]:bg-green-500' : ''}`}
            />
          </div>
        )}

        {/* Mensaje si sin configurar */}
        {data.status === 'pending_configuration' && (
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            Configura tus ingresos mensuales en <strong>Contribuciones</strong> para activar el tracking.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
