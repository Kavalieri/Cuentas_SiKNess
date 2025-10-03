'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseServer, getUserHouseholdId } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';

const CategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  icon: z.string().optional(),
  type: z.enum(['expense', 'income']),
});

/**
 * Obtiene todas las categorías del household
 */
export async function getCategories(type?: 'expense' | 'income'): Promise<Result<unknown[]>> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return ok([]);
  }

  const supabase = await supabaseServer();

  let query = supabase
    .from('categories')
    .select('*')
    .eq('household_id', householdId)
    .order('name', { ascending: true });

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error) {
    return fail(error.message);
  }

  return ok(data || []);
}

/**
 * Crea una nueva categoría
 */
export async function createCategory(formData: FormData): Promise<Result<{ id: string }>> {
  const parsed = CategorySchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No tienes un hogar configurado');
  }

  const supabase = await supabaseServer();

  // @ts-ignore - Supabase types issue
  const { data, error } = await supabase
    .from('categories')
    // @ts-ignore
    .insert({
      household_id: householdId,
      name: parsed.data.name,
      icon: parsed.data.icon || null,
      type: parsed.data.type,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      // Violación de constraint unique
      return fail('Ya existe una categoría con ese nombre y tipo');
    }
    return fail(error.message);
  }

  revalidatePath('/app/categories');
  revalidatePath('/app/expenses');
  // @ts-ignore
  return ok({ id: data.id });
}

/**
 * Elimina una categoría
 */
export async function deleteCategory(categoryId: string): Promise<Result> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No tienes un hogar configurado');
  }

  const supabase = await supabaseServer();

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)
    .eq('household_id', householdId);

  if (error) {
    return fail(error.message);
  }

  revalidatePath('/app/categories');
  revalidatePath('/app/expenses');
  return ok();
}
