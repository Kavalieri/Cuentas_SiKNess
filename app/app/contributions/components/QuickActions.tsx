'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Receipt, PlusCircle, Loader2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { createPrepaymentRequest, recordExtraIncome } from '@/app/app/contributions/adjustment-actions';
import type { Database } from '@/types/database';

type Category = Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'name' | 'icon' | 'type'>;

interface QuickActionsProps {
  contributionId: string | null;
  categories: Category[];
  hasMetGoal: boolean;
}

export function QuickActions({
  contributionId,
  categories,
  hasMetGoal,
}: QuickActionsProps) {
  const [showPrepaymentDialog, setShowPrepaymentDialog] = useState(false);
  const [showExtraIncomeDialog, setShowExtraIncomeDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulario de pre-pago
  const [prepaymentAmount, setPrepaymentAmount] = useState('');
  const [prepaymentReason, setPrepaymentReason] = useState('');
  const [prepaymentCategory, setPrepaymentCategory] = useState('');
  const [prepaymentExpenseDesc, setPrepaymentExpenseDesc] = useState('');
  const [prepaymentIncomeDesc, setPrepaymentIncomeDesc] = useState('');

  // Formulario de ingreso extra
  const [extraIncomeAmount, setExtraIncomeAmount] = useState('');
  const [extraIncomeReason, setExtraIncomeReason] = useState('');

  // Reset formulario pre-pago
  const resetPrepaymentForm = () => {
    setPrepaymentAmount('');
    setPrepaymentReason('');
    setPrepaymentCategory('');
    setPrepaymentExpenseDesc('');
    setPrepaymentIncomeDesc('');
  };

  // Reset formulario ingreso extra
  const resetExtraIncomeForm = () => {
    setExtraIncomeAmount('');
    setExtraIncomeReason('');
  };

  // Manejar envío de pre-pago
  const handlePrepaymentSubmit = async () => {
    if (!contributionId) {
      toast.error('No se encontró tu contribución del mes actual');
      return;
    }

    if (!prepaymentAmount || parseFloat(prepaymentAmount) <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    if (!prepaymentReason.trim()) {
      toast.error('Debes indicar la razón del pre-pago');
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('contribution_id', contributionId);
    formData.append('amount', (-Math.abs(parseFloat(prepaymentAmount))).toString()); // Negativo
    formData.append('reason', prepaymentReason);
    
    if (prepaymentCategory) {
      formData.append('category_id', prepaymentCategory);
    }
    if (prepaymentExpenseDesc) {
      formData.append('expense_description', prepaymentExpenseDesc);
    }
    if (prepaymentIncomeDesc) {
      formData.append('income_description', prepaymentIncomeDesc);
    }

    const result = await createPrepaymentRequest(formData);

    if (result.ok) {
      toast.success('✅ Solicitud de pre-pago enviada', {
        description: 'Un owner debe aprobarla para que se registre en el sistema',
        duration: 5000,
      });
      setShowPrepaymentDialog(false);
      resetPrepaymentForm();
      
      // Mostrar mensaje de espera antes de recargar
      setTimeout(() => {
        toast.info('🔄 Actualizando...', { duration: 2000 });
        window.location.reload();
      }, 1000);
    } else {
      toast.error('message' in result ? result.message : 'Error al crear solicitud');
    }

    setIsSubmitting(false);
  };

  // Manejar envío de ingreso extra
  const handleExtraIncomeSubmit = async () => {
    if (!contributionId) {
      toast.error('No se encontró tu contribución del mes actual');
      return;
    }

    if (!extraIncomeAmount || parseFloat(extraIncomeAmount) <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    if (!extraIncomeReason.trim()) {
      toast.error('Debes indicar la razón del ingreso extra');
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('contribution_id', contributionId);
    formData.append('amount', (-Math.abs(parseFloat(extraIncomeAmount))).toString()); // Negativo
    formData.append('reason', extraIncomeReason);

    const result = await recordExtraIncome(formData);

    if (result.ok) {
      toast.success('✅ Ingreso extra registrado correctamente', {
        description: 'Tu contribución se ha actualizado automáticamente',
        duration: 5000,
      });
      setShowExtraIncomeDialog(false);
      resetExtraIncomeForm();
      
      // Mostrar mensaje de espera antes de recargar
      setTimeout(() => {
        toast.info('🔄 Actualizando...', { duration: 2000 });
        window.location.reload();
      }, 1000);
    } else {
      toast.error('message' in result ? result.message : 'Error al registrar ingreso extra');
    }

    setIsSubmitting(false);
  };

  // Categorías de gasto
  const expenseCategories = categories.filter((cat) => cat.type === 'expense');

  return (
    <Card>
      <CardHeader>
        <CardTitle>💳 Acciones Rápidas</CardTitle>
        <CardDescription>
          Registra pre-pagos o ingresos extra a tu contribución mensual
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Botón Pre-pago */}
        <Dialog open={showPrepaymentDialog} onOpenChange={setShowPrepaymentDialog}>
          <DialogTrigger asChild>
            <Button className="w-full" variant="outline" size="lg">
              <Receipt className="h-5 w-5 mr-2" />
              Registrar Pre-pago
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Pre-pago</DialogTitle>
              <DialogDescription>
                Indica un gasto común que pagaste de tu bolsillo. 
                Un owner debe aprobar esta solicitud antes de que se registre en el sistema.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Monto */}
              <div>
                <Label htmlFor="prepayment_amount">Monto pagado *</Label>
                <Input
                  id="prepayment_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="85.00"
                  value={prepaymentAmount}
                  onChange={(e) => setPrepaymentAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Cantidad que pagaste de tu bolsillo
                </p>
              </div>

              {/* Razón */}
              <div>
                <Label htmlFor="prepayment_reason">Razón / Concepto *</Label>
                <Textarea
                  id="prepayment_reason"
                  placeholder="Ej: Pagué el recibo de la luz de octubre"
                  value={prepaymentReason}
                  onChange={(e) => setPrepaymentReason(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Categoría sugerida */}
              <div>
                <Label htmlFor="prepayment_category">Categoría (opcional)</Label>
                <Select value={prepaymentCategory} onValueChange={setPrepaymentCategory}>
                  <SelectTrigger id="prepayment_category">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin categoría</SelectItem>
                    {expenseCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  El owner podrá cambiar la categoría al aprobar
                </p>
              </div>

              {/* Descripciones opcionales */}
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  📝 Descripciones personalizadas (opcional)
                </p>

                <div>
                  <Label htmlFor="prepayment_expense_desc">Descripción del gasto</Label>
                  <Input
                    id="prepayment_expense_desc"
                    placeholder="Ej: Recibo luz octubre 2025"
                    value={prepaymentExpenseDesc}
                    onChange={(e) => setPrepaymentExpenseDesc(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="prepayment_income_desc">Descripción del aporte</Label>
                  <Input
                    id="prepayment_income_desc"
                    placeholder="Ej: Aporte de Juan - Luz octubre"
                    value={prepaymentIncomeDesc}
                    onChange={(e) => setPrepaymentIncomeDesc(e.target.value)}
                  />
                </div>
              </div>

              {/* Info adicional */}
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-sm space-y-1">
                <p className="font-medium">ℹ️ Qué sucederá:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
                  <li>Se creará una solicitud de pre-pago con estado &quot;Pendiente&quot;</li>
                  <li>Un owner recibirá notificación para revisar tu solicitud</li>
                  <li>Al aprobarla, se crearán 2 movimientos automáticamente:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>Gasto común en la categoría seleccionada</li>
                      <li>Ingreso virtual que representa tu aporte</li>
                    </ul>
                  </li>
                  <li>Tu contribución del mes se actualizará automáticamente</li>
                </ol>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPrepaymentDialog(false);
                  resetPrepaymentForm();
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePrepaymentSubmit}
                disabled={isSubmitting || !prepaymentAmount || !prepaymentReason}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4 mr-2" />
                    Enviar Solicitud
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Botón Ingreso Extra (solo si ya cumplió meta) */}
        {hasMetGoal && (
          <Dialog open={showExtraIncomeDialog} onOpenChange={setShowExtraIncomeDialog}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline" size="lg">
                <TrendingUp className="h-5 w-5 mr-2" />
                Registrar Ingreso Extra
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Ingreso Extra</DialogTitle>
                <DialogDescription>
                  Ya cumpliste tu meta del mes. ¿Quieres aportar más al fondo común?
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Monto */}
                <div>
                  <Label htmlFor="extra_income_amount">Monto adicional *</Label>
                  <Input
                    id="extra_income_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="100.00"
                    value={extraIncomeAmount}
                    onChange={(e) => setExtraIncomeAmount(e.target.value)}
                  />
                </div>

                {/* Razón */}
                <div>
                  <Label htmlFor="extra_income_reason">Razón / Concepto *</Label>
                  <Textarea
                    id="extra_income_reason"
                    placeholder="Ej: Aporte extra para vacaciones"
                    value={extraIncomeReason}
                    onChange={(e) => setExtraIncomeReason(e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Info */}
                <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg text-sm space-y-1">
                  <p className="font-medium">✅ Qué sucederá:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                    <li>Se registrará inmediatamente (sin necesidad de aprobación)</li>
                    <li>Se creará un movimiento de ingreso al fondo común</li>
                    <li>Tu estado pasará a &quot;Overpaid&quot; (aportaste más de lo esperado)</li>
                  </ul>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowExtraIncomeDialog(false);
                    resetExtraIncomeForm();
                  }}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleExtraIncomeSubmit}
                  disabled={isSubmitting || !extraIncomeAmount || !extraIncomeReason}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Registrar Ingreso
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Mensaje si no ha cumplido meta */}
        {!hasMetGoal && (
          <div className="text-center py-2 text-sm text-muted-foreground">
            El ingreso extra estará disponible cuando cumplas tu meta del mes
          </div>
        )}
      </CardContent>
    </Card>
  );
}
