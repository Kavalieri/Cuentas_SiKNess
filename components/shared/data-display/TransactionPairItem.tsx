import { formatCurrency } from '@/lib/format';
import { ArrowDownLeft, ArrowUpRight, Link2 } from 'lucide-react';
type Transaction = {
  id: string;
  amount: number;
  description: string | null;
  occurred_at: string;
  performed_at?: string | null;
  flow_type: string;
  type: string;
  performed_by_profile_id?: string | null;
};

interface TransactionPairItemProps {
  expense: Transaction;
  income: Transaction;
}

export function TransactionPairItem({ expense, income }: TransactionPairItemProps) {
  return (
    <div className="flex flex-col gap-2 p-3 border-b border-border last:border-b-0 bg-orange-50/40 dark:bg-orange-950/10 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <Link2 className="h-4 w-4 text-orange-500" />
        <span className="text-xs font-semibold text-orange-700">Gasto directo emparejado</span>
      </div>
      <div className="flex gap-4">
        {/* Gasto */}
        <div className="flex-1 flex items-center gap-2">
          <ArrowDownLeft className="h-4 w-4 text-red-500" />
          <span className="font-medium text-sm">{expense.description ?? 'Sin descripción'}</span>
          <span className="text-red-600 font-bold">-{formatCurrency(expense.amount)}</span>
        </div>
        {/* Ingreso */}
        <div className="flex-1 flex items-center gap-2">
          <ArrowUpRight className="h-4 w-4 text-green-500" />
          <span className="font-medium text-sm">{income.description ?? 'Sin descripción'}</span>
          <span className="text-green-600 font-bold">+{formatCurrency(income.amount)}</span>
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>Miembro: {expense.performed_by_profile_id ?? 'N/A'}</span>
        {(() => {
          const src = expense.performed_at || expense.occurred_at;
          const d = new Date(src as string);
          return (
            <span>
              Fecha: {d.toLocaleDateString('es-ES')}
              {expense.performed_at && (
                <span className="ml-1">{d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </span>
          );
        })()}
      </div>
    </div>
  );
}
