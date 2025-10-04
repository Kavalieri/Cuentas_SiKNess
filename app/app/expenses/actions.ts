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
  description: z.string().optional(),
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

  // Obtener profile_id del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    return fail('Usuario no encontrado');
  }

  // @ts-ignore - Supabase types issue
  const { data, error } = await supabase
    .from('transactions')
    // @ts-ignore
    .insert({
      household_id: householdId,
      profile_id: profile.id,
      category_id: parsed.data.category_id, // Ya transformado por Zod
      type: parsed.data.type,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      description: parsed.data.description || null,
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
    .from('transactions')
    .select(
      `
      id,
      type,
      amount,
      currency,
      description,
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
    .from('transactions')
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
    .from('transactions')
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

/**
 * Obtiene el balance total acumulativo (todos los movimientos históricos)
 */
export async function getTotalBalance(): Promise<Result<{ balance: number; income: number; expenses: number }>> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return ok({ balance: 0, income: 0, expenses: 0 });
  }

  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('household_id', householdId);

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
    balance: income - expenses,
    income,
    expenses,
  });
}

/**
 * Obtiene gastos agrupados por categoría para un período
 */
export async function getCategoryExpenses(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<
  Result<
    Array<{
      category_id: string | null;
      category_name: string;
      category_icon: string;
      total: number;
      count: number;
      percentage: number;
    }>
  >
> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return ok([]);
  }

  const supabase = await supabaseServer();

  let query = supabase
    .from('transactions')
    .select(
      `
      category_id,
      amount,
      categories (
        id,
        name,
        icon
      )
    `
    )
    .eq('household_id', householdId)
    .eq('type', 'expense');

  if (params?.startDate) {
    query = query.gte('occurred_at', params.startDate);
  }
  if (params?.endDate) {
    query = query.lte('occurred_at', params.endDate);
  }

  const { data: movements, error } = await query;

  if (error) {
    return fail(error.message);
  }

  // Agrupar manualmente por categoría
  const categoryMap = new Map<
    string,
    {
      category_id: string | null;
      category_name: string;
      category_icon: string;
      total: number;
      count: number;
    }
  >();

  // @ts-ignore
  movements?.forEach((mov) => {
    // @ts-ignore
    const catId = mov.category_id || 'sin-categoria';
    // @ts-ignore
    const catName = mov.categories?.name || 'Sin categoría';
    // @ts-ignore
    const catIcon = mov.categories?.icon || '📦';

    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, {
        // @ts-ignore
        category_id: mov.category_id,
        category_name: catName,
        category_icon: catIcon,
        total: 0,
        count: 0,
      });
    }

    const entry = categoryMap.get(catId)!;
    // @ts-ignore
    entry.total += Number(mov.amount);
    entry.count += 1;
  });

  const categories = Array.from(categoryMap.values());
  const totalExpenses = categories.reduce((sum, cat) => sum + cat.total, 0);

  // Calcular porcentajes
  const result = categories.map((cat) => ({
    ...cat,
    percentage: totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0,
  }));

  // Ordenar por total descendente
  result.sort((a, b) => b.total - a.total);

  return ok(result);
}

/**
 * Obtiene gastos diarios para un mes específico
 */
export async function getDailyExpenses(params?: {
  month?: string; // YYYY-MM
}): Promise<
  Result<
    Array<{
      date: string;
      amount: number;
      count: number;
    }>
  >
> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return ok([]);
  }

  // Determinar rango del mes
  const monthDate = params?.month ? new Date(`${params.month}-01`) : new Date();
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const startDate = new Date(year, month, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('transactions')
    .select('occurred_at, amount')
    .eq('household_id', householdId)
    .eq('type', 'expense')
    .gte('occurred_at', startDate)
    .lte('occurred_at', endDate)
    .order('occurred_at', { ascending: true });

  if (error) {
    return fail(error.message);
  }

  // Agrupar por día
  const dailyMap = new Map<string, { amount: number; count: number }>();

  // @ts-ignore
  data?.forEach((mov) => {
    // @ts-ignore
    const dateStr = mov.occurred_at?.split('T')[0]; // YYYY-MM-DD
    if (!dateStr) return;

    if (!dailyMap.has(dateStr)) {
      dailyMap.set(dateStr, { amount: 0, count: 0 });
    }

    const entry = dailyMap.get(dateStr)!;
    // @ts-ignore
    entry.amount += Number(mov.amount);
    entry.count += 1;
  });

  // Convertir a array
  const result = Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    ...data,
  }));

  return ok(result);
}

/**
 * Obtiene comparación entre mes actual y anterior
 */
export async function getMonthComparison(params?: {
  currentMonth?: string; // YYYY-MM
}): Promise<
  Result<{
    current: { income: number; expenses: number; balance: number };
    previous: { income: number; expenses: number; balance: number };
    change: { income: number; expenses: number; balance: number };
  }>
> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return ok({
      current: { income: 0, expenses: 0, balance: 0 },
      previous: { income: 0, expenses: 0, balance: 0 },
      change: { income: 0, expenses: 0, balance: 0 },
    });
  }

  // Determinar meses
  const currentDate = params?.currentMonth ? new Date(`${params.currentMonth}-01`) : new Date();
  const previousDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);

  // Obtener resúmenes de ambos meses
  const currentResult = await getMonthSummary(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1
  );
  const previousResult = await getMonthSummary(
    previousDate.getFullYear(),
    previousDate.getMonth() + 1
  );

  if (!currentResult.ok || !previousResult.ok) {
    return fail('Error al obtener comparación de meses');
  }

  const current = currentResult.data!;
  const previous = previousResult.data!;

  // Calcular cambios porcentuales
  const calculateChange = (curr: number, prev: number): number => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  return ok({
    current,
    previous,
    change: {
      income: calculateChange(current.income, previous.income),
      expenses: calculateChange(current.expenses, previous.expenses),
      balance: calculateChange(current.balance, previous.balance),
    },
  });
}
