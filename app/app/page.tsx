import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getUserHouseholdId } from '@/lib/supabaseServer';
import { getMonthSummary, getMovements } from './expenses/actions';
import { getCategories } from './categories/actions';
import { formatCurrency } from '@/lib/format';
import { AddMovementDialog } from './expenses/components/AddMovementDialog';
import { MovementsList } from './components/MovementsList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default async function DashboardPage() {
  // Verificar si el usuario tiene un household
  const householdId = await getUserHouseholdId();

  // Si no tiene household, redirigir a onboarding
  if (!householdId) {
    redirect('/app/onboarding');
  }

  // Obtener el mes y año actual
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // getMonth() devuelve 0-11

  // Obtener datos en paralelo
  const [summaryResult, movementsResult, categoriesResult] = await Promise.all([
    getMonthSummary(year, month),
    getMovements(),
    getCategories(),
  ]);

  const summary = summaryResult.ok
    ? summaryResult.data
    : { expenses: 0, income: 0, balance: 0 };

  const allMovements = movementsResult.ok ? movementsResult.data || [] : [];
  const categories = categoriesResult.ok ? categoriesResult.data || [] : [];

  // Filtrar movimientos por tipo
  const expenseMovements = allMovements.filter((m) => {
    const movement = m as Record<string, unknown>;
    return movement.type === 'expense';
  });

  const incomeMovements = allMovements.filter((m) => {
    const movement = m as Record<string, unknown>;
    return movement.type === 'income';
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen de {now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        {/* @ts-ignore - categories typing */}
        <AddMovementDialog categories={categories} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gastos del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary?.expenses || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.expenses ? 'Total gastado' : 'Sin movimientos aún'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ingresos del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary?.income || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.income ? 'Total ingresado' : 'Sin movimientos aún'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                (summary?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(summary?.balance || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.balance
                ? (summary.balance >= 0 ? 'Ahorro' : 'Déficit')
                : 'Sin movimientos aún'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="expenses">Gastos</TabsTrigger>
          <TabsTrigger value="income">Ingresos</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Todos los Movimientos</CardTitle>
              <CardDescription>
                Historial completo de gastos e ingresos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* @ts-ignore - complex movements typing */}
              <MovementsList movements={allMovements} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gastos</CardTitle>
              <CardDescription>
                Todos tus gastos registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* @ts-ignore - complex movements typing */}
              <MovementsList movements={expenseMovements} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ingresos</CardTitle>
              <CardDescription>
                Todos tus ingresos registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* @ts-ignore - complex movements typing */}
              <MovementsList movements={incomeMovements} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
