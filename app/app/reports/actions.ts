'use server';

import { supabaseServer, getUserHouseholdId } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';

/**
 * Obtiene datos de tendencia de gastos e ingresos por mes
 * Para gráfico de líneas (LineChart)
 */
export async function getTrendData(params?: {
  months?: number; // Últimos N meses, default 12
}): Promise<
  Result<
    Array<{
      month: string; // 'YYYY-MM'
      monthLabel: string; // 'Ene 2025'
      expenses: number;
      income: number;
      net: number;
    }>
  >
> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No se encontró household activo');
    }

    const supabase = await supabaseServer();
    const months = params?.months || 12;

    // Calcular rango de fechas
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Obtener transacciones del período
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('type, amount, occurred_at')
      .eq('household_id', householdId)
      .gte('occurred_at', startDate.toISOString().split('T')[0])
      .lte('occurred_at', endDate.toISOString().split('T')[0])
      .order('occurred_at', { ascending: true });

    if (error) {
      return fail(`Error al obtener transacciones: ${error.message}`);
    }

    // Agrupar por mes
    const monthlyData = new Map<
      string,
      { expenses: number; income: number }
    >();

    transactions?.forEach((tx: any) => {
      // Asegurar que occurred_at sea string
      const occurredAt = typeof tx.occurred_at === 'string' ? tx.occurred_at : String(tx.occurred_at || '');
      if (!occurredAt || occurredAt === 'null' || occurredAt === 'undefined') return;

      const month = occurredAt.substring(0, 7); // 'YYYY-MM'
      const current = monthlyData.get(month) || { expenses: 0, income: 0 };

      if (tx.type === 'expense') {
        current.expenses += tx.amount;
      } else if (tx.type === 'income') {
        current.income += tx.amount;
      }

      monthlyData.set(month, current);
    });

    // Convertir a array con formato de labels
    const result = Array.from(monthlyData.entries())
      .map(([month, data]) => {
        const [year, monthNum] = month.split('-');
        const monthNames = [
          'Ene',
          'Feb',
          'Mar',
          'Abr',
          'May',
          'Jun',
          'Jul',
          'Ago',
          'Sep',
          'Oct',
          'Nov',
          'Dic',
        ];
        const monthIndex = parseInt(monthNum || '1', 10) - 1;
        const monthLabel = `${monthNames[monthIndex] || 'Ene'} ${year || ''}`;

        return {
          month,
          monthLabel,
          expenses: data.expenses,
          income: data.income,
          net: data.income - data.expenses,
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    return ok(result);
  } catch (error) {
    console.error('Error en getTrendData:', error);
    return fail('Error inesperado al obtener datos de tendencia');
  }
}

/**
 * Obtiene distribución de gastos por categoría
 * Para gráfico circular (PieChart)
 */
export async function getCategoryDistribution(params?: {
  startDate?: string; // 'YYYY-MM-DD'
  endDate?: string;
  type?: 'expense' | 'income'; // Default: 'expense'
}): Promise<
  Result<
    Array<{
      name: string;
      value: number;
      percentage: number;
      icon: string | null;
    }>
  >
> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No se encontró household activo');
    }

    const supabase = await supabaseServer();
    const type = params?.type || 'expense';

    // Si no hay fechas, usar mes actual
    const now = new Date();
    const startDate =
      params?.startDate ||
      new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate =
      params?.endDate ||
      new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];

    // Obtener transacciones con categoría
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('amount, category:categories(name, icon)')
      .eq('household_id', householdId)
      .eq('type', type)
      .gte('occurred_at', startDate)
      .lte('occurred_at', endDate)
      .neq('category_id', null);

    if (error) {
      return fail(`Error al obtener transacciones: ${error.message}`);
    }

    // Agrupar por categoría
    const categoryMap = new Map<string, { amount: number; icon: string | null }>();
    let total = 0;

    transactions?.forEach((tx: any) => {
      if (tx.category) {
        const categoryName = tx.category.name;
        const current = categoryMap.get(categoryName) || {
          amount: 0,
          icon: tx.category.icon,
        };
        current.amount += tx.amount;
        categoryMap.set(categoryName, current);
        total += tx.amount;
      }
    });

    // Convertir a array con porcentajes
    const result = Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        name,
        value: data.amount,
        percentage: (data.amount / total) * 100,
        icon: data.icon,
      }))
      .sort((a, b) => b.value - a.value);

    return ok(result);
  } catch (error) {
    console.error('Error en getCategoryDistribution:', error);
    return fail('Error inesperado al obtener distribución de categorías');
  }
}

