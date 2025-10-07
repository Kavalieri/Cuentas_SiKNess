'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { addContributionAdjustment } from '@/app/app/contributions/actions';
import type { Database } from '@/types/database';

type Category = Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'name' | 'icon' | 'type'>;

interface AddAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  currency: string;
  onSuccess: () => void;
}

export function AddAdjustmentDialog({
  open,
  onOpenChange,
  categories,
  currency,
  onSuccess,
}: AddAdjustmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    categoryId: '',
    amount: '',
    reason: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  // Filtrar solo categorías de gasto para ajustes de pre-pago
  const expenseCategories = categories.filter((cat) => cat.type === 'expense');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.categoryId || !formData.amount || !formData.reason) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('El monto debe ser un número positivo');
      return;
    }

    setIsSubmitting(true);
    try {
      // Crear FormData con los campos esperados por la action
      const submitData = new FormData();
      submitData.append('type', 'prepayment');
      submitData.append('amount', (-amount).toString()); // Negativo para prepayment
      submitData.append('reason', formData.reason);
      submitData.append('category_id', formData.categoryId);
      submitData.append('year', formData.year.toString());
      submitData.append('month', formData.month.toString());
      
      const result = await addContributionAdjustment(submitData);

      if (result.ok) {
        toast.success('Ajuste creado correctamente. Pendiente de aprobación.');
        setFormData({
          categoryId: '',
          amount: '',
          reason: '',
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
        });
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.message || 'Error al crear el ajuste');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generar opciones de mes (último mes hasta 2 meses adelante)
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    
    for (let i = -1; i <= 2; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      options.push({
        value: `${year}-${month}`,
        label: `${date.toLocaleString('es-ES', { month: 'long' })} ${year}`,
        year,
        month,
      });
    }
    
    return options;
  };

  const monthOptions = generateMonthOptions();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Ajuste de Contribución</DialogTitle>
          <DialogDescription>
            Crea un ajuste de pre-pago que será aplicado a tu contribución mensual.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Categoría */}
          <div className="space-y-2">
            <Label htmlFor="category">
              Categoría <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Categoría del gasto que pagas por adelantado
            </p>
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Monto ({currency}) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Cantidad que pagas por adelantado
            </p>
          </div>

          {/* Razón */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Descripción <span className="text-red-500">*</span>
            </Label>
            <Input
              id="reason"
              type="text"
              placeholder="Ej: Pago adelantado de internet del próximo mes"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Explica brevemente el motivo del ajuste
            </p>
          </div>

          {/* Mes de aplicación */}
          <div className="space-y-2">
            <Label htmlFor="month">
              Aplicar en mes <span className="text-red-500">*</span>
            </Label>
            <Select
              value={`${formData.year}-${formData.month}`}
              onValueChange={(value) => {
                const option = monthOptions.find((opt) => opt.value === value);
                if (option) {
                  setFormData({ ...formData, year: option.year, month: option.month });
                }
              }}
            >
              <SelectTrigger id="month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Mes en el que se aplicará el ajuste a tu contribución
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Ajuste'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
