'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { usePrivateFormat } from '@/lib/hooks/usePrivateFormat';
import { Wallet, CreditCard, DollarSign } from 'lucide-react';

interface BalanceBreakdownProps {
  totalBalance: number;
  freeBalance: number;
  activeCredits: number;
  reservedCredits: number;
}

export function BalanceBreakdown({
  totalBalance,
  freeBalance,
  activeCredits,
  reservedCredits,
}: BalanceBreakdownProps) {
  const { formatPrivateCurrency } = usePrivateFormat();

  const freePercentage = totalBalance > 0 ? (freeBalance / totalBalance) * 100 : 0;
  const creditsPercentage = totalBalance > 0 ? ((activeCredits + reservedCredits) / totalBalance) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Desglose del Balance
        </CardTitle>
        <CardDescription>
          Distribución de tu balance actual
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Balance Total */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Balance Total</p>
              <p className="text-2xl font-bold">{formatPrivateCurrency(totalBalance)}</p>
            </div>
          </div>
        </div>

        {/* Balance Libre */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm font-medium">Balance Libre</span>
            </div>
            <span className="text-sm font-bold text-green-600 dark:text-green-400">
              {formatPrivateCurrency(freeBalance)}
            </span>
          </div>
          <Progress value={freePercentage} className="h-2 [&>div]:bg-green-500" />
          <p className="text-xs text-muted-foreground">
            {freePercentage.toFixed(1)}% del total • Disponible para usar
          </p>
        </div>

        {/* Créditos Activos */}
        {(activeCredits > 0 || reservedCredits > 0) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-3 w-3 text-blue-500" />
                <span className="text-sm font-medium">Créditos</span>
              </div>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {formatPrivateCurrency(activeCredits + reservedCredits)}
              </span>
            </div>
            <Progress value={creditsPercentage} className="h-2 [&>div]:bg-blue-500" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {creditsPercentage.toFixed(1)}% del total
              </span>
              <span>
                Activos: {formatPrivateCurrency(activeCredits)} • 
                Reservados: {formatPrivateCurrency(reservedCredits)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