/**
 * Obtiene comparación de contribuciones entre miembros
 * Para gráfico de barras (BarChart)
 */
export async function getContributionsComparison(params?: {
  year?: number;
  month?: number;
}): Promise<
  Result<
    Array<{
      name: string; // Nombre del miembro
      expected: number;
      paid: number;
      percentage: number;
    }>
  >
> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No se encontró household activo');
    }

    const supabase = await supabaseServer();
    const now = new Date();
    const year = params?.year || now.getFullYear();
    const month = params?.month || now.getMonth() + 1;

    // Obtener contribuciones del mes
    const { data: contributions, error } = await supabase
      .from('contributions')
      .select(
        `
        expected_amount,
        paid_amount,
        profile:profiles(display_name)
      `
      )
      .eq('household_id', householdId)
      .eq('year', year)
      .eq('month', month);

    if (error) {
      return fail(`Error al obtener contribuciones: ${error.message}`);
    }

    if (!contributions || contributions.length === 0) {
      return ok([]);
    }

    // Formatear datos
    const result = contributions.map((c: any) => {
      const expectedAmount = c.expected_amount || 0;
      const paidAmount = c.paid_amount || 0;
      return {
        name: c.profile?.display_name || 'Desconocido',
        expected: expectedAmount,
        paid: paidAmount,
        percentage: expectedAmount > 0 ? (paidAmount / expectedAmount) * 100 : 0,
      };
    });

    return ok(result);
  } catch (error) {
    console.error('Error en getContributionsComparison:', error);
    return fail('Error inesperado al obtener comparación de contribuciones');
  }
}

/**
 * Obtiene ranking de categorías más usadas
 * Para tabla de top categorías
 */
export async function getTopCategories(params?: {
  startDate?: string;
  endDate?: string;
  type?: 'expense' | 'income';
  limit?: number;
}): Promise<
  Result<
    Array<{
      name: string;
      icon: string | null;
      total: number;
      count: number;
      average: number;
    }>
  >
> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No se encontró household activo');
    }

    const supabase = await supabaseServer();
    const type = params?.type || 'expense';
    const limit = params?.limit || 10;

    // Si no hay fechas, usar últimos 6 meses
    const now = new Date();
    const startDate =
      params?.startDate ||
      new Date(now.getFullYear(), now.getMonth() - 6, 1)
        .toISOString()
        .split('T')[0];
    const endDate =
      params?.endDate || now.toISOString().split('T')[0];

    // Obtener transacciones con categoría
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('amount, category:categories(name, icon)')
      .eq('household_id', householdId)
      .eq('type', type)
      .gte('occurred_at', startDate)
      .lte('occurred_at', endDate)
      .neq('category_id', null);

    if (error) {
      return fail(`Error al obtener transacciones: ${error.message}`);
    }

    // Agrupar por categoría
    const categoryMap = new Map<
      string,
      { total: number; count: number; icon: string | null }
    >();

    transactions?.forEach((tx: any) => {
      if (tx.category) {
        const categoryName = tx.category.name;
        const current = categoryMap.get(categoryName) || {
          total: 0,
          count: 0,
          icon: tx.category.icon,
        };
        current.total += tx.amount;
        current.count += 1;
        categoryMap.set(categoryName, current);
      }
    });

    // Convertir a array con promedios
    const result = Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        name,
        icon: data.icon,
        total: data.total,
        count: data.count,
        average: data.total / data.count,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);

    return ok(result);
  } catch (error) {
    console.error('Error en getTopCategories:', error);
    return fail('Error inesperado al obtener ranking de categorías');
  }
}
