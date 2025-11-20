'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { requestHouseholdLoan } from '@/lib/loans/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface RequestLoanFormProps {
  availableBalance: number;
}

export default function RequestLoanForm({ availableBalance }: RequestLoanFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    if (parsedAmount > availableBalance) {
      alert(
        `El monto solicitado (€${parsedAmount.toFixed(2)}) excede el disponible (€${availableBalance.toFixed(2)})`,
      );
      return;
    }

    setLoading(true);

    const result = await requestHouseholdLoan(parsedAmount, description || undefined);

    if (result.ok) {
      alert('✅ Solicitud de préstamo creada. Pendiente de aprobación del administrador.');
      router.push('/sickness/credito-deuda');
    } else {
      alert('❌ Error: ' + result.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Info de saldo disponible */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Saldo disponible para préstamos:</strong> €{availableBalance.toFixed(2)}
          <br />
          <span className="text-muted-foreground text-sm">
            Tu solicitud será revisada por el administrador del hogar antes de ser aprobada.
          </span>
        </AlertDescription>
      </Alert>

      {/* Monto */}
      <div className="space-y-2">
        <Label htmlFor="amount">Monto del préstamo (€)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          max={availableBalance}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Máximo: €${availableBalance.toFixed(2)}`}
          disabled={loading}
          required
        />
        <p className="text-xs text-muted-foreground">
          Máximo disponible: €{availableBalance.toFixed(2)}
        </p>
      </div>

      {/* Descripción opcional */}
      <div className="space-y-2">
        <Label htmlFor="description">
          Descripción (opcional)
          <span className="text-muted-foreground ml-2">Ej: Para compra de...</span>
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe el motivo del préstamo..."
          disabled={loading}
          rows={3}
        />
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || availableBalance <= 0}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando solicitud...
            </>
          ) : (
            'Solicitar Préstamo'
          )}
        </Button>
      </div>
    </form>
  );
}
