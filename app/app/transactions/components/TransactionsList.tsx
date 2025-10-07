'use client';

import { TransactionItem } from '@/components/shared/data-display/TransactionItem';
import { EmptyState } from '@/components/shared/data-display/EmptyState';
import { Receipt } from 'lucide-react';
import type { Database } from '@/types/database';

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'] | null;
  profiles?: Database['public']['Tables']['profiles']['Row'] | null;
};

interface TransactionsListProps {
  transactions: Transaction[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TransactionsList({
  transactions,
  onEdit,
  onDelete,
}: TransactionsListProps) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="h-12 w-12" />}
        title="No hay transacciones"
        description="No se encontraron transacciones que coincidan con los filtros."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Vista móvil: Cards */}
      <div className="grid gap-4 md:hidden">
        {transactions.map((transaction) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
            variant="detailed"
            showActions={true}
            onEdit={() => onEdit(transaction.id)}
            onDelete={() => onDelete(transaction.id)}
          />
        ))}
      </div>

      {/* Vista desktop: Lista compacta */}
      <div className="hidden md:block space-y-2">
        {transactions.map((transaction) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
            variant="compact"
            showActions={true}
            onEdit={() => onEdit(transaction.id)}
            onDelete={() => onDelete(transaction.id)}
          />
        ))}
      </div>
    </div>
  );
}
