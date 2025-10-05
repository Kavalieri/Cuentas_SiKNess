'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';

// ========================================================================
// EDICIÓN DE TRANSACCIONES CON HISTORIAL
// ========================================================================

const EditMovementSchema = z.object({
  movementId: z.string().uuid(),
  description: z.string().min(1, 'La descripción es requerida'),
  occurred_at: z.coerce.date(),
  // FIX: Transformar "none" y "" a null automáticamente
  category_id: z
    .string()
    .transform((val) => (val === '' || val === 'none' ? null : val))
    .pipe(z.string().uuid().nullable()),
  amount: z.coerce.number().positive('El monto debe ser positivo'),
});

export async function updateMovement(formData: FormData): Promise<Result> {
  const supabase = await supabaseServer();

  // 1. Obtener profile_id del usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('No autenticado');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) return fail('Usuario no encontrado');

  // 2. Validar datos del formulario
  const parsed = EditMovementSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const { movementId, description, occurred_at, category_id, amount } =
    parsed.data;

  // 3. Obtener transacción actual para verificar household y valores
  const { data: currentMovement, error: fetchError } = await supabase
    .from('transactions')
    .select('*, household_id')
    .eq('id', movementId)
    .single();

  if (fetchError || !currentMovement) {
    return fail('Movimiento no encontrado');
  }

  // 4. Verificar que el usuario pertenece al hogar
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id, profile_id')
    .eq('household_id', currentMovement.household_id)
    .eq('profile_id', profile.id)
    .single();

  if (!membership) {
    return fail('No tienes permiso para editar este movimiento');
  }

  // 5. Verificar si hubo cambios reales
  const hasChanges =
    currentMovement.description !== description ||
    currentMovement.occurred_at !== occurred_at.toISOString().split('T')[0] ||
    currentMovement.category_id !== category_id ||
    currentMovement.amount !== amount;

  if (!hasChanges) {
    return fail('No se detectaron cambios');
  }

  // 6. Actualizar la transacción (el trigger guardará automáticamente el historial)
  const { error: updateError } = await supabase
    .from('transactions')
    .update({
      description,
      occurred_at: occurred_at.toISOString().split('T')[0], // Solo fecha
      category_id,
      amount,
    })
    .eq('id', movementId);

  if (updateError) {
    console.error('❌ Error al actualizar movimiento:', updateError);
    return fail('Error al actualizar: ' + updateError.message);
  }

  // 7. Revalidar rutas
  revalidatePath('/app');
  revalidatePath('/app/expenses');
  revalidatePath('/app/household');

  return ok();
}

// ========================================================================
// OBTENER HISTORIAL DE UNA TRANSACCIÓN
// ========================================================================

export async function getMovementHistory(movementId: string): Promise<Result<unknown[]>> {
  const supabase = await supabaseServer();
  
  const { data, error } = await supabase
    .from('transaction_history')
    .select(
      `
      *,
      changed_by_profile:profiles!transaction_history_changed_by_fkey(display_name, email),
      old_category:categories!transaction_history_old_category_id_fkey(name, icon),
      new_category:categories!transaction_history_new_category_id_fkey(name, icon)
    `
    )
    .eq('transaction_id', movementId)
    .order('changed_at', { ascending: false });

  if (error) {
    console.error('❌ Error al obtener historial:', error);
    return fail('Error al obtener historial: ' + error.message);
  }

  return ok(data);
}

