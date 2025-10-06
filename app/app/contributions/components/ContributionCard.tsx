'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { markContributionAsPaid, markContributionAsUnpaid } from '@/app/app/contributions/actions';
import { toast } from 'sonner';
import { CheckCircle2, Circle } from 'lucide-react';

interface ContributionCardProps {
  contribution: {
    id: string;
    user_id: string;
    expected_amount: number;
    paid_amount: number;
    status: string;
    household_members: {
      profiles: {
        email: string;
      };
    };
  };
}

export function ContributionCard({ contribution }: ContributionCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const isPaid = contribution.status === 'paid' || contribution.status === 'overpaid';
  const percentage = contribution.expected_amount > 0 
    ? (contribution.paid_amount / contribution.expected_amount) * 100 
    : 0;

  const handleTogglePaid = async () => {
    setIsLoading(true);

    const result = isPaid
      ? await markContributionAsUnpaid(contribution.id)
      : await markContributionAsPaid(contribution.id);

    setIsLoading(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(isPaid ? 'Marcada como no pagada' : 'Marcada como pagada');
    router.refresh(); // ⭐ Recargar datos instantáneamente
  };

  const statusConfig = {
    pending: { label: 'Pendiente', color: 'bg-yellow-500' },
    partial: { label: 'Parcial', color: 'bg-blue-500' },
    paid: { label: 'Pagado', color: 'bg-green-500' },
    overpaid: { label: 'Sobrepagado', color: 'bg-purple-500' },
  };

  const status = statusConfig[contribution.status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold">{contribution.household_members.profiles.email}</p>
              <Badge variant="outline" className={`mt-1 ${status.color} text-white`}>
                {status.label}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Contribución</p>
              <p className="text-2xl font-bold">{formatCurrency(contribution.expected_amount)}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progreso</span>
              <span className="font-medium">{percentage.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Pagado: {formatCurrency(contribution.paid_amount)}</span>
              <span>Pendiente: {formatCurrency(contribution.expected_amount - contribution.paid_amount)}</span>
            </div>
          </div>

          {/* Actions */}
          <Button
            onClick={handleTogglePaid}
            disabled={isLoading}
            variant={isPaid ? 'outline' : 'default'}
            className="w-full"
            size="sm"
          >
            {isPaid ? (
              <>
                <Circle className="mr-2 h-4 w-4" />
                Marcar como No Pagada
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Marcar como Pagada
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
