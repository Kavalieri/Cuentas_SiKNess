'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle } from 'lucide-react';
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
import { toast } from 'sonner';
import { approveContributionAdjustment } from '@/app/app/contributions/actions';
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

interface ApproveAdjustmentDialogProps {
  adjustmentData: AdjustmentData;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ApproveAdjustmentDialog({
  adjustmentData,
  currency,
  open,
  onOpenChange,
  onSuccess,
}: ApproveAdjustmentDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const { adjustment, member, contribution, category } = adjustmentData;

  const handleApprove = async () => {
    setIsLoading(true);

    const result = await approveContributionAdjustment(adjustment.id);

    if (!result.ok) {
      toast.error(result.message);
      setIsLoading(false);
      return;
    }

    toast.success('Ajuste aprobado exitosamente');
    setIsLoading(false);
    onOpenChange(false);
    onSuccess();
    router.refresh();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            ¿Aprobar ajuste?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Al aprobar, este ajuste cambiará a estado <strong>Activo</strong> y se aplicará en el
            cálculo de contribuciones del mes correspondiente.
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

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleApprove}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Aprobando...' : 'Aprobar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
