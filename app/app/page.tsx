import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getUserHouseholdId } from '@/lib/supabaseServer';
import { getMonthSummary } from './expenses/actions';
import { formatCurrency } from '@/lib/format';
import Link from 'next/link';

export default async function DashboardPage() {
  // Verificar si el usuario tiene un household
  const householdId = await getUserHouseholdId();

  // Si no tiene household, redirigir a settings para crear uno
  if (!householdId) {
    redirect('/app/settings?create=true');
  }

  // Obtener el mes y año actual
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // getMonth() devuelve 0-11

  // Obtener el resumen del mes
  const summaryResult = await getMonthSummary(year, month);
  const summary = summaryResult.ok
    ? summaryResult.data
    : { expenses: 0, income: 0, balance: 0 };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600">
            Resumen de {now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link href="/app/expenses">
          <Button>+ Nuevo Movimiento</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Gastos del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary?.expenses || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {summary?.expenses ? 'Total gastado' : 'Sin movimientos aún'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Ingresos del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary?.income || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {summary?.income ? 'Total ingresado' : 'Sin movimientos aún'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                (summary?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(summary?.balance || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {summary?.balance
                ? (summary.balance >= 0 ? 'Ahorro' : 'Déficit')
                : 'Sin movimientos aún'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos Movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            No hay movimientos aún. Comienza agregando tu primer gasto o ingreso.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
