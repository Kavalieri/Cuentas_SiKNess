import { redirect } from 'next/navigation';
import { supabaseServer, getUserHouseholdId } from '@/lib/supabaseServer';
import { getAllPeriods, getPendingPeriods } from './actions';
import { PeriodsPageContent } from './components/PeriodsPageContent';

export const metadata = {
  title: 'Períodos Mensuales | CuentasSiK',
  description: 'Gestiona y visualiza los períodos mensuales de tu hogar',
};

export default async function PeriodsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const householdId = await getUserHouseholdId();
  if (!householdId) {
    redirect('/app/household/create');
  }

  // Obtener todos los períodos
  const periodsResult = await getAllPeriods(24); // Últimos 2 años
  const periods = periodsResult.ok ? periodsResult.data || [] : [];

  // Obtener períodos pendientes
  const pendingResult = await getPendingPeriods();
  const pendingPeriods = pendingResult.ok ? pendingResult.data || [] : [];

  return (
    <PeriodsPageContent
      initialPeriods={periods}
      initialPendingPeriods={pendingPeriods}
    />
  );
}
