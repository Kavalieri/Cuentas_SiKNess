'use client';

import {
  createCommonTransaction,
  getHouseholdMembersWithRole,
} from '@/app/app/transactions/unified-actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useHousehold } from '@/contexts/HouseholdContext';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface AddTransactionDialogProps {
  categories: Array<{ id: string; name: string; icon: string | null; type: string }>;
}

export function AddTransactionDialog({ categories }: AddTransactionDialogProps) {
  const router = useRouter();
  const { isOwner, userId } = useHousehold();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<'expense' | 'income'>('expense');

  // Cargar solo los miembros del household (el rol ya viene del contexto)
  const [members, setMembers] = useState<Array<{ id: string; display_name: string }>>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === type);

  // Cargar miembros al montar el componente
  useEffect(() => {
    console.log('[AddTransactionDialog] Loading household members, isOwner from context:', isOwner);
    if (members.length === 0 && !membersLoading) {
      setMembersLoading(true);
      getHouseholdMembersWithRole().then(
        (result: Awaited<ReturnType<typeof getHouseholdMembersWithRole>>) => {
          console.log('[AddTransactionDialog] getHouseholdMembersWithRole result:', result);
          if (result.ok && result.data) {
            console.log('[AddTransactionDialog] Setting members:', result.data.members);
            setMembers(result.data.members);
          } else {
            console.error(
              '[AddTransactionDialog] Error loading members:',
              !result.ok ? result.message : 'Unknown error',
            );
            toast.error(!result.ok ? result.message : 'Error al cargar miembros');
          }
          setMembersLoading(false);
        },
      );
    }
  }, [members.length, membersLoading, isOwner]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.append('type', type);

    const result = await createCommonTransaction(formData);

    if (!result.ok) {
      toast.error(result.message);
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, errors]) => {
          if (Array.isArray(errors) && errors.length > 0) {
            toast.error(`${field}: ${errors[0]}`);
          }
        });
      }
      setIsLoading(false);
      return;
    }

    // Éxito: cerrar dialog y refrescar
    toast.success('Movimiento creado exitosamente');

    // Resetear y cerrar
    form.reset();
    setIsLoading(false);
    setOpen(false);

    // Refrescar datos del servidor SIN recargar página
    router.refresh();
  };

  // DEBUG: Log del estado de members antes de renderizar
  console.log('[AddTransactionDialog] State before render:', {
    members,
    isOwner,
    userId,
    membersLoading,
  });

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

          {/* ⭐ Selector de quién pagó - VISIBLE PARA TODOS */}
          <div className="space-y-2">
            <Label htmlFor="paid_by">
              {type === 'expense' ? '¿Quién pagó?' : '¿Quién ingresó?'}
            </Label>
            <Select
              name="paid_by"
              defaultValue={type === 'expense' ? 'common' : userId}
              disabled={membersLoading || !isOwner}
            >
              <SelectTrigger>
                <SelectValue placeholder={membersLoading ? 'Cargando...' : 'Seleccionar'} />
              </SelectTrigger>
              <SelectContent>
                {/* Opción "Cuenta común" solo para GASTOS */}
                {type === 'expense' && <SelectItem value="common">🏦 Cuenta común</SelectItem>}
                {/* Lista de miembros */}
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.display_name}
                    {member.id === userId && ' (tú)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {type === 'income' && (
              <p className="text-xs text-muted-foreground">
                ℹ️ Los ingresos siempre deben tener un usuario para trazabilidad
              </p>
            )}
            {!isOwner && (
              <p className="text-xs text-amber-500">
                🔒 Solo el propietario puede cambiar este campo
              </p>
            )}
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

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input
              id="description"
              name="description"
              placeholder="Ej: Compra del supermercado"
              disabled={isLoading}
            />
          </div>

          {/* Moneda (oculto, siempre EUR) */}
          <input type="hidden" name="currency" value="EUR" />

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
