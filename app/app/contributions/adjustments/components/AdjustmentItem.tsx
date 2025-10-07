'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User } from 'lucide-react';
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

interface AdjustmentItemProps {
  adjustmentData: AdjustmentData;
  isOwner: boolean;
  currentUserProfileId: string;
  currency: string;
  onUpdate: () => void;
}

export function AdjustmentItem({
  adjustmentData,
  currentUserProfileId, // eslint-disable-line @typescript-eslint/no-unused-vars
  currency,
  onUpdate, // eslint-disable-line @typescript-eslint/no-unused-vars
}: AdjustmentItemProps) {
  const { adjustment, member, contribution, category } = adjustmentData;

  const getStatusBadge = () => {
    switch (adjustment.status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">⏳ Pendiente</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">✅ Activo</Badge>;
      case 'applied':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">✓ Aplicado</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">✕ Cancelado</Badge>;
      case 'locked':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">🔒 Bloqueado</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Info principal */}
          <div className="flex-1 space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge()}
                  {adjustment.type === 'prepayment' && (
                    <Badge variant="secondary">💳 Pre-pago</Badge>
                  )}
                </div>
                
                <p className="font-medium">
                  {adjustment.reason || 'Sin descripción'}
                </p>
                
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
                <p className={`text-lg font-bold ${
                  adjustment.amount >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {adjustment.amount >= 0 ? '+' : ''}
                  {formatCurrency(adjustment.amount, currency)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
