import { supabaseServer } from '@/lib/supabaseServer';
import SystemAdminsClientPage from './SystemAdminsClient';

export default async function SystemAdminsPage() {
  const supabase = await supabaseServer();

  // Obtener todos los admins con detalles de los usuarios
  const { data: admins, error } = await supabase
    .from('system_admins')
    .select('user_id, granted_by, created_at, notes')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="text-destructive">
        Error al cargar administradores: {error.message}
      </div>
    );
  }

  // Obtener emails de los usuarios
  const { data: users } = await supabase.auth.admin.listUsers();

  const adminsWithEmails = (admins ?? []).map((admin) => {
    const user = users?.users.find((u) => u.id === admin.user_id);
    const grantedByUser = admin.granted_by
      ? users?.users.find((u) => u.id === admin.granted_by)
      : null;

    return {
      user_id: admin.user_id,
      email: user?.email ?? 'Email desconocido',
      created_at: admin.created_at ?? new Date().toISOString(),
      granted_by: admin.granted_by,
      granted_by_email: grantedByUser?.email ?? null,
      notes: admin.notes,
      is_permanent: user?.email === 'caballeropomes@gmail.com',
    };
  });

  return <SystemAdminsClientPage admins={adminsWithEmails} />;
}
