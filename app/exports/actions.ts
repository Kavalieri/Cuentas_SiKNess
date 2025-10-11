/**
 * SERVER ACTIONS - Sistema de Exportación
 *
 * Obtiene datos estructurados del período seleccionado para exportación
 */

'use server';

import { supabaseServer, getUserHouseholdId } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';
import type { ExportData, ExportOptions } from '@/lib/export/types';

/**
 * Obtiene todos los datos necesarios para exportación del período seleccionado
 */
export async function getExportData(
  options: ExportOptions
): Promise<Result<ExportData>> {
  const supabase = await supabaseServer();

  // 1. Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('No autenticado');

  // 2. Obtener household_id activo
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return fail('No tienes un hogar activo');
  }

  // 3. Obtener nombre del hogar
  const { data: household } = await supabase
    .from('households')
    .select('name')
    .eq('id', householdId)
    .single();

  if (!household) return fail('Hogar no encontrado');

  // 4. Calcular rango de fechas del período
  const { year, month } = options;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Último día del mes

  const startISO = startDate.toISOString().split('T')[0];
  const endISO = endDate.toISOString().split('T')[0];

  // 5. Obtener transacciones del período
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select(`
      id,
      occurred_at,
      type,
      amount,
      currency,
      description,
      category_id,
      paid_by
    `)
    .eq('household_id', householdId)
    .gte('occurred_at', startISO)
    .lte('occurred_at', endISO)
    .order('occurred_at', { ascending: false });

  if (transactionsError) {
    return fail(`Error al obtener transacciones: ${transactionsError.message}`);
  }

  if (!transactions || transactions.length === 0) {
    // Retornar estructura vacía si no hay transacciones
    return ok({
      householdName: household.name,
      period: `${getMonthName(month)} ${year}`,
      year,
      month,
      summary: {
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        avgDailyExpense: 0,
        transactionCount: 0
      },
      balance: {
        total: 0,
        free: 0,
        activeCredits: 0,
        reservedCredits: 0
      },
      transactions: [],
      contributions: [],
      categories: [],
      csvData: 'Fecha,Tipo,Monto,Moneda,Descripción,Categoría,Usuario\n'
    });
  }

  // Obtener category_ids y user_ids únicos
  const categoryIds = [...new Set((transactions as any[]).map((t: any) => t.category_id).filter(Boolean))];
  const userIds = [...new Set((transactions as any[]).map((t: any) => t.paid_by).filter(Boolean))];

  // Obtener datos relacionados en paralelo
  const [categoriesResult, profilesResult] = await Promise.all([
    categoryIds.length > 0 ? supabase
      .from('categories')
      .select('id, name, icon, type')
      .in('id', categoryIds) : Promise.resolve({ data: [], error: null }),
    userIds.length > 0 ? supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds) : Promise.resolve({ data: [], error: null })
  ]);

  if (categoriesResult.error) {
    return fail(`Error al obtener categorías: ${categoriesResult.error.message}`);
  }
  if (profilesResult.error) {
    return fail(`Error al obtener perfiles: ${profilesResult.error.message}`);
  }

  // Crear mapas para lookups eficientes
  const categoriesMap = new Map((categoriesResult.data as any[])?.map((c: any) => [c.id, c]) || []);
  const profilesMap = new Map((profilesResult.data as any[])?.map((p: any) => [p.id, p]) || []);  // Enriquecer transacciones con datos relacionados
  const enrichedTransactions = transactions.map((transaction: any) => ({
    ...transaction,
    categories: transaction.category_id ? categoriesMap.get(transaction.category_id) : null,
    profiles: transaction.paid_by ? profilesMap.get(transaction.paid_by) : null
  }));

  // Tipar transacciones con relaciones anidadas
  type TransactionWithRelations = {
    id: string;
    occurred_at: string;
    type: 'income' | 'expense';
    amount: number;
    currency: string;
    description: string | null;
    category_id: string | null;
    paid_by: string | null;
    categories: {
      id: string;
      name: string;
      icon: string | null;
      type: string;
    } | null;
    profiles: {
      email: string;
    } | null;
  };
  const typedTransactions = enrichedTransactions as unknown as TransactionWithRelations[];  // 6. Calcular resumen financiero
  const totalIncome = typedTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = typedTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;
  const avgDailyExpense = totalExpenses / endDate.getDate();

  // 7. Obtener balance breakdown usando RPC
  const { data: balanceData, error: balanceError } = await supabase.rpc('get_balance_breakdown', {
    p_household_id: householdId
  });

  if (balanceError) {
    console.error('Error obteniendo balance breakdown:', balanceError);
  }

  // El RPC retorna un array con un solo elemento
  const balanceBreakdown = balanceData?.[0];

  // 8. Obtener contribuciones del mes
  const { data: contributions, error: contributionsError } = await supabase
    .from('contributions')
    .select(`
      id,
      profile_id,
      expected_amount,
      paid_amount,
      status
    `)
    .eq('household_id', householdId)
    .eq('year', year)
    .eq('month', month);

  if (contributionsError) {
    console.error('Error obteniendo contribuciones:', contributionsError);
  }

  // Obtener profile_ids únicos de las contribuciones
  const contributionProfileIds = [...new Set((contributions as any[])?.map((c: any) => c.profile_id).filter(Boolean) || [])];

  // Obtener perfiles y member_incomes en paralelo
  const [contributionProfilesResult, memberIncomesResult] = await Promise.all([
    contributionProfileIds.length > 0 ? supabase
      .from('profiles')
      .select('id, email')
      .in('id', contributionProfileIds) : Promise.resolve({ data: [], error: null }),
    contributionProfileIds.length > 0 ? supabase
      .from('member_incomes')
      .select('profile_id, monthly_income')
      .in('profile_id', contributionProfileIds) : Promise.resolve({ data: [], error: null })
  ]);

  // Crear mapas para lookup rápido
  const contributionProfilesMap = new Map((contributionProfilesResult.data as any[])?.map((p: any) => [p.id, p]) || []);
  const memberIncomesMap = new Map();
  (memberIncomesResult.data as any[])?.forEach((mi: any) => {
    if (!memberIncomesMap.has(mi.profile_id)) {
      memberIncomesMap.set(mi.profile_id, []);
    }
    memberIncomesMap.get(mi.profile_id).push(mi);
  });

  // Enriquecer contribuciones con datos relacionados
  const enrichedContributions = (contributions as any[])?.map((contribution: any) => ({
    ...contribution,
    profiles: contribution.profile_id ? contributionProfilesMap.get(contribution.profile_id) : null,
    member_incomes: contribution.profile_id ? (memberIncomesMap.get(contribution.profile_id) || []) : []
  })) || [];

  // Tipar contribuciones con relaciones anidadas
  type ContributionWithRelations = {
    id: string;
    profile_id: string;
    expected_amount: number | null;
    paid_amount: number;
    status: 'pending' | 'partial' | 'paid' | 'overpaid';
    profiles: {
      email: string;
    } | null;
    member_incomes: Array<{
      monthly_income: number;
    }>;
  };
  const typedContributions = enrichedContributions as unknown as ContributionWithRelations[];

  // 9. Obtener ahorro del hogar
  const { data: savings, error: savingsError } = await supabase
    .from('household_savings')
    .select(`
      current_balance,
      goal_amount,
      goal_description
    `)
    .eq('household_id', householdId)
    .single();

  if (savingsError) {
    console.error('Error obteniendo ahorro:', savingsError);
  }

  // 10. Obtener movimientos de ahorro del período
  let typedSavingsTransactions: Array<{
    created_at: string;
    type: string;
    amount: number;
    balance_after: number;
  }> = [];

  if (savings) {
    const { data: savingsTxs } = await supabase
      .from('savings_transactions')
      .select('*')
      .eq('household_id', householdId)
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .order('created_at', { ascending: false });

    typedSavingsTransactions = (savingsTxs || []) as unknown as Array<{
      created_at: string;
      type: string;
      amount: number;
      balance_after: number;
    }>;
  }  // 11. Calcular totales por categoría
  const categoryTotals = new Map<string, number>();
  typedTransactions
    .filter(t => t.type === 'expense' && t.categories)
    .forEach(t => {
      const categories = t.categories as { name: string } | null;
      const catName = categories?.name || 'Sin categoría';
      categoryTotals.set(catName, (categoryTotals.get(catName) || 0) + t.amount);
    });

  const categories = Array.from(categoryTotals.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  // 12. Construir objeto ExportData
  const exportData: ExportData = {
    householdName: household.name,
    period: `${getMonthName(month)} ${year}`,
    year,
    month,

    summary: {
      totalIncome,
      totalExpenses,
      balance,
      avgDailyExpense,
      transactionCount: typedTransactions.length
    },

    balance: {
      total: balanceBreakdown?.total_balance || 0,
      free: balanceBreakdown?.free_balance || 0,
      activeCredits: balanceBreakdown?.active_credits || 0,
      reservedCredits: balanceBreakdown?.reserved_credits || 0,
    },

    transactions: typedTransactions.map(t => {
      const categories = t.categories as { name: string } | null;
      const profiles = t.profiles as { email: string } | null;
      return {
        id: t.id,
        date: t.occurred_at,
        type: t.type as 'income' | 'expense',
        category: categories?.name || 'Sin categoría',
        amount: t.amount,
        currency: t.currency,
        description: t.description || '',
        paidBy: profiles?.email || 'Desconocido'
      };
    }),

    contributions: typedContributions.map(c => {
      const income = c.member_incomes[0]?.monthly_income || 0;
      const totalExpected = typedContributions.reduce((sum, contrib) =>
        sum + (contrib.expected_amount || 0), 0
      );
      const percentage = totalExpected > 0
        ? ((c.expected_amount || 0) / totalExpected) * 100
        : 0;

      return {
        memberName: c.profiles?.email || 'Desconocido',
        income,
        percentage,
        expected: c.expected_amount || 0,
        paid: c.paid_amount,
        status: c.status || 'pending'
      };
    }),

    savings: savings ? {
      balance: savings.current_balance,
      goal: savings.goal_amount,
      goalDescription: savings.goal_description,
      movements: typedSavingsTransactions.length,
      transactions: typedSavingsTransactions.map(t => ({
        date: t.created_at?.split('T')[0] || '',
        type: t.type,
        amount: t.amount,
        balanceAfter: t.balance_after
      }))
    } : undefined,

    categories
  };

  return ok(exportData);
}

/**
 * Convierte número de mes a nombre en español
 */
function getMonthName(month: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[month - 1] || 'Desconocido';
}
