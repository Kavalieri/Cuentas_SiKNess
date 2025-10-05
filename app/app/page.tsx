import { cookies } from 'next/headers';
import { getUserHouseholdId } from '@/lib/supabaseServer';
import { getMonthSummary, getTransactions, getCategoryExpenses, getMonthComparison } from './expenses/actions';
import { getCategories } from './categories/actions';
import { getInvitationDetails, getUserPendingInvitations } from './household/invitations/actions';
import { DashboardOnboarding } from './components/DashboardOnboarding';
import { PendingInvitationsCard } from './components/PendingInvitationsCard';
import { DashboardContent } from './components/DashboardContent';

export default async function DashboardPage() {
  // Verificar si el usuario tiene un household
  const householdId = await getUserHouseholdId();

  // Si el usuario no tiene hogar, mostrar onboarding
  if (!householdId) {
    // PRIMERO: Buscar invitaciones pendientes en la base de datos por email
    const pendingInvitationsResult = await getUserPendingInvitations();
    let pendingInvitation = undefined;

    if (pendingInvitationsResult.ok && pendingInvitationsResult.data && pendingInvitationsResult.data.length > 0) {
      // Usar la primera invitación pendiente encontrada
      const inv = pendingInvitationsResult.data[0];
      if (inv) {
        pendingInvitation = {
          id: inv.id,
          token: inv.token,
          household_name: inv.household_name,
          invited_by_email: inv.invited_by_email,
          expires_at: inv.expires_at,
          type: inv.type,
        };
      }
    }

    // FALLBACK: Si no se encontró en DB, verificar cookie
    if (!pendingInvitation) {
      const cookieStore = await cookies();
      const invitationToken = cookieStore.get('invitation_token')?.value;

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
    }

    return <DashboardOnboarding pendingInvitation={pendingInvitation} />;
  }  // Obtener el mes y año actual
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // getMonth() devuelve 0-11

  // Calcular rango de fechas del mes
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  // Obtener invitaciones pendientes del usuario
  const pendingInvitationsResult = await getUserPendingInvitations();
  const pendingInvitations = pendingInvitationsResult.ok ? pendingInvitationsResult.data || [] : [];

  // Obtener datos en paralelo
  const [summaryResult, transactionsResult, categoriesResult, categoryExpensesResult, comparisonResult] = await Promise.all([
    getMonthSummary(year, month),
    getTransactions(),
    getCategories(),
    getCategoryExpenses({ startDate, endDate }),
    getMonthComparison({ currentMonth: `${year}-${month.toString().padStart(2, '0')}` }),
  ]);

  const summary = summaryResult.ok
    ? summaryResult.data!
    : { expenses: 0, income: 0, balance: 0 };

  const allTransactions = transactionsResult.ok ? (transactionsResult.data || []) : [];
  const categories = categoriesResult.ok ? (categoriesResult.data || []) : [];
  const categoryExpenses = categoryExpensesResult.ok ? (categoryExpensesResult.data || []) : [];
  const comparison = comparisonResult.ok ? comparisonResult.data : undefined;

  return (
    <div className="space-y-8">
      {/* Invitaciones Pendientes */}
      {pendingInvitations.length > 0 && (
        <PendingInvitationsCard invitations={pendingInvitations} />
      )}

      <DashboardContent
        initialCategories={categories as never[]}
        initialTransactions={allTransactions as never[]}
        initialSummary={summary}
        initialCategoryExpenses={categoryExpenses as never[]}
        initialComparison={comparison as never}
      />
    </div>
  );
}
