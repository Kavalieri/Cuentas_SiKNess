"use client";
import {
    getCategoryHierarchy,
    type CategoryHierarchy
} from "@/app/sickness/configuracion/categorias/hierarchy-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MonthlyPeriodPhase } from "@/lib/periods";
import { createUnifiedTransaction } from "@/lib/transactions/unified";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";


// Tipos para props
interface Member {
  profile_id: string;
  email: string;
  display_name: string;
  role: string;
}

interface NewMovementFormProps {
  open: boolean;
  onClose: () => void;
  members: Member[];
  // Ya no necesitamos categorías flat
  phase: MonthlyPeriodPhase;
  user: { id: string; email: string; displayName: string; isSystemAdmin: boolean } | null;
  isOwner: boolean;
  // Nuevo: refrescar datos tras crear
  onSuccess?: () => void | Promise<void>;
  // Nuevo: pasar periodo explícito para evitar desajustes
  periodId?: string;
  // Nuevo: householdId para cargar jerarquía
  householdId: string;
}

function formatDateTimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

export function NewMovementForm({ open, onClose, members, phase, user, isOwner, onSuccess, periodId, householdId }: NewMovementFormProps) {
  const router = useRouter();

    // Fases: preparing (bloqueado), validation (solo gastos directos), active (todos)
  const canDirect = phase === "validation" || phase === "active"; // preparing: bloqueado
  const canCommon = phase === "active";

  // ✨ NUEVO: Estado para jerarquía de categorías
  const [hierarchy, setHierarchy] = useState<CategoryHierarchy[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');

  // Estados del formulario con valores por defecto inteligentes
  const [type, setType] = useState(() => {
    if (canDirect && !canCommon) return "direct_expense";
    return "expense";
  });
  // Guardamos la cantidad como string para no forzar 0 y permitir borrar/escribir sin fricción
  const [amount, setAmount] = useState<string>("");
  // Ya no usamos categoryId, ahora es subcategoryId
  const [description, setDescription] = useState("");
  const [realPayerId, setRealPayerId] = useState<string | undefined>(() => user?.id || undefined);
  const [occurredAt, setOccurredAt] = useState<string>(() => formatDateTimeLocal(new Date()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false); // Nuevo: feedback tras guardar

  // ✨ NUEVO: Cargar jerarquía de categorías al abrir el modal
  useEffect(() => {
    if (open && householdId) {
      const loadHierarchy = async () => {
        const result = await getCategoryHierarchy(householdId);
        if (result.ok && result.data) {
          setHierarchy(result.data);
        } else {
          toast.error('No se pudo cargar la jerarquía de categorías');
        }
      };
      loadHierarchy();
    }
  }, [open, householdId]);

  // Resetear formulario cuando se abre el modal
  useEffect(() => {
    if (open) {
      const defaultType = (canDirect && !canCommon) ? "direct_expense" : "expense";
      setType(defaultType);
      setAmount("");
      setSelectedParentId('');
      setSelectedCategoryId('');
      setSelectedSubcategoryId('');
      setDescription("");
      setRealPayerId(user?.id || undefined);
      setOccurredAt(formatDateTimeLocal(new Date()));
      setError(null);
      setJustSaved(false); // Reset feedback al abrir
    }
  }, [open, canDirect, canCommon, user?.id]);

  // ✨ NUEVO: Lógica de cascada para categorías
  const filteredParents = useMemo(() => {
    if (type === 'income') return hierarchy.filter(p => p.type === 'income');
    if (type === 'expense' || type === 'direct_expense') return hierarchy.filter(p => p.type === 'expense');
    return hierarchy;
  }, [hierarchy, type]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Reglas por fase
      const selectedType = type;

      // Validación de fase: preparing y closed están bloqueados (pero no deberían llegar aquí)
      if (phase === 'preparing') {
        setError('En configuración inicial no se pueden crear movimientos');
        setLoading(false);
        return;
      }
      if (phase === 'closed') {
        setError('No se pueden crear movimientos en un período cerrado');
        setLoading(false);
        return;
      }

      // En validation solo gastos directos
      if (phase === 'validation') {
        if (selectedType !== 'direct_expense') {
          setError('En validación solo puedes registrar gastos directos');
          setLoading(false);
          return;
        }
      }

      // Normalizar tipos al esquema unificado
      let payloadType: 'income' | 'expense' | 'income_direct' | 'expense_direct';
      let flow_type: 'common' | 'direct';
      if (selectedType === 'direct_expense') {
        payloadType = 'expense_direct';
        flow_type = 'direct';
      } else if (selectedType === 'income') {
        payloadType = 'income';
        flow_type = 'common';
      } else {
        payloadType = 'expense';
        flow_type = 'common';
      }

      // Validaciones mínimas
      const normalizedAmount = parseFloat(String(amount).replace(',', '.'));
      if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        setError('Introduce una cantidad válida');
        setLoading(false);
        return;
      }

      // ✨ NUEVO: Validación de subcategoría en flujo común
      if (flow_type === 'common' && !selectedSubcategoryId) {
        setError('Selecciona una subcategoría completa (grupo → categoría → subcategoría)');
        setLoading(false);
        return;
      }

      if (flow_type === 'direct' && (realPayerId === undefined || realPayerId === null)) {
        setError('Selecciona quién pagó');
        setLoading(false);
        return;
      }

      const result = await createUnifiedTransaction({
        // ✨ NUEVO: Enviar subcategory_id en lugar de category_id
        subcategory_id: selectedSubcategoryId || null,
        type: payloadType,
        amount: normalizedAmount,
        currency: 'EUR',
        description: description || undefined,
        occurred_at: occurredAt,
        flow_type,
        real_payer_id: flow_type === 'direct' ? realPayerId : undefined,
        creates_balance_pair: flow_type === 'direct' ? true : undefined,
        period_id: periodId,
      });

      if (!result.ok) {
        setError(result.message || 'No se pudo crear el movimiento');
        toast.error(result.message || 'No se pudo crear el movimiento');
        setLoading(false);
        return;
      }

      toast.success('Movimiento creado correctamente');

      // Refrescar la vista para ver el nuevo movimiento
      if (onSuccess) {
        try { await onSuccess(); } catch {}
      } else {
        router.refresh();
      }

      // ✨ NUEVO: Mantener formulario abierto, limpiar solo amount y description
      setAmount("");
      setDescription("");
      // NO actualizar occurredAt: mantener la fecha del formulario para permitir registros consecutivos
      // El usuario puede cambiarla manualmente si quiere otra fecha
      setJustSaved(true); // Activar feedback visual

      // Ocultar feedback después de 3 segundos
      setTimeout(() => setJustSaved(false), 3000);

      // NO cerrar el modal: onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear movimiento';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo movimiento</DialogTitle>
        </DialogHeader>

        {/* Banner de feedback tras guardar */}
        {justSaved && (
          <div className="bg-green-50 dark:bg-green-950 border-l-4 border-green-500 dark:border-green-600 p-3 rounded-r animate-in slide-in-from-top duration-200">
            <p className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
              ✅ Movimiento guardado. ¿Nuevo movimiento?
            </p>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType} disabled={!canDirect && !canCommon}>
              <SelectTrigger>
                <SelectValue placeholder={phase === 'preparing' ? 'Periodo en preparación' : 'Selecciona tipo'} />
              </SelectTrigger>
              <SelectContent>
                {canDirect && <SelectItem value="direct_expense">Gasto directo</SelectItem>}
                {canCommon && <SelectItem value="expense">Gasto común</SelectItem>}
                {canCommon && <SelectItem value="income">Ingreso común</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Grupo de categoría</Label>
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
            <Label>Categoría</Label>
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
                {availableCategories.map((category) => (
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
            <Label>Subcategoría</Label>
            <Select
              value={selectedSubcategoryId}
              onValueChange={setSelectedSubcategoryId}
              disabled={!selectedCategoryId}
            >
              <SelectTrigger>
                <SelectValue placeholder={!selectedCategoryId ? 'Primero selecciona categoría' : 'Selecciona subcategoría'} />
              </SelectTrigger>
              <SelectContent>
                {availableSubcategories.map((subcategory) => (
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
            <Label>Cantidad (€)</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
            {amount && parseFloat(amount) <= 0 && (
              <span className="text-xs text-red-500">El importe debe ser mayor que 0</span>
            )}
          </div>
          <div>
            <Label>Fecha y hora</Label>
            <Input
              type="datetime-local"
              value={occurredAt}
              onChange={e => setOccurredAt(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Descripción</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          {type === "direct_expense" && (
            <div>
              <Label>Pagado por</Label>
              <Select value={realPayerId} onValueChange={setRealPayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona miembro" />
                </SelectTrigger>
                <SelectContent>
                  {isOwner
                    ? members?.map((m) => (
                        <SelectItem key={m.profile_id} value={m.profile_id}>
                          {m.display_name || m.email}
                        </SelectItem>
                      ))
                    : members
                        .filter((m) => user && m.profile_id === user.id)
                        .map((m) => (
                          <SelectItem key={m.profile_id} value={m.profile_id}>
                            {m.display_name || m.email}
                          </SelectItem>
                        ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {phase === 'preparing' && (
            <div className="text-amber-600 text-sm">
              Este período está en preparación: no se pueden crear movimientos todavía.
            </div>
          )}
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading || phase === 'preparing'}>{loading ? 'Creando...' : 'Crear'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
