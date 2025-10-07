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
      paid_by,
      categories(name),
      profiles!transactions_paid_by_fkey(email)
    `)
    .eq('household_id', householdId)
    .gte('occurred_at', startISO)
    .lte('occurred_at', endISO)
    .order('occurred_at', { ascending: false });
  
  if (transactionsError) {
    return fail(`Error al obtener transacciones: ${transactionsError.message}`);
  }
  
  // 6. Calcular resumen financiero
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = transactions
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
      status,
      profiles!contributions_profile_id_fkey(email),
      member_incomes!inner(monthly_income)
    `)
    .eq('household_id', householdId)
    .eq('year', year)
    .eq('month', month);
  
  if (contributionsError) {
    console.error('Error obteniendo contribuciones:', contributionsError);
  }
  
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
  let savingsTransactions = null;
  if (savings) {
    const { data: savingsTxs } = await supabase
      .from('savings_transactions')
      .select('*')
      .eq('household_id', householdId)
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .order('created_at', { ascending: false });
    
    savingsTransactions = savingsTxs;
  }
  
  // 11. Calcular totales por categoría
  const categoryTotals = new Map<string, number>();
  transactions
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
      transactionCount: transactions.length
    },
    
    balance: {
      total: balanceBreakdown?.total_balance || 0,
      free: balanceBreakdown?.free_balance || 0,
      activeCredits: balanceBreakdown?.active_credits || 0,
      reservedCredits: balanceBreakdown?.reserved_credits || 0,
    },
    
    transactions: transactions.map(t => {
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
    
    contributions: contributions?.map(c => {
      const memberIncomes = c.member_incomes as unknown;
      const profiles = c.profiles as { email: string } | null;
      const income = (memberIncomes as Array<{ monthly_income: number }> | null)?.[0]?.monthly_income || 0;
      const totalExpected = contributions.reduce((sum, contrib) => 
        sum + (contrib.expected_amount || 0), 0
      );
      const percentage = totalExpected > 0 
        ? ((c.expected_amount || 0) / totalExpected) * 100 
        : 0;
      
      return {
        memberName: profiles?.email || 'Desconocido',
        income,
        percentage,
        expected: c.expected_amount || 0,
        paid: c.paid_amount,
        status: (c.status as 'pending' | 'partial' | 'paid' | 'overpaid') || 'pending'
      };
    }) || [],
    
    savings: savings ? {
      balance: savings.current_balance,
      goal: savings.goal_amount,
      goalDescription: savings.goal_description,
      movements: savingsTransactions?.length || 0,
      transactions: savingsTransactions?.map(t => ({
        date: t.created_at?.split('T')[0] || '',
        type: t.type,
        amount: t.amount,
        balanceAfter: t.balance_after
      })) || []
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
