'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { repayLoan } from '@/lib/loans/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface MemberDebt {
  profile_id: string;
  display_name: string;
  debt_amount: number;
}

interface RepayLoanFormProps {
  debts: MemberDebt[];
}

export default function RepayLoanForm({ debts }: RepayLoanFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [creditorId, setCreditorId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');

  // Encontrar la deuda seleccionada
  const selectedDebt = debts.find((d) => d.profile_id === creditorId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!creditorId) {
      alert('Debes seleccionar a quién le pagas');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    // Advertir si se paga más de lo debido
    if (selectedDebt && parsedAmount > selectedDebt.debt_amount) {
      const confirmOverpay = window.confirm(
        `Estás pagando €${parsedAmount.toFixed(2)} pero solo debes €${selectedDebt.debt_amount.toFixed(2)}. ¿Deseas continuar?`,
      );
      if (!confirmOverpay) {
        return;
      }
    }

    setLoading(true);

    const result = await repayLoan(creditorId, parsedAmount);

    if (result.ok) {
      alert('✅ Pago registrado exitosamente');
      router.push('/sickness/credito-deuda');
    } else {
      alert('❌ Error: ' + result.message);
      setLoading(false);
    }
  };

  const handlePayFull = () => {
    if (selectedDebt) {
      setAmount(selectedDebt.debt_amount.toFixed(2));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Selección de acreedor */}
      <div className="space-y-2">
        <Label htmlFor="creditor">¿A quién le pagas?</Label>
        <Select
          value={creditorId}
          onValueChange={setCreditorId}
          disabled={loading}
        >
          <SelectTrigger id="creditor">
            <SelectValue placeholder="Selecciona un miembro" />
          </SelectTrigger>
          <SelectContent>
            {debts.map((debt) => (
              <SelectItem key={debt.profile_id} value={debt.profile_id}>
                {debt.display_name} - Debes €{debt.debt_amount.toFixed(2)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Monto */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="amount">Monto a pagar (€)</Label>
          {selectedDebt && (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={handlePayFull}
              disabled={loading}
              className="h-auto p-0"
            >
              Pagar deuda completa (€{selectedDebt.debt_amount.toFixed(2)})
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
        {selectedDebt && parseFloat(amount) > 0 && (
          <p className="text-sm text-muted-foreground">
            {parseFloat(amount) > selectedDebt.debt_amount ? (
              <span className="text-orange-600">
                ⚠️ Pagarás €
                {(parseFloat(amount) - selectedDebt.debt_amount).toFixed(2)} de
                más
              </span>
            ) : parseFloat(amount) === selectedDebt.debt_amount ? (
              <span className="text-green-600">
                ✓ Saldarás la deuda completamente
              </span>
            ) : (
              <span>
                Quedarán €
                {(selectedDebt.debt_amount - parseFloat(amount)).toFixed(2)} por
                pagar
              </span>
            )}
          </p>
        )}
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registrando...
            </>
          ) : (
            'Registrar Pago'
          )}
        </Button>
      </div>
    </form>
  );
}
