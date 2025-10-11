export const dynamic = 'force-dynamic';

import { supabaseServer } from '@/lib/supabaseServer';
import SystemAdminsClientPage from './SystemAdminsClient';

interface Admin {
  profile_id: string;
  granted_by: string | null;
  created_at: string;
  notes: string | null;
}

interface Profile {
  id: string;
  email: string;
}

export default async function SystemAdminsPage() {
  const supabase = await supabaseServer();

  // Obtener todos los admins con detalles de los usuarios
  const { data: admins, error } = await supabase
    .from('system_admins')
    .select('profile_id, granted_by, created_at, notes')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="text-destructive">
        Error al cargar administradores: {error.message}
      </div>
    );
  }

  // Obtener emails de los perfiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email');

  const adminsWithEmails = ((admins as unknown as Admin[]) ?? []).map((admin) => {
    // Buscar el perfil por profile_id
    const profile = (profiles as unknown as Profile[])?.find((p) => p.id === admin.profile_id);
    const grantedByProfile = admin.granted_by
      ? (profiles as unknown as Profile[])?.find((p) => p.id === admin.granted_by)
      : null;

    return {
      profile_id: admin.profile_id,
      email: profile?.email ?? 'Email desconocido',
      created_at: admin.created_at ?? new Date().toISOString(),
      granted_by: admin.granted_by,
      granted_by_email: grantedByProfile?.email ?? null,
      notes: admin.notes,
      // Admin permanente configurado en variable de entorno
      is_permanent: profile?.email === process.env.NEXT_PUBLIC_SYSTEM_ADMIN_EMAIL,
    };
  });

  return <SystemAdminsClientPage admins={adminsWithEmails} />;
}
