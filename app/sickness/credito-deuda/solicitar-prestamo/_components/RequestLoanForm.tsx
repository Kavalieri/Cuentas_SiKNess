'use client';

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
import { Textarea } from '@/components/ui/textarea';
import { requestLoan } from '@/lib/loans/actions';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Member {
  profile_id: string;
  display_name: string;
  balance: number;
}

interface RequestLoanFormProps {
  members: Member[];
}

export default function RequestLoanForm({ members }: RequestLoanFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [lenderId, setLenderId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!lenderId) {
      alert('Debes seleccionar un prestamista');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    setLoading(true);

    const result = await requestLoan(lenderId, parsedAmount, description);

    if (result.ok) {
      alert('✅ Préstamo registrado exitosamente');
      router.push('/sickness/credito-deuda');
    } else {
      alert('❌ Error: ' + result.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Selección de prestamista */}
      <div className="space-y-2">
        <Label htmlFor="lender">¿Quién te presta el dinero?</Label>
        <Select value={lenderId} onValueChange={setLenderId} disabled={loading}>
          <SelectTrigger id="lender">
            <SelectValue placeholder="Selecciona un miembro" />
          </SelectTrigger>
          <SelectContent>
            {members.map((member) => (
              <SelectItem key={member.profile_id} value={member.profile_id}>
                {member.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay otros miembros en el hogar</p>
        )}
      </div>

      {/* Monto */}
      <div className="space-y-2">
        <Label htmlFor="amount">Monto del préstamo (€)</Label>
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
        <Button type="submit" disabled={loading || members.length === 0}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registrando...
            </>
          ) : (
            'Registrar Préstamo'
          )}
        </Button>
      </div>
    </form>
  );
}
