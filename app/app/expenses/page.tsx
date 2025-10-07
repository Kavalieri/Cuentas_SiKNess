import { getTransactions } from '@/app/app/expenses/actions';
import { getCategories } from '@/app/app/categories/actions';
import { AddTransactionDialog } from './components/AddTransactionDialog';
import { FilterBar } from './components/FilterBar';
import { ActiveFilters } from './components/ActiveFilters';
import { TransactionsList } from './components/TransactionsList';
import { Card, CardContent } from '@/components/ui/card';

type PageProps = {
  searchParams: Promise<{
    type?: 'expense' | 'income';
    category_id?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }>;
};

export default async function ExpensesPage({ searchParams }: PageProps) {
  // Await searchParams (Next.js 15 requirement)
  const params = await searchParams;

  // Obtener Transacciones con filtros y categorías
  const [movementsResult, categoriesResult] = await Promise.all([
    getTransactions({
      type: params.type,
      categoryId: params.category_id,
      startDate: params.dateFrom,
      endDate: params.dateTo,
      search: params.search,
    }),
    getCategories(),
  ]);

  const transactions = movementsResult.ok ? movementsResult.data || [] : [];
  const categories = categoriesResult.ok ? categoriesResult.data || [] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gastos e Ingresos</h1>
          <p className="text-muted-foreground">
            {transactions.length} transaccion{transactions.length !== 1 ? 'es' : ''}
          </p>
        </div>
        {/* @ts-ignore - categories typing */}
        <AddTransactionDialog categories={categories} />
      </div>

      {/* Filtros */}
      {/* @ts-ignore - categories typing */}
      <FilterBar categories={categories} />

      {/* Filtros activos */}
      {/* @ts-ignore - categories typing */}
      <ActiveFilters categories={categories} />

      {transactions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium mb-2">No hay transacciones</p>
              <p className="text-sm">
                {params.type || params.category_id || params.dateFrom || params.dateTo || params.search
                  ? 'Intenta ajustar los filtros'
                  : 'Haz click en "+ Nuevo" para empezar'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* @ts-ignore - transactions with complex typing */
        <TransactionsList transactions={transactions} categories={categories} />
      )}
    </div>
  );
}
