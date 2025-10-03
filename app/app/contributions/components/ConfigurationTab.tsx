import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabaseServer } from '@/lib/supabaseServer';
import { GoalForm } from './GoalForm';
import { IncomesSection } from './IncomesSection';

interface ConfigurationTabProps {
  householdId: string;
}

export async function ConfigurationTab({ householdId }: ConfigurationTabProps) {
  const supabase = await supabaseServer();

  // Obtener configuración actual del hogar
  const { data: settings } = await supabase
    .from('household_settings')
    .select('*')
    .eq('household_id', householdId)
    .single();

  // Obtener miembros del hogar
  const { data: membersData } = await supabase.rpc('get_household_members', {
    p_household_id: householdId,
  });

  // Obtener ingresos de cada miembro
  const membersWithIncomes = await Promise.all(
    (membersData || []).map(async (member) => {
      // Obtener ingreso actual
      const { data: income } = await supabase.rpc('get_member_income', {
        p_household_id: householdId,
        p_user_id: member.user_id,
        p_date: new Date().toISOString().split('T')[0],
      });

      return {
        user_id: member.user_id,
        role: member.role,
        email: member.email || 'Sin email',
        currentIncome: (income as number) ?? 0,
      };
    })
  );

  return (
    <div className="space-y-6">
      {/* Sección 1: Fondo Mensual */}
      <Card>
        <CardHeader>
          <CardTitle>💰 Fondo Mensual del Hogar</CardTitle>
          <CardDescription>
            Establece el fondo de partida mensual. Este es el dinero que aportáis entre todos al inicio de cada mes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoalForm
            householdId={householdId}
            currentGoal={settings?.monthly_contribution_goal ?? 0}
            currency={settings?.currency ?? 'EUR'}
          />
        </CardContent>
      </Card>

      {/* Sección 2: Ingresos de Miembros */}
      <Card>
        <CardHeader>
          <CardTitle>💵 Ingresos Individuales</CardTitle>
          <CardDescription>
            Configura el ingreso mensual de cada miembro para calcular contribuciones proporcionales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IncomesSection householdId={householdId} members={membersWithIncomes} />
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-muted">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-2">💡 ¿Cómo funciona el fondo mensual?</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li><strong>Inicio del mes:</strong> Define el fondo de partida (ej: 2000€)</li>
            <li><strong>Configura ingresos:</strong> Cada miembro indica sus ingresos mensuales</li>
            <li><strong>Aportación proporcional:</strong> El sistema calcula cuánto debe aportar cada uno según su capacidad</li>
            <li><strong>Marcar aportaciones:</strong> Cada miembro marca cuando ha realizado su transferencia</li>
            <li><strong>Gestionar gastos:</strong> Durante el mes se registran los gastos que reducen el fondo</li>
            <li><strong>Fin de mes:</strong> Lo que sobra es vuestro ahorro conjunto</li>
          </ol>
          <div className="mt-4 p-3 bg-background rounded border text-sm">
            <strong>Ejemplo práctico:</strong>
            <ul className="mt-2 space-y-1">
              <li>• Fondo mensual: 2000€</li>
              <li>• Miembro A gana 1500€ → aporta 750€ al inicio (37.5%)</li>
              <li>• Miembro B gana 2500€ → aporta 1250€ al inicio (62.5%)</li>
              <li>• Gastos del mes: 1800€</li>
              <li>• <strong>Ahorro:</strong> 200€ para el mes siguiente</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
