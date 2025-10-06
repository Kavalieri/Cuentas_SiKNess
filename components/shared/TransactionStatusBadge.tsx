import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';

export type TransactionStatus = 'draft' | 'pending' | 'confirmed' | 'locked';

interface TransactionStatusBadgeProps {
  status: TransactionStatus;
}

const statusConfig: Record<
  TransactionStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: { label: 'Borrador', variant: 'outline' },
  pending: { label: 'Pendiente', variant: 'secondary' },
  confirmed: { label: 'Confirmado', variant: 'default' },
  locked: { label: 'Cerrado', variant: 'destructive' },
};

export function TransactionStatusBadge({ status }: TransactionStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant={config.variant} className="gap-1">
      {status === 'locked' && <Lock className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
