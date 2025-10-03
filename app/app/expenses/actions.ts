'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseServer, getCurrentUser, getUserHouseholdId } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';

const MovementSchema = z.object({
  category_id: z
    .string()
    .transform((val) => (val === '' || val === 'none' ? null : val))
    .pipe(z.string().uuid().nullable()),
  type: z.enum(['expense', 'income']),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  currency: z.string().min(1).default('EUR'),
  note: z.string().optional(),
  occurred_at: z.string().min(1, 'La fecha es requerida'),
});

/**
 * Crea un nuevo movimiento (gasto o ingreso)
 */
export async function createMovement(formData: FormData): Promise<Result<{ id: string }>> {
  const parsed = MovementSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const user = await getCurrentUser();
  if (!user) {
    return fail('No autenticado');
  }

  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No tienes un hogar configurado');
  }

  const supabase = await supabaseServer();

  // @ts-ignore - Supabase types issue
  const { data, error } = await supabase
    .from('movements')
    // @ts-ignore
    .insert({
      household_id: householdId,
      user_id: user.id,
      category_id: parsed.data.category_id, // Ya transformado por Zod
      type: parsed.data.type,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      note: parsed.data.note || null,
      occurred_at: parsed.data.occurred_at,
    })
    .select()
    .single();

  if (error) {
    return fail(error.message);
  }

  revalidatePath('/app');
  revalidatePath('/app/expenses');
  // @ts-ignore
  return ok({ id: data.id });
}

/**
 * Obtiene todos los movimientos del household
 */
export async function getMovements(params?: {
  type?: 'expense' | 'income';
  startDate?: string;
  endDate?: string;
}): Promise<Result<unknown[]>> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return ok([]);
  }

  const supabase = await supabaseServer();

  let query = supabase
    .from('movements')
    .select(
      `
      id,
      type,
      amount,
      currency,
      note,
      occurred_at,
      created_at,
      categories (
        id,
        name,
        icon
      )
    `,
    )
    .eq('household_id', householdId)
    .order('occurred_at', { ascending: false });

  if (params?.type) {
    query = query.eq('type', params.type);
  }

  if (params?.startDate) {
    query = query.gte('occurred_at', params.startDate);
  }

  if (params?.endDate) {
    query = query.lte('occurred_at', params.endDate);
  }

  const { data, error } = await query;

  if (error) {
    return fail(error.message);
  }

  return ok(data || []);
}

/**
 * Elimina un movimiento
 */
export async function deleteMovement(movementId: string): Promise<Result> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No tienes un hogar configurado');
  }

  const supabase = await supabaseServer();

  const { error } = await supabase
    .from('movements')
    .delete()
    .eq('id', movementId)
    .eq('household_id', householdId); // Verificar que pertenece al household

  if (error) {
    return fail(error.message);
  }

  revalidatePath('/app');
  revalidatePath('/app/expenses');
  return ok();
}

/**
 * Obtiene el resumen del mes actual
 */
export async function getMonthSummary(
  year: number,
  month: number,
): Promise<Result<{ expenses: number; income: number; balance: number }>> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return ok({ expenses: 0, income: 0, balance: 0 });
  }

  // Calcular primer y último día del mes
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('movements')
    .select('type, amount')
    .eq('household_id', householdId)
    .gte('occurred_at', startDate)
    .lte('occurred_at', endDate);

  if (error) {
    return fail(error.message);
  }

  // @ts-ignore - Supabase types issue
  const expenses =
    // @ts-ignore
    data?.filter((m) => m.type === 'expense').reduce((sum, m) => sum + Number(m.amount), 0) || 0;

  // @ts-ignore - Supabase types issue
  const income =
    // @ts-ignore
    data?.filter((m) => m.type === 'income').reduce((sum, m) => sum + Number(m.amount), 0) || 0;

  return ok({
    expenses,
    income,
    balance: income - expenses,
  });
}
