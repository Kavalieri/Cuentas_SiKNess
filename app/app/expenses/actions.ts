'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseServer, getCurrentUser, getUserHouseholdId, getUserRoleInActiveHousehold, query } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';

const TransactionSchema = z.object({
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
 * Crea una nueva transacción (gasto o ingreso)
 * Campos actuales: id, household_id, category_id, type, amount, currency, description,
 *                  occurred_at, created_at, period_id, profile_id, updated_at, paid_by
 * Asegura que exista el período mensual antes de insertar
 */
export async function createTransaction(formData: FormData): Promise<Result<{ id: string }>> {
  const parsed = TransactionSchema.safeParse(Object.fromEntries(formData));

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

  // Extraer año y mes de occurred_at para asegurar período mensual
  const occurredDate = new Date(parsed.data.occurred_at);
  const year = occurredDate.getFullYear();
  const month = occurredDate.getMonth() + 1;

  // Asegurar que existe el período mensual
  const { data: periodId, error: periodError } = await supabase.rpc('ensure_monthly_period', {
    p_household_id: householdId,
    p_year: year,
    p_month: month,
  });

  if (periodError) {
    return fail(`Error al crear período mensual: ${periodError.message}`);
  }

  // Obtener paid_by del FormData
  // "common" → NULL (cuenta común)
  // UUID válido → ese usuario
  // vacío → usuario actual (fallback)
  const paidByFormValue = formData.get('paid_by') as string | null;
  let paidBy: string | null = profile.id; // Default: usuario actual

  if (paidByFormValue === 'common') {
    paidBy = null; // Cuenta común
  } else if (paidByFormValue && paidByFormValue !== '') {
    paidBy = paidByFormValue; // Usuario específico
  }

  // Validación: Si es ingreso, paid_by NO puede ser NULL
  if (parsed.data.type === 'income' && paidBy === null) {
    return fail('Los ingresos deben tener un usuario asignado para trazabilidad');
  }

  // @ts-ignore - Supabase types issue
  const { data, error } = await supabase
    .from('transactions')
    // @ts-ignore
    .insert({
      household_id: householdId,
      profile_id: profile.id, // Quien registró la transacción (auditoría)
      category_id: parsed.data.category_id, // Ya transformado por Zod
      type: parsed.data.type,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      description: parsed.data.description || null,
      occurred_at: parsed.data.occurred_at,
      period_id: periodId,

      // ⭐ RESPONSABILIDAD FINANCIERA (quién pagó/recibió)
      paid_by: paidBy, // NULL = cuenta común (ambos), UUID = usuario específico

      // ✅ AUDITORÍA (quién REGISTRÓ la transacción)
      created_by_profile_id: profile.id,
      updated_by_profile_id: profile.id,
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
 * Actualiza una transacción existente
 * Solo el owner puede editar. Members solo pueden editar sus propias transacciones.
 */
export async function updateTransaction(formData: FormData): Promise<Result<{ id: string }>> {
  const transactionId = formData.get('id') as string;
  if (!transactionId) {
    return fail('ID de transacción requerido');
  }

  // Validar datos
  const parsed = TransactionSchema.safeParse(Object.fromEntries(formData));
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

  const role = await getUserRoleInActiveHousehold();
  console.log('[getHouseholdMembersWithRole] Role obtenido:', role);
  if (!role) {
    return fail('No se pudo determinar tu rol en el hogar');
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

  // Verificar que la transacción existe y pertenece al household
  const { data: existingTransaction } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('household_id', householdId)
    .single();

  if (!existingTransaction) {
    return fail('Transacción no encontrada');
  }

  // Validación de permisos
  if (role === 'member' && existingTransaction.paid_by !== profile.id) {
    return fail('Los miembros solo pueden editar sus propias transacciones');
  }

  // Procesar paid_by
  const paidByFormValue = formData.get('paid_by') as string | null;
  let paidBy: string | null = existingTransaction.paid_by; // Mantener el actual si no se cambia

  if (paidByFormValue === 'common') {
    paidBy = null; // Común
  } else if (paidByFormValue && paidByFormValue !== '') {
    paidBy = paidByFormValue; // Usuario específico
  }

  // Validación: Si es ingreso, paid_by NO puede ser NULL
  if (parsed.data.type === 'income' && paidBy === null) {
    return fail('Los ingresos deben tener un usuario asignado para trazabilidad');
  }

  // Actualizar transacción
  // @ts-ignore
  const { data, error } = await supabase
    .from('transactions')
    // @ts-ignore
    .update({
      category_id: parsed.data.category_id,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      description: parsed.data.description || null,
      occurred_at: parsed.data.occurred_at,

      // ⭐ RESPONSABILIDAD FINANCIERA (quién se beneficia/contribuye)
      paid_by: paidBy, // Puede cambiar según quién asuma el gasto/ingreso

      // ✅ AUDITORÍA (quién MODIFICÓ la transacción)
      updated_by_profile_id: profile.id,
    })
    .eq('id', transactionId)
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
 * Obtiene todas las transacciones del household
 */
export async function getTransactions(params?: {
  type?: 'expense' | 'income';
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  search?: string;
}): Promise<Result<unknown[]>> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return ok([]);
  }

  const supabase = await supabaseServer();

  // Primero obtener transacciones sin JOINs
  let query = supabase
    .from('transactions')
    .select('id, type, amount, currency, description, occurred_at, created_at, updated_at, category_id, paid_by')
    .eq('household_id', householdId)
    .order('occurred_at', { ascending: false });

  if (params?.type) {
    query = query.eq('type', params.type);
  }

  if (params?.categoryId) {
    query = query.eq('category_id', params.categoryId);
  }

  if (params?.startDate) {
    query = query.gte('occurred_at', params.startDate);
  }

  if (params?.endDate) {
    query = query.lte('occurred_at', params.endDate);
  }

  if (params?.search) {
    query = query.ilike('description', `%${params.search}%`);
  }

  const { data: transactions, error } = await query;

  if (error) {
    return fail(error.message);
  }

  // Debug: Log sample transaction data
  if (transactions && transactions.length > 0 && transactions[0]) {
    const sample = transactions[0] as any;
    console.log('[getTransactions] Sample transaction data:', {
      id: sample.id,
      occurred_at: sample.occurred_at,
      occurred_at_type: typeof sample.occurred_at,
      created_at: sample.created_at,
      created_at_type: typeof sample.created_at,
    });
  }

  if (!transactions || transactions.length === 0) {
    return ok([]);
  }

  // Tipar transacciones
  type TransactionData = {
    id: string;
    type: string;
    amount: number;
    currency: string;
    description: string | null;
    occurred_at: string;
    created_at: string;
    updated_at: string;
    category_id: string | null;
    paid_by: string | null;
  };
  const typedTransactions = transactions as TransactionData[];

  // Obtener categorías y perfiles por separado
  const categoryIds = [...new Set(typedTransactions.map(t => t.category_id).filter(Boolean))];
  const userIds = [...new Set(typedTransactions.map(t => t.paid_by).filter(Boolean))];

  const [categoriesResult, profilesResult] = await Promise.all([
    categoryIds.length > 0
      ? supabase.from('categories').select('id, name, icon').in('id', categoryIds as string[])
      : Promise.resolve({ data: [], error: null }),
    userIds.length > 0
      ? supabase.from('profiles').select('auth_user_id, display_name, avatar_url').in('auth_user_id', userIds as string[])
      : Promise.resolve({ data: [], error: null })
  ]);

  // Crear mapas para búsqueda rápida
  type CategoryData = { id: string; name: string; icon: string | null };
  type ProfileData = { auth_user_id: string; display_name: string; avatar_url: string | null };

  const categoriesById = new Map<string, CategoryData>(
    (categoriesResult.data as CategoryData[]).map(c => [c.id, c])
  );
  const profilesById = new Map<string, ProfileData>(
    (profilesResult.data as ProfileData[]).map(p => [p.auth_user_id, p])
  );

  // Unir datos
  const enrichedTransactions = typedTransactions.map(t => ({
    ...t,
    categories: t.category_id ? categoriesById.get(t.category_id) : null,
    profile: t.paid_by ? profilesById.get(t.paid_by) : null
  }));

  return ok(enrichedTransactions);
}

/**
 * Elimina una transacción
 */
export async function deleteTransaction(transactionId: string): Promise<Result> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No tienes un hogar configurado');
  }

  const supabase = await supabaseServer();

  // 1. Obtener transacción actual para verificar household
  const { data: currentTransaction, error: fetchError } = await supabase
    .from('transactions')
    .select('id, household_id')
    .eq('id', transactionId)
    .single();

  if (fetchError || !currentTransaction) {
    return fail('Transacción no encontrada');
  }

  // 2. Verificar que pertenece al household
  if (currentTransaction.household_id !== householdId) {
    return fail('No tienes permisos para eliminar esta transacción');
  }

  // 3. Eliminar transacción
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('household_id', householdId);

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

  // Construir query con JOIN manual para PostgreSQL directo
  let sql = `
    SELECT
      t.category_id,
      t.amount,
      c.id as category_id,
      c.name as category_name,
      c.icon as category_icon
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.household_id = $1 AND t.type = $2
  `;

  const queryParams: unknown[] = [householdId, 'expense'];
  let paramIndex = 3;

  if (params?.startDate) {
    sql += ` AND t.occurred_at >= $${paramIndex}`;
    queryParams.push(params.startDate);
    paramIndex++;
  }
  if (params?.endDate) {
    sql += ` AND t.occurred_at <= $${paramIndex}`;
    queryParams.push(params.endDate);
    paramIndex++;
  }

  let transactions: any[] = [];

  try {
    const { query } = await import('@/lib/db');
    const result = await query(sql, queryParams);
    transactions = result.rows.map((row: any) => ({
      category_id: row.category_id,
      amount: row.amount,
      categories: row.category_id ? {
        id: row.category_id,
        name: row.category_name,
        icon: row.category_icon
      } : null
    }));
  } catch (err: any) {
    return fail(err.message);
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
  transactions?.forEach((txn) => {
    // @ts-ignore
    const catId = txn.category_id || 'sin-categoria';
    // @ts-ignore
    const catName = txn.categories?.name || 'Sin categoría';
    // @ts-ignore
    const catIcon = txn.categories?.icon || '📦';

    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, {
        // @ts-ignore
        category_id: txn.category_id,
        category_name: catName,
        category_icon: catIcon,
        total: 0,
        count: 0,
      });
    }

    const entry = categoryMap.get(catId)!;
    // @ts-ignore
    entry.total += Number(txn.amount);
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

/**
 * Obtiene los miembros del household activo y el rol del usuario actual
 * Usado para el selector de "¿Quién pagó?" en el formulario de transacciones
 */
export async function getHouseholdMembersWithRole(): Promise<
  Result<{
    members: Array<{ id: string; display_name: string }>;
    userRole: 'owner' | 'member';
    currentUserId: string;
  }>
> {
  const user = await getCurrentUser();
  if (!user) {
    return fail('No autenticado');
  }

  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No tienes un hogar configurado');
  }

  const role = await getUserRoleInActiveHousehold();
  console.log('[getHouseholdMembersWithRole] Role obtenido:', role);
  if (!role) {
    return fail('No se pudo determinar tu rol en el hogar');
  }

  const supabase = await supabaseServer();

  // user.profile_id ya ES el profiles.id que necesitamos
  console.log('[getHouseholdMembersWithRole] user.id (auth_user_id):', user.id);
  console.log('[getHouseholdMembersWithRole] user.profile_id (profiles.id):', user.profile_id);

  const currentProfileId = user.profile_id;

  // Obtener todos los miembros del household con SQL nativo
  const result = await query(
    `SELECT
      hm.profile_id,
      p.id,
      p.display_name
    FROM household_members hm
    JOIN profiles p ON hm.profile_id = p.id
    WHERE hm.household_id = $1`,
    [householdId]
  );

  if (!result.rows || result.rows.length === 0) {
    return fail('Error al obtener miembros del hogar');
  }

  type MemberRaw = {
    profile_id: string;
    id: string;
    display_name: string;
  };

  const typedMembers = result.rows as MemberRaw[];

  // DEBUG: Log para verificar qué miembros se están retornando
  console.log('[getHouseholdMembersWithRole] members:', typedMembers);

  return ok({
    members: typedMembers.map((m) => ({
      id: m.id,
      display_name: m.display_name,
    })),
    userRole: role as 'owner' | 'member',
    currentUserId: currentProfileId,
  });
}
