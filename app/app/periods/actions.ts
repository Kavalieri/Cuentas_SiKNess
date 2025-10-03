'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer, getUserHouseholdId } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';
import type { MonthlyPeriod } from '@/lib/periods';

/**
 * Obtiene un período mensual específico
 */
export async function getPeriod(
  year: number,
  month: number
): Promise<Result<MonthlyPeriod | null>> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No tienes un hogar activo');
  }

  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('monthly_periods')
    .select('*')
    .eq('household_id', householdId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (error) {
    return fail(error.message);
  }

  return ok(data);
}

/**
 * Obtiene o crea un período mensual (llama a la función RPC)
 */
export async function ensurePeriod(year: number, month: number): Promise<Result<MonthlyPeriod>> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No tienes un hogar activo');
  }

  const supabase = await supabaseServer();

  const { data, error } = await supabase.rpc('ensure_monthly_period', {
    p_household_id: householdId,
    p_year: year,
    p_month: month,
  });

  if (error) {
    return fail(error.message);
  }

  return ok(data);
}

/**
 * Obtiene todos los períodos de un hogar
 * @param limit Número máximo de períodos a obtener
 */
export async function getAllPeriods(limit = 12): Promise<Result<MonthlyPeriod[]>> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No tienes un hogar activo');
  }

  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('monthly_periods')
    .select('*')
    .eq('household_id', householdId)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(limit);

  if (error) {
    return fail(error.message);
  }

  return ok(data || []);
}

/**
 * Obtiene períodos pendientes de cerrar
 */
export async function getPendingPeriods(): Promise<Result<MonthlyPeriod[]>> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No tienes un hogar activo');
  }

  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('monthly_periods')
    .select('*')
    .eq('household_id', householdId)
    .eq('status', 'pending_close')
    .order('year', { ascending: true })
    .order('month', { ascending: true });

  if (error) {
    return fail(error.message);
  }

  return ok(data || []);
}

/**
 * Cierra un período mensual
 */
export async function closePeriod(periodId: string, notes?: string): Promise<Result> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.rpc('close_monthly_period', {
    p_period_id: periodId,
    p_notes: notes,
  });

  if (error) {
    return fail(error.message);
  }

  revalidatePath('/app');
  revalidatePath('/app/periods');
  return ok(data);
}

/**
 * Reabre un período cerrado (solo owners)
 */
export async function reopenPeriod(periodId: string): Promise<Result> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.rpc('reopen_monthly_period', {
    p_period_id: periodId,
  });

  if (error) {
    return fail(error.message);
  }

  revalidatePath('/app');
  revalidatePath('/app/periods');
  return ok(data);
}

/**
 * Actualiza los totales de un período (recalcula desde movimientos)
 */
export async function updatePeriodTotals(periodId: string): Promise<Result> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.rpc('update_period_totals', {
    p_period_id: periodId,
  });

  if (error) {
    return fail(error.message);
  }

  revalidatePath('/app');
  return ok(data);
}

/**
 * Obtiene estadísticas de un período (usando la vista v_period_stats)
 */
export async function getPeriodStats(periodId: string): Promise<
  Result<{
    monthly_savings: number | null;
    savings_percentage: number | null;
    movement_count: number | null;
    income_count: number | null;
    expense_count: number | null;
    top_expense_category: string | null;
  } | null>
> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('v_period_stats')
    .select(
      'monthly_savings, savings_percentage, movement_count, income_count, expense_count, top_expense_category'
    )
    .eq('id', periodId)
    .maybeSingle();

  if (error) {
    return fail(error.message);
  }

  return ok(data);
}

/**
 * Obtiene estadísticas por categoría de un período
 */
export async function getPeriodCategoryStats(
  year: number,
  month: number
): Promise<
  Result<
    Array<{
      category_id: string;
      category_name: string;
      total: number;
      percentage: number;
      count: number;
    }>
  >
> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No tienes un hogar activo');
  }

  const supabase = await supabaseServer();

  // Obtener período
  const periodResult = await getPeriod(year, month);
  if (!periodResult.ok || !periodResult.data) {
    return fail('Período no encontrado');
  }

  const periodId = periodResult.data.id;

  // Obtener movimientos del período agrupados por categoría
  const { data, error } = await supabase
    .from('transactions')
    .select(
      `
      category_id,
      amount,
      categories!inner (
        id,
        name
      )
    `
    )
    .eq('period_id', periodId)
    .eq('type', 'expense');

  if (error) {
    return fail(error.message);
  }

  // Agrupar y calcular totales
  const categoryMap = new Map<
    string,
    { category_id: string; category_name: string; total: number; count: number }
  >();

  (data || []).forEach((movement) => {
    const categoryId = movement.category_id as string;
    const categoryName = (movement.categories as { name?: string })?.name || 'Sin categoría';
    const existing = categoryMap.get(categoryId);

    if (existing) {
      existing.total += Number(movement.amount);
      existing.count += 1;
    } else {
      categoryMap.set(categoryId, {
        category_id: categoryId,
        category_name: categoryName,
        total: Number(movement.amount),
        count: 1,
      });
    }
  });

  // Calcular total de gastos
  const totalExpenses = Array.from(categoryMap.values()).reduce(
    (sum, cat) => sum + cat.total,
    0
  );

  // Calcular porcentajes
  const stats = Array.from(categoryMap.values())
    .map((cat) => ({
      ...cat,
      percentage: totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return ok(stats);
}

/**
 * Migra movimientos existentes a su período correspondiente
 * EJECUTAR SOLO UNA VEZ después de aplicar la migración
 */
export async function migrateExistingMovements(): Promise<
  Result<
    Array<{
      household_id: string;
      periods_created: number;
      movements_assigned: number;
    }>
  >
> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.rpc('migrate_existing_movements');

  if (error) {
    return fail(error.message);
  }

  revalidatePath('/app');
  return ok(data || []);
}
