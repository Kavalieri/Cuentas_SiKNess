'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { updateMovement } from '@/app/app/expenses/edit-actions';

interface Category {
  id: string;
  name: string;
  icon: string | null;
  type: string;
}

interface Movement {
  id: string;
  description: string | null;
  occurred_at: string;
  category_id: string | null;
  amount: number;
  type: 'expense' | 'income';
}

interface EditMovementDialogProps {
  movement: Movement;
  categories: Category[];
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void | Promise<void>;
}

export function EditMovementDialog({
  movement,
  categories,
  open,
  onClose,
  onUpdate,
}: EditMovementDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Estado local para el formulario
  const [description, setDescription] = useState(movement.description || '');
  const [occurredAt, setOccurredAt] = useState(
    movement.occurred_at ? movement.occurred_at.split('T')[0] : ''
  );
  const [amount, setAmount] = useState(movement.amount.toString());
  
  // Para la categoría, usamos un approach no-controlled para evitar bugs de renderizado del Select
  // El Select tiene key={movement.id} para forzar re-render cuando cambia el movimiento
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    movement.category_id || 'none'
  );

  // Actualizar estado cuando cambia el movimiento
  useEffect(() => {
    setDescription(movement.description || '');
    setOccurredAt(movement.occurred_at ? movement.occurred_at.split('T')[0] : '');
    setSelectedCategoryId(movement.category_id || 'none');
    setAmount(movement.amount.toString());
  }, [movement]);

  // Filtrar categorías por tipo del movimiento
  const filteredCategories = categories.filter(
    (cat) => cat.type === movement.type
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!occurredAt) {
      toast.error('La fecha es requerida');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('movementId', movement.id);
      formData.append('description', description);
      formData.append('occurred_at', occurredAt);
      // FIX: Convertir "none" a string vacío para que el schema lo transforme a null
      if (selectedCategoryId && selectedCategoryId !== 'none') {
        formData.append('category_id', selectedCategoryId);
      } else {
        formData.append('category_id', '');
      }
      formData.append('amount', amount);

      const result = await updateMovement(formData);

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
              key={movement.id}
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
