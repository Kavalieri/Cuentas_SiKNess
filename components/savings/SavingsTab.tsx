'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/format';
import { usePrivateFormat } from '@/lib/hooks/usePrivateFormat';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PiggyBank, TrendingUp, ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft } from 'lucide-react';
import { DepositModal } from './DepositModal';
import { WithdrawModal } from './WithdrawModal';
import { TransferCreditModal } from './TransferCreditModal';
import type { SavingsBalance, SavingsTransaction } from '@/types/savings';

type Props = {
  initialBalance: SavingsBalance | undefined;
  initialTransactions: SavingsTransaction[];
};

export function SavingsTab({ initialBalance, initialTransactions }: Props) {
  const router = useRouter();
  const { formatPrivateCurrency } = usePrivateFormat();
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  const balance = initialBalance?.current_balance ?? 0;
  const goal = initialBalance?.goal_amount ?? null;
  const deadline = initialBalance?.goal_deadline;
  const progress = goal ? (balance / goal) * 100 : 0;

  const handleSuccess = () => {
    router.refresh();
  };

  const getTypeBadge = (type: SavingsTransaction['type']) => {
    switch (type) {
      case 'deposit':
        return <Badge className="bg-green-500">Depósito</Badge>;
      case 'withdrawal':
        return <Badge variant="destructive">Retiro</Badge>;
      case 'transfer_from_credit':
        return <Badge className="bg-blue-500">Transferencia</Badge>;
      case 'interest':
        return <Badge className="bg-purple-500">Interés</Badge>;
      case 'adjustment':
        return <Badge variant="outline">Ajuste</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.RelativeTimeFormat('es', { numeric: 'auto' }).format(
      Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Actual</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatPrivateCurrency(balance)}</div>
          </CardContent>
        </Card>

        {goal && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Meta de Ahorro</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(goal)}</div>
                {deadline && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Fecha límite: {new Date(deadline).toLocaleDateString('es-ES')}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Progreso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{progress.toFixed(1)}%</div>
                <div className="w-full bg-secondary rounded-full h-2 mt-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Botones de Acción */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setDepositModalOpen(true)} className="gap-2">
          <ArrowDownToLine className="h-4 w-4" />
          Depositar
        </Button>
        <Button
          variant="destructive"
          onClick={() => setWithdrawModalOpen(true)}
          className="gap-2"
        >
          <ArrowUpFromLine className="h-4 w-4" />
          Retirar
        </Button>
        <Button variant="outline" onClick={() => setTransferModalOpen(true)} className="gap-2">
          <ArrowRightLeft className="h-4 w-4" />
          Transferir Crédito
        </Button>
      </div>

      {/* Lista de Transacciones */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          {initialTransactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay transacciones de ahorro aún. ¡Realiza tu primer depósito!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Balance</TableHead>
                    <TableHead className="hidden sm:table-cell">Miembro</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{getTypeBadge(tx.type)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{tx.description || 'Sin descripción'}</p>
                          {tx.category && (
                            <Badge variant="outline" className="text-xs">
                              {tx.category}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            tx.type === 'withdrawal' ? 'text-destructive' : 'text-green-600'
                          }
                        >
                          {tx.type === 'withdrawal' ? '-' : '+'}
                          {formatPrivateCurrency(tx.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(tx.balance_before)} → {formatCurrency(tx.balance_after)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {tx.source_profile?.display_name || 'Sistema'}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(tx.created_at)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      <DepositModal
        open={depositModalOpen}
        onOpenChange={setDepositModalOpen}
        onSuccess={handleSuccess}
      />
      <WithdrawModal
        open={withdrawModalOpen}
        onOpenChange={setWithdrawModalOpen}
        onSuccess={handleSuccess}
        currentBalance={balance}
      />
      <TransferCreditModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
