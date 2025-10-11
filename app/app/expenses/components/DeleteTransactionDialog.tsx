'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { deleteTransaction } from '@/app/app/expenses/actions';
import { formatCurrency } from '@/lib/format';

interface Transaction {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  currency: string;
  description: string | null;
  occurred_at: string | Date;
  categories?: {
    name: string;
    icon: string | null;
  } | null;
}

interface DeleteTransactionDialogProps {
  transaction: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteTransactionDialog({
  transaction,
  open,
  onOpenChange,
}: DeleteTransactionDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);

    const result = await deleteTransaction(transaction.id);

    if (!result.ok) {
      toast.error(result.message);
      setIsLoading(false);
      return;
    }

    toast.success('Transacción eliminada exitosamente');
    setIsLoading(false);
    onOpenChange(false);

    // Refrescar datos del servidor
    router.refresh();
  };

  const formatDate = (dateValue: string | Date) => {
    // Manejar si ya es un objeto Date
    let date: Date;

    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'string') {
      // Si ya incluye 'T', es un timestamp completo, si no, es solo fecha
      const dateString = dateValue.includes('T') ? dateValue : dateValue + 'T00:00:00';
      date = new Date(dateString);
    } else {
      console.error('Invalid date value:', dateValue);
      return 'Fecha inválida';
    }

    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateValue);
      return 'Fecha inválida';
    }

    return date.toLocaleDateString('es-ES', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            ¿Eliminar transacción?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente la siguiente transacción:
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Detalles de la transacción */}
        <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {transaction.categories?.icon} {transaction.categories?.name || 'Sin categoría'}
            </span>
            <span
              className={`text-lg font-bold ${
                transaction.type === 'expense' ? 'text-destructive' : 'text-green-600'
              }`}
            >
              {transaction.type === 'expense' ? '-' : '+'}
              {formatCurrency(transaction.amount, transaction.currency)}
            </span>
          </div>

          {transaction.description && (
            <p className="text-sm text-muted-foreground">{transaction.description}</p>
          )}

          <p className="text-xs text-muted-foreground">{formatDate(transaction.occurred_at)}</p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
