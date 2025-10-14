import { getCurrentUser, getUserHouseholdId, query } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { HouseholdConfigPage } from './components/HouseholdConfigPage';

export default async function HogarPage() {
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

  // Obtener información del hogar
  const householdResult = await query('SELECT id, name, created_at FROM households WHERE id = $1', [
    householdId,
  ]);

  if (householdResult.rows.length === 0) {
    redirect('/app/onboarding');
  }

  const household = householdResult.rows[0];

  // Obtener miembros del hogar
  const membersResult = await query(
    `SELECT
       hm.profile_id,
       hm.role,
       hm.joined_at,
       p.display_name,
       p.email
     FROM household_members hm
     JOIN profiles p ON hm.profile_id = p.id
     WHERE hm.household_id = $1
     ORDER BY hm.role DESC, hm.joined_at ASC`,
    [householdId],
  );

  const members = membersResult.rows.map((row) => ({
    profile_id: row.profile_id,
    role: row.role,
    joined_at: row.joined_at,
    display_name: row.display_name || 'Sin nombre',
    email: row.email || '',
  }));

  // Verificar que el hogar existe
  if (!household) {
    redirect('/app/onboarding');
  }

  // Mapear household a la interfaz correcta
  const householdData = {
    id: household.id,
    name: household.name,
    created_at: household.created_at,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Configuración del Hogar</h1>
          <p className="text-muted-foreground">
            Gestiona la configuración, objetivos y miembros de tu hogar
          </p>
        </div>

        {/* Contenido principal */}
        <HouseholdConfigPage
          household={householdData}
          members={members}
          currentUserId={currentUser.profile_id}
        />

        {/* Espaciado para navegación inferior */}
        <div className="h-20"></div>
      </div>
    </div>
  );
}
