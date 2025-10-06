'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePrivateFormat } from '@/lib/hooks/usePrivateFormat';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteTransaction } from '@/app/app/expenses/actions';
import { EditTransactionDialog } from '@/app/app/components/EditTransactionDialog';
import { useRouter } from 'next/navigation';
import { TransactionStatusBadge, type TransactionStatus } from '@/components/shared/TransactionStatusBadge';
import Image from 'next/image';

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
  paid_by?: string | null;
  status?: TransactionStatus;
  categories: {
    name: string;
    icon: string | null;
  } | null;
  profile?: {
    display_name: string;
    avatar_url: string | null;
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
  const { formatPrivateCurrency } = usePrivateFormat();
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
    <>
      {/* Vista Móvil - Cards */}
      <div className="space-y-3 md:hidden">
        {transactions.map((transaction) => (
          <Card key={transaction.id}>
            <CardContent className="py-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {transaction.categories?.icon || (transaction.type === 'expense' ? '💸' : '💰')}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.categories?.name || 'Sin categoría'}</p>
                      {transaction.description && (
                        <p className="text-sm text-muted-foreground">{transaction.description}</p>
                      )}
                    </div>
                  </div>
                  <p
                    className={`text-xl font-bold ${
                      transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {transaction.type === 'expense' ? '-' : '+'}
                    {formatPrivateCurrency(transaction.amount)}
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="space-y-1">
                    {transaction.profile && (
                      <p className="text-muted-foreground">
                        Pagado por: <span className="font-medium">{transaction.profile.display_name}</span>
                      </p>
                    )}
                    {transaction.status && <TransactionStatusBadge status={transaction.status} />}
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
      </div>

      {/* Vista Desktop - Tabla */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Pagado por</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                {showActions && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {transaction.categories?.icon || (transaction.type === 'expense' ? '💸' : '💰')}
                      </span>
                      <span className="font-medium">{transaction.categories?.name || 'Sin categoría'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm">{transaction.description || '-'}</p>
                      <Badge variant={transaction.type === 'expense' ? 'destructive' : 'default'} className="text-xs">
                        {transaction.type === 'expense' ? 'Gasto' : 'Ingreso'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`text-lg font-bold ${
                        transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {transaction.type === 'expense' ? '-' : '+'}
                      {formatPrivateCurrency(transaction.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {transaction.profile ? (
                      <div className="flex items-center gap-2">
                        {transaction.profile.avatar_url && (
                          <Image
                            src={transaction.profile.avatar_url}
                            alt={transaction.profile.display_name}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        )}
                        <span className="text-sm">{transaction.profile.display_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {transaction.status ? (
                      <TransactionStatusBadge status={transaction.status} />
                    ) : (
                      <TransactionStatusBadge status="confirmed" />
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(transaction.created_at || transaction.occurred_at).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingId(transaction.id)}
                          disabled={deletingId === transaction.id || transaction.status === 'locked'}
                          title={transaction.status === 'locked' ? 'No se puede editar una transacción cerrada' : 'Editar'}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(transaction.id)}
                          disabled={deletingId === transaction.id || transaction.status === 'locked'}
                          title={transaction.status === 'locked' ? 'No se puede eliminar una transacción cerrada' : 'Eliminar'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
    </>
  );
}
