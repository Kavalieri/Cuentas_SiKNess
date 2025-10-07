'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Settings } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import type { MemberCredit } from '@/lib/actions/credits';

interface CreditItemProps {
  credit: MemberCredit;
  currency: string;
  onManage: () => void;
}

export function CreditItem({ credit, currency, onManage }: CreditItemProps) {
  const sourceDate = new Date(credit.source_year, credit.source_month - 1);
  const formattedDate = sourceDate.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  const getDecisionBadge = () => {
    switch (credit.monthly_decision) {
      case 'apply_to_month':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            📅 Aplicar al mes
          </Badge>
        );
      case 'keep_active':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            ✓ Mantener activo
          </Badge>
        );
      case 'transfer_to_savings':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            💰 Transferir a ahorros
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 bg-muted rounded-lg flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-3">
          <div className="text-xl font-bold text-green-600">
            {formatCurrency(credit.amount, currency)}
          </div>
          {credit.auto_apply && (
            <Badge variant="secondary" className="text-xs">
              🔄 Auto-aplicar
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Generado en {formattedDate}</span>
          </div>

          {credit.monthly_decision && (
            <div className="flex items-center gap-2 mt-1">
              {getDecisionBadge()}
            </div>
          )}
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onManage}
        className="w-full md:w-auto"
      >
        <Settings className="h-4 w-4 mr-2" />
        Gestionar
      </Button>
    </div>
  );
}
