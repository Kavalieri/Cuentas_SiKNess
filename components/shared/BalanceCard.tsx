import { formatCurrency } from '@/lib/format';

interface BalanceCardProps {
  balance: number;
  income: number;
  expenses: number;
}

export function BalanceCard({ balance, income, expenses }: BalanceCardProps) {
  return (
    <div className="bg-card rounded-lg p-6 shadow-sm border">
      <h2 className="text-lg font-semibold mb-4">Balance Actual</h2>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Balance</span>
          <span className={`text-xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(balance)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Ingresos</span>
          <span className="text-green-600 font-medium">{formatCurrency(income)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Gastos</span>
          <span className="text-red-600 font-medium">{formatCurrency(expenses)}</span>
        </div>
      </div>
    </div>
  );
}
