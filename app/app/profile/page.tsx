import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabaseServer, getCurrentUser, getUserHouseholdId, getUserHouseholds } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { ProfileForm } from './components/ProfileForm';
import { IncomeForm } from './components/IncomeForm';
import { HouseholdsList } from './components/HouseholdsList';
import { ProfileInvitationsCard } from './components/ProfileInvitationsCard';
import { getUserPendingInvitations } from '@/app/app/household/invitations/actions';

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const householdId = await getUserHouseholdId();
  const userHouseholds = await getUserHouseholds();
  const supabase = await supabaseServer();

  // Obtener profile_id y display_name del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  // Obtener ingreso actual (del hogar activo si existe)
  let currentIncome = 0;
  if (householdId) {
    const { data: income } = await supabase.rpc('get_member_income', {
      p_household_id: householdId,
      p_profile_id: profile.id,
      p_date: new Date().toISOString().split('T')[0],
    });
    currentIncome = (income as number) ?? 0;
  }

  // Obtener invitaciones pendientes
  const pendingInvitationsResult = await getUserPendingInvitations();
  const pendingInvitations = pendingInvitationsResult.ok ? pendingInvitationsResult.data! : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mi Perfil</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona tu información personal y configuración
        </p>
      </div>

      {/* Información Básica */}
      <Card>
        <CardHeader>
          <CardTitle>Información Básica</CardTitle>
          <CardDescription>
            Tu información de cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            email={user.email || ''}
            userId={user.id}
            displayName={profile.display_name}
          />
        </CardContent>
      </Card>

      {/* Invitaciones Pendientes */}
      <ProfileInvitationsCard invitations={pendingInvitations} />

      {/* Hogares */}
      <Card>
        <CardHeader>
          <CardTitle>🏠 Mis Hogares</CardTitle>
          <CardDescription>
            Hogares a los que perteneces y tu rol en cada uno
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HouseholdsList 
            households={userHouseholds} 
            activeHouseholdId={householdId}
          />
        </CardContent>
      </Card>

      {/* Ingresos Mensuales */}
      {householdId && (
        <Card>
          <CardHeader>
            <CardTitle>💰 Ingresos Mensuales</CardTitle>
            <CardDescription>
              Configura tu ingreso mensual para el cálculo de contribuciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IncomeForm
              householdId={householdId}
              profileId={profile.id}
              currentIncome={currentIncome}
            />
          </CardContent>
        </Card>
      )}

      {/* Info adicional */}
      <Card className="bg-muted">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-2">ℹ️ Sobre tu perfil</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Tu ingreso mensual se usa para calcular tu contribución proporcional al hogar</li>
            <li>• Solo tú y los administradores pueden ver tu ingreso</li>
            <li>• Puedes actualizar tu ingreso cuando cambie tu situación financiera</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
