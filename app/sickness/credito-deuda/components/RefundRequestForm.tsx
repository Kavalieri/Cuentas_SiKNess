'use client';

import { useState } from 'react';
import { requestCreditRefund } from '@/app/sickness/credito-deuda/actions';

interface RefundRequestFormProps {
  credit: number;
  onSuccess?: () => void;
}

export function RefundRequestForm({ credit, onSuccess }: RefundRequestFormProps) {
  const [amount, setAmount] = useState(credit.toString());
  const [notes, setNotes] = useState('');
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

      if (numAmount > credit) {
        setError(`El importe no puede exceder tu crédito disponible (€${credit.toFixed(2)})`);
        setIsLoading(false);
        return;
      }

      // Llamar a la acción de servidor
      const result = await requestCreditRefund(numAmount, notes || undefined);

      if (result.ok) {
        const requestId = result.data?.requestId || 'sin-id';
        setSuccess(`✅ Reembolso solicitado correctamente (ID: ${requestId})`);
        setAmount(credit.toString());
        setNotes('');

        // Llamar callback si existe
        if (onSuccess) {
          onSuccess();
        }

        // Limpiar mensaje de éxito después de 5 segundos
        setTimeout(() => {
          setSuccess(null);
        }, 5000);
      } else {
        setError(result.message || 'Error al solicitar el reembolso');
      }
    } catch (err) {
      console.error('Error en RefundRequestForm:', err);
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
            max={credit}
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
            Notas (opcional)
          </label>
          <input
            name="notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border px-3 py-2 bg-background"
            placeholder="Motivo del reembolso"
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
        disabled={isLoading || credit <= 0}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {isLoading ? '⏳ Procesando...' : 'Solicitar reembolso'}
      </button>
    </form>
  );
}
