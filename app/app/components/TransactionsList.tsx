'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteTransaction } from '@/app/app/expenses/actions';
import { EditTransactionDialog } from '@/app/app/components/EditTransactionDialog';
import { useRouter } from 'next/navigation';

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: 'expense' | 'income';
  description: string | null;
  occurred_at: string;
  created_at: string | null;
  updated_at?: string | null;
  category_id: string | null;
  categories: {
    name: string;
    icon: string | null;
  } | null;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  type: string;
}

interface TransactionsListProps {
  transactions: Transaction[];
  categories?: Category[];
  showActions?: boolean;
  onUpdate?: () => void | Promise<void>;
}

export function TransactionsList({ transactions, categories = [], showActions = true, onUpdate }: TransactionsListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta transacción?')) return;

    setDeletingId(id);
    const result = await deleteTransaction(id);

    if (!result.ok) {
      toast.error(result.message);
    } else {
      toast.success('Transacción eliminada');
      router.refresh();
    }
    setDeletingId(null);
  };

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">
              No hay transacciones registradas
            </p>
            <p className="text-sm">
              Haz click en &quot;+ Nueva Transacción&quot; para empezar
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <Card key={transaction.id}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="text-2xl flex-shrink-0">
                  {transaction.categories?.icon || (transaction.type === 'expense' ? '💸' : '💰')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {transaction.categories?.name || 'Sin categoría'}
                  </p>
                  {transaction.description && (
                    <p className="text-sm text-muted-foreground truncate">{transaction.description}</p>
                  )}
                  {transaction.created_at && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p
                    className={`text-xl font-bold ${
                      transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {transaction.type === 'expense' ? '-' : '+'}
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </p>
                  <Badge variant={transaction.type === 'expense' ? 'destructive' : 'default'} className="mt-1">
                    {transaction.type === 'expense' ? 'Gasto' : 'Ingreso'}
                  </Badge>
                </div>
                {showActions && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingId(transaction.id)}
                      disabled={deletingId === transaction.id}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(transaction.id)}
                      disabled={deletingId === transaction.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Dialog de edición */}
      {editingId && (
        <EditTransactionDialog
          transaction={transactions.find((t) => t.id === editingId)!}
          categories={categories}
          open={editingId !== null}
          onClose={() => setEditingId(null)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
