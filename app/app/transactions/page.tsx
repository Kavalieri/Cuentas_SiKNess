import { getUserHouseholdId } from '@/lib/supabaseServer';
import { getTransactions } from '@/app/app/expenses/actions';
import { getCategories } from '@/app/app/categories/actions';
import { redirect } from 'next/navigation';
import { TransactionsContent } from './components/TransactionsContent';

export default async function TransactionsPage() {
  const householdId = await getUserHouseholdId();

  if (!householdId) {
    redirect('/app/onboarding');
  }

  // Obtener todas las transacciones y categorías
  const [transactionsResult, categoriesResult] = await Promise.all([
    getTransactions(),
    getCategories(),
  ]);

  const transactions = transactionsResult.ok ? (transactionsResult.data || []) : [];
  const categories = categoriesResult.ok ? (categoriesResult.data || []) : [];

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <TransactionsContent
        initialTransactions={transactions as never[]}
        categories={categories as never[]}
      />
    </div>
  );
}
