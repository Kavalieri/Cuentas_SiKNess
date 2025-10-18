import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

interface EditDirectExpenseButtonProps {
  tx: {
    id: string;
    amount: number;
    description?: string;
    category_id?: string;
    occurred_at?: string;
  };
  householdId?: string;
  onSuccess?: () => void;
  categories: Array<{ id: string; name: string }>;
}

export function EditDirectExpenseButton({ tx, householdId, onSuccess, categories }: EditDirectExpenseButtonProps) {
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      amount: tx.amount,
      description: tx.description || '',
      categoryId: tx.category_id || '',
      occurredAt: tx.occurred_at ? tx.occurred_at.slice(0, 10) : '',
    },
  });

  const onSubmit = async (data: { amount: number; description: string; categoryId: string; occurredAt: string }) => {
    const formData = new FormData();
    formData.append('movementId', tx.id);
    formData.append('householdId', householdId || '');
    formData.append('amount', String(data.amount));
    formData.append('description', data.description);
    formData.append('categoryId', data.categoryId);
    formData.append('occurredAt', data.occurredAt);
    const res = await fetch('/app/sickness/balance/actions/editDirectExpenseWithCompensatory', {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      setOpen(false);
      onSuccess?.();
    }
  };

  return (
    <>
      <button
        className="ml-2 px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
        title="Editar movimiento directo"
        onClick={() => setOpen(true)}
      >
        Editar
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar gasto directo</DialogTitle>
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
              <label className="block text-sm font-medium">Fecha</label>
              <input
                type="date"
                {...register('occurredAt', { required: true })}
                className="border rounded px-2 py-1 w-full"
              />
              {errors.occurredAt && <span className="text-xs text-red-500">Fecha obligatoria</span>}
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
                className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                disabled={isSubmitting}
              >
                Guardar
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
