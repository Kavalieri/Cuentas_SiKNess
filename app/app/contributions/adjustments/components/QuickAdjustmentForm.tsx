'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createAdjustmentFromTemplate } from '@/app/app/contributions/adjustments/template-actions';
import type { AdjustmentTemplate } from '@/app/app/contributions/adjustments/template-actions';

// ============================================================================
// SCHEMA DE VALIDACIÓN
// ============================================================================

const QuickAdjustmentSchema = z.object({
  amount: z.coerce.number().positive('El monto debe ser positivo'),
  categoryId: z.string().uuid('Debes seleccionar una categoría').optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

type QuickAdjustmentFormData = z.infer<typeof QuickAdjustmentSchema>;

// ============================================================================
// PROPS
// ============================================================================

interface QuickAdjustmentFormProps {
  template: AdjustmentTemplate;
  categories: Array<{ id: string; name: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// ============================================================================
// COMPONENTE
// ============================================================================

export function QuickAdjustmentForm({
  template,
  categories,
  open,
  onOpenChange,
  onSuccess,
}: QuickAdjustmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generar reason por defecto: "Pago [nombre_plantilla] [mes_actual]"
  const currentDate = new Date();
  const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  const defaultReason = `Pago ${template.name} ${monthName}`;

  const form = useForm<QuickAdjustmentFormData>({
    resolver: zodResolver(QuickAdjustmentSchema),
    defaultValues: {
      amount: template.last_used_amount || 0,
      categoryId: template.category_id || undefined,
      reason: defaultReason,
      notes: '',
    },
  });

  // Re-configurar valores cuando cambia la plantilla o se abre el modal
  useEffect(() => {
    if (open) {
      form.reset({
        amount: template.last_used_amount || 0,
        categoryId: template.category_id || undefined,
        reason: defaultReason,
        notes: '',
      });
    }
  }, [open, template, defaultReason, form]);

  const onSubmit = async (data: QuickAdjustmentFormData) => {
    setIsSubmitting(true);

    const result = await createAdjustmentFromTemplate({
      templateId: template.id,
      amount: data.amount,
      categoryId: data.categoryId,
      reason: data.reason,
      notes: data.notes,
    });

    if (result.ok) {
      toast.success('Pre-pago creado correctamente');
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast.error(result.message || 'Error al crear el pre-pago');

      // Pintar errores de campo si existen
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, errors]) => {
          form.setError(field as keyof QuickAdjustmentFormData, {
            message: errors[0],
          });
        });
      }
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{template.icon || '📋'}</span>
            <span>Crear Pre-pago: {template.name}</span>
          </DialogTitle>
          <DialogDescription>
            Completa el monto y confirma la categoría para crear el ajuste rápidamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Monto (€) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...form.register('amount')}
              disabled={isSubmitting}
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label htmlFor="categoryId">
              Categoría de gasto <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.watch('categoryId')}
              onValueChange={(value) => form.setValue('categoryId', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="categoryId">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.categoryId && (
              <p className="text-sm text-destructive">{form.formState.errors.categoryId.message}</p>
            )}
          </div>

          {/* Razón (pre-llenado) */}
          <div className="space-y-2">
            <Label htmlFor="reason">Razón</Label>
            <Input
              id="reason"
              type="text"
              placeholder="Pago mensual..."
              {...form.register('reason')}
              disabled={isSubmitting}
            />
            {form.formState.errors.reason && (
              <p className="text-sm text-destructive">{form.formState.errors.reason.message}</p>
            )}
          </div>

          {/* Notas (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas adicionales (opcional)</Label>
            <Input
              id="notes"
              type="text"
              placeholder="Información adicional..."
              {...form.register('notes')}
              disabled={isSubmitting}
            />
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Pre-pago'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
