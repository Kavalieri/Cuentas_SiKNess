import type {
    CategoryHierarchy,
    CategoryWithSubcategories,
    Subcategory
} from '@/app/sickness/configuracion/categorias/hierarchy-actions';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCategoryHierarchy } from '@/contexts/CategoryHierarchyContext';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { editDirectExpenseWithCompensatory } from './actions';

interface EditDirectExpenseButtonProps {
  tx: {
    id: string;
    amount: number;
    description?: string;
    category_id?: string;
    subcategory_id?: string;
    occurred_at?: string;
    performed_at?: string | null;
    real_payer_id?: string; // ✨ NUEVO: ID del pagador actual
  };
  householdId?: string;
  onSuccess?: () => void;
  members?: Array<{ profile_id: string; email: string; display_name?: string; role?: string }>; // ✨ NUEVO: lista de miembros
}

export function EditDirectExpenseButton({ tx, householdId, onSuccess, members = [] }: EditDirectExpenseButtonProps) {
  const [open, setOpen] = useState(false);

  // ✨ Usar jerarquía pre-cargada del Context (Issue #22)
  const { hierarchy } = useCategoryHierarchy();

  // ✨ Estados para selección de 3 niveles
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      amount: tx.amount,
      description: tx.description || '',
      // Prefill desde performed_at si disponible; fallback a occurred_at
      occurredAt: tx.performed_at
        ? tx.performed_at.slice(0, 16)
        : (tx.occurred_at ? (tx.occurred_at.length > 10 ? tx.occurred_at.slice(0, 16) : `${tx.occurred_at}T00:00`) : ''),
      realPayerId: tx.real_payer_id || '', // ✨ NUEVO: pagador actual
    },
  });

  const realPayerId = watch('realPayerId');

  // ✨ Resolver valores iniciales al abrir (usando jerarquía pre-cargada)
  useEffect(() => {
    if (open && hierarchy.length > 0) {
      // Resolver valores iniciales desde subcategory_id (prioritario) o category_id (legacy)
      const targetId = tx.subcategory_id || tx.category_id;
      if (targetId) {
        // Recorrer jerarquía completa para encontrar la subcategoría
        for (const parent of hierarchy) {
          for (const category of parent.categories) {
            // Buscar en subcategorías primero
            const subcategory = category.subcategories?.find(s => s.id === targetId);
            if (subcategory) {
              // Encontrada subcategoría → configurar todo el path
              setSelectedParentId(parent.id);
              setSelectedCategoryId(category.id);
              setSelectedSubcategoryId(subcategory.id);
              return; // Salir completamente
            }
            // Si no es subcategoría, verificar si es categoría (legacy)
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

  // ✨ Filtros cascada (solo gastos para direct expense)
  const filteredParents = useMemo(() => {
    return hierarchy.filter(p => p.type === 'expense');
  }, [hierarchy]);

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

  const onSubmit = async (data: { amount: number; description: string; occurredAt: string; realPayerId: string }) => {
    try {
      const formData = new FormData();
      formData.append('movementId', tx.id);
      formData.append('householdId', householdId || '');
      formData.append('amount', String(data.amount));
      formData.append('description', data.description);
      // ✨ Enviar subcategory_id en lugar de categoryId
      formData.append('subcategoryId', selectedSubcategoryId || '');
      formData.append('occurredAt', data.occurredAt);
      formData.append('realPayerId', data.realPayerId); // ✨ NUEVO: pagador

      const result = await editDirectExpenseWithCompensatory(formData);

      if (result.ok) {
        toast.success('Gasto directo actualizado correctamente');
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(result.message || 'Error al actualizar el gasto directo');
      }
    } catch (error) {
      console.error('Error en onSubmit:', error);
      toast.error('Error inesperado al actualizar el gasto');
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
                inputMode="decimal"
                step="0.01"
                min={0.01}
                {...register('amount', { required: true, min: 0.01 })}
                className="border rounded px-2 py-1 w-full"
              />
              {errors.amount && <span className="text-xs text-red-500">Importe obligatorio y mayor que 0</span>}
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

            {/* ✨ NUEVO: Selector de pagador */}
            <div>
              <Label className="block text-sm font-medium mb-1">Pagador</Label>
              <Select
                value={realPayerId}
                onValueChange={(value) => setValue('realPayerId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona pagador" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.profile_id} value={member.profile_id}>
                      <span>{member.display_name || member.email}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.realPayerId && <span className="text-xs text-red-500">Selecciona un pagador</span>}
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
