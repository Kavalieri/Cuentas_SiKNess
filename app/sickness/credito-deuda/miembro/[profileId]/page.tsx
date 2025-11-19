import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getMemberBalanceHistory } from '@/lib/balance/getMemberBalanceHistory';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar, CheckCircle, TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const MONTH_NAMES = [
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

const PHASE_LABELS: Record<string, string> = {
  preparing: 'Preparación',
  validation: 'Validación',
  active: 'Activo',
  closing: 'Cerrando',
  closed: 'Cerrado',
};

const STATUS_LABELS: Record<string, string> = {
  settled: 'Saldado',
  pending: 'Pendiente',
  overpaid: 'Sobrepago',
  disabled: 'Sin contribución',
};

/**
 * Página de Historial de Balance por Miembro
 *
 * Muestra período por período cómo se generó el balance actual:
 * - Contribución esperada vs pagada
 * - Balance del período (overpaid - pending)
 * - Balance acumulado (running balance)
 */
export default async function MemberBalanceHistoryPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;

  const historyRes = await getMemberBalanceHistory(profileId);

  if (!historyRes.ok) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <div className="text-destructive">Error: {historyRes.message}</div>
      </div>
    );
  }

  if (!historyRes.data) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <div className="text-destructive">Error: No se pudieron obtener los datos</div>
      </div>
    );
  }

  const { member, current_balance, history } = historyRes.data;

  const EPSILON = 0.01;
  const absBalance = Math.abs(current_balance);
  const isSettled = Math.abs(current_balance) < EPSILON;
  const isCredit = current_balance >= EPSILON;
  const isDebt = current_balance <= -EPSILON;

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {/* Botón Volver */}
      <Link href="/sickness/credito-deuda">
        <Button variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Dashboard
        </Button>
      </Link>

      {/* Balance del Miembro */}
      <Card
        className={cn(
          'border-2',
          isCredit && 'border-green-500',
          isDebt && 'border-red-500',
          isSettled && 'border-green-500/30',
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
            {isCredit && <TrendingUp className="h-8 w-8 text-green-600" />}
            {isDebt && <TrendingDown className="h-8 w-8 text-red-600" />}
            {isSettled && <CheckCircle className="h-8 w-8 text-green-600" />}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Balance Principal */}
          <div className="text-center p-6 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Balance Global Acumulado</p>
            <p
              className={cn(
                'text-5xl font-bold mb-2',
                isSettled && 'text-green-600',
                isDebt && 'text-red-600',
                isCredit && 'text-green-600',
              )}
            >
              {isSettled ? '€0.00' : `€${absBalance.toFixed(2)}`}
            </p>
            <Badge
              variant={isCredit ? 'default' : isDebt ? 'destructive' : 'secondary'}
              className={cn('text-base px-4 py-1', isSettled && 'bg-green-600')}
            >
              {isCredit && 'Crédito a favor'}
              {isDebt && 'Deuda pendiente'}
              {isSettled && 'Al día'}
            </Badge>
          </div>

          {/* Descripción */}
          <div className="text-sm text-muted-foreground text-center">
            {isCredit && (
              <p>
                Has aportado{' '}
                <span className="font-semibold text-green-600">€{absBalance.toFixed(2)} más</span>{' '}
                de lo esperado. Este crédito se mantendrá acumulado hasta que se utilice o se salde.
              </p>
            )}
            {isDebt && (
              <p>
                Tienes una deuda pendiente de{' '}
                <span className="font-semibold text-red-600">€{absBalance.toFixed(2)}</span>. Puedes
                saldarla realizando un ingreso a la cuenta común.
              </p>
            )}
            {isSettled && (
              <p>
                Tus contribuciones están al día. Has pagado exactamente lo esperado en todos los
                períodos.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Historial Período por Período */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historial de Balance por Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-center">Fase</TableHead>
                  <TableHead className="text-right">Esperado</TableHead>
                  <TableHead className="text-right">Pagado</TableHead>
                  <TableHead className="text-right">Sobrepago</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                  <TableHead className="text-right">Balance Período</TableHead>
                  <TableHead className="text-right font-bold">Balance Acumulado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No hay períodos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((entry) => {
                    const periodName = `${MONTH_NAMES[entry.period.month - 1]} ${
                      entry.period.year
                    }`;
                    const phaseLabel = PHASE_LABELS[entry.period.phase] || entry.period.phase;

                    // Normalizar valores muy pequeños a 0 para evitar -0.00
                    const periodBalance = Math.abs(entry.period_balance) < EPSILON ? 0 : entry.period_balance;
                    const runningBalance = Math.abs(entry.running_balance) < EPSILON ? 0 : entry.running_balance;

                    const isPeriodPositive = periodBalance > EPSILON;
                    const isPeriodNegative = periodBalance < -EPSILON;
                    const isPeriodZero = Math.abs(periodBalance) < EPSILON;

                    const isRunningPositive = runningBalance > EPSILON;
                    const isRunningNegative = runningBalance < -EPSILON;
                    const isRunningZero = Math.abs(runningBalance) < EPSILON;

                    return (
                      <TableRow key={entry.period.id}>
                        <TableCell className="font-medium">{periodName}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">
                            {phaseLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.period.contribution_disabled ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            `€${entry.contribution.expected_amount.toFixed(2)}`
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.period.contribution_disabled ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            `€${entry.contribution.paid_amount.toFixed(2)}`
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.contribution.overpaid_amount > EPSILON ? (
                            <span className="text-green-600 font-semibold">
                              €{entry.contribution.overpaid_amount.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">€0.00</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.contribution.pending_amount > EPSILON ? (
                            <span className="text-red-600 font-semibold">
                              €{entry.contribution.pending_amount.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">€0.00</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              'font-semibold',
                              isPeriodPositive && 'text-green-600',
                              isPeriodNegative && 'text-red-600',
                              isPeriodZero && 'text-muted-foreground',
                            )}
                          >
                            {isPeriodPositive && '+'}€{periodBalance.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              'font-bold text-base',
                              isRunningPositive && 'text-green-600',
                              isRunningNegative && 'text-red-600',
                              isRunningZero && 'text-green-600',
                            )}
                          >
                            {isRunningPositive && '+'}€{runningBalance.toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Leyenda */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
            <h4 className="font-semibold">Leyenda:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>
                <span className="font-semibold text-foreground">Esperado:</span> Contribución
                mensual calculada según ingresos y método del hogar
              </li>
              <li>
                <span className="font-semibold text-foreground">Pagado:</span> Gastos directos +
                Ingresos comunes realizados
              </li>
              <li>
                <span className="font-semibold text-foreground">Sobrepago:</span> Pagaste más de lo
                esperado (genera crédito)
              </li>
              <li>
                <span className="font-semibold text-foreground">Pendiente:</span> Pagaste menos de
                lo esperado (genera deuda)
              </li>
              <li>
                <span className="font-semibold text-foreground">Balance Período:</span> Sobrepago -
                Pendiente (resultado del mes)
              </li>
              <li>
                <span className="font-semibold text-foreground">Balance Acumulado:</span> Suma de
                todos los balances desde el inicio
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
