'use client';

import { requestPersonalLoan } from '@/app/sickness/credito-deuda/actions';
import { useState } from 'react';

interface LoanRequestFormProps {
  onSuccess?: () => void;
}

export function LoanRequestForm({ onSuccess }: LoanRequestFormProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const numAmount = Number(amount);

      // Validación básica
      if (numAmount <= 0) {
        setError('El importe debe ser mayor a 0');
        setIsLoading(false);
        return;
      }

      // Llamar a la acción de servidor
      const result = await requestPersonalLoan(numAmount, reason || 'Sin especificar');

      if (result.ok) {
        const loanId = result.data?.loanId || 'sin-id';
        setSuccess(`✅ Solicitud de préstamo enviada (ID: ${loanId})`);
        setAmount('');
        setReason('');

        // Llamar callback si existe
        if (onSuccess) {
          onSuccess();
        }

        // Limpiar mensaje de éxito después de 5 segundos
        setTimeout(() => {
          setSuccess(null);
        }, 5000);
      } else {
        setError(result.message || 'Error al solicitar el préstamo');
      }
    } catch (err) {
      console.error('Error en LoanRequestForm:', err);
      setError('Error inesperado al procesar la solicitud');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Importe (€)
          </label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min={0.01}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError(null); // Limpiar error cuando el usuario cambia el valor
            }}
            className="w-full rounded-md border px-3 py-2 bg-background"
            required
            disabled={isLoading}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Motivo (opcional)
          </label>
          <input
            name="reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-md border px-3 py-2 bg-background"
            placeholder="Razón del préstamo"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950 p-3 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Mensaje de éxito */}
      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-950 p-3 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {isLoading ? '⏳ Procesando...' : 'Solicitar préstamo'}
      </button>
    </form>
  );
}
