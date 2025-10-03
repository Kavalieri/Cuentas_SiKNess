import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCategories } from '@/app/app/categories/actions';
import { AddCategoryDialog } from '@/app/app/categories/components/AddCategoryDialog';
import { CategoryItem } from '@/app/app/categories/components/CategoryItem';

export async function CategoriesTab() {
  const expensesResult = await getCategories('expense');
  const incomesResult = await getCategories('income');

  const expenseCategories = expensesResult.ok ? (expensesResult.data as Array<{ id: string; name: string; icon: string | null; type: string }>) : [];
  const incomeCategories = incomesResult.ok ? (incomesResult.data as Array<{ id: string; name: string; icon: string | null; type: string }>) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Categorías del Hogar</h2>
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

      <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
        <p className="font-semibold mb-2">💡 Acerca de las categorías:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Las categorías por defecto se crean automáticamente al crear el hogar</li>
          <li>Puedes agregar nuevas categorías personalizadas</li>
          <li>Cada hogar tiene sus propias categorías independientes</li>
          <li>Las categorías se usan para clasificar tus movimientos</li>
        </ul>
      </div>
    </div>
  );
}
