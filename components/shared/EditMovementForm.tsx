'use client';

import type {
  CategoryWithSubcategories,
  Subcategory
} from '@/app/sickness/configuracion/categorias/hierarchy-actions';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCategoryHierarchy } from '@/contexts/CategoryHierarchyContext';
import { useDatePeriodValidation } from '@/lib/hooks/useDatePeriodValidation';
import { Pencil, Loader2, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

type MovementType = 'common' | 'direct_expense';

interface EditMovementFormProps {
  tx: {
    id: string;
    type: string; // 'income' | 'expense' | 'direct_expense'
    amount: number;
    description?: string;
    category_id?: string;
    subcategory_id?: string;
    occurred_at?: string;
    performed_at?: string | null;
    performed_by_profile_id?: string | null;
  };
  movementType: MovementType;
  householdId?: string;
  onSuccess?: () => void;
  members: Array<{ profile_id: string; email: string; display_name?: string; role?: string }>;
  editAction: (formData: FormData) => Promise<{ ok: boolean; message?: string }>;
}

export function EditMovementForm({
  tx,
  movementType,
  householdId,
  onSuccess,
  members,
  editAction
}: EditMovementFormProps) {
  const [open, setOpen] = useState(false);

  // ✨ Jerarquía pre-cargada
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
      performedBy: tx.performed_by_profile_id || '',
    },
  });

  const performedBy = watch('performedBy');
  const newOccurredAt = watch('occurredAt');

  // ✅ VALIDACIÓN DOBLE:
  // 1. Fecha ORIGINAL → ¿Periodo actual permite modificaciones?
  const originalDate = tx.performed_at || tx.occurred_at || null;
  const {
    canCreate: canModifyOriginal,
    message: _originalPeriodMessage,
    phase: originalPhase,
    isLoading: isLoadingOriginal
  } = useDatePeriodValidation(originalDate);

  // 2. Fecha NUEVA → ¿Periodo destino permite este tipo?
  const {
    allowedTypes: newAllowedTypes,
    canCreate: canCreateInNew,
    message: newPeriodMessage,
    phase: _newPhase,
    isLoading: isLoadingNew
  } = useDatePeriodValidation(newOccurredAt);

  // ✅ Determinar si el tipo actual es permitido en el periodo destino
  const isTypeAllowedInNew = useMemo(() => {
    if (movementType === 'direct_expense') {
      return newAllowedTypes.includes('direct_expense');
    }
    // Common: income o expense
    return newAllowedTypes.includes(tx.type);
  }, [newAllowedTypes, movementType, tx.type]);

  // ✅ Condiciones para permitir edición
  const canEdit = useMemo(() => {
    // No se puede editar si periodo original está cerrado/bloqueado
    if (!canModifyOriginal) return false;
    
    // No se puede guardar si periodo nuevo no permite creación
    if (!canCreateInNew) return false;
    
    // No se puede guardar si tipo no es permitido en periodo nuevo
    if (!isTypeAllowedInNew) return false;
    
    return true;
  }, [canModifyOriginal, canCreateInNew, isTypeAllowedInNew]);

  // ✨ Resolver valores iniciales al abrir
  useEffect(() => {
    if (open && hierarchy.length > 0) {
      const targetId = tx.subcategory_id || tx.category_id;
      if (targetId) {
        for (const parent of hierarchy) {
          for (const category of parent.categories) {
            const subcategory = category.subcategories?.find(s => s.id === targetId);
            if (subcategory) {
              setSelectedParentId(parent.id);
              setSelectedCategoryId(category.id);
              setSelectedSubcategoryId(subcategory.id);
              return;
            }
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

  // ✨ Filtros cascada (según tipo de movimiento)
  const filteredParents = useMemo(() => {
    if (movementType === 'common') {
      // Common: filtrar por tipo de transacción (income/expense)
      return hierarchy.filter(p => p.type === tx.type);
    }
    // Direct: solo gastos
    return hierarchy.filter(p => p.type === 'expense');
  }, [hierarchy, movementType, tx.type]);

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
    // ✅ Validación final antes de enviar
    if (!canEdit) {
      toast.error('No se puede guardar la edición en este momento');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('movementId', tx.id);
      formData.append('householdId', householdId || '');
      formData.append('amount', String(data.amount));
      formData.append('description', data.description);
      
      // ✅ Campos según tipo de movimiento
      if (movementType === 'common') {
        // Common: enviar subcategoryId Y categoryId (Issue #38)
        formData.append('subcategoryId', selectedSubcategoryId || '');
        formData.append('categoryId', selectedSubcategoryId ? '' : (selectedCategoryId || ''));
      } else {
        // Direct: solo subcategoryId
        formData.append('subcategoryId', selectedSubcategoryId || '');
      }
      
      formData.append('occurredAt', data.occurredAt);
      formData.append('performedBy', data.performedBy);

      const result = await editAction(formData);

      if (result.ok) {
        toast.success(
          movementType === 'common'
            ? 'Movimiento actualizado correctamente'
            : 'Gasto directo actualizado correctamente'
        );
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(result.message || 'Error al actualizar el movimiento');
      }
    } catch (error) {
      console.error('Error editando movimiento:', error);
      toast.error('Error inesperado al actualizar el movimiento');
    }
  };

  // ✅ Determinar título del diálogo
  const dialogTitle = useMemo(() => {
    if (movementType === 'direct_expense') return 'Editar gasto directo';
    return `Editar ${tx.type === 'income' ? 'ingreso' : 'gasto'} común`;
  }, [movementType, tx.type]);

  // ✅ Determinar label de performedBy
  const performedByLabel = useMemo(() => {
    if (movementType === 'direct_expense') return '¿Quién pagó de su bolsillo?';
    if (tx.type === 'income') return '¿Quién ingresó el dinero?';
    return '¿Quién realizó esta transacción?';
  }, [movementType, tx.type]);

  // ✅ Determinar mensaje de validación combinado
  const validationMessage = useMemo(() => {
    if (isLoadingOriginal || isLoadingNew) return null;

    // Prioridad: Periodo original cerrado
    if (!canModifyOriginal) {
      return {
        type: 'error' as const,
        text: `Periodo original ${originalPhase === 'closed' ? 'cerrado' : 'bloqueado'}. No se pueden realizar modificaciones sin reabrirlo.`,
        icon: AlertCircle
      };
    }

    // Periodo destino no permite creación
    if (!canCreateInNew) {
      return {
        type: 'error' as const,
        text: newPeriodMessage || 'Periodo destino no permite crear movimientos',
        icon: AlertCircle
      };
    }

    // Tipo no permitido en periodo destino
    if (!isTypeAllowedInNew) {
      return {
        type: 'error' as const,
        text: `El periodo destino no permite movimientos de tipo "${tx.type === 'income' ? 'ingreso' : tx.type === 'expense' ? 'gasto común' : 'gasto directo'}"`,
        icon: AlertTriangle
      };
    }

    // Todo OK
    return {
      type: 'success' as const,
      text: newPeriodMessage || 'Periodo válido para edición',
      icon: CheckCircle2
    };
  }, [
    isLoadingOriginal,
    isLoadingNew,
    canModifyOriginal,
    canCreateInNew,
    isTypeAllowedInNew,
    originalPhase,
    newPeriodMessage,
    tx.type
  ]);

  return (
    <>
      <button
        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        title={`Editar ${movementType === 'direct_expense' ? 'gasto directo' : 'movimiento común'}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Pencil className="h-4 w-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* ✨ Jerarquía de 3 niveles */}
            <div>
              <Label className="block text-sm font-medium mb-1">Grupo de categoría</Label>
              <Select
                value={selectedParentId}
                onValueChange={(value) => {
                  setSelectedParentId(value);
                  setSelectedCategoryId('');
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
                  setSelectedSubcategoryId('');
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

            {/* ✅ ¿Quién realizó? */}
            <div>
              <Label htmlFor="performedBy">{performedByLabel}</Label>
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

            {/* ✅ Importe */}
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

            {/* ✅ Fecha con validación DOBLE */}
            <div>
              <Label htmlFor="occurredAt">Fecha y hora</Label>
              <Input
                id="occurredAt"
                type="datetime-local"
                {...register('occurredAt', { required: true })}
              />
              {errors.occurredAt && <span className="text-xs text-red-500">Fecha obligatoria</span>}
              
              {/* ✅ Feedback visual */}
              {(isLoadingOriginal || isLoadingNew) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verificando periodos...</span>
                </div>
              )}

              {validationMessage && validationMessage.type === 'error' && (
                <div className="flex items-center gap-2 text-sm text-destructive mt-1">
                  <validationMessage.icon className="h-4 w-4" />
                  <span>{validationMessage.text}</span>
                </div>
              )}

              {validationMessage && validationMessage.type === 'success' && (
                <div className="flex items-center gap-2 text-sm text-green-600 mt-1">
                  <validationMessage.icon className="h-4 w-4" />
                  <span>{validationMessage.text}</span>
                </div>
              )}
            </div>

            {/* ✅ Descripción */}
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
                disabled={isSubmitting || !canEdit || isLoadingOriginal || isLoadingNew}
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
