'use client';

import { editCommonMovement } from '@/app/sickness/balance/actions';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

interface EditCommonMovementButtonProps {
  tx: {
    id: string;
    type: string; // 'income' | 'expense'
    amount: number;
    description?: string;
    category_id?: string;
    occurred_at?: string;
    performed_at?: string | null;
    paid_by?: string | null; // Para ingresos, el profile_id del miembro
  };
  householdId?: string;
  onSuccess?: () => void;
  categories: Array<{ id: string; name: string }>;
  members: Array<{ profile_id: string; email: string }>;
}

export function EditCommonMovementButton({ tx, householdId, onSuccess, categories, members }: EditCommonMovementButtonProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      amount: tx.amount,
      description: tx.description || '',
      categoryId: tx.category_id || '',
      occurredAt: tx.performed_at
        ? tx.performed_at.slice(0, 16)
        : (tx.occurred_at ? (tx.occurred_at.length > 10 ? tx.occurred_at.slice(0, 16) : `${tx.occurred_at}T00:00`) : ''),
      // Para ingresos: usar el profile_id del miembro que lo aportó; para gastos: 'common'
      paidBy: tx.type === 'income' && tx.paid_by ? tx.paid_by : 'common',
    },
  });

  const paidBy = watch('paidBy');

  const onSubmit = async (data: { amount: number; description: string; categoryId: string; occurredAt: string; paidBy: string }) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('movementId', tx.id);
      formData.append('householdId', householdId || '');
      formData.append('amount', String(data.amount));
      formData.append('description', data.description);
      formData.append('categoryId', data.categoryId);
      formData.append('occurredAt', data.occurredAt);
      formData.append('paidBy', data.paidBy);

      const result = await editCommonMovement(formData);

      if (result.ok) {
        toast.success('Movimiento actualizado correctamente');
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(result.message || 'Error al actualizar el movimiento');
      }
    } catch (error) {
      console.error('Error editando movimiento común:', error);
      toast.error('Error inesperado al actualizar el movimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requiresMember = tx.type === 'income';

  return (
    <>
      <button
        className="ml-2 px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
        title="Editar movimiento común"
        onClick={() => setOpen(true)}
      >
        Editar
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar {tx.type === 'income' ? 'ingreso' : 'gasto'} común</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Importe (€)</label>
              <input
                type="number"
                step="0.01"
                min={0.01}
                {...register('amount', { required: true, min: 0.01 })}
                className="border rounded px-2 py-1 w-full"
              />
              {errors.amount && <span className="text-xs text-red-500">Importe obligatorio</span>}
            </div>
            <div>
              <label className="block text-sm font-medium">Descripción</label>
              <input
                type="text"
                {...register('description')}
                className="border rounded px-2 py-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Categoría</label>
              <select {...register('categoryId')} className="border rounded px-2 py-1 w-full">
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Fecha y hora</label>
              <input
                type="datetime-local"
                {...register('occurredAt', { required: true })}
                className="border rounded px-2 py-1 w-full"
              />
              {errors.occurredAt && <span className="text-xs text-red-500">Fecha obligatoria</span>}
            </div>

            {/* Pagador (para ingresos es obligatorio) */}
            <div>
              <label className="block text-sm font-medium">Pagado por</label>
              <select
                {...register('paidBy', { required: requiresMember ? 'Selecciona un miembro' : false })}
                className="border rounded px-2 py-1 w-full"
              >
                <option value="common">Cuenta común</option>
                {members.map((m) => (
                  <option key={m.profile_id} value={m.profile_id}>{m.email}</option>
                ))}
              </select>
              {requiresMember && paidBy === 'common' && (
                <span className="text-xs text-red-500">Para ingresos, selecciona un miembro</span>
              )}
            </div>

            <DialogFooter>
              <button
                type="button"
                className="px-3 py-1 rounded bg-muted text-muted-foreground border mr-2"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
