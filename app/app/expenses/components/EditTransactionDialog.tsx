'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
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
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { updateTransaction, getHouseholdMembersWithRole } from '@/app/app/expenses/actions';

interface Transaction {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  description: string | null;
  category_id: string | null;
  occurred_at: string;
  paid_by?: string | null;
}

interface EditTransactionDialogProps {
  transaction: Transaction;
  categories: Array<{ id: string; name: string; icon: string | null; type: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTransactionDialog({
  transaction,
  categories,
  open,
  onOpenChange,
}: EditTransactionDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Estado para miembros y rol
  const [members, setMembers] = useState<Array<{ id: string; display_name: string }>>([]);
  const [userRole, setUserRole] = useState<'owner' | 'member'>('member');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [membersLoading, setMembersLoading] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === transaction.type);

  // Cargar miembros cuando se abre el diálogo
  useEffect(() => {
    if (open && members.length === 0) {
      setMembersLoading(true);
      getHouseholdMembersWithRole().then((result) => {
        console.log('[EditTransactionDialog] getHouseholdMembersWithRole result:', result);
        if (result.ok && result.data) {
          console.log('[EditTransactionDialog] Setting members:', result.data.members);
          setMembers(result.data.members);
          setUserRole(result.data.userRole);
          setCurrentUserId(result.data.currentUserId);
        } else {
          toast.error(!result.ok ? result.message : 'Error al cargar miembros');
        }
        setMembersLoading(false);
      });
    }
  }, [open, members.length]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.append('id', transaction.id);
    formData.append('type', transaction.type);

    const result = await updateTransaction(formData);

    if (!result.ok) {
      toast.error(result.message);
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, errors]) => {
          toast.error(`${field}: ${errors[0]}`);
        });
      }
      setIsLoading(false);
      return;
    }

    toast.success('Movimiento actualizado exitosamente');
    router.refresh();

    form.reset();
    setIsLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar {transaction.type === 'expense' ? 'Gasto' : 'Ingreso'}</DialogTitle>
          <DialogDescription>
            Modifica los detalles de este movimiento
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor="amount">Monto *</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              defaultValue={transaction.amount}
              required
              disabled={isLoading || userRole !== 'owner'}
            />
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label htmlFor="category_id">Categoría</Label>
            <Select 
              name="category_id" 
              defaultValue={transaction.category_id || 'none'}
              disabled={isLoading || userRole !== 'owner'}
            >
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

          {/* Selector de quién pagó/ingresó - VISIBLE PARA TODOS */}
          <div className="space-y-2">
            <Label htmlFor="paid_by">
              {transaction.type === 'expense' ? '¿Quién se beneficia?' : '¿Quién ingresó?'}
            </Label>
            <Select 
              name="paid_by" 
              defaultValue={transaction.paid_by || 'common'} 
              disabled={membersLoading || isLoading || userRole !== 'owner'}
            >
              <SelectTrigger>
                <SelectValue placeholder={membersLoading ? "Cargando..." : "Seleccionar"} />
              </SelectTrigger>
              <SelectContent>
                {/* Opción "Común" solo para GASTOS */}
                {transaction.type === 'expense' && (
                  <SelectItem value="common">🏦 Común (ambos)</SelectItem>
                )}
                {/* Lista de miembros */}
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.display_name}
                    {member.id === currentUserId && ' (tú)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {transaction.type === 'income' && (
              <p className="text-xs text-muted-foreground">
                ℹ️ Los ingresos siempre deben tener un usuario para trazabilidad
              </p>
            )}
            {transaction.type === 'expense' && (
              <p className="text-xs text-muted-foreground">
                ℹ️ Indica quién se beneficia del gasto (aunque se pague del fondo común)
              </p>
            )}
            {userRole !== 'owner' && (
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
              defaultValue={transaction.occurred_at}
              required
              disabled={isLoading || userRole !== 'owner'}
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input
              id="description"
              name="description"
              placeholder="Ej: Compra del supermercado"
              defaultValue={transaction.description || ''}
              disabled={isLoading || userRole !== 'owner'}
            />
          </div>

          {/* Moneda (oculto, siempre EUR) */}
          <input type="hidden" name="currency" value="EUR" />

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || userRole !== 'owner'}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>

          {userRole !== 'owner' && (
            <p className="text-xs text-center text-muted-foreground">
              ⚠️ Solo el propietario del hogar puede editar movimientos
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
