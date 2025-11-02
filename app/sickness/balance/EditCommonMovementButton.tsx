'use client';

import { editCommonMovement } from '@/app/sickness/balance/actions';
import type {
    CategoryWithSubcategories,
    Subcategory
} from '@/app/sickness/configuracion/categorias/hierarchy-actions';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCategoryHierarchy } from '@/contexts/CategoryHierarchyContext';
import { Pencil } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

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
    performed_by_profile_id?: string | null; // ✅ Issue #29: Ejecutor físico
  };
  householdId?: string;
  onSuccess?: () => void;
  members: Array<{ profile_id: string; email: string; display_name?: string; role?: string }>;
}

export function EditCommonMovementButton({ tx, householdId, onSuccess, members }: EditCommonMovementButtonProps) {
  const [open, setOpen] = useState(false);

  // ✨ Usar jerarquía pre-cargada del Context (Issue #22)
  const { hierarchy } = useCategoryHierarchy();

  // ✨ Estados para selección de 3 niveles
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      amount: tx.amount,
      description: tx.description || '',
      occurredAt: tx.performed_at
        ? tx.performed_at.slice(0, 16)
        : (tx.occurred_at ? (tx.occurred_at.length > 10 ? tx.occurred_at.slice(0, 16) : `${tx.occurred_at}T00:00`) : ''),
      // ✅ Issue #29: Usar performed_by_profile_id (ejecutor físico)
      performedBy: tx.performed_by_profile_id || '',
    },
  });

  const performedBy = watch('performedBy');

  // ✨ Resolver valores iniciales al abrir (usando jerarquía pre-cargada)
  useEffect(() => {
    if (open && hierarchy.length > 0) {
      // ✅ Priorizar subcategory_id sobre category_id
      const targetId = tx.subcategory_id || tx.category_id;
      if (targetId) {
        // ✅ Buscar en toda la jerarquía (parent → category → subcategory)
        for (const parent of hierarchy) {
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
    }
  }, [open, hierarchy, tx.category_id, tx.subcategory_id]);

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

  const onSubmit = async (data: { amount: number; description: string; occurredAt: string; performedBy: string }) => {
    try {
      const formData = new FormData();
      formData.append('movementId', tx.id);
      formData.append('householdId', householdId || '');
      formData.append('amount', String(data.amount));
      formData.append('description', data.description);
      // ✅ Issue #38: Enviar subcategoryId Y categoryId para actualizar ambos campos
      formData.append('subcategoryId', selectedSubcategoryId || '');
      formData.append('categoryId', selectedSubcategoryId ? '' : (selectedCategoryId || ''));
      formData.append('occurredAt', data.occurredAt);
      // ✅ Issue #29: Enviar performedBy (ejecutor físico)
      formData.append('performedBy', data.performedBy);

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
    }
  };

  return (
    <>
      <button
        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        title="Editar movimiento común"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Pencil className="h-4 w-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar {tx.type === 'income' ? 'ingreso' : 'gasto'} común</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* ✨ Orden consistente con NewMovementForm: Jerarquía de 3 niveles primero */}
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

            {/* ✅ Orden consistente con NewMovementForm: ¿Quién realizó? → Importe → Fecha → Descripción */}
            <div>
              <Label htmlFor="performedBy">
                {tx.type === 'income' ? '¿Quién ingresó el dinero?' : '¿Quién realizó esta transacción?'}
              </Label>
              <Select
                value={performedBy || ''}
                onValueChange={(value) => setValue('performedBy', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona miembro" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.profile_id} value={m.profile_id}>
                      {m.display_name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.performedBy && (
                <span className="text-xs text-red-500">{errors.performedBy.message}</span>
              )}
            </div>

            <div>
              <Label htmlFor="amount">Cantidad (€)</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0.01}
                  {...register('amount', { required: true, min: 0.01 })}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                  €
                </span>
              </div>
              {errors.amount && <span className="text-xs text-red-500">Importe obligatorio y mayor que 0</span>}
            </div>

            <div>
              <Label htmlFor="occurredAt">Fecha y hora</Label>
              <Input
                id="occurredAt"
                type="datetime-local"
                {...register('occurredAt', { required: true })}
              />
              {errors.occurredAt && <span className="text-xs text-red-500">Fecha obligatoria</span>}
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                type="text"
                {...register('description')}
              />
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
