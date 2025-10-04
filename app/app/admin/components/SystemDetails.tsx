import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

interface SystemDetailsProps {
  supabase: SupabaseClient<Database>;
}

export default async function SystemDetails({ supabase }: SystemDetailsProps) {
  // Obtener últimos hogares
  const { data: recentHouseholds } = await supabase
    .from('households')
    .select('id, name, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  // Obtener últimas transacciones
  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select(`
      id, 
      type, 
      amount, 
      currency, 
      occurred_at,
      household_id,
      households!inner(name)
    `)
    .order('occurred_at', { ascending: false })
    .limit(10);

  // Obtener system admins
  const { data: systemAdmins } = await supabase
    .from('system_admins')
    .select('user_id, created_at, notes')
    .order('created_at', { ascending: false });

  // Obtener emails de admins (desde auth)
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  
  const adminsWithEmails = (systemAdmins ?? []).map((admin) => {
    const user = authUsers?.users.find((u) => u.id === admin.user_id);
    return {
      email: user?.email ?? 'Desconocido',
      created_at: admin.created_at,
      notes: admin.notes,
    };
  });

  // Obtener últimos miembros agregados (por ID, no hay created_at en household_members)
  const { data: recentMembers } = await supabase
    .from('household_members')
    .select(`
      profile_id,
      household_id,
      role,
      households!inner(name),
      profiles!inner(display_name, email)
    `)
    .order('household_id', { ascending: false })
    .limit(10);

  // Obtener categorías (sin RPC, query directo)
  const { data: categoriesData } = await supabase
    .from('categories')
    .select('id, name, type, household_id, households!inner(name)')
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <Tabs defaultValue="households" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="households">Hogares</TabsTrigger>
        <TabsTrigger value="transactions">Transacciones</TabsTrigger>
        <TabsTrigger value="members">Miembros</TabsTrigger>
        <TabsTrigger value="admins">Admins</TabsTrigger>
        <TabsTrigger value="categories">Categorías</TabsTrigger>
      </TabsList>

      <TabsContent value="households" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Últimos 5 Hogares Creados</CardTitle>
            <CardDescription>
              Hogares más recientes en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentHouseholds && recentHouseholds.length > 0 ? (
              <div className="space-y-3">
                {recentHouseholds.map((household) => (
                  <div
                    key={household.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{household.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ID: {household.id}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {household.created_at
                          ? new Date(household.created_at).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Fecha desconocida'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No hay hogares en el sistema</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="transactions" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Últimas 10 Transacciones</CardTitle>
            <CardDescription>
              Movimientos más recientes en todos los hogares
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions && recentTransactions.length > 0 ? (
              <div className="space-y-2">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={transaction.type === 'expense' ? 'destructive' : 'default'}>
                        {transaction.type === 'expense' ? '💸' : '💰'}
                      </Badge>
                      <div>
                        <p className="font-medium">
                          {new Intl.NumberFormat('es-ES', {
                            style: 'currency',
                            currency: transaction.currency,
                          }).format(transaction.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(transaction.households as any)?.name ?? 'Hogar desconocido'}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.occurred_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No hay transacciones registradas</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="members" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Últimos 10 Miembros Agregados</CardTitle>
            <CardDescription>
              Membresías más recientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentMembers && recentMembers.length > 0 ? (
              <div className="space-y-2">
                {recentMembers.map((member, idx) => (
                  <div
                    key={`${member.profile_id}-${member.household_id}-${idx}`}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {(member.profiles as any)?.display_name ?? (member.profiles as any)?.email ?? 'Usuario desconocido'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(member.households as any)?.name ?? 'Hogar desconocido'} • {member.role === 'owner' ? '👑 Owner' : '👥 Member'}
                      </p>
                    </div>
                    <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                      {member.role === 'owner' ? 'Owner' : 'Member'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No hay miembros registrados</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="admins" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>System Admins ({adminsWithEmails.length})</CardTitle>
            <CardDescription>
              Administradores del sistema con acceso total
            </CardDescription>
          </CardHeader>
          <CardContent>
            {adminsWithEmails.length > 0 ? (
              <div className="space-y-3">
                {adminsWithEmails.map((admin, idx) => (
                  <div
                    key={`${admin.email}-${idx}`}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {admin.email}
                        {admin.email === process.env.NEXT_PUBLIC_SYSTEM_ADMIN_EMAIL && (
                          <Badge variant="secondary">Permanente</Badge>
                        )}
                      </p>
                      {admin.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {admin.notes}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {admin.created_at
                        ? new Date(admin.created_at).toLocaleDateString('es-ES')
                        : 'Fecha desconocida'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No hay administradores configurados</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="categories" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Categorías del Sistema</CardTitle>
            <CardDescription>
              Primeras 10 categorías registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoriesData && categoriesData.length > 0 ? (
              <div className="space-y-2">
                {categoriesData.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm"
                  >
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(category.households as any)?.name ?? 'Hogar desconocido'}
                      </p>
                    </div>
                    <Badge variant={category.type === 'expense' ? 'destructive' : 'default'}>
                      {category.type === 'expense' ? 'Gasto' : 'Ingreso'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No hay categorías configuradas</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
