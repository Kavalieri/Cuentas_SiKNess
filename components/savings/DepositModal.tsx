'use client';

import { useState, useTransition } from 'react';
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { depositToSavings } from '@/app/app/savings/actions';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

const depositSchema = z.object({
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  profileId: z.string().uuid('Selecciona un miembro válido'),
  description: z.string().min(1, 'La descripción es requerida'),
  category: z.enum(['emergency', 'vacation', 'home', 'investment', 'other']).optional(),
});

type DepositFormData = z.infer<typeof depositSchema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

type Member = {
  profile_id: string;
  profile: {
    display_name: string;
    avatar_url: string | null;
  };
};

export function DepositModal({ open, onOpenChange, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<DepositFormData>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      amount: 0,
      profileId: '',
      description: '',
      category: undefined,
    },
  });

  // Cargar miembros al abrir modal
  const handleOpenChange = async (newOpen: boolean) => {
    onOpenChange(newOpen);

    if (newOpen && members.length === 0) {
      setLoading(true);
      try {
        const supabase = supabaseBrowser();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        // Tipar user
        type User = { id: string; email?: string };
        const typedUser = user as unknown as User;

        // Obtener household activo
        const { data: settings } = await supabase
          .from('user_settings')
          .select('active_household_id')
          .eq('user_id', typedUser.id)
          .single();

        // Tipar settings
        type Settings = { active_household_id: string };
        const typedSettings = settings as unknown as Settings;

        if (!typedSettings?.active_household_id) return;

        // Obtener miembros del household
        const { data: householdMembers } = await supabase
          .from('household_members')
          .select('profile_id, profile:profiles(display_name, avatar_url)')
          .eq('household_id', typedSettings.active_household_id);

        type HouseholdMember = {
          profile_id: string;
          profile: { display_name: string; avatar_url: string | null } | null;
        };
        const typedMembers = (householdMembers || []) as unknown as HouseholdMember[];

        if (typedMembers.length > 0) {
          setMembers(typedMembers as Member[]);

          // Auto-seleccionar usuario actual (asumiendo que user tiene profile_id)
          type UserWithProfile = User & { profile_id?: string };
          const userWithProfile = typedUser as UserWithProfile;

          const currentMember = typedMembers.find(m => m.profile_id === userWithProfile.profile_id);
          if (currentMember && userWithProfile.profile_id) {
            form.setValue('profileId', userWithProfile.profile_id);
          }
        }
      } catch (error) {
        console.error('Error loading members:', error);
        toast.error('Error al cargar los miembros');
      } finally {
        setLoading(false);
      }
    }
  };

  const onSubmit = (data: DepositFormData) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('amount', data.amount.toString());
      formData.append('profileId', data.profileId);
      formData.append('description', data.description);
      if (data.category) {
        formData.append('category', data.category);
      }

      const result = await depositToSavings(formData);

      if (result.ok) {
        toast.success('Depósito realizado exitosamente');
        form.reset();
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Depositar al Fondo de Ahorro</DialogTitle>
          <DialogDescription>
            Registra un depósito al fondo de ahorro común del hogar.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              name="profileId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Miembro que deposita *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isPending || loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un miembro" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.profile_id} value={member.profile_id}>
                          {member.profile.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Depósito mensual octubre"
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="emergency">Emergencia</SelectItem>
                      <SelectItem value="vacation">Vacaciones</SelectItem>
                      <SelectItem value="home">Hogar</SelectItem>
                      <SelectItem value="investment">Inversión</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
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
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Depositando...' : 'Depositar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
