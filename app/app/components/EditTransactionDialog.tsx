'use client';

import { useState, useTransition, useEffect } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateTransaction } from '@/app/app/expenses/edit-actions';

interface Category {
  id: string;
  name: string;
  icon: string | null;
  type: string;
}

interface Transaction {
  id: string;
  description: string | null;
  occurred_at: string;
  category_id: string | null;
  amount: number;
  type: 'expense' | 'income';
}

interface EditTransactionDialogProps {
  transaction: Transaction;
  categories: Category[];
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void | Promise<void>;
}

export function EditTransactionDialog({
  transaction,
  categories,
  open,
  onClose,
  onUpdate,
}: EditTransactionDialogProps) {
  const [isPending, startTransition] = useTransition();

  // Estado local para el formulario
  const [description, setDescription] = useState(transaction.description || '');
  const [occurredAt, setOccurredAt] = useState(
    transaction.occurred_at ? transaction.occurred_at.split('T')[0] : ''
  );
  const [amount, setAmount] = useState(transaction.amount.toString());
  
  // Para la categoría, usamos un approach no-controlled para evitar bugs de renderizado del Select
  // El Select tiene key={transaction.id} para forzar re-render cuando cambia el movimiento
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    transaction.category_id || 'none'
  );

  // Actualizar estado cuando cambia el movimiento
  useEffect(() => {
    setDescription(transaction.description || '');
    setOccurredAt(transaction.occurred_at ? transaction.occurred_at.split('T')[0] : '');
    setSelectedCategoryId(transaction.category_id || 'none');
    setAmount(transaction.amount.toString());
  }, [transaction]);

  // Filtrar categorías por tipo del movimiento
  const filteredCategories = categories.filter(
    (cat) => cat.type === transaction.type
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!occurredAt) {
      toast.error('La fecha es requerida');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('movementId', transaction.id);
      formData.append('description', description);
      formData.append('occurred_at', occurredAt);
      // FIX: Convertir "none" a string vacío para que el schema lo transforme a null
      if (selectedCategoryId && selectedCategoryId !== 'none') {
        formData.append('category_id', selectedCategoryId);
      } else {
        formData.append('category_id', '');
      }
      formData.append('amount', amount);

      const result = await updateTransaction(formData);

      if (!result.ok) {
        toast.error(result.message);
        if (result.fieldErrors) {
          // Mostrar errores de campos específicos
          Object.entries(result.fieldErrors).forEach(([field, errors]) => {
            toast.error(`${field}: ${errors[0]}`);
          });
        }
      } else {
        toast.success('Movimiento actualizado');
        onClose();
        // Llamar al callback de actualización si existe
        if (onUpdate) {
          await onUpdate();
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Movimiento</DialogTitle>
          <DialogDescription>
            Modifica los detalles del movimiento. Los cambios quedarán
            registrados en el historial.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Compra supermercado"
              required
              disabled={isPending}
            />
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <Label htmlFor="occurred_at">Fecha</Label>
            <Input
              id="occurred_at"
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              required
              disabled={isPending}
            />
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Select
              key={transaction.id}
              defaultValue={selectedCategoryId}
              onValueChange={setSelectedCategoryId}
              disabled={isPending}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                {/* FIX: Usar "none" en lugar de "" (SelectItem no acepta value vacío) */}
                <SelectItem value="none">Sin categoría</SelectItem>
                {filteredCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor="amount">Monto (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={isPending}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
