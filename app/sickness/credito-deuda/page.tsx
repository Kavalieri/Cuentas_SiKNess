import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getHouseholdMembersBalance } from '@/lib/balance/actions';
import { cn } from '@/lib/utils';
import { CheckCircle, Users } from 'lucide-react';
import Link from 'next/link';
import { MemberBalanceCard } from './_components/MemberBalanceCard';

export const dynamic = 'force-dynamic';

/**
 * Página de Balance Global del Hogar (Créditos/Deudas)
 *
 * IMPORTANTE: Esta página muestra balance GLOBAL ACUMULADO, NO por período.
 * - Balance persiste entre períodos (créditos/deudas acumuladas)
 * - Se actualiza mediante préstamos personales entre miembros
 * - Para contribuciones mensuales, ver /app/sickness/periodo
 */
export default async function BalancePage() {
  const balancesRes = await getHouseholdMembersBalance();

  if (!balancesRes.ok) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <div className="text-destructive">Error: {balancesRes.message}</div>
      </div>
    );
  }

  if (!balancesRes.data) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <div className="text-destructive">Error: No se pudieron obtener los datos</div>
      </div>
    );
  }

  const { members, summary } = balancesRes.data;

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* ===== HEADER ===== */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Créditos y Deudas</h1>
        <p className="text-muted-foreground">
          Balance individual acumulado · Saldo personal de cada miembro con el hogar
        </p>
      </div>

      {/* ===== ESTADÍSTICAS GLOBALES ===== */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resumen de Saldos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Créditos a Favor</p>
              <p className="text-2xl font-bold text-green-600">
                €{summary.total_credits.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.members_with_credit} miembro(s)
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Deudas Pendientes</p>
              <p
                className={cn(
                  'text-2xl font-bold',
                  summary.total_debts < 0.01 ? 'text-green-600' : 'text-red-600',
                )}
              >
                €{summary.total_debts.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.members_with_debt} miembro(s)
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Estado del Balance</p>
              <div className="flex items-center gap-2">
                {Math.abs(summary.total_credits - summary.total_debts) < 0.01 ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <p className="text-2xl font-bold text-green-600">Balanceado</p>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <p className="text-2xl font-bold text-green-600">
                      Excedente: €{Math.abs(summary.total_credits - summary.total_debts).toFixed(2)}
                    </p>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {members.filter((m) => m.current_balance >= -0.01).length} miembro(s) al día
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== TARJETAS DE BALANCE POR MIEMBRO ===== */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Balance por Miembro</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {members.map((member) => (
            <MemberBalanceCard key={member.profile_id} member={member} />
          ))}
        </div>
      </div>

      {/* ===== ACCIONES GLOBALES ===== */}
      <Card>
        <CardHeader>
          <CardTitle>Mis Acciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/sickness/credito-deuda/solicitar-prestamo">
              <Button>Solicitar Préstamo</Button>
            </Link>
            <Link href="/sickness/credito-deuda/devolver-prestamo">
              <Button variant="secondary">Devolver Préstamo</Button>
            </Link>
            <Link href="/sickness/credito-deuda/historial-prestamos">
              <Button variant="outline">Ver Historial de Préstamos</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
