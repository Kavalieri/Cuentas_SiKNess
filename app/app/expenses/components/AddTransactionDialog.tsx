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
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { createTransaction, getHouseholdMembersWithRole } from '@/app/app/expenses/actions';

interface AddTransactionDialogProps {
  categories: Array<{ id: string; name: string; icon: string | null; type: string }>;
}

export function AddTransactionDialog({ categories }: AddTransactionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  
  // ⭐ NEW: Estado para miembros y rol
  const [members, setMembers] = useState<Array<{ id: string; display_name: string }>>([]);
  const [userRole, setUserRole] = useState<'owner' | 'member'>('member');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [membersLoading, setMembersLoading] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === type);

  // ⭐ NEW: Cargar miembros cuando se abre el diálogo
  useEffect(() => {
    if (open && members.length === 0) {
      setMembersLoading(true);
      getHouseholdMembersWithRole().then((result) => {
        if (result.ok && result.data) {
          setMembers(result.data.members);
          setUserRole(result.data.userRole);
          setCurrentUserId(result.data.currentUserId);
        } else {
          // Type narrowing: si !result.ok, entonces es Fail y tiene message
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
    formData.append('type', type);

    const result = await createTransaction(formData);

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

    // Éxito: revalidar PRIMERO, luego cerrar
    toast.success('Movimiento creado exitosamente');
    router.refresh(); // Llamar ANTES de cerrar dialog
    
    // Resetear y cerrar
    form.reset();
    setIsLoading(false);
    setOpen(false);
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

          {/* ⭐ NEW: Selector de quién pagó (solo para owners) */}
          {userRole === 'owner' && (
            <div className="space-y-2">
              <Label htmlFor="paid_by">
                {type === 'expense' ? '¿Quién pagó?' : '¿Quién ingresó?'}
              </Label>
              <Select 
                name="paid_by" 
                defaultValue={type === 'expense' ? 'common' : currentUserId} 
                disabled={membersLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={membersLoading ? "Cargando..." : "Seleccionar"} />
                </SelectTrigger>
                <SelectContent>
                  {/* Opción "Cuenta común" solo para GASTOS */}
                  {type === 'expense' && (
                    <SelectItem value="common">🏦 Cuenta común</SelectItem>
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
              {type === 'income' && (
                <p className="text-xs text-muted-foreground">
                  ℹ️ Los ingresos siempre deben tener un usuario para trazabilidad
                </p>
              )}
            </div>
          )}

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
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
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
