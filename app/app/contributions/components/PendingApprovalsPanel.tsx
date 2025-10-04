'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getPendingAdjustments, approvePrepayment, rejectPrepayment } from '@/app/app/contributions/adjustment-actions';
import { formatCurrency } from '@/lib/format';
import type { Database } from '@/types/database';

type AdjustmentRow = Database['public']['Tables']['contribution_adjustments']['Row'];
type Category = Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'name' | 'icon' | 'type'>;

interface PendingApprovalsData {
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

interface PendingApprovalsPanelProps {
  categories: Category[];
  currency: string;
}

export function PendingApprovalsPanel({ categories, currency }: PendingApprovalsPanelProps) {
  const [pendingAdjustments, setPendingAdjustments] = useState<PendingApprovalsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdjustment, setSelectedAdjustment] = useState<PendingApprovalsData | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Formulario de aprobación
  const [expenseCategoryId, setExpenseCategoryId] = useState<string>('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [incomeDescription, setIncomeDescription] = useState('');

  // Formulario de rechazo
  const [rejectionReason, setRejectionReason] = useState('');

  // Cargar ajustes pendientes
  const loadPendingAdjustments = async () => {
    setLoading(true);
    const result = await getPendingAdjustments();
    
    if (result.ok && result.data) {
      // Transformar datos
      type RawItem = {
        contributions: {
          profile_id: string;
          profiles: { display_name: string | null; email: string };
          year: number;
          month: number;
        };
        categories: Category | null;
        [key: string]: unknown;
      };
      
      const transformed = ((result.data as unknown) as RawItem[]).map((item) => ({
        adjustment: item as unknown as AdjustmentRow,
        member: {
          profile_id: item.contributions.profile_id,
          display_name: item.contributions.profiles.display_name,
          email: item.contributions.profiles.email,
        },
        contribution: {
          year: item.contributions.year,
          month: item.contributions.month,
        },
        category: item.categories || null,
      }));
      setPendingAdjustments(transformed);
    } else if (!result.ok) {
      toast.error('message' in result ? result.message : 'Error al cargar ajustes pendientes');
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadPendingAdjustments();
  }, []);

  // Abrir modal de aprobación
  const handleOpenApprove = (data: PendingApprovalsData) => {
    setSelectedAdjustment(data);
    
    // Pre-rellenar con valores sugeridos
    setExpenseCategoryId(data.adjustment.category_id || data.category?.id || '');
    setExpenseDescription(
      data.adjustment.expense_description || 
      `${data.category?.name || 'Gasto común'} - ${data.member.display_name || data.member.email}`
    );
    setIncomeDescription(
      data.adjustment.income_description || 
      `Aporte de ${data.member.display_name || data.member.email} - ${data.adjustment.reason}`
    );
    
    setShowApproveDialog(true);
  };

  // Abrir modal de rechazo
  const handleOpenReject = (data: PendingApprovalsData) => {
    setSelectedAdjustment(data);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  // Aprobar pre-pago
  const handleApprove = async () => {
    if (!selectedAdjustment) return;
    
    if (!expenseCategoryId || !expenseDescription || !incomeDescription) {
      toast.error('Todos los campos son requeridos');
      return;
    }

    setIsApproving(true);
    
    const formData = new FormData();
    formData.append('adjustment_id', selectedAdjustment.adjustment.id);
    formData.append('expense_category_id', expenseCategoryId);
    formData.append('expense_description', expenseDescription);
    formData.append('income_description', incomeDescription);

    const result = await approvePrepayment(formData);
    
    if (result.ok) {
      toast.success('Pre-pago aprobado correctamente');
      setShowApproveDialog(false);
      loadPendingAdjustments(); // Recargar lista
    } else {
      toast.error('message' in result ? result.message : 'Error al aprobar pre-pago');
    }
    
    setIsApproving(false);
  };

  // Rechazar pre-pago
  const handleReject = async () => {
    if (!selectedAdjustment) return;
    
    if (!rejectionReason.trim()) {
      toast.error('Debes proporcionar una razón para el rechazo');
      return;
    }

    setIsRejecting(true);
    
    const formData = new FormData();
    formData.append('adjustment_id', selectedAdjustment.adjustment.id);
    formData.append('rejection_reason', rejectionReason);

    const result = await rejectPrepayment(formData);
    
    if (result.ok) {
      toast.success('Pre-pago rechazado');
      setShowRejectDialog(false);
      loadPendingAdjustments(); // Recargar lista
    } else {
      toast.error('message' in result ? result.message : 'Error al rechazar pre-pago');
    }
    
    setIsRejecting(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando aprobaciones pendientes...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (pendingAdjustments.length === 0) {
    return null; // No mostrar nada si no hay pendientes
  }

  return (
    <>
      <Card className="border-orange-200 dark:border-orange-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Pre-pagos Pendientes de Aprobación
              </CardTitle>
              <CardDescription>
                {pendingAdjustments.length} {pendingAdjustments.length === 1 ? 'solicitud' : 'solicitudes'} esperando tu revisión
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {pendingAdjustments.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingAdjustments.map((data) => {
              const amount = Math.abs(data.adjustment.amount);
              const createdAt = new Date(data.adjustment.created_at);
              
              return (
                <div
                  key={data.adjustment.id}
                  className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors"
                >
                  {/* Header: Miembro y monto */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">
                        {data.member.display_name || data.member.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {createdAt.toLocaleDateString('es-ES', { 
                          day: 'numeric', 
                          month: 'long', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {formatCurrency(amount, currency)}
                      </p>
                      <Badge variant="outline" className="mt-1">
                        {data.contribution.month}/{data.contribution.year}
                      </Badge>
                    </div>
                  </div>

                  {/* Detalles */}
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Razón:</p>
                      <p className="text-sm">{data.adjustment.reason}</p>
                    </div>
                    
                    {data.category && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Categoría sugerida:</p>
                        <Badge variant="secondary">
                          {data.category.icon} {data.category.name}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleOpenApprove(data)}
                      className="flex-1"
                      variant="default"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprobar
                    </Button>
                    <Button
                      onClick={() => handleOpenReject(data)}
                      className="flex-1"
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rechazar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Aprobación */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aprobar Pre-pago</DialogTitle>
            <DialogDescription>
              Revisa y edita los detalles antes de aprobar. Se crearán 2 movimientos automáticamente.
            </DialogDescription>
          </DialogHeader>

          {selectedAdjustment && (
            <div className="space-y-4">
              {/* Info del ajuste */}
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p className="text-sm">
                  <strong>Miembro:</strong> {selectedAdjustment.member.display_name || selectedAdjustment.member.email}
                </p>
                <p className="text-sm">
                  <strong>Monto:</strong> {formatCurrency(Math.abs(selectedAdjustment.adjustment.amount), currency)}
                </p>
                <p className="text-sm">
                  <strong>Razón:</strong> {selectedAdjustment.adjustment.reason}
                </p>
              </div>

              <div className="border-t pt-4 space-y-4">
                <p className="font-medium">Movimientos que se crearán:</p>

                {/* Movimiento 1: Gasto */}
                <div className="space-y-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    1️⃣ Movimiento de Gasto
                  </p>
                  
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="expense_category">Categoría *</Label>
                      <Select value={expenseCategoryId} onValueChange={setExpenseCategoryId}>
                        <SelectTrigger id="expense_category">
                          <SelectValue placeholder="Selecciona categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories
                            .filter((cat) => cat.type === 'expense')
                            .map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.icon} {cat.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="expense_description">Descripción *</Label>
                      <Input
                        id="expense_description"
                        value={expenseDescription}
                        onChange={(e) => setExpenseDescription(e.target.value)}
                        placeholder="Descripción del gasto"
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Monto: {formatCurrency(Math.abs(selectedAdjustment.adjustment.amount), currency)}
                    </p>
                  </div>
                </div>

                {/* Movimiento 2: Ingreso Virtual */}
                <div className="space-y-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    2️⃣ Ingreso Virtual (Aporte del miembro)
                  </p>
                  
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="income_description">Descripción *</Label>
                      <Input
                        id="income_description"
                        value={incomeDescription}
                        onChange={(e) => setIncomeDescription(e.target.value)}
                        placeholder="Descripción del aporte"
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Monto: {formatCurrency(Math.abs(selectedAdjustment.adjustment.amount), currency)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={isApproving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApproving || !expenseCategoryId || !expenseDescription || !incomeDescription}
            >
              {isApproving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aprobando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprobar y Crear Movimientos
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Rechazo */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Pre-pago</DialogTitle>
            <DialogDescription>
              Proporciona una razón para el rechazo. El miembro recibirá una notificación.
            </DialogDescription>
          </DialogHeader>

          {selectedAdjustment && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p className="text-sm">
                  <strong>Miembro:</strong> {selectedAdjustment.member.display_name || selectedAdjustment.member.email}
                </p>
                <p className="text-sm">
                  <strong>Monto:</strong> {formatCurrency(Math.abs(selectedAdjustment.adjustment.amount), currency)}
                </p>
                <p className="text-sm">
                  <strong>Razón:</strong> {selectedAdjustment.adjustment.reason}
                </p>
              </div>

              <div>
                <Label htmlFor="rejection_reason">Razón del rechazo *</Label>
                <Textarea
                  id="rejection_reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ej: Este gasto no corresponde al presupuesto del hogar"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={isRejecting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting || !rejectionReason.trim()}
            >
              {isRejecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rechazando...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Rechazar Pre-pago
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
