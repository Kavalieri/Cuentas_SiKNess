import { Badge } from '@/components/ui/badge';
import { query } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import type { Database } from '@/types/database';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'] | null;
  profiles?: Database['public']['Tables']['profiles']['Row'] | null;
  profile?: {
    display_name: string;
    avatar_url: string | null;
  } | null;
};

interface RecentTransactionsProps {
  householdId: string;
  limit?: number;
}

async function getRecentTransactions(
  householdId: string,
  limit: number = 5,
): Promise<Transaction[]> {
  const result = await query<Transaction>(
    `
    SELECT * FROM transactions
    WHERE household_id = $1
    ORDER BY occurred_at DESC, created_at DESC
    LIMIT $2
    `,
    [householdId, limit],
  );

  return result.rows;
}

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const isIncome = transaction.type === 'income' || transaction.type === 'income_direct';
  const amount = isIncome ? transaction.amount : -transaction.amount;

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
            {new Date(transaction.occurred_at).toLocaleDateString('es-ES')}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p className={`font-medium ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
          {isIncome ? '+' : ''}
          {formatCurrency(amount)}
        </p>
        <Badge variant="outline" className="text-xs">
          {transaction.flow_type === 'direct' ? 'Directo' : 'Común'}
        </Badge>
      </div>
    </div>
  );
}

export async function RecentTransactions({ householdId, limit = 5 }: RecentTransactionsProps) {
  const transactions = await getRecentTransactions(householdId, limit);

  if (transactions.length === 0) {
    return (
      <div className="bg-card rounded-lg p-6 shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">Transacciones Recientes</h2>
        <p className="text-muted-foreground text-center py-8">No hay transacciones recientes</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm border">
      <h2 className="text-lg font-semibold mb-4">Transacciones Recientes</h2>

      <div className="space-y-0">
        {transactions.map((transaction) => (
          <TransactionItem key={transaction.id} transaction={transaction} />
        ))}
      </div>
    </div>
  );
}
