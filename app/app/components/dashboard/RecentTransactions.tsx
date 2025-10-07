'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TransactionItem } from '@/components/shared/data-display/TransactionItem';
import { EmptyState } from '@/components/shared/data-display/EmptyState';
import { ArrowRight, Receipt } from 'lucide-react';
import Link from 'next/link';
import type { Database } from '@/types/database';

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'] | null;
  profiles?: Database['public']['Tables']['profiles']['Row'] | null;
};

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const hasTransactions = transactions.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Últimas Transacciones
            </CardTitle>
            <CardDescription>
              {hasTransactions 
                ? `Mostrando las últimas ${transactions.length} transacciones`
                : 'No hay transacciones este mes'}
            </CardDescription>
          </div>
          {hasTransactions && (
            <Link href="/app/transactions">
              <Button variant="ghost" size="sm">
                Ver todas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasTransactions ? (
          <div className="space-y-2">
            {transactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                variant="compact"
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Receipt className="h-12 w-12 text-muted-foreground/50" />}
            title="Sin transacciones"
            description="No hay transacciones registradas en este período"
          />
        )}
      </CardContent>
    </Card>
  );
}
