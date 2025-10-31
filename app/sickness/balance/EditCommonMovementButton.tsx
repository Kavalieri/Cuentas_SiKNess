'use client';

import { editCommonMovement } from '@/app/sickness/balance/actions';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { 
  getCategoryHierarchy, 
  type CategoryHierarchy,
  type CategoryWithSubcategories,
  type Subcategory
} from '@/app/sickness/configuracion/categorias/hierarchy-actions';

interface EditCommonMovementButtonProps {
  tx: {
    id: string;
    type: string; // 'income' | 'expense'
    amount: number;
    description?: string;
    category_id?: string;
    subcategory_id?: string;
    occurred_at?: string;
    performed_at?: string | null;
    paid_by?: string | null; // Para ingresos, el profile_id del miembro
  };
  householdId?: string;
  onSuccess?: () => void;
  members: Array<{ profile_id: string; email: string; display_name?: string; role?: string }>;
}

export function EditCommonMovementButton({ tx, householdId, onSuccess, members }: EditCommonMovementButtonProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✨ Estados para jerarquía de 3 niveles
  const [hierarchy, setHierarchy] = useState<CategoryHierarchy[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      amount: tx.amount,
      description: tx.description || '',
      occurredAt: tx.performed_at
        ? tx.performed_at.slice(0, 16)
        : (tx.occurred_at ? (tx.occurred_at.length > 10 ? tx.occurred_at.slice(0, 16) : `${tx.occurred_at}T00:00`) : ''),
      // Para ingresos: usar el profile_id del miembro que lo aportó; para gastos: 'common'
      paidBy: tx.type === 'income' && tx.paid_by ? tx.paid_by : 'common',
    },
  });

  const paidBy = watch('paidBy');

  // ✨ Cargar jerarquía y resolver valores iniciales al abrir
  useEffect(() => {
    if (open && householdId) {
      const loadHierarchyAndResolve = async () => {
        // Cargar jerarquía
        const result = await getCategoryHierarchy(householdId);
        if (result.ok && result.data) {
          setHierarchy(result.data);
          
          // ✅ Priorizar subcategory_id sobre category_id
          const targetId = tx.subcategory_id || tx.category_id;
          if (targetId) {
            // ✅ Buscar en toda la jerarquía (parent → category → subcategory)
            for (const parent of result.data) {
              for (const category of parent.categories) {
                // ✅ Primero buscar en subcategorías
                const subcategory = category.subcategories?.find(s => s.id === targetId);
                if (subcategory) {
                  setSelectedParentId(parent.id);
                  setSelectedCategoryId(category.id);
                  setSelectedSubcategoryId(subcategory.id);
                  return; // Salir completamente
                }
                // ✅ Fallback: verificar si targetId es la categoría (legacy)
                if (category.id === targetId) {
                  setSelectedParentId(parent.id);
                  setSelectedCategoryId(category.id);
                  setSelectedSubcategoryId('');
                  return;
                }
              }
            }
          }
        } else {
          toast.error('No se pudo cargar la jerarquía de categorías');
        }
      };
      loadHierarchyAndResolve();
    }
  }, [open, householdId, tx.category_id, tx.subcategory_id]);

  // ✨ Filtros cascada (ingresos o gastos según el tipo de transacción)
  const filteredParents = useMemo(() => {
    if (tx.type === 'income') return hierarchy.filter(p => p.type === 'income');
    return hierarchy.filter(p => p.type === 'expense');
  }, [hierarchy, tx.type]);

  const selectedParent = useMemo(() => {
    return hierarchy.find(p => p.id === selectedParentId);
  }, [hierarchy, selectedParentId]);

  const availableCategories = useMemo(() => {
    return selectedParent?.categories || [];
  }, [selectedParent]);

  const selectedCategory = useMemo(() => {
    return availableCategories.find(c => c.id === selectedCategoryId);
  }, [availableCategories, selectedCategoryId]);

  const availableSubcategories = useMemo(() => {
    return selectedCategory?.subcategories || [];
  }, [selectedCategory]);

  const onSubmit = async (data: { amount: number; description: string; occurredAt: string; paidBy: string }) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('movementId', tx.id);
      formData.append('householdId', householdId || '');
      formData.append('amount', String(data.amount));
      formData.append('description', data.description);
      // ✨ Enviar subcategory_id en lugar de categoryId
      formData.append('subcategoryId', selectedSubcategoryId || '');
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
            
            {/* ✨ NUEVO: Jerarquía de 3 niveles */}
            <div>
              <Label className="block text-sm font-medium mb-1">Grupo de categoría</Label>
              <Select
                value={selectedParentId}
                onValueChange={(value) => {
                  setSelectedParentId(value);
                  setSelectedCategoryId(''); // Reset dependientes
                  setSelectedSubcategoryId('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona grupo" />
                </SelectTrigger>
                <SelectContent>
                  {filteredParents.map((parent) => (
                    <SelectItem key={parent.id} value={parent.id}>
                      <span className="flex items-center gap-2">
                        <span>{parent.icon}</span>
                        <span>{parent.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="block text-sm font-medium mb-1">Categoría</Label>
              <Select
                value={selectedCategoryId}
                onValueChange={(value) => {
                  setSelectedCategoryId(value);
                  setSelectedSubcategoryId(''); // Reset dependiente
                }}
                disabled={!selectedParentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!selectedParentId ? 'Primero selecciona un grupo' : 'Selecciona categoría'} />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((category: CategoryWithSubcategories) => (
                    <SelectItem key={category.id} value={category.id}>
                      <span className="flex items-center gap-2">
                        {category.icon && <span>{category.icon}</span>}
                        <span>{category.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="block text-sm font-medium mb-1">Subcategoría</Label>
              <Select
                value={selectedSubcategoryId}
                onValueChange={setSelectedSubcategoryId}
                disabled={!selectedCategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!selectedCategoryId ? 'Primero selecciona categoría' : 'Selecciona subcategoría'} />
                </SelectTrigger>
                <SelectContent>
                  {availableSubcategories.map((subcategory: Subcategory) => (
                    <SelectItem key={subcategory.id} value={subcategory.id}>
                      <span className="flex items-center gap-2">
                        {subcategory.icon && <span>{subcategory.icon}</span>}
                        <span>{subcategory.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <option key={m.profile_id} value={m.profile_id}>
                    {m.display_name || m.email}
                  </option>
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
