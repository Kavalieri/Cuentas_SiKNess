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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import { transferCreditToSavings } from '@/app/app/savings/actions';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { formatCurrency } from '@/lib/format';

const transferSchema = z.object({
  creditId: z.string().uuid('Selecciona un crédito válido'),
  notes: z.string().optional(),
});

type TransferFormData = z.infer<typeof transferSchema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

type Credit = {
  id: string;
  amount: number;
  description: string | null;
  origin_date: string;
  status: string;
  profile: {
    display_name: string;
  };
};

export function TransferCreditModal({ open, onOpenChange, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      creditId: '',
      notes: '',
    },
  });

  // Cargar créditos activos al abrir modal
  useEffect(() => {
    if (open) {
      loadActiveCredits();
    }
  }, [open]);

  const loadActiveCredits = async () => {
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

      // Obtener créditos activos del household
      const { data: activeCredits } = await supabase
        .from('member_credits')
        .select(`
          id,
          amount,
          description,
          origin_date,
          status,
          profile:profiles!member_credits_profile_id_fkey(display_name)
        `)
        .eq('household_id', settings.active_household_id)
        .eq('status', 'active')
        .order('origin_date', { ascending: true });

      if (activeCredits) {
        setCredits(activeCredits as unknown as Credit[]);
      }
    } catch (error) {
      console.error('Error loading credits:', error);
      toast.error('Error al cargar los créditos');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (data: TransferFormData) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('creditId', data.creditId);
      if (data.notes) {
        formData.append('notes', data.notes);
      }

      const result = await transferCreditToSavings(formData);

      if (result.ok) {
        toast.success('Crédito transferido al fondo de ahorro exitosamente');
        form.reset();
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.message);
      }
    });
  };

  const selectedCredit = credits.find((c) => c.id === form.watch('creditId'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transferir Crédito al Fondo de Ahorro</DialogTitle>
          <DialogDescription>
            Convierte un crédito activo de un miembro en un depósito al fondo de ahorro común.
          </DialogDescription>
        </DialogHeader>

        {credits.length === 0 ? (
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              No hay créditos activos disponibles para transferir. Los créditos se generan cuando un
              miembro paga más de su contribución mensual proporcional.
            </AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="creditId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Crédito a Transferir *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isPending || loading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un crédito" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {credits.map((credit) => (
                          <SelectItem key={credit.id} value={credit.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{formatCurrency(credit.amount)}</span>
                              <span className="text-muted-foreground">-</span>
                              <span>{credit.profile.display_name}</span>
                              {credit.description && (
                                <>
                                  <span className="text-muted-foreground">-</span>
                                  <span className="text-sm text-muted-foreground">
                                    {credit.description}
                                  </span>
                                </>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Selecciona el crédito que deseas transferir al fondo de ahorro
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedCredit && (
                <Alert>
                  <InfoIcon className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p>
                        <strong>Monto:</strong> {formatCurrency(selectedCredit.amount)}
                      </p>
                      <p>
                        <strong>Miembro:</strong> {selectedCredit.profile.display_name}
                      </p>
                      {selectedCredit.description && (
                        <p>
                          <strong>Descripción:</strong> {selectedCredit.description}
                        </p>
                      )}
                      <p>
                        <strong>Fecha origen:</strong>{' '}
                        {new Date(selectedCredit.origin_date).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ej: Decidimos en conjunto ahorrar este crédito para vacaciones"
                        rows={3}
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormDescription>Agrega notas adicionales sobre la transferencia</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending || !form.watch('creditId')}>
                  {isPending ? 'Transfiriendo...' : 'Transferir al Fondo'}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {credits.length === 0 && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
