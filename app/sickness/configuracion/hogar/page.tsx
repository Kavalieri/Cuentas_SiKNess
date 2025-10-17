import { getCurrentUser, getUserHouseholdId } from '@/lib/auth';
import { query } from '@/lib/db';
import { redirect } from 'next/navigation';
import { getHouseholdMembers, getPendingInvitations } from './actions';
import HogarMembersClient from './HogarMembersClient';

export default async function HogarPage() {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    redirect('/sickness/onboarding');
  }
  const user = await getCurrentUser();
  let isOwner = false;
  if (user && householdId) {
    // Consultar el rol del usuario en el hogar actual
    const res = await query<{ role: string }>(
      'SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2',
      [householdId, user.profile_id],
    );
    isOwner = res.rows[0]?.role === 'owner';
  }
  const rows = await getHouseholdMembers(householdId);

  // Obtener nombre del hogar y objetivo
  const householdRes = await query<{ name: string }>(
    'SELECT name FROM households WHERE id = $1',
    [householdId],
  );
  const settingsRes = await query<{
    monthly_contribution_goal: number | null;
    calculation_type: string | null;
  }>(
    'SELECT monthly_contribution_goal, calculation_type FROM household_settings WHERE household_id = $1',
    [householdId],
  );
  const householdName = householdRes.rows[0]?.name || 'Mi Hogar';
  const monthlyGoal = settingsRes.rows[0]?.monthly_contribution_goal ?? 0;
  const calculationType = settingsRes.rows[0]?.calculation_type ?? 'equal';

  // Invitaciones pendientes
  const pendingInvitations = await getPendingInvitations(householdId);

  const members = rows.map((row) => ({
    id: row.profile_id,
    email: row.email,
    displayName: row.display_name ?? null,
    role: row.role,
    income: row.current_income ?? 0,
    joinedAt: row.joined_at,
  }));

  return (
    <HogarMembersClient
      members={members}
      householdId={householdId}
      householdName={householdName}
      monthlyGoal={monthlyGoal}
      calculationType={calculationType}
      pendingInvitations={pendingInvitations}
      isOwner={isOwner}
    />
  );
}
