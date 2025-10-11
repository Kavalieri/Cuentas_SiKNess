export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { getCurrentUser, getUserHouseholds, getUserHouseholdId } from '@/lib/supabaseServer';
import { SettingsTabs } from './components/SettingsTabs';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  // Obtener todos los hogares del usuario (usando RPC optimizada)
  const households = await getUserHouseholds();
  const activeHouseholdId = await getUserHouseholdId();

  // Si no tiene household, redirigir a onboarding
  if (households.length === 0) {
    redirect('/app/onboarding');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">
          Gestiona tu cuenta y hogares
        </p>
      </div>

      <SettingsTabs
        user={{
          email: user.email || '',
          profile_id: user.profile_id,
        }}
        households={households}
        activeHouseholdId={activeHouseholdId}
      />
    </div>
  );
}
