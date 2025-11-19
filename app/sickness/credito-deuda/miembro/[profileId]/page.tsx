import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getMemberBalance } from '@/lib/balance/actions';
import { cn } from '@/lib/utils';
import { ArrowLeft, CheckCircle, TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: { profileId: string };
  searchParams: { year?: string; month?: string };
}) {
  const year = searchParams.year ? Number(searchParams.year) : undefined;
  const month = searchParams.month ? Number(searchParams.month) : undefined;

  const balanceRes = await getMemberBalance(params.profileId, year, month);

  if (!balanceRes.ok) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="text-destructive">Error: {balanceRes.message}</div>
      </div>
    );
  }

  if (!balanceRes.data) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="text-destructive">Error: No se pudieron obtener los datos del miembro</div>
      </div>
    );
  }

  const member = balanceRes.data;

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      {/* Botón Volver */}
      <Link href="/app/sickness/credito-deuda">
        <Button variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Dashboard
        </Button>
      </Link>

      {/* Balance del Miembro */}
      <Card
        className={cn(
          'border-2',
          member.balance.status === 'credit' && 'border-green-500',
          member.balance.status === 'pending' && 'border-red-500',
          member.balance.status === 'settled' && 'border-gray-500',
        )}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <Avatar className="h-16 w-16">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className="text-xl">
                  {member.display_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl">{member.display_name}</h2>
                {member.role === 'owner' && (
                  <Badge variant="secondary" className="mt-1">
                    Administrador
                  </Badge>
                )}
              </div>
            </CardTitle>
            {member.balance.status === 'credit' && (
              <TrendingUp className="h-8 w-8 text-green-600" />
            )}
            {member.balance.status === 'pending' && (
              <TrendingDown className="h-8 w-8 text-red-600" />
            )}
            {member.balance.status === 'settled' && (
              <CheckCircle className="h-8 w-8 text-gray-600" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Balance Principal */}
          <div className="text-center p-6 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Balance Actual</p>
            <p
              className={cn(
                'text-5xl font-bold mb-2',
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
              className="text-base px-4 py-1"
            >
              {member.balance.status === 'credit' && 'Crédito a favor'}
              {member.balance.status === 'pending' && 'Pendiente de pago'}
              {member.balance.status === 'settled' && 'Al día'}
            </Badge>
          </div>

          {/* Desglose Detallado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Aportación Esperada</p>
                <p className="text-3xl font-bold mt-1">€{member.balance.expected.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Aportado</p>
                <p className="text-3xl font-bold mt-1 text-blue-600">
                  €{member.balance.paid.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Información Adicional */}
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <p className="text-sm">
              <strong>Nota:</strong> El balance se calcula considerando las aportaciones esperadas y
              los gastos directos realizados durante el periodo.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Historial de Transacciones (Placeholder - Issue #62) */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            El historial detallado de transacciones se implementará en la siguiente fase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
