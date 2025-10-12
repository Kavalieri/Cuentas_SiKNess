'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import type { Database } from '@/types/database';
import { Calendar, CheckCircle, Trash2, User, XCircle } from 'lucide-react';
import { useState } from 'react';
import { ApproveAdjustmentDialog } from './ApproveAdjustmentDialog';
import { DeleteAdjustmentDialog } from './DeleteAdjustmentDialog';
import { RejectAdjustmentDialog } from './RejectAdjustmentDialog';

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

interface AdjustmentItemProps {
  adjustmentData: AdjustmentData;
  isOwner: boolean;
  currentUserProfileId: string;
  currency: string;
  onUpdate: () => void;
}

export function AdjustmentItem({
  adjustmentData,
  isOwner,
  currentUserProfileId, // eslint-disable-line @typescript-eslint/no-unused-vars
  currency,
  onUpdate,
}: AdjustmentItemProps) {
  const { adjustment, member, contribution, category } = adjustmentData;

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getStatusBadge = () => {
    switch (adjustment.status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            ⏳ Pendiente
          </Badge>
        );
      case 'active':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            ✅ Activo
          </Badge>
        );
      case 'applied':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            ✓ Aplicado
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            ✕ Cancelado
          </Badge>
        );
      case 'locked':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            🔒 Bloqueado
          </Badge>
        );
      default:
        return null;
    }
  };

  const isPending = adjustment.status === 'pending';
  const showActionButtons = isOwner && isPending;

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Info principal */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {getStatusBadge()}
                      {adjustment.type === 'prepayment' && (
                        <Badge variant="secondary">💳 Pre-pago</Badge>
                      )}
                    </div>

                    <p className="font-medium">{adjustment.reason || 'Sin descripción'}</p>

                    <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{member.display_name || member.email}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {contribution.month}/{contribution.year}
                        </span>
                      </div>

                      {category && (
                        <div className="flex items-center gap-2">
                          <span>{category.icon}</span>
                          <span>{category.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Monto */}
                  <div className="text-right">
                    <p
                      className={`text-lg font-bold ${
                        adjustment.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {adjustment.amount >= 0 ? '+' : ''}
                      {formatCurrency(adjustment.amount, currency)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de acción (solo para owner y pending) */}
            {showActionButtons && (
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  onClick={() => setShowApproveDialog(true)}
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprobar
                </Button>
                <Button
                  onClick={() => setShowRejectDialog(true)}
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rechazar
                </Button>
              </div>
            )}

            {/* Botón de eliminación (solo para owner en cualquier estado) */}
            {isOwner && (
              <div className="flex gap-2 pt-2 border-t border-dashed border-orange-200">
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  size="sm"
                  variant="outline"
                  className="w-full text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Permanentemente
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Diálogos */}
      {showApproveDialog && (
        <ApproveAdjustmentDialog
          adjustmentData={adjustmentData}
          currency={currency}
          open={showApproveDialog}
          onOpenChange={setShowApproveDialog}
          onSuccess={onUpdate}
        />
      )}

      {showRejectDialog && (
        <RejectAdjustmentDialog
          adjustmentData={adjustmentData}
          currency={currency}
          open={showRejectDialog}
          onOpenChange={setShowRejectDialog}
          onSuccess={onUpdate}
        />
      )}

      {showDeleteDialog && (
        <DeleteAdjustmentDialog
          adjustmentData={adjustmentData}
          currency={currency}
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onSuccess={onUpdate}
        />
      )}
    </>
  );
}
