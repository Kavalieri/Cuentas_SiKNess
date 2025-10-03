import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabaseServer } from '@/lib/supabaseServer';
import { formatDate } from '@/lib/format';
import { Users, Mail, Calendar, Home, Shield } from 'lucide-react';

export default async function UsersPage() {
  // Verificar que el usuario actual es admin
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="text-destructive">No autenticado</div>;
  }

  const { data: isAdmin } = await supabase
    .from('system_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single();

  if (!isAdmin) {
    return <div className="text-destructive">Acceso denegado</div>;
  }

  // Usar cliente admin para operaciones de administración
  const adminClient = supabaseAdmin();

  // Obtener todos los usuarios de auth.users con sus membresías
  const { data: users, error: usersError } = await adminClient.auth.admin.listUsers();

  if (usersError) {
    return (
      <div className="text-destructive">
        Error al cargar usuarios: {usersError.message}
      </div>
    );
  }

  // Para cada usuario, obtener sus membresías y si es admin
  const usersWithDetails = await Promise.all(
    users.users.map(async (user) => {
      const [membershipsResult, adminResult] = await Promise.all([
        adminClient
          .from('household_members')
          .select(`
            household_id,
            role,
            households (
              name
            )
          `)
          .eq('user_id', user.id),
        adminClient
          .from('system_admins')
          .select('user_id')
          .eq('user_id', user.id)
          .single(),
      ]);

      return {
        id: user.id,
        email: user.email ?? 'Sin email',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        memberships: membershipsResult.data ?? [],
        is_system_admin: !adminResult.error && !!adminResult.data,
      };
    })
  );

  // Ordenar: admins primero, luego por fecha de creación
  const sortedUsers = usersWithDetails.sort((a, b) => {
    if (a.is_system_admin && !b.is_system_admin) return -1;
    if (!a.is_system_admin && b.is_system_admin) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Usuarios del Sistema
          </h1>
          <p className="text-muted-foreground mt-1">
            Listado completo de todos los usuarios registrados
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-lg px-4 py-2">
            {sortedUsers.length} usuarios
          </Badge>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {sortedUsers.filter((u) => u.is_system_admin).length} admins
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        {sortedUsers.map((user) => (
          <Card key={user.id} className={user.is_system_admin ? 'border-green-500' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {user.email}
                    {user.is_system_admin && (
                      <Badge variant="default" className="bg-green-600">
                        <Shield className="h-3 w-3 mr-1" />
                        System Admin
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Registrado: {formatDate(new Date(user.created_at))}
                    </span>
                    {user.last_sign_in_at && (
                      <span className="text-xs">
                        Último login: {formatDate(new Date(user.last_sign_in_at))}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {user.memberships.length} hogar(es)
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Membresías */}
              {user.memberships.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Membresías:</div>
                  <div className="flex flex-wrap gap-2">
                    {user.memberships.map((membership: { household_id: string; role: string | null; households: { name: string } | null }) => (
                      <Badge key={membership.household_id} variant="secondary">
                        <Home className="h-3 w-3 mr-1" />
                        {membership.households?.name ?? 'Sin nombre'}
                        {membership.role === 'owner' && ' (Owner)'}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Sin hogares asignados
                </div>
              )}

              {/* ID del usuario */}
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded font-mono truncate mt-3">
                {user.id}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sortedUsers.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No hay usuarios registrados en el sistema</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
