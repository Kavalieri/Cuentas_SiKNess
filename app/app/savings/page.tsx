export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import { SavingsTab } from '@/components/savings/SavingsTab';
import { getHouseholdSavings, getSavingsTransactions } from './actions';
import type { SavingsBalance, SavingsTransaction } from '@/types/savings';

export default async function SavingsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Obtener datos iniciales
  const balanceResult = await getHouseholdSavings();
  const transactionsResult = await getSavingsTransactions();

  if (!balanceResult.ok) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">{balanceResult.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Fondo de Ahorro</h1>
      
      <SavingsTab
        initialBalance={balanceResult.data as SavingsBalance}
        initialTransactions={
          transactionsResult.ok ? (transactionsResult.data as SavingsTransaction[]) : []
        }
      />
    </div>
  );
}
