'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { withdrawFromSavings } from '@/app/app/savings/actions';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { formatCurrency } from '@/lib/format';

const withdrawSchema = z.object({
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  reason: z.string().min(1, 'La razón del retiro es requerida'),
  categoryId: z.string().uuid().optional(),
  createTransaction: z.boolean().default(false),
});

type WithdrawFormData = z.infer<typeof withdrawSchema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentBalance: number;
};

type Category = {
  id: string;
  name: string;
  icon: string | null;
};

export function WithdrawModal({ open, onOpenChange, onSuccess, currentBalance }: Props) {
  const [isPending, startTransition] = useTransition();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<WithdrawFormData>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: {
      amount: 0,
      reason: '',
      categoryId: undefined,
      createTransaction: false,
    },
  });

  const watchAmount = form.watch('amount');
  const watchCreateTransaction = form.watch('createTransaction');
  const willExceedBalance = watchAmount > currentBalance;

  // Cargar categorías de gasto al abrir modal
  useEffect(() => {
    if (open && categories.length === 0) {
      loadCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, categories.length]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const supabase = supabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Obtener household activo
      const { data: settings } = await supabase
        .from('user_settings')
        .select('active_household_id')
        .eq('user_id', user.id)
        .single();

      if (!settings?.active_household_id) return;

      // Obtener categorías de gasto
      const { data: expenseCategories } = await supabase
        .from('categories')
        .select('id, name, icon')
        .eq('household_id', settings.active_household_id)
        .eq('type', 'expense')
        .order('name');

      if (expenseCategories) {
        setCategories(expenseCategories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Error al cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (data: WithdrawFormData) => {
    if (willExceedBalance) {
      toast.error('El monto excede el balance disponible');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('amount', data.amount.toString());
      formData.append('reason', data.reason);
      if (data.categoryId) {
        formData.append('categoryId', data.categoryId);
      }
      formData.append('createTransaction', data.createTransaction.toString());

      const result = await withdrawFromSavings(formData);

      if (result.ok) {
        toast.success('Retiro realizado exitosamente');
        form.reset();
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Retirar del Fondo de Ahorro</DialogTitle>
          <DialogDescription>
            Registra un retiro del fondo de ahorro común.
            <br />
            Balance disponible: <span className="font-bold">{formatCurrency(currentBalance)}</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {willExceedBalance && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  El monto solicitado ({formatCurrency(watchAmount)}) excede el balance disponible ({formatCurrency(currentBalance)}).
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="100.00"
                      {...field}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razón del Retiro *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Pago reparación urgente"
                      {...field}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="createTransaction"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Crear transacción de gasto</FormLabel>
                    <FormDescription>
                      Registrar también como gasto en el listado de transacciones del hogar
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {watchCreateTransaction && (
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isPending || loading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.icon} {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending || willExceedBalance}>
                {isPending ? 'Retirando...' : 'Retirar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
