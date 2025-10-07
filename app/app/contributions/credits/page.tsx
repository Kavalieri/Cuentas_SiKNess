import { getUserHouseholdId, supabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { CreditsContent } from './components/CreditsContent';

export default async function CreditsPage() {
  const supabase = await supabaseServer();
  const householdId = await getUserHouseholdId();

  if (!householdId) {
    redirect('/app/onboarding');
  }

  // Obtener el perfil del usuario actual
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, email')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    redirect('/app/profile');
  }

  // Verificar si es owner del household
  const { data: member } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', householdId)
    .eq('profile_id', profile.id)
    .single();

  const isOwner = member?.role === 'owner';

  // Obtener currency del household
  const { data: household } = await supabase
    .from('households')
    .select('settings')
    .eq('id', householdId)
    .single();

  const currency = (household?.settings as { currency?: string })?.currency || 'EUR';

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <CreditsContent
        currentUserProfileId={profile.id}
        isOwner={isOwner}
        currency={currency}
      />
    </div>
  );
}
