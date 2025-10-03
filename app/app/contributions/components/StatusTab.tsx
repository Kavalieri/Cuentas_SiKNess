import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabaseServer } from '@/lib/supabaseServer';
import { formatCurrency } from '@/lib/format';
import { startOfMonth, endOfMonth } from 'date-fns';
import { ContributionCard } from './ContributionCard';
import { CalculateButton } from './CalculateButton';

interface StatusTabProps {
  householdId: string;
}

export async function StatusTab({ householdId }: StatusTabProps) {
  const supabase = await supabaseServer();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Obtener configuración
  const { data: settings } = await supabase
    .from('household_settings')
    .select('*')
    .eq('household_id', householdId)
    .single();

  // Obtener contribuciones del mes actual
  const { data: contributionsData } = await supabase
    .from('contributions')
    .select('*')
    .eq('household_id', householdId)
    .gte('month', monthStart.getMonth() + 1)
    .lte('month', monthEnd.getMonth() + 1)
    .eq('year', now.getFullYear());

  // Enriquecer con emails de los miembros
  const contributions = await Promise.all(
    (contributionsData || []).map(async (contrib) => {
      const { data: members } = await supabase.rpc('get_household_members', {
        p_household_id: householdId,
      });

      const member = members?.find((m) => m.user_id === contrib.user_id);

      return {
        ...contrib,
        household_members: {
          profiles: {
            email: member?.email || 'Sin email',
          },
        },
      };
    })
  );

  // Obtener gastos del mes
  const { data: expenses } = await supabase
    .from('movements')
    .select('amount')
    .eq('household_id', householdId)
    .eq('type', 'expense')
    .gte('occurred_at', monthStart.toISOString().split('T')[0])
    .lte('occurred_at', monthEnd.toISOString().split('T')[0]);

  const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;

  // Calcular totales
  const contributionsPaid = contributions?.reduce((sum, c) => sum + (c.paid_amount ?? 0), 0) ?? 0;
  const contributionsExpected = contributions?.reduce((sum, c) => sum + c.expected_amount, 0) ?? 0;

  const realBalance = contributionsPaid - totalExpenses;
  const projectedBalance = contributionsExpected - totalExpenses;

  const hasConfiguration = settings && contributionsExpected > 0;

  return (
    <div className="space-y-6">
      {!hasConfiguration && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="text-yellow-700 dark:text-yellow-300">⚠️ Configuración Pendiente</CardTitle>
            <CardDescription className="text-yellow-600 dark:text-yellow-400">
              Primero debes configurar la meta mensual y los ingresos de los miembros en la pestaña &quot;Configuración&quot;.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {hasConfiguration && (
        <>
          {/* Resumen General */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Meta Mensual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(settings.monthly_contribution_goal)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Contribuciones Pagadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(contributionsPaid)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {contributionsExpected > 0 ? ((contributionsPaid / contributionsExpected) * 100).toFixed(0) : 0}% del total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Gastos del Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Disponible</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${realBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(realBalance)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Proyectado: {formatCurrency(projectedBalance)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contribuciones por Miembro */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Contribuciones por Miembro</h3>
              {(!contributions || contributions.length === 0) && (
                <CalculateButton householdId={householdId} month={monthStart} />
              )}
            </div>

            {contributions && contributions.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {contributions.map((contribution) => (
                  <ContributionCard key={contribution.id} contribution={contribution} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <p>No hay contribuciones calculadas para este mes.</p>
                  <p className="text-sm mt-2">Haz clic en &quot;Calcular Contribuciones&quot; para generarlas.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
