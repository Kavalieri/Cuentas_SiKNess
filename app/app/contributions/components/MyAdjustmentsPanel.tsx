'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, AlertCircle, Loader2, ExternalLink, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { getAllHouseholdAdjustments, getMyAdjustments, approvePrepayment, rejectPrepayment } from '@/app/app/contributions/adjustment-actions';
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

interface MyAdjustmentsPanelProps {
  isOwner: boolean;
  currentUserProfileId: string;
  categories: Category[];
  currency: string;
}

export function MyAdjustmentsPanel({ isOwner, currentUserProfileId, categories, currency }: MyAdjustmentsPanelProps) {
  const [adjustments, setAdjustments] = useState<AdjustmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdjustment, setSelectedAdjustment] = useState<AdjustmentData | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Formulario de aprobación
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [incomeCategoryId, setIncomeCategoryId] = useState('');
  const [incomeDescription, setIncomeDescription] = useState('');

  // Formulario de rechazo
  const [rejectionReason, setRejectionReason] = useState('');

  // Cargar ajustes
  const loadAdjustments = async () => {
    setLoading(true);
    
    const result = isOwner 
      ? await getAllHouseholdAdjustments()
      : await getMyAdjustments();
    
    if (result.ok && result.data) {
      type RawItem = {
        contributions: {
          profile_id: string;
          profiles: { display_name: string | null; email: string };
          year: number;
          month: number;
        };
        category: Category | null;
        expense_category: Category | null;
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
        category: item.expense_category || item.category || null,
      }));
      setAdjustments(transformed);
    } else if (!result.ok) {
      toast.error('message' in result ? result.message : 'Error al cargar ajustes');
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadAdjustments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, currentUserProfileId]);

  // Filtrar ajustes por estado
  const pendingAdjustments = adjustments.filter(a => a.adjustment.status === 'pending');
  const approvedAdjustments = adjustments.filter(a => a.adjustment.status === 'approved');
  const rejectedAdjustments = adjustments.filter(a => a.adjustment.status === 'rejected');

  // Abrir modal de aprobación
  const handleOpenApprove = (data: AdjustmentData) => {
    setSelectedAdjustment(data);
    
    // Pre-rellenar con valores sugeridos
    setExpenseCategoryId(data.adjustment.expense_category_id || data.adjustment.category_id || data.category?.id || '');
    setExpenseDescription(
      data.adjustment.expense_description || 
      `${data.category?.name || 'Gasto común'} - ${data.member.display_name || data.member.email}`
    );
    setIncomeCategoryId(''); // Usuario debe seleccionarlo
    setIncomeDescription(
      data.adjustment.income_description || 
      `Aporte de ${data.member.display_name || data.member.email} - ${data.adjustment.reason}`
    );
    
    setShowApproveDialog(true);
  };

  // Revisar antes de aprobar
  const handleReviewAndApprove = () => {
    setShowApproveDialog(false);
    setShowConfirmDialog(true);
  };

  // Confirmar aprobación
  const handleConfirmApproval = async () => {
    if (!selectedAdjustment) return;

    setIsApproving(true);

    const formData = new FormData();
    formData.append('adjustment_id', selectedAdjustment.adjustment.id);
    formData.append('expense_category_id', expenseCategoryId);
    formData.append('expense_description', expenseDescription);
    if (incomeCategoryId) {
      formData.append('income_category_id', incomeCategoryId);
    }
    formData.append('income_description', incomeDescription);

    const result = await approvePrepayment(formData);

    if (result.ok) {
      toast.success('Pre-pago aprobado correctamente');
      setShowConfirmDialog(false);
      setSelectedAdjustment(null);
      loadAdjustments();
    } else {
      toast.error('message' in result ? result.message : 'Error al aprobar pre-pago');
    }

    setIsApproving(false);
  };

  // Abrir modal de rechazo
  const handleOpenReject = (data: AdjustmentData) => {
    setSelectedAdjustment(data);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  // Confirmar rechazo
  const handleConfirmRejection = async () => {
    if (!selectedAdjustment || !rejectionReason.trim()) {
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
      setSelectedAdjustment(null);
      setRejectionReason('');
      loadAdjustments();
    } else {
      toast.error('message' in result ? result.message : 'Error al rechazar pre-pago');
    }

    setIsRejecting(false);
  };

  // Badge de estado
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">⏳ Pendiente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">✅ Aprobado</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">❌ Rechazado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Renderizar card de ajuste
  const renderAdjustmentCard = (data: AdjustmentData) => {
    const { adjustment, member, category } = data;
    const isOwnAdjustment = member.profile_id === currentUserProfileId;

    return (
      <Card key={adjustment.id} className="mb-3">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              {/* Header */}
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(adjustment.status)}
                <span className="text-sm text-muted-foreground">
                  {isOwner && !isOwnAdjustment && (
                    <span className="font-medium">{member.display_name || member.email}</span>
                  )}
                  {isOwner && !isOwnAdjustment && ' • '}
                  {new Date(adjustment.created_at).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>

              {/* Monto y categoría */}
              <div>
                <span className="font-semibold text-lg">
                  {formatCurrency(Math.abs(adjustment.amount), currency)}
                </span>
                {category && (
                  <span className="text-sm text-muted-foreground ml-2">
                    en {category.icon} {category.name}
                  </span>
                )}
              </div>

              {/* Razón */}
              {adjustment.reason && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Motivo:</span> {adjustment.reason}
                </p>
              )}

              {/* Links a movimientos (si approved) */}
              {adjustment.status === 'approved' && adjustment.movement_id && (
                <div className="flex gap-2 pt-2 flex-wrap">
                  <Link href={`/app/expenses?highlight=${adjustment.movement_id}`}>
                    <Button variant="outline" size="sm" className="text-xs">
                      <FileText className="w-3 h-3 mr-1" />
                      Ver gasto
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                  {adjustment.income_movement_id && (
                    <Link href={`/app/expenses?highlight=${adjustment.income_movement_id}`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        <FileText className="w-3 h-3 mr-1" />
                        Ver aporte
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              )}

              {/* Razón de rechazo (si rejected) */}
              {adjustment.status === 'rejected' && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                  <p className="font-medium text-red-900">Razón del rechazo:</p>
                  <p className="text-red-700 whitespace-pre-wrap">{adjustment.reason}</p>
                </div>
              )}
            </div>

            {/* Acciones (solo para owners en pending) */}
            {isOwner && adjustment.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleOpenApprove(data)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleOpenReject(data)}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Rechazar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Cargando ajustes...</p>
        </CardContent>
      </Card>
    );
  }

  if (adjustments.length === 0) {
    return null; // No mostrar nada si no hay ajustes
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>📋 Mis Ajustes de Contribución</span>
            {pendingAdjustments.length > 0 && (
              <Badge variant="default" className="bg-yellow-500">
                {pendingAdjustments.length} pendiente{pendingAdjustments.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {/* Pending */}
            {pendingAdjustments.length > 0 && (
              <AccordionItem value="pending">
                <AccordionTrigger className="text-yellow-700 hover:text-yellow-800">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Pendientes de Aprobación ({pendingAdjustments.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {pendingAdjustments.map(renderAdjustmentCard)}
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Approved */}
            {approvedAdjustments.length > 0 && (
              <AccordionItem value="approved">
                <AccordionTrigger className="text-green-700 hover:text-green-800">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Aprobados ({approvedAdjustments.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {approvedAdjustments.map(renderAdjustmentCard)}
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Rejected */}
            {rejectedAdjustments.length > 0 && (
              <AccordionItem value="rejected">
                <AccordionTrigger className="text-red-700 hover:text-red-800">
                  <span className="flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Rechazados ({rejectedAdjustments.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {rejectedAdjustments.map(renderAdjustmentCard)}
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </CardContent>
      </Card>

      {/* Modal de Aprobación */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>✏️ Revisar Pre-pago</DialogTitle>
            <DialogDescription>
              Edita los detalles antes de aprobar. Se crearán 2 movimientos automáticamente.
            </DialogDescription>
          </DialogHeader>

          {selectedAdjustment && (
            <div className="space-y-4">
              {/* Info básica */}
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Miembro:</span>
                  <span className="text-sm">{selectedAdjustment.member.display_name || selectedAdjustment.member.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Monto:</span>
                  <span className="text-sm font-semibold">{formatCurrency(Math.abs(selectedAdjustment.adjustment.amount), currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Razón:</span>
                  <span className="text-sm">{selectedAdjustment.adjustment.reason}</span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <p className="text-sm font-medium">Movimientos que se crearán:</p>

                {/* Movimiento 1: Gasto */}
                <div className="space-y-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <Label className="text-sm font-medium text-destructive">1️⃣ Gasto</Label>
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="expense-category">Categoría *</Label>
                      <Select value={expenseCategoryId} onValueChange={setExpenseCategoryId}>
                        <SelectTrigger id="expense-category">
                          <SelectValue placeholder="Selecciona categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories
                            .filter((c) => c.type === 'expense')
                            .map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.icon} {cat.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="expense-desc">Descripción</Label>
                      <Input
                        id="expense-desc"
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

                {/* Movimiento 2: Ingreso virtual */}
                <div className="space-y-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <Label className="text-sm font-medium text-green-600 dark:text-green-400">2️⃣ Ingreso Virtual (Aporte)</Label>
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="income-category">Categoría (opcional)</Label>
                      <Select value={incomeCategoryId || undefined} onValueChange={setIncomeCategoryId}>
                        <SelectTrigger id="income-category">
                          <SelectValue placeholder="Sin categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories
                            .filter((c) => c.type === 'income')
                            .map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.icon} {cat.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="income-desc">Descripción</Label>
                      <Input
                        id="income-desc"
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
            <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={isApproving}>
              Cancelar
            </Button>
            <Button onClick={handleReviewAndApprove} disabled={!expenseCategoryId || isApproving}>
              Revisar y Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ Confirmar Aprobación</DialogTitle>
            <DialogDescription>
              Vas a crear 2 movimientos y aprobar este pre-pago. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {selectedAdjustment && (
            <div className="space-y-2 text-sm">
              <p>
                ✅ Se creará un <strong>gasto</strong> de {formatCurrency(Math.abs(selectedAdjustment.adjustment.amount), currency)}
              </p>
              <p>
                ✅ Se creará un <strong>ingreso virtual</strong> de {formatCurrency(Math.abs(selectedAdjustment.adjustment.amount), currency)}
              </p>
              <p>
                ✅ La contribución de <strong>{selectedAdjustment.member.display_name || selectedAdjustment.member.email}</strong> se recalculará
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={isApproving}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmApproval} disabled={isApproving} className="bg-green-600 hover:bg-green-700">
              {isApproving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Aprobando...
                </>
              ) : (
                'Confirmar Aprobación'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Rechazo */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>❌ Rechazar Pre-pago</DialogTitle>
            <DialogDescription>
              Proporciona una razón para rechazar este pre-pago. El miembro será notificado.
            </DialogDescription>
          </DialogHeader>

          {selectedAdjustment && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Miembro:</span>
                  <span className="text-sm">{selectedAdjustment.member.display_name || selectedAdjustment.member.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Monto:</span>
                  <span className="text-sm font-semibold">{formatCurrency(Math.abs(selectedAdjustment.adjustment.amount), currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Razón:</span>
                  <span className="text-sm">{selectedAdjustment.adjustment.reason}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="rejection-reason">Razón del rechazo *</Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explica por qué rechazas este pre-pago..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={isRejecting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRejection}
              disabled={!rejectionReason.trim() || isRejecting}
            >
              {isRejecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rechazando...
                </>
              ) : (
                'Rechazar Pre-pago'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
