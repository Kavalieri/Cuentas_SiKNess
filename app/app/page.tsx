import { cookies } from 'next/headers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getUserHouseholdId } from '@/lib/supabaseServer';
import { getMonthSummary, getMovements } from './expenses/actions';
import { getCategories } from './categories/actions';
import { getInvitationDetails, getUserPendingInvitations } from './household/invitations/actions';
import { formatCurrency } from '@/lib/format';
import { AddMovementDialog } from './expenses/components/AddMovementDialog';
import { MovementsList } from './components/MovementsList';
import { DashboardOnboarding } from './components/DashboardOnboarding';
import { PendingInvitationsCard } from './components/PendingInvitationsCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default async function DashboardPage() {
  // Verificar si el usuario tiene un household
  const householdId = await getUserHouseholdId();

  // Si el usuario no tiene hogar, mostrar onboarding
  if (!householdId) {
    // Verificar si hay un token de invitación en cookie
    const cookieStore = await cookies();
    const invitationToken = cookieStore.get('invitation_token')?.value;

    let pendingInvitation = undefined;
    if (invitationToken) {
      // Intentar obtener detalles de la invitación
      const result = await getInvitationDetails(invitationToken);
      
      if (result.ok) {
        // Invitación válida - mostrarla en el dashboard
        pendingInvitation = {
          id: result.data!.id,
          token: result.data!.token,
          household_name: result.data!.household_name,
          invited_by_email: result.data!.invited_by_email,
          expires_at: result.data!.expires_at,
          type: result.data!.type,
        };
      } else {
        // Invitación inválida (expirada/cancelada/usada) - limpiar cookie
        cookieStore.delete('invitation_token');
      }
    }

    return <DashboardOnboarding pendingInvitation={pendingInvitation} />;
  }  // Obtener el mes y año actual
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // getMonth() devuelve 0-11

  // Obtener invitaciones pendientes del usuario
  const pendingInvitationsResult = await getUserPendingInvitations();
  const pendingInvitations = pendingInvitationsResult.ok ? pendingInvitationsResult.data || [] : [];

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
      {/* Invitaciones Pendientes */}
      {pendingInvitations.length > 0 && (
        <PendingInvitationsCard invitations={pendingInvitations} />
      )}

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
