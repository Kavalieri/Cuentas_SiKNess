'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClosePeriodModal } from '@/components/periods/ClosePeriodModal';
import { ReopenPeriodModal } from '@/components/periods/ReopenPeriodModal';
import type { MonthlyPeriod } from '@/lib/periods';
import { Lock, Unlock, AlertCircle } from 'lucide-react';

interface PeriodActionsProps {
  period: MonthlyPeriod;
  hasDescuadre?: boolean;
  descuadreAmount?: number;
  currency?: string;
  onRefresh?: () => void;
}

export function PeriodActions({
  period,
  hasDescuadre = false,
  descuadreAmount = 0,
  currency = 'EUR',
  onRefresh,
}: PeriodActionsProps) {
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);

  const isOpen = period.status === 'open' || period.status === 'pending_close';
  const isClosed = period.status === 'closed';
  const maxReopens = 3;
  const canReopen = isClosed && (period.reopened_count || 0) < maxReopens;

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Badge de estado */}
        <Badge
          variant={
            period.status === 'closed'
              ? 'secondary'
              : period.status === 'pending_close'
              ? 'outline'
              : 'default'
          }
        >
          {period.status === 'closed' && '🔒 Cerrado'}
          {period.status === 'open' && '🟢 Abierto'}
          {period.status === 'pending_close' && '⏳ Pendiente'}
        </Badge>

        {/* Contador de reaperturas si está cerrado */}
        {isClosed && (
          <Badge variant="outline" className="text-xs">
            Reaperturas: {period.reopened_count || 0} / {maxReopens}
          </Badge>
        )}

        {/* Advertencia de descuadre */}
        {hasDescuadre && isOpen && (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="mr-1 h-3 w-3" />
            Descuadre detectado
          </Badge>
        )}

        {/* Botón Cerrar Período */}
        {isOpen && (
          <Button
            onClick={() => setShowCloseModal(true)}
            variant={hasDescuadre ? 'destructive' : 'default'}
            size="sm"
          >
            <Lock className="mr-2 h-4 w-4" />
            Cerrar Período
          </Button>
        )}

        {/* Botón Reabrir Período */}
        {isClosed && (
          <Button
            onClick={() => setShowReopenModal(true)}
            variant="outline"
            size="sm"
            disabled={!canReopen}
          >
            <Unlock className="mr-2 h-4 w-4" />
            Reabrir Período
          </Button>
        )}
      </div>

      {/* Modal Cerrar */}
      <ClosePeriodModal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        period={period}
        hasDescuadre={hasDescuadre}
        descuadreAmount={descuadreAmount}
        currency={currency}
        onSuccess={onRefresh}
      />

      {/* Modal Reabrir */}
      <ReopenPeriodModal
        isOpen={showReopenModal}
        onClose={() => setShowReopenModal(false)}
        period={{
          ...period,
          reopened_count: period.reopened_count || 0,
        }}
        maxReopens={maxReopens}
        onSuccess={onRefresh}
      />
    </>
  );
}
