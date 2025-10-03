'use client';

import { formatCurrency } from '@/lib/format';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BalanceDisplayProps {
  balance: number;
  income: number;
  expenses: number;
}

export function BalanceDisplay({ balance, income, expenses }: BalanceDisplayProps) {
  const isPositive = balance >= 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Balance Total</span>
          <div className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(balance)}
          </div>
        </div>
      </div>
      <div className="h-8 w-px bg-border" />
      <div className="flex gap-2 text-xs">
        <Badge variant="outline" className="gap-1">
          <TrendingUp className="h-3 w-3 text-green-600" />
          {formatCurrency(income)}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <TrendingDown className="h-3 w-3 text-red-600" />
          {formatCurrency(expenses)}
        </Badge>
      </div>
    </div>
  );
}
