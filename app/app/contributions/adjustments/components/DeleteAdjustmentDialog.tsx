'use client';

import { deleteContributionAdjustment } from '@/app/app/contributions/actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/lib/format';
import type { Database } from '@/types/database';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

type AdjustmentRow = Database['public']['Tables']['contribution_adjustments']['Row'];
type Category = Pick<
  Database['public']['Tables']['categories']['Row'],
  'id' | 'name' | 'icon' | 'type'
>;

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

interface DeleteAdjustmentDialogProps {
  adjustmentData: AdjustmentData;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteAdjustmentDialog({
  adjustmentData,
  currency,
  open,
  onOpenChange,
  onSuccess,
}: DeleteAdjustmentDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const { adjustment, member, contribution, category } = adjustmentData;

  const handleDelete = async () => {
    setIsLoading(true);

    const result = await deleteContributionAdjustment(adjustment.id);

    if (!result.ok) {
      toast.error(result.message);
      setIsLoading(false);
      return;
    }

    toast.success(
      'Ajuste eliminado exitosamente - Se han eliminado todos los movimientos asociados',
    );
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
            <Trash2 className="h-5 w-5 text-destructive" />
            ¿Eliminar ajuste permanentemente?
          </AlertDialogTitle>
          <div className="text-sm text-muted-foreground">
            <strong className="text-destructive">¡ACCIÓN IRREVERSIBLE!</strong>
            <br />
            Al eliminar este ajuste se borrarán:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>El ajuste y su registro</li>
              <li>Todas las transacciones asociadas</li>
              <li>Se recalculará automáticamente la contribución</li>
            </ul>
          </div>
        </AlertDialogHeader>

        {/* Detalles del ajuste */}
        <div className="rounded-lg border bg-destructive/5 border-destructive/20 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Ajuste:</span>
            <span>{adjustment.reason}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Usuario:</span>
            <span>{member.display_name || member.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Período:</span>
            <span>
              {contribution.month}/{contribution.year}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Monto:</span>
            <span
              className={`font-bold ${adjustment.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {adjustment.amount >= 0 ? '+' : ''}
              {formatCurrency(adjustment.amount, currency)}
            </span>
          </div>
          {category && (
            <div className="flex items-center justify-between">
              <span className="font-medium">Categoría:</span>
              <span className="flex items-center gap-1">
                {category.icon} {category.name}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <span className="text-sm text-orange-700">
            Esta acción queda registrada en el journal de auditoría
          </span>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Eliminando...' : 'Eliminar Definitivamente'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
