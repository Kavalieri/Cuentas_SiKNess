export const dynamic = 'force-dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCategories } from './actions';
import { AddCategoryDialog } from './components/AddCategoryDialog';
import { CategoryItem } from './components/CategoryItem';

export default async function CategoriesPage() {
  const expensesResult = await getCategories('expense');
  const incomesResult = await getCategories('income');

  const expenseCategories = expensesResult.ok ? (expensesResult.data as Array<{ id: string; name: string; icon: string | null; type: string }>) : [];
  const incomeCategories = incomesResult.ok ? (incomesResult.data as Array<{ id: string; name: string; icon: string | null; type: string }>) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categorías</h1>
          <p className="text-muted-foreground">Organiza tus gastos e ingresos por categorías</p>
        </div>
        <AddCategoryDialog />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Categorías de Gastos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Categorías de Gastos</CardTitle>
              <Badge variant="secondary">{expenseCategories.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {expenseCategories.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay categorías de gastos configuradas aún.
              </p>
            ) : (
              <div className="space-y-2">
                {expenseCategories.map((category) => (
                  <CategoryItem key={category.id} category={category} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Categorías de Ingresos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Categorías de Ingresos</CardTitle>
              <Badge variant="secondary">{incomeCategories.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {incomeCategories.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay categorías de ingresos configuradas aún.
              </p>
            ) : (
              <div className="space-y-2">
                {incomeCategories.map((category) => (
                  <CategoryItem key={category.id} category={category} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
