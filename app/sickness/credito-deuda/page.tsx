import { PeriodSelector } from '@/components/balance/PeriodSelector';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getHouseholdMembersBalance } from '@/lib/balance/actions';
import { cn } from '@/lib/utils';
import { CheckCircle, TrendingDown, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function BalancePage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string };
}) {
  const year = searchParams.year ? Number(searchParams.year) : undefined;
  const month = searchParams.month ? Number(searchParams.month) : undefined;

  const balancesRes = await getHouseholdMembersBalance(year, month);

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

  const { members, household_total, period_info } = balancesRes.data;

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* ===== HEADER CON SELECTOR DE PERIODO ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Balance del Hogar
          </h1>
          <p className="text-muted-foreground mt-1">
            {period_info.month_name} {period_info.year}
          </p>
        </div>
        <PeriodSelector />
      </div>

      {/* ===== RESUMEN GLOBAL DEL HOGAR ===== */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resumen del Periodo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Aportación Esperada Total</p>
              <p className="text-2xl font-bold">€{household_total.expected_total.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Aportado</p>
              <p className="text-2xl font-bold text-blue-600">
                €{household_total.paid_total.toFixed(2)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pendiente Total</p>
              <p
                className={cn(
                  'text-2xl font-bold',
                  household_total.pending_total === 0 && 'text-green-600',
                  household_total.pending_total > 0 && 'text-red-600',
                  household_total.pending_total < 0 && 'text-green-600',
                )}
              >
                €{household_total.pending_total.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== TARJETAS DE BALANCE POR MIEMBRO ===== */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Balance por Miembro</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {members.map((member: typeof members[0]) => (
            <Card
              key={member.profile_id}
              className={cn(
                'transition-all hover:shadow-lg',
                member.balance.status === 'credit' && 'border-green-500/50',
                member.balance.status === 'pending' && 'border-red-500/50',
                member.balance.status === 'settled' && 'border-gray-500/50',
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback>
                        {member.display_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-lg">{member.display_name}</p>
                      {member.role === 'owner' && (
                        <Badge variant="secondary" className="mt-1">
                          Administrador
                        </Badge>
                      )}
                    </div>
                  </div>
                  {member.balance.status === 'credit' && (
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  )}
                  {member.balance.status === 'pending' && (
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  )}
                  {member.balance.status === 'settled' && (
                    <CheckCircle className="h-6 w-6 text-gray-600" />
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Balance Principal */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Balance:</p>
                  <div className="flex items-baseline gap-2">
                    <p
                      className={cn(
                        'text-3xl font-bold',
                        member.balance.pending === 0 && 'text-gray-600',
                        member.balance.pending > 0 && 'text-red-600',
                        member.balance.pending < 0 && 'text-green-600',
                      )}
                    >
                      €{Math.abs(member.balance.pending).toFixed(2)}
                    </p>
                    <Badge
                      variant={
                        member.balance.status === 'credit'
                          ? 'default'
                          : member.balance.status === 'pending'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {member.balance.status === 'credit' && 'Crédito a favor'}
                      {member.balance.status === 'pending' && 'Pendiente'}
                      {member.balance.status === 'settled' && 'Al día'}
                    </Badge>
                  </div>
                </div>

                {/* Desglose Compacto */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Esperado</p>
                    <p className="text-lg font-semibold">€{member.balance.expected.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Aportado</p>
                    <p className="text-lg font-semibold text-blue-600">
                      €{member.balance.paid.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Botón Ver Detalle */}
                <Link href={`/app/sickness/credito-deuda/miembro/${member.profile_id}`}>
                  <Button variant="outline" className="w-full mt-4">
                    Ver Detalle Completo
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ===== ACCIONES RÁPIDAS (PERSONALES) ===== */}
      <Card>
        <CardHeader>
          <CardTitle>Mis Acciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/app/sickness/credito-deuda/solicitar-prestamo">
              <Button>Solicitar Préstamo</Button>
            </Link>
            <Link href="/app/sickness/credito-deuda/devolver-prestamo">
              <Button variant="secondary">Devolver Préstamo</Button>
            </Link>
            <Link href="/app/sickness/credito-deuda/mi-historial">
              <Button variant="outline">Mi Historial</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
