import { getCurrentUser, getUserHouseholdId } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { DashboardEjecutivo } from './components/PeriodosPage';

export default async function PeriodsPage() {
  // Verificar autenticación
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  // Obtener household ID
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    redirect('/app/onboarding');
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Períodos y Estadísticas</h1>
          <p className="text-muted-foreground">
            Navega por los diferentes meses y revisa el histórico de gastos
          </p>
        </div>

        {/* Contenido principal */}
        <DashboardEjecutivo householdId={householdId} />

        {/* Espaciado para navegación inferior */}
        <div className="h-20"></div>
      </div>
    </div>
  );
}
