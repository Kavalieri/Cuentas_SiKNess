"use client";
import { Badge } from '@/components/ui/badge';
import { formatCurrency, toNumber } from '@/lib/format';
import type { Categories, Profiles, Transactions } from '@/types/database.generated';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TransactionPairItem } from './data-display/TransactionPairItem';

type Transaction = Transactions & {
  categories?: Categories | null;
  profiles?: Profiles | null;
  profile?: {
    display_name: string;
    avatar_url: string | null;
  } | null;
};

interface RecentTransactionsProps {
  householdId: string;
  limit?: number;
  flowType?: 'all' | 'common' | 'direct';
  year?: number;
  month?: number;
  memberId?: string;
  categoryId?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

async function fetchRecentTransactions(
  householdId: string,
  limit = 5,
  flowType: 'all' | 'common' | 'direct' = 'all',
  year?: number,
  month?: number,
  memberId?: string,
  categoryId?: string,
  startDate?: string,
  endDate?: string,
) {
  const params = new URLSearchParams({ householdId, limit: String(limit), flowType });
  if (year && month) {
    params.set('year', String(year));
    params.set('month', String(month));
  }
  if (memberId) params.set('memberId', memberId);
  if (categoryId) params.set('categoryId', categoryId);
  if (startDate && endDate) {
    params.set('startDate', startDate);
    params.set('endDate', endDate);
  }
  const res = await fetch(`/api/transactions/recent?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Error al cargar transacciones');
  const data = await res.json();
  return data.transactions as Transaction[];
}

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const isIncome = transaction.type === 'income' || transaction.type === 'income_direct';
  const amount = isIncome ? toNumber(transaction.amount) : -toNumber(transaction.amount);

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-full ${
            isIncome ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          }`}
        >
          {isIncome ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
        </div>
        <div>
          <p className="font-medium text-sm">{transaction.description}</p>
          <p className="text-xs text-muted-foreground">
            {(() => {
              const src = transaction.performed_at || transaction.occurred_at;
              const d = new Date(String(src));
              return (
                <>
                  {d.toLocaleDateString('es-ES')}
                  {transaction.performed_at && (
                    <span className="ml-1">{d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                </>
              );
            })()}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p className={`font-medium ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
          {isIncome ? '+' : ''}
          {formatCurrency(amount)}
        </p>
        <Badge variant="outline" className="text-xs">
          {String(transaction.flow_type) === 'direct' ? 'Directo' : 'Común'}
        </Badge>
      </div>
    </div>
  );
}

const RecentTransactions = ({ householdId, limit = 5, flowType = 'all', year, month, memberId, categoryId, startDate, endDate }: RecentTransactionsProps) => {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRecentTransactions(householdId, limit, flowType, year, month, memberId, categoryId, startDate, endDate)
      .then((txs) => {
        if (!cancelled) setTransactions(txs);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Error');
      });
    return () => {
      cancelled = true;
    };
  }, [householdId, limit, flowType, year, month, memberId, categoryId, startDate, endDate]);

  if (error) {
    return (
      <div className="bg-card rounded-lg p-6 shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">Transacciones Recientes</h2>
        <p className="text-destructive text-center py-8">{error}</p>
      </div>
    );
  }

  if (!transactions) {
    return (
      <div className="bg-card rounded-lg p-6 shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">Transacciones Recientes</h2>
        <p className="text-muted-foreground text-center py-8">Cargando…</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-card rounded-lg p-6 shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">Transacciones Recientes</h2>
        <p className="text-muted-foreground text-center py-8">No hay transacciones recientes</p>
      </div>
    );
  }

  // Agrupar pares de transacciones directas
  const pairs: Record<string, { expense?: Transaction; income?: Transaction }> = {};
  const singles: Transaction[] = [];
  transactions.forEach(tx => {
    if (String(tx.flow_type) === 'direct' && tx.transaction_pair_id) {
      if (!pairs[String(tx.transaction_pair_id)]) pairs[String(tx.transaction_pair_id)] = {};
      const pair = pairs[String(tx.transaction_pair_id)];
      if (pair) {
        if (tx.type === 'expense' || tx.type === 'expense_direct') pair.expense = tx;
        if (tx.type === 'income' || tx.type === 'income_direct') pair.income = tx;
      }
    } else {
      singles.push(tx);
    }
  });

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm border">
      <h2 className="text-lg font-semibold mb-4">Transacciones Recientes</h2>
      <div className="space-y-0">
        {/* Mostrar pares directos */}
        {Object.values(pairs).map((pair) =>
          pair.expense && pair.income ? (
            <TransactionPairItem
              key={String(pair.expense.id) + '-' + String(pair.income.id)}
              expense={pair.expense}
              income={pair.income}
            />
          ) : null
        )}
        {/* Mostrar transacciones individuales */}
        {singles.map((transaction) => (
          <TransactionItem key={String(transaction.id)} transaction={transaction} />
        ))}
      </div>
    </div>
  );
};

export default RecentTransactions;
