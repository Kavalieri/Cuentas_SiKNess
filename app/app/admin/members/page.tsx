import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabaseServer } from '@/lib/supabaseServer';
import { getCurrentHouseholdId } from '@/lib/adminCheck';
import { MembersList } from './components/MembersList';
import { InviteMemberDialog } from './components/InviteMemberDialog';

export default async function AdminMembersPage() {
  const householdId = await getCurrentHouseholdId();

  if (!householdId) {
    return <div>No perteneces a ningún hogar.</div>;
  }

  const supabase = await supabaseServer();

  // Obtener miembros del hogar con sus ingresos
  const { data: membersData } = await supabase.rpc('get_household_members', {
    p_household_id: householdId,
  });

  // Enriquecer con ingresos actuales
  const members = await Promise.all(
    (membersData || []).map(async (member) => {
      const { data: income } = await supabase.rpc('get_member_income', {
        p_household_id: householdId,
        p_profile_id: member.profile_id,
        p_date: new Date().toISOString().split('T')[0],
      });

      return {
        id: member.id,
        profile_id: member.profile_id,
        email: member.email || 'Sin email',
        role: member.role,
        currentIncome: (income as number) ?? 0,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Miembros</h1>
          <p className="text-muted-foreground mt-1">
            Administra los miembros de tu hogar
          </p>
        </div>
        <InviteMemberDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Miembros del Hogar</CardTitle>
          <CardDescription>
            Lista de todos los miembros con sus roles e ingresos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MembersList members={members} householdId={householdId} />
        </CardContent>
      </Card>
    </div>
  );
}
