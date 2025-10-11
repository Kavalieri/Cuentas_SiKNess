'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { PrivateAmount } from '@/components/shared/PrivateAmount';

interface HouseholdCreditsCardProps {
  totalActiveCredits: number;
  totalReservedCredits: number;
  balanceAfterCredits: number;
  rawBalance: number;
  currency: string;
}

export function HouseholdCreditsCard({
  totalActiveCredits,
  totalReservedCredits,
  balanceAfterCredits,
  rawBalance,
  currency = 'EUR',
}: HouseholdCreditsCardProps) {
  const totalCredits = totalActiveCredits + totalReservedCredits;
  const hasCredits = totalCredits > 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="h-4 w-4" />
            Créditos del Hogar
          </CardTitle>
          {hasCredits && (
            <Badge variant="secondary" className="text-xs">
              <PrivateAmount amount={totalCredits} currency={currency} />
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Balance bruto */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Wallet className="h-3 w-3" />
              Balance Total
            </span>
          </div>
          <p className={`text-2xl font-bold ${rawBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <PrivateAmount amount={rawBalance} currency={currency} />
          </p>
        </div>

        {/* Desglose de créditos */}
        {hasCredits && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">Créditos Acumulados:</h4>

            {totalActiveCredits > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-blue-600">
                  <TrendingUp className="h-3 w-3" />
                  Activos
                </span>
                <span className="font-semibold text-blue-600">
                  <PrivateAmount amount={totalActiveCredits} currency={currency} />
                </span>
              </div>
            )}

            {totalReservedCredits > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-orange-600">
                  <TrendingDown className="h-3 w-3" />
                  Reservados
                </span>
                <span className="font-semibold text-orange-600">
                  <PrivateAmount amount={totalReservedCredits} currency={currency} />
                </span>
              </div>
            )}
          </div>
        )}

        {/* Balance disponible (después de créditos) */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Balance Disponible</span>
            <span className="text-xs text-muted-foreground">(sin créditos)</span>
          </div>
          <p className={`text-xl font-bold ${balanceAfterCredits >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <PrivateAmount amount={balanceAfterCredits} currency={currency} />
          </p>
        </div>

        {!hasCredits && (
          <div className="text-xs text-center text-muted-foreground py-4">
            No hay créditos acumulados
          </div>
        )}
      </CardContent>
    </Card>
  );
}
