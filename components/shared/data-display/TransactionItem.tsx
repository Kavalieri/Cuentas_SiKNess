'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { usePrivateFormat } from '@/lib/hooks/usePrivateFormat';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/database';

type Transaction = Database['public']['Tables']['transactions']['Row'];
type Category = Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'name' | 'icon'>;
type Profile = Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'email'>;

interface TransactionItemProps {
  transaction: Transaction & {
    categories?: Category | null;
    profiles?: Profile | null;
  };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  variant?: 'compact' | 'detailed';
  showActions?: boolean;
}

export function TransactionItem({
  transaction,
  onEdit,
  onDelete,
  variant = 'detailed',
  showActions = false,
}: TransactionItemProps) {
  const { formatPrivateCurrency } = usePrivateFormat();
  
  const date = new Date(transaction.occurred_at);
  const isIncome = transaction.type === 'income';
  
  const Icon = isIncome ? ArrowUpCircle : ArrowDownCircle;
  const amountColor = isIncome 
    ? 'text-green-600 dark:text-green-400' 
    : 'text-red-600 dark:text-red-400';

  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-between py-2 border-b last:border-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Icon className={cn('h-5 w-5 shrink-0', amountColor)} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {transaction.description || 'Sin descripción'}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
              {transaction.categories && (
                <>
                  <span>•</span>
                  <span className="truncate">{transaction.categories.icon} {transaction.categories.name}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className={cn('text-sm font-semibold shrink-0', amountColor)}>
          {isIncome ? '+' : '-'}{formatPrivateCurrency(Math.abs(transaction.amount))}
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Icon className={cn('h-6 w-6 shrink-0 mt-0.5', amountColor)} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium truncate">
                  {transaction.description || 'Sin descripción'}
                </h3>
                <Badge variant={isIncome ? 'default' : 'secondary'} className="shrink-0">
                  {isIncome ? 'Ingreso' : 'Gasto'}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {date.toLocaleDateString('es-ES', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </span>
                {transaction.categories && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span>{transaction.categories.icon}</span>
                      <span>{transaction.categories.name}</span>
                    </span>
                  </>
                )}
                {transaction.profiles && (
                  <>
                    <span>•</span>
                    <span>Pagado por {transaction.profiles.email?.split('@')[0]}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className={cn('text-xl font-bold', amountColor)}>
              {isIncome ? '+' : '-'}{formatPrivateCurrency(Math.abs(transaction.amount))}
            </div>
            {showActions && onEdit && onDelete && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(transaction.id)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete(transaction.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
