import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { getCurrentUser, getUserHouseholdId } from '@/lib/supabaseServer';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle,
  Clock,
  DollarSign,
  HandHeart,
  History,
} from 'lucide-react';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export default async function ContribucionPage() {
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

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      {/* Header con título */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Contribución</h1>
        <p className="text-muted-foreground">
          Gestiona los ingresos del hogar y calcula las contribuciones mensuales
        </p>
      </div>

      <Suspense fallback={<div>Cargando datos de contribución...</div>}>
        <ContribucionContent householdId={householdId} />
      </Suspense>

      {/* Bottom Padding para evitar overlap con bottom nav */}
      <div className="h-20"></div>
    </div>
  );
}

async function ContribucionContent({ householdId }: { householdId: string }) {
  // Importar supabase para consultas reales
  const { supabaseServer } = await import('@/lib/supabaseServer');
  const supabase = await supabaseServer();

  // Obtener fecha actual
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // 1. Obtener configuración del hogar
  const { data: settings } = await supabase
    .from('household_settings')
    .select('*')
    .eq('household_id', householdId)
    .single();

  const monthlyGoal = settings?.monthly_contribution_goal ?? 0;
  const _calculationType = settings?.calculation_type || 'proportional'; // Para futuro uso

  // 2. Obtener miembros del hogar con sus ingresos
  const { data: membersData } = await supabase.rpc('get_household_members', {
    p_household_id: householdId,
  });

  interface MemberRaw {
    id: string;
    profile_id: string;
    email: string | null;
    role: string;
  }

  const typedMembersData = (membersData as unknown as MemberRaw[]) ?? [];

  // 3. Enriquecer miembros con ingresos actuales
  const membersWithIncomes = await Promise.all(
    typedMembersData.map(async (member) => {
      const { data: income } = await supabase.rpc('get_member_income', {
        p_household_id: householdId,
        p_profile_id: member.profile_id,
        p_date: new Date().toISOString().split('T')[0],
      });

      return {
        profile_id: member.profile_id,
        nombre: member.email || 'Sin email',
        email: member.email || 'Sin email',
        role: member.role as 'owner' | 'member',
        ingresos: (income as number) ?? 0,
      };
    }),
  );

  // 4. Obtener contribuciones del mes actual
  const { data: contributions } = await supabase
    .from('contributions')
    .select('*')
    .eq('household_id', householdId)
    .eq('year', currentYear)
    .eq('month', currentMonth);

  // Definir tipo para contribuciones
  interface Contribution {
    id: string;
    profile_id: string;
    expected_amount: number;
    paid_amount: number;
    status: string;
  }

  const typedContributions = (contributions || []) as Contribution[];

  const contributionsMap = new Map(typedContributions.map((c) => [c.profile_id, c]));

  // 5. Calcular totales
  const totalIngresos = membersWithIncomes.reduce((sum, m) => sum + (m.ingresos || 0), 0);
  const totalContribuciones = typedContributions.reduce(
    (sum: number, c: Contribution) => sum + (c.expected_amount || 0),
    0,
  );

  // 6. Determinar estado del período
  const hayContribuciones = typedContributions && typedContributions.length > 0;
  const todasPagadas =
    hayContribuciones &&
    typedContributions.every((c: Contribution) => c.paid_amount >= (c.expected_amount || 0));
  const estadoContribucion = todasPagadas ? 'completado' : 'pendiente';

  // 7. Preparar datos para la interfaz
  const miembrosConContribuciones = membersWithIncomes.map((miembro) => {
    const contribucion = contributionsMap.get(miembro.profile_id);
    return {
      ...miembro,
      contribucion: contribucion?.expected_amount || 0,
      pagado: contribucion?.paid_amount || 0,
      estado: contribucion?.status || 'pending',
    };
  });

  // Formatear período actual
  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  const periodoActual = `${meses[currentMonth - 1]} ${currentYear}`;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Estado del Período */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Período Actual</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold">{periodoActual}</div>
            <Badge variant={estadoContribucion === 'pendiente' ? 'secondary' : 'default'}>
              {estadoContribucion === 'pendiente' ? 'Pendiente' : 'Completado'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Ingresos Totales */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold">{formatCurrency(totalIngresos)}</div>
            <p className="text-xs text-muted-foreground">Suma de todos los ingresos del hogar</p>
          </div>
        </CardContent>
      </Card>

      {/* Contribución Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Contribución Total</CardTitle>
          <HandHeart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold">{formatCurrency(totalContribuciones)}</div>
            <p className="text-xs text-muted-foreground">Calculado automáticamente</p>
          </div>
        </CardContent>
      </Card>

      {/* Miembros del Hogar */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Desglose por Miembro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {miembrosConContribuciones.map((miembro, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-1">
                  <div className="font-medium">{miembro.nombre}</div>
                  <div className="text-sm text-muted-foreground">
                    Ingresos: {formatCurrency(miembro.ingresos)}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="font-semibold">{formatCurrency(miembro.contribucion)}</div>
                  <div className="text-xs text-muted-foreground">
                    {miembro.estado === 'paid' ? 'Pagado' : 'Pendiente'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Estado de Contribución */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Estado</CardTitle>
          {estadoContribucion === 'pendiente' ? (
            <AlertCircle className="h-4 w-4 text-orange-500" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-lg font-semibold">
              {estadoContribucion === 'pendiente' ? 'Pendiente' : 'Completado'}
            </div>
            <p className="text-xs text-muted-foreground">
              {hayContribuciones
                ? 'Con descuentos de gastos directos'
                : 'Contribuciones no configuradas'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Historial */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial de Contribuciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay historial disponible</p>
          </div>
        </CardContent>
      </Card>

      {/* Mensaje de estado */}
      <Card
        className={`md:col-span-2 lg:col-span-3 ${
          !hayContribuciones
            ? 'border-dashed border-orange-500 bg-orange-50 dark:bg-orange-950/20'
            : 'border-dashed border-primary/50'
        }`}
      >
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            {!hayContribuciones ? (
              <>
                <div className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  ⚠️ Configuración Pendiente
                </div>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  {monthlyGoal === 0
                    ? 'Configura la meta mensual de contribución en el sistema principal'
                    : totalIngresos === 0
                    ? 'Configura los ingresos de los miembros del hogar'
                    : 'Calcula las contribuciones del mes para comenzar'}
                </p>
              </>
            ) : (
              <>
                <div className="text-sm font-medium">✅ Sistema Activo</div>
                <p className="text-xs text-muted-foreground">
                  Gestión completa de contribuciones con cálculo automático y descuentos por gastos
                  directos.
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
