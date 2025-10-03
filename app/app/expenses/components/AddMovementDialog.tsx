'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { createMovement } from '@/app/app/expenses/actions';

interface AddMovementDialogProps {
  categories: Array<{ id: string; name: string; icon: string | null; type: string }>;
}

export function AddMovementDialog({ categories }: AddMovementDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<'expense' | 'income'>('expense');

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      formData.append('type', type);

      const result = await createMovement(formData);

      if (!result.ok) {
        toast.error(result.message);
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, errors]) => {
            toast.error(`${field}: ${errors[0]}`);
          });
        }
      } else {
        toast.success('Movimiento creado exitosamente');
        setOpen(false);
        // Reset form
        e.currentTarget.reset();
      }
    } catch {
      toast.error('Ocurrió un error. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Nuevo Movimiento</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nuevo Movimiento</DialogTitle>
          <DialogDescription>Registra un gasto o ingreso</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'expense' | 'income')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">💸 Gasto</SelectItem>
                <SelectItem value="income">💰 Ingreso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor="amount">Monto (€) *</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              required
              disabled={isLoading}
            />
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label htmlFor="category_id">Categoría</Label>
            <Select name="category_id" defaultValue="none">
              <SelectTrigger>
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin categoría</SelectItem>
                {filteredCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <Label htmlFor="occurred_at">Fecha *</Label>
            <Input
              id="occurred_at"
              name="occurred_at"
              type="date"
              defaultValue={new Date().toISOString().split('T')[0]}
              required
              disabled={isLoading}
            />
          </div>

          {/* Nota */}
          <div className="space-y-2">
            <Label htmlFor="note">Nota (opcional)</Label>
            <Input
              id="note"
              name="note"
              placeholder="Ej: Compra del supermercado"
              disabled={isLoading}
            />
          </div>

          {/* Moneda (oculto, siempre EUR) */}
          <input type="hidden" name="currency" value="EUR" />

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
