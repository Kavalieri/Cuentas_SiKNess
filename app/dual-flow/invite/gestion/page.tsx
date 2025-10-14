import { InviteManager } from '@/app/dual-flow/invite/components/InviteManager';
import { getCurrentUser, getUserHouseholdId } from '@/lib/auth';
import { query } from '@/lib/db';
import { checkDualFlowAccess } from '@/lib/featureFlags';
import { redirect } from 'next/navigation';

export default async function DualFlowInviteManagerPage() {
  // Verificar autenticación
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  // Verificar acceso al sistema dual-flow
  const accessCheck = await checkDualFlowAccess(user.email!);
  if (!accessCheck.hasAccess) {
    redirect('/app/app');
  }

  // Obtener hogar activo del usuario
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    redirect('/dual-flow');
  }

  // Verificar que sea owner del hogar
  const isOwnerQuery = await query(
    'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
    [householdId, user.id],
  );

  if (isOwnerQuery.rows.length === 0 || isOwnerQuery.rows[0]?.role !== 'owner') {
    redirect('/dual-flow');
  }

  // Obtener nombre del hogar
  const householdQuery = await query('SELECT name FROM households WHERE id = $1', [householdId]);
  const householdName = householdQuery.rows[0]?.name || 'Hogar';

  return (
    <div className="container mx-auto p-6">
      <InviteManager householdId={householdId} householdName={householdName} />
    </div>
  );
}
