'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { repayHouseholdLoan } from '@/lib/loans/actions';
import { Info, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface RepayLoanFormProps {
  currentDebt: number;
}

export default function RepayLoanForm({ currentDebt }: RepayLoanFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    // Advertir si se paga más de lo debido
    if (parsedAmount > currentDebt) {
      const confirmOverpay = window.confirm(
        `Estás pagando €${parsedAmount.toFixed(2)} pero solo debes €${currentDebt.toFixed(
          2,
        )}. El exceso quedará a tu favor. ¿Deseas continuar?`,
      );
      if (!confirmOverpay) {
        return;
      }
    }

    setLoading(true);

    const result = await repayHouseholdLoan(parsedAmount);

    if (result.ok) {
      alert('✅ Pago registrado exitosamente');
      router.push('/sickness/credito-deuda');
    } else {
      alert('❌ Error: ' + result.message);
      setLoading(false);
    }
  };

  const handlePayFull = () => {
    setAmount(currentDebt.toFixed(2));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Info de deuda actual */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Tu deuda con el hogar:</strong>{' '}
          {currentDebt > 0 ? (
            <span className="text-orange-600 font-semibold">€{currentDebt.toFixed(2)}</span>
          ) : currentDebt < 0 ? (
            <span className="text-green-600 font-semibold">
              Crédito a favor: €{Math.abs(currentDebt).toFixed(2)}
            </span>
          ) : (
            <span className="text-green-600">€0.00 (sin deuda)</span>
          )}
          <br />
          <span className="text-muted-foreground text-sm">
            El pago se registra inmediatamente en la cuenta común del hogar.
          </span>
        </AlertDescription>
      </Alert>

      {/* Monto */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="amount">Monto a pagar (€)</Label>
          {currentDebt > 0 && (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={handlePayFull}
              disabled={loading}
              className="h-auto p-0"
            >
              Pagar deuda completa (€{currentDebt.toFixed(2)})
            </Button>
          )}
        </div>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          disabled={loading}
          required
        />
        {parseFloat(amount) > 0 && (
          <p className="text-sm text-muted-foreground">
            {parseFloat(amount) > currentDebt ? (
              <span className="text-orange-600">
                ⚠️ Pagarás €{(parseFloat(amount) - currentDebt).toFixed(2)} de más (quedará a tu
                favor)
              </span>
            ) : parseFloat(amount) === currentDebt ? (
              <span className="text-green-600">✓ Saldarás la deuda completamente</span>
            ) : (
              <span>Quedarán €{(currentDebt - parseFloat(amount)).toFixed(2)} por pagar</span>
            )}
          </p>
        )}
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registrando pago...
            </>
          ) : (
            'Realizar Pago'
          )}
        </Button>
      </div>
    </form>
  );
}
