'use client';

import { AdjustmentItem } from './AdjustmentItem';
import { EmptyState } from '@/components/shared/data-display/EmptyState';
import { FileText } from 'lucide-react';
import type { Database } from '@/types/database';

type AdjustmentRow = Database['public']['Tables']['contribution_adjustments']['Row'];
type Category = Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'name' | 'icon' | 'type'>;

interface AdjustmentData {
  adjustment: AdjustmentRow;
  member: {
    profile_id: string;
    display_name: string | null;
    email: string;
  };
  contribution: {
    year: number;
    month: number;
  };
  category: Category | null;
}

interface AdjustmentsListProps {
  adjustments: AdjustmentData[];
  isOwner: boolean;
  currentUserProfileId: string;
  currency: string;
  onAdjustmentUpdated: () => void;
}

export function AdjustmentsList({
  adjustments,
  isOwner,
  currentUserProfileId,
  currency,
  onAdjustmentUpdated,
}: AdjustmentsListProps) {
  if (adjustments.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-12 w-12" />}
        title="No hay ajustes"
        description={
          isOwner
            ? 'No se han registrado ajustes en el hogar.'
            : 'No tienes ajustes registrados.'
        }
      />
    );
  }

  // Agrupar por estado
  const pending = adjustments.filter((a) => a.adjustment.status === 'pending');
  const approved = adjustments.filter((a) => a.adjustment.status === 'approved');
  const active = adjustments.filter((a) => a.adjustment.status === 'active');
  const applied = adjustments.filter((a) => a.adjustment.status === 'applied');
  const cancelled = adjustments.filter((a) => a.adjustment.status === 'cancelled');
  const rejected = adjustments.filter((a) => a.adjustment.status === 'rejected');
  const locked = adjustments.filter((a) => a.adjustment.status === 'locked');

  return (
    <div className="space-y-6">
      {/* Pendientes */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Pendientes de Aprobación ({pending.length})</h2>
          <div className="grid gap-4">
            {pending.map((data) => (
              <AdjustmentItem
                key={data.adjustment.id}
                adjustmentData={data}
                isOwner={isOwner}
                currentUserProfileId={currentUserProfileId}
                currency={currency}
                onUpdate={onAdjustmentUpdated}
              />
            ))}
          </div>
        </div>
      )}

      {/* Aprobados (listos para aplicar) */}
      {approved.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-green-600">Aprobados ({approved.length})</h2>
          <p className="text-sm text-muted-foreground">
            Estos ajustes han sido aprobados y están listos para aplicarse en las contribuciones.
          </p>
          <div className="grid gap-4">
            {approved.map((data) => (
              <AdjustmentItem
                key={data.adjustment.id}
                adjustmentData={data}
                isOwner={isOwner}
                currentUserProfileId={currentUserProfileId}
                currency={currency}
                onUpdate={onAdjustmentUpdated}
              />
            ))}
          </div>
        </div>
      )}

      {/* Activos */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Activos ({active.length})</h2>
          <div className="grid gap-4">
            {active.map((data) => (
              <AdjustmentItem
                key={data.adjustment.id}
                adjustmentData={data}
                isOwner={isOwner}
                currentUserProfileId={currentUserProfileId}
                currency={currency}
                onUpdate={onAdjustmentUpdated}
              />
            ))}
          </div>
        </div>
      )}

      {/* Aplicados */}
      {applied.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Aplicados ({applied.length})</h2>
          <div className="grid gap-4">
            {applied.map((data) => (
              <AdjustmentItem
                key={data.adjustment.id}
                adjustmentData={data}
                isOwner={isOwner}
                currentUserProfileId={currentUserProfileId}
                currency={currency}
                onUpdate={onAdjustmentUpdated}
              />
            ))}
          </div>
        </div>
      )}

      {/* Rechazados */}
      {rejected.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-red-600">
            Rechazados ({rejected.length})
          </h2>
          <div className="grid gap-4">
            {rejected.map((data) => (
              <AdjustmentItem
                key={data.adjustment.id}
                adjustmentData={data}
                isOwner={isOwner}
                currentUserProfileId={currentUserProfileId}
                currency={currency}
                onUpdate={onAdjustmentUpdated}
              />
            ))}
          </div>
        </div>
      )}

      {/* Cancelados */}
      {cancelled.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">
            Cancelados ({cancelled.length})
          </h2>
          <div className="grid gap-4">
            {cancelled.map((data) => (
              <AdjustmentItem
                key={data.adjustment.id}
                adjustmentData={data}
                isOwner={isOwner}
                currentUserProfileId={currentUserProfileId}
                currency={currency}
                onUpdate={onAdjustmentUpdated}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bloqueados */}
      {locked.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">
            Bloqueados (Mes Cerrado) ({locked.length})
          </h2>
          <div className="grid gap-4">
            {locked.map((data) => (
              <AdjustmentItem
                key={data.adjustment.id}
                adjustmentData={data}
                isOwner={isOwner}
                currentUserProfileId={currentUserProfileId}
                currency={currency}
                onUpdate={onAdjustmentUpdated}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
