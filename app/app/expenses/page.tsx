import { getTransactions } from '@/app/app/expenses/actions';
import { getCategories } from '@/app/app/categories/actions';
import { AddTransactionDialog } from './components/AddTransactionDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';

export default async function ExpensesPage() {
  // Obtener Transacciones y categorías
  const [movementsResult, categoriesResult] = await Promise.all([
    getTransactions(),
    getCategories(),
  ]);

  const transactions = movementsResult.ok ? movementsResult.data || [] : [];
  const categories = categoriesResult.ok ? categoriesResult.data || [] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transacciones</h1>
          <p className="text-gray-600">Todos tus gastos e ingresos</p>
        </div>
        {/* @ts-ignore - categories typing */}
        <AddTransactionDialog categories={categories} />
      </div>

      {transactions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium mb-2">
                No hay Transacciones registrados
              </p>
              <p className="text-sm">
                Haz click en &quot;+ Nuevo transacción&quot; para empezar
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* @ts-ignore - transactions with complex typing */}
          {transactions.map((movement) => {
            const m = movement as Record<string, unknown>;
            const categories = m.categories as Record<string, unknown> | null;
            
            return (
              <Card key={m.id as string}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">
                        {/* @ts-ignore - categories icon typing */}
                        {categories?.icon || (m.type === 'expense' ? '💸' : '💰')}
                      </div>
                      <div>
                        <p className="font-medium">
                          {(categories?.name as string) || 'Sin categoría'}
                        </p>
                        {m.note ? (
                          <p className="text-sm text-gray-500">{m.note as string}</p>
                        ) : null}
                        <p className="text-xs text-gray-400">
                          {new Date(m.occurred_at as string).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            timeZone: 'Europe/Madrid',
                          })}
                          {(m.created_at as string | undefined) && (
                            <span className="ml-2">
                              •{' '}
                              {new Date(m.created_at as string).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Europe/Madrid',
                              })}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-xl font-bold ${
                          m.type === 'expense' ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {m.type === 'expense' ? '-' : '+'}
                        {formatCurrency(m.amount as number, m.currency as string)}
                      </p>
                      <Badge variant={m.type === 'expense' ? 'destructive' : 'default'}>
                        {m.type === 'expense' ? 'Gasto' : 'Ingreso'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
