'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Clock, TrendingDown, Receipt } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { recordContributionPayment } from '@/app/app/contributions/actions';
import { createPrepaymentRequest } from '@/app/app/contributions/adjustment-actions';
import { useState } from 'react';

type Contribution = {
  id: string;
  expected_amount: number;
  paid_amount: number;
  adjustments_total: number | null;
  status: string;
  month: number;
  year: number;
};

type Category = {
  id: string;
  name: string;
  type: string;
};

type HeroContributionProps = {
  contribution: Contribution | null;
  userEmail: string;
  totalIncome: number;
  userIncome: number;
  currency?: string;
  categories: Category[];
};

export function HeroContribution({
  contribution,
  totalIncome,
  userIncome,
  currency = 'EUR',
  categories,
}: HeroContributionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'full' | 'custom' | 'prepayment'>('full');
  const [customAmount, setCustomAmount] = useState('');
  
  // Estados para pre-pago
  const [prepaymentAmount, setPrepaymentAmount] = useState('');
  const [prepaymentCategory, setPrepaymentCategory] = useState('');
  const [prepaymentReason, setPrepaymentReason] = useState('');
  const [prepaymentExpenseDesc, setPrepaymentExpenseDesc] = useState('');
  const [prepaymentIncomeDesc, setPrepaymentIncomeDesc] = useState('');

  // Filtrar solo categorías de tipo expense
  const expenseCategories = categories.filter(c => c.type === 'expense');

  if (!contribution) {
    return (
      <Card className="border-2 border-dashed">
        <CardHeader>
          <CardTitle className="text-2xl">🎯 Tu Contribución Este Mes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            No hay contribuciones calculadas para este mes.
          </p>
          <p className="text-sm text-muted-foreground">
            Asegúrate de que tu ingreso mensual y la meta del hogar estén configurados.
          </p>
        </CardContent>
      </Card>
    );
  }

  const percentage = totalIncome > 0 ? (userIncome / totalIncome) * 100 : 0;
  
  // adjustments_total puede ser positivo (cargos extra) o negativo (descuentos)
  const hasAdjustments = (contribution.adjustments_total || 0) !== 0;
  // expected_amount YA incluye adjustments_total (calculado en el trigger)
  const remainingToPay = contribution.expected_amount - (contribution.paid_amount || 0);

  // DEBUG: Forzar recálculo del status localmente si los datos del servidor están incorrectos
  const actualStatus = remainingToPay > 0 ? 'pending' : remainingToPay < 0 ? 'overpaid' : 'paid';
  const actualIsPending = actualStatus === 'pending' || contribution.status === 'partial';
  const actualIsOverpaid = actualStatus === 'overpaid';

  const handleRecordPayment = async () => {
    if (!contribution) return;

    let amountToRecord: number;

    if (paymentMode === 'full') {
      amountToRecord = remainingToPay;
    } else if (paymentMode === 'custom') {
      amountToRecord = parseFloat(customAmount);
      if (isNaN(amountToRecord) || amountToRecord <= 0) {
        toast.error('Por favor, introduce un monto válido');
        return;
      }
    } else {
      // paymentMode === 'prepayment'
      return handlePrepaymentSubmit();
    }

    setIsLoading(true);
    const result = await recordContributionPayment(contribution.id, amountToRecord);

    if (result.ok) {
      toast.success('✅ Pago registrado correctamente');
      setCustomAmount('');
      setPaymentMode('full');
      // Recargar página después de 1 segundo
      setTimeout(() => {
        toast.info('🔄 Actualizando...', { duration: 2000 });
        window.location.reload();
      }, 1000);
    } else {
      toast.error(result.message);
    }
    setIsLoading(false);
  };

  const handlePrepaymentSubmit = async () => {
    if (!contribution) return;

    // Validaciones
    if (!prepaymentAmount || isNaN(parseFloat(prepaymentAmount)) || parseFloat(prepaymentAmount) <= 0) {
      toast.error('Por favor, introduce un monto válido');
      return;
    }

    if (!prepaymentCategory) {
      toast.error('Por favor, selecciona una categoría');
      return;
    }

    if (!prepaymentReason.trim()) {
      toast.error('Por favor, describe el motivo del pre-pago');
      return;
    }

    if (!prepaymentExpenseDesc.trim()) {
      toast.error('Por favor, describe el gasto realizado');
      return;
    }

    if (!prepaymentIncomeDesc.trim()) {
      toast.error('Por favor, describe tu aporte');
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append('contribution_id', contribution.id);
    formData.append('amount', (-parseFloat(prepaymentAmount)).toString()); // Negativo = reducción
    formData.append('category_id', prepaymentCategory);
    formData.append('reason', prepaymentReason);
    formData.append('expense_description', prepaymentExpenseDesc);
    formData.append('income_description', prepaymentIncomeDesc);

    const result = await createPrepaymentRequest(formData);

    if (result.ok) {
      toast.success('✅ Solicitud de pre-pago enviada', {
        description: 'Un owner debe aprobarla para que se registre en el sistema',
        duration: 5000,
      });
      
      // Resetear formulario
      setPrepaymentAmount('');
      setPrepaymentCategory('');
      setPrepaymentReason('');
      setPrepaymentExpenseDesc('');
      setPrepaymentIncomeDesc('');
      setPaymentMode('full');

      // Recargar después de 1 segundo
      setTimeout(() => {
        toast.info('🔄 Actualizando...', { duration: 2000 });
        window.location.reload();
      }, 1000);
    } else {
      toast.error(result.message);
    }

    setIsLoading(false);
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center justify-between">
          <span>🎯 Tu Contribución Este Mes</span>
          <Badge
            variant={actualIsOverpaid || (!actualIsPending && remainingToPay <= 0) ? 'default' : 'secondary'}
            className={`text-sm ${actualIsOverpaid ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            {!actualIsPending && remainingToPay <= 0 ? (
              <>
                <CheckCircle2 className="mr-1 h-4 w-4" />
                {actualIsOverpaid ? 'Aporte Extra' : 'Pagado'}
              </>
            ) : (
              <>
                <Clock className="mr-1 h-4 w-4" />
                {contribution.status === 'partial' ? 'Parcial' : 'Pendiente'}
              </>
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
            <CardContent className="space-y-6">
        {/* Desglose de montos */}
        <div className="space-y-3">
          {/* Mostrar primero la base de contribución (sin ajustes) */}
          {hasAdjustments && (
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">
                Contribución base:
              </span>
              <span className="text-lg font-semibold text-muted-foreground">
                {formatCurrency(contribution.expected_amount - (contribution.adjustments_total || 0), currency)}
              </span>
            </div>
          )}

          {/* Luego los ajustes */}
          {hasAdjustments && (
            <div className={`flex items-baseline justify-between ${
              (contribution.adjustments_total || 0) < 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-orange-600 dark:text-orange-400'
            }`}>
              <span className="text-sm flex items-center gap-1">
                <TrendingDown className="h-4 w-4" />
                Ajustes:
              </span>
              <span className="text-xl font-semibold">
                {(contribution.adjustments_total || 0) < 0 ? '' : '+'}
                {formatCurrency(contribution.adjustments_total || 0, currency)}
              </span>
            </div>
          )}

          {/* Total esperado - lo más importante */}
          <div className="flex items-baseline justify-between pt-2 border-t">
            <span className="text-sm font-medium">
              Total esperado:
            </span>
            <span className="text-2xl font-bold">
              {formatCurrency(contribution.expected_amount, currency)}
            </span>
          </div>

          {/* Monto ya pagado */}
          {contribution.paid_amount > 0 && (
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Ya pagado:</span>
              <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(contribution.paid_amount, currency)}
              </span>
            </div>
          )}

          {/* Pendiente o aporte extra */}
          {remainingToPay > 0 && (
            <div className="pt-2 border-t">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">Pendiente:</span>
                <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(remainingToPay, currency)}
                </span>
              </div>
            </div>
          )}

          {remainingToPay < 0 && (
            <div className="pt-2 border-t">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Aporte extra:</span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  +{formatCurrency(Math.abs(remainingToPay), currency)}
                </span>
              </div>
            </div>
          )}

          {/* Porcentaje del hogar */}
          <div className="flex items-baseline justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">Porcentaje del hogar:</span>
            <span className="text-lg font-semibold text-muted-foreground">
              {percentage.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Estado pagado */}
        {!actualIsOverpaid && !actualIsPending && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
            <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Has completado tu contribución de este mes. ¡Gracias!
            </p>
          </div>
        )}

        {/* Estado sobrepagado */}
        {actualIsOverpaid && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
            <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              ¡Excelente! Has aportado {formatCurrency(Math.abs(remainingToPay), currency)} más de lo esperado este mes. Gracias por tu contribución extra.
            </p>
          </div>
        )}

        {/* Formulario de pago */}
        {actualIsPending && remainingToPay > 0 && (
          <div className="space-y-4 pt-2">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Opciones de pago:</Label>
```
              
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="full"
                    checked={paymentMode === 'full'}
                    onChange={() => setPaymentMode('full')}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">
                    Pagar el total pendiente ({formatCurrency(remainingToPay, currency)})
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="custom"
                    checked={paymentMode === 'custom'}
                    onChange={() => setPaymentMode('custom')}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Cantidad personalizada</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="prepayment"
                    checked={paymentMode === 'prepayment'}
                    onChange={() => setPaymentMode('prepayment')}
                    className="h-4 w-4"
                  />
                  <span className="text-sm flex items-center gap-1">
                    <Receipt className="h-4 w-4" />
                    Pre-pago (gasto ya realizado)
                  </span>
                </label>
              </div>

              {paymentMode === 'custom' && (
                <div className="space-y-2 ml-6">
                  <Label htmlFor="customAmount" className="text-xs">
                    Cantidad a pagar (€):
                  </Label>
                  <Input
                    id="customAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="0.00"
                    className="max-w-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Puedes pagar menos (pago parcial) o más (aporte extra)
                  </p>
                </div>
              )}

              {paymentMode === 'prepayment' && (
                <div className="space-y-3 ml-6 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-900 dark:text-blue-100 mb-2">
                    💡 Los pre-pagos requieren aprobación de un owner. Proporciona todos los detalles:
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="prepaymentAmount" className="text-xs">
                      Monto del gasto (€):
                    </Label>
                    <Input
                      id="prepaymentAmount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={prepaymentAmount}
                      onChange={(e) => setPrepaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="max-w-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prepaymentCategory" className="text-xs">
                      Categoría del gasto:
                    </Label>
                    <Select value={prepaymentCategory} onValueChange={setPrepaymentCategory}>
                      <SelectTrigger id="prepaymentCategory" className="max-w-xs">
                        <SelectValue placeholder="Selecciona categoría..." />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.length === 0 && (
                          <SelectItem value="__empty__" disabled>
                            No hay categorías disponibles
                          </SelectItem>
                        )}
                        {expenseCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prepaymentReason" className="text-xs">
                      Motivo del pre-pago:
                    </Label>
                    <Input
                      id="prepaymentReason"
                      type="text"
                      value={prepaymentReason}
                      onChange={(e) => setPrepaymentReason(e.target.value)}
                      placeholder="Ej: Pagué la luz de octubre"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prepaymentExpenseDesc" className="text-xs">
                      Descripción del gasto:
                    </Label>
                    <Input
                      id="prepaymentExpenseDesc"
                      type="text"
                      value={prepaymentExpenseDesc}
                      onChange={(e) => setPrepaymentExpenseDesc(e.target.value)}
                      placeholder="Ej: Recibo luz octubre 2025"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prepaymentIncomeDesc" className="text-xs">
                      Descripción del aporte:
                    </Label>
                    <Input
                      id="prepaymentIncomeDesc"
                      type="text"
                      value={prepaymentIncomeDesc}
                      onChange={(e) => setPrepaymentIncomeDesc(e.target.value)}
                      placeholder="Ej: Aporte de Juan - Luz octubre"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleRecordPayment}
              disabled={isLoading || (paymentMode === 'custom' && !customAmount) || (paymentMode === 'prepayment' && (!prepaymentAmount || !prepaymentCategory))}
              size="lg"
              className="w-full"
            >
              {paymentMode === 'prepayment' ? (
                <>
                  <Receipt className="mr-2 h-5 w-5" />
                  {isLoading ? 'Enviando solicitud...' : 'Solicitar Aprobación de Pre-pago'}
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  {isLoading ? 'Procesando...' : 'Registrar Pago'}
                </>
              )}
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Basado en tu ingreso mensual de {formatCurrency(userIncome, currency)}
        </p>
      </CardContent>
    </Card>
  );
}
