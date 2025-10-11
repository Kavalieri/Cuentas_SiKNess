export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabaseServer } from '@/lib/supabaseServer';
import { Home, Users, Tag, TrendingDown, Settings } from 'lucide-react';
import SystemDetails from './components/SystemDetails';

export default async function AdminPage() {
  const supabase = await supabaseServer();

  // Obtener estadísticas globales del sistema
  const [householdsResult, membersResult, categoriesResult, transactionsResult, adminsResult, contributionsResult, adjustmentsResult] = await Promise.all([
    supabase.from('households').select('id', { count: 'exact', head: true }),
    supabase.from('household_members').select('profile_id', { count: 'exact', head: true }),
    supabase.from('categories').select('id', { count: 'exact', head: true }),
    supabase.from('transactions').select('id', { count: 'exact', head: true }),
    supabase.from('system_admins').select('user_id', { count: 'exact', head: true }),
    supabase.from('contributions').select('id', { count: 'exact', head: true }),
    supabase.from('contribution_adjustments').select('id', { count: 'exact', head: true }),
  ]);

  const stats = {
    households: householdsResult.count ?? 0,
    members: membersResult.count ?? 0,
    categories: categoriesResult.count ?? 0,
    transactions: transactionsResult.count ?? 0,
    admins: adminsResult.count ?? 0,
    contributions: contributionsResult.count ?? 0,
    adjustments: adjustmentsResult.count ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas Globales */}
      <div>
        <h2 className="text-2xl font-bold mb-4">📊 Estadísticas del Sistema</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Home className="h-4 w-4" />
                Hogares
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.households}</div>
              <p className="text-xs text-muted-foreground mt-1">Total en el sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Miembros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.members}</div>
              <p className="text-xs text-muted-foreground mt-1">Membresías activas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Categorías
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.categories}</div>
              <p className="text-xs text-muted-foreground mt-1">Total configuradas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Transacciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.transactions}</div>
              <p className="text-xs text-muted-foreground mt-1">Movimientos registrados</p>
            </CardContent>
          </Card>
        </div>

        {/* Segunda fila de estadísticas */}
        <div className="grid gap-4 md:grid-cols-3 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                System Admins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.admins}</div>
              <p className="text-xs text-muted-foreground mt-1">Administradores</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Contribuciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.contributions}</div>
              <p className="text-xs text-muted-foreground mt-1">Registros mensuales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Ajustes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.adjustments}</div>
              <p className="text-xs text-muted-foreground mt-1">Pre-pagos y ajustes</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Gestión de Entidades */}
      <div>
        <h2 className="text-2xl font-bold mb-4">🔧 Gestión de Entidades</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Hogares
              </CardTitle>
              <CardDescription>
                Ver, editar y eliminar todos los hogares del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/app/admin/households">Gestionar Hogares</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Usuarios
              </CardTitle>
              <CardDescription>
                Ver todos los usuarios y sus membresías
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/app/admin/users">Gestionar Usuarios</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Categorías
              </CardTitle>
              <CardDescription>
                Ver y gestionar categorías por hogar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/app/admin/categories">Gestionar Categorías</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Transacciones
              </CardTitle>
              <CardDescription>
                Ver y eliminar transacciones en bloque
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/app/admin/transactions">Gestionar Transacciones</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Admins del Sistema
              </CardTitle>
              <CardDescription>
                Gestionar administradores del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/app/admin/system-admins">Gestionar Admins</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detalles del Sistema */}
      <div>
        <h2 className="text-2xl font-bold mb-4">📋 Vista Detallada</h2>
        <SystemDetails />
      </div>

      {/* Herramientas de Desarrollo */}
      <div>
        <h2 className="text-2xl font-bold mb-4">🛠️ Herramientas de Desarrollo</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle>🗑️ Restaurar a Stock</CardTitle>
              <CardDescription>
                Elimina TODOS los datos y fuerza re-onboarding a todos los usuarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="destructive">
                <Link href="/app/admin/tools/restore-stock">Restaurar Sistema</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-yellow-500">
            <CardHeader>
              <CardTitle>⚠️ Limpiar Datos de Prueba</CardTitle>
              <CardDescription>
                Elimina datos de testing de hogares específicos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/app/admin/wipe">Limpiar Datos</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
