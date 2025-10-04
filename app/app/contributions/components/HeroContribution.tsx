'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Clock, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { recordContributionPayment } from '@/app/app/contributions/actions';
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

type HeroContributionProps = {
  contribution: Contribution | null;
  userEmail: string;
  totalIncome: number;
  userIncome: number;
  currency?: string;
};

export function HeroContribution({
  contribution,
  totalIncome,
  userIncome,
  currency = 'EUR',
}: HeroContributionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'full' | 'custom'>('full');
  const [customAmount, setCustomAmount] = useState('');

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
  const isPaid = contribution.status === 'paid' || contribution.status === 'overpaid';
  const isPending = contribution.status === 'pending' || contribution.status === 'partial';
  const isOverpaid = contribution.status === 'overpaid';
  
  // adjustments_total puede ser positivo (cargos extra) o negativo (descuentos)
  const hasAdjustments = (contribution.adjustments_total || 0) !== 0;
  // expected_amount YA incluye adjustments_total (calculado en el trigger)
  const remainingToPay = contribution.expected_amount - (contribution.paid_amount || 0);

  const handleRecordPayment = async () => {
    let amountToRecord: number;

    if (paymentMode === 'full') {
      amountToRecord = remainingToPay;
    } else {
      amountToRecord = parseFloat(customAmount);
      if (isNaN(amountToRecord) || amountToRecord <= 0) {
        toast.error('Por favor, introduce un monto válido');
        return;
      }
    }

    setIsLoading(true);
    const result = await recordContributionPayment(contribution.id, amountToRecord);

    if (result.ok) {
      toast.success('✅ Pago registrado correctamente');
      setCustomAmount('');
      setPaymentMode('full');
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
            variant={isPaid ? 'default' : 'secondary'}
            className={`text-sm ${isOverpaid ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            {isPaid ? (
              <>
                <CheckCircle2 className="mr-1 h-4 w-4" />
                {isOverpaid ? 'Aporte Extra' : 'Pagado'}
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
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">
              Contribución esperada:
            </span>
            <span className="text-2xl font-bold">
              {formatCurrency(contribution.expected_amount, currency)}
            </span>
          </div>

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

          {contribution.paid_amount > 0 && (
            <div className="flex items-baseline justify-between text-muted-foreground">
              <span className="text-sm">Ya pagado:</span>
              <span className="text-lg font-semibold">
                {formatCurrency(contribution.paid_amount, currency)}
              </span>
            </div>
          )}

          {isPending && remainingToPay > 0 && (
            <div className="pt-2 border-t">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">Pendiente:</span>
                <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(remainingToPay, currency)}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-baseline justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">Porcentaje del hogar:</span>
            <span className="text-lg font-semibold text-muted-foreground">
              {percentage.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Estado pagado */}
        {isPaid && !isOverpaid && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
            <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Has completado tu contribución de este mes. ¡Gracias!
            </p>
          </div>
        )}

        {/* Estado sobrepagado */}
        {isOverpaid && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
            <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              ¡Excelente! Has aportado {formatCurrency(contribution.paid_amount - contribution.expected_amount, currency)} más de lo esperado este mes. Gracias por tu contribución extra.
            </p>
          </div>
        )}

        {/* Formulario de pago */}
        {isPending && remainingToPay > 0 && (
          <div className="space-y-4 pt-2">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Opciones de pago:</Label>
              
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
            </div>

            <Button
              onClick={handleRecordPayment}
              disabled={isLoading || (paymentMode === 'custom' && !customAmount)}
              size="lg"
              className="w-full"
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              {isLoading ? 'Procesando...' : 'Registrar Pago'}
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
