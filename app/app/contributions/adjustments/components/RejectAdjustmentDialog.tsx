'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { rejectContributionAdjustment } from '@/app/app/contributions/actions';
import { formatCurrency } from '@/lib/format';
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

interface RejectAdjustmentDialogProps {
  adjustmentData: AdjustmentData;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RejectAdjustmentDialog({
  adjustmentData,
  currency,
  open,
  onOpenChange,
  onSuccess,
}: RejectAdjustmentDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const { adjustment, member, contribution, category } = adjustmentData;

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Debes proporcionar una razón para el rechazo');
      return;
    }

    setIsLoading(true);

    const result = await rejectContributionAdjustment(adjustment.id, rejectionReason.trim());

    if (!result.ok) {
      toast.error(result.message);
      setIsLoading(false);
      return;
    }

    toast.success('Ajuste rechazado exitosamente');
    setIsLoading(false);
    setRejectionReason('');
    onOpenChange(false);
    onSuccess();
    router.refresh();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            ¿Rechazar ajuste?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Al rechazar, este ajuste cambiará a estado <strong>Cancelado</strong> y se eliminarán
            las transacciones asociadas (si existen).
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Detalles del ajuste */}
        <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Miembro:</span>
            <span className="text-sm">{member.display_name || member.email}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Período:</span>
            <span className="text-sm">
              {contribution.month}/{contribution.year}
            </span>
          </div>

          {category && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Categoría:</span>
              <span className="text-sm">
                {category.icon} {category.name}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Razón:</span>
            <span className="text-sm text-right max-w-[200px] truncate">
              {adjustment.reason || 'Sin descripción'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-bold">Monto:</span>
            <span
              className={`text-lg font-bold ${
                adjustment.amount >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {adjustment.amount >= 0 ? '+' : ''}
              {formatCurrency(adjustment.amount, currency)}
            </span>
          </div>
        </div>

        {/* Razón del rechazo */}
        <div className="space-y-2">
          <Label htmlFor="rejectionReason">Razón del rechazo *</Label>
          <Input
            id="rejectionReason"
            placeholder="Ej: Documentación insuficiente, monto incorrecto..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReject}
            disabled={isLoading || !rejectionReason.trim()}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Rechazando...' : 'Rechazar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
