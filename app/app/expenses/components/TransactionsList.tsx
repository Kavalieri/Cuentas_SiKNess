'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PrivateAmount } from '@/components/shared/PrivateAmount';
import { EditTransactionDialog } from './EditTransactionDialog';
import { DeleteTransactionDialog } from './DeleteTransactionDialog';
import { Pencil, Trash2 } from 'lucide-react';

type Transaction = {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  currency: string;
  description: string | null;
  occurred_at: string;
  created_at: string;
  category_id: string | null;
  paid_by: string | null;
  categories: {
    id: string;
    name: string;
    icon: string | null;
  } | null;
};

type Category = {
  id: string;
  name: string;
  icon: string;
  type: 'expense' | 'income';
};

type TransactionsListProps = {
  transactions: Transaction[];
  categories: Category[];
};

export function TransactionsList({ transactions, categories }: TransactionsListProps) {
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="space-y-4">
        {transactions.map((transaction) => (
          <Card key={transaction.id}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                {/* Info izquierda */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="text-2xl flex-shrink-0">
                    {transaction.categories?.icon ||
                      (transaction.type === 'expense' ? '💸' : '💰')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {transaction.categories?.name || 'Sin categoría'}
                    </p>
                    {transaction.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {transaction.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDate(transaction.occurred_at)} • {formatTime(transaction.created_at)}
                    </p>
                  </div>
                </div>

                {/* Info derecha + acciones */}
                <div className="flex items-center gap-4">
                  {/* Monto */}
                  <div className="text-right">
                    <p
                      className={`text-xl font-bold ${
                        transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {transaction.type === 'expense' ? '-' : '+'}
                      <PrivateAmount amount={transaction.amount} currency={transaction.currency} />
                    </p>
                    <Badge variant={transaction.type === 'expense' ? 'destructive' : 'default'}>
                      {transaction.type === 'expense' ? 'Gasto' : 'Ingreso'}
                    </Badge>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingTransaction(transaction)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingTransaction(transaction)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Diálogos */}
      {editingTransaction && (
        <EditTransactionDialog
          transaction={editingTransaction}
          categories={categories}
          open={!!editingTransaction}
          onOpenChange={(open) => !open && setEditingTransaction(null)}
        />
      )}

      {deletingTransaction && (
        <DeleteTransactionDialog
          transaction={deletingTransaction}
          open={!!deletingTransaction}
          onOpenChange={(open) => !open && setDeletingTransaction(null)}
        />
      )}
    </>
  );
}
