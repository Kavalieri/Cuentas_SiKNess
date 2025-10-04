import { redirect } from 'next/navigation';
import { supabaseServer, getUserHouseholdId } from '@/lib/supabaseServer';
import { isOwner } from '@/lib/adminCheck';
import DangerousClient from './DangerousClient';

export default async function DangerousPage() {
  // Verificar que el usuario es owner
  const userIsOwner = await isOwner();
  if (!userIsOwner) {
    redirect('/app/household');
  }

  // Obtener el household actual
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    redirect('/app/household/create');
  }

  // Obtener datos del household
  const supabase = await supabaseServer();
  const { data: household, error } = await supabase
    .from('households')
    .select('id, name')
    .eq('id', householdId)
    .single();

  if (error || !household) {
    redirect('/app/household');
  }

  return (
    <DangerousClient 
      householdId={household.id} 
      householdName={household.name} 
    />
  );
}
