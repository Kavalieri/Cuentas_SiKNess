'use client';

import { AlertCircle, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { MonthlyPeriod } from '@/lib/periods';
import { formatPeriodMonth } from '@/lib/periods';
import Link from 'next/link';

interface PendingPeriodsAlertProps {
  periods: MonthlyPeriod[];
}

export function PendingPeriodsAlert({ periods }: PendingPeriodsAlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (periods.length === 0 || dismissed) {
    return null;
  }

  return (
    <div className="relative rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/50 dark:bg-yellow-900/10">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-500" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
            {periods.length === 1
              ? 'Tienes 1 mes pendiente de cerrar'
              : `Tienes ${periods.length} meses pendientes de cerrar`}
          </h3>
          <div className="mt-2 text-sm text-yellow-800 dark:text-yellow-200">
            {periods.length === 1 ? (
              <p>
                El mes de <strong>{formatPeriodMonth(periods[0]!.year, periods[0]!.month)}</strong>{' '}
                está listo para cerrar. Cierra el mes para consolidar el balance y evitar
                modificaciones accidentales.
              </p>
            ) : (
              <p>
                Los meses{' '}
                {periods.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && (i === periods.length - 1 ? ' y ' : ', ')}
                    <strong>{formatPeriodMonth(p.year, p.month)}</strong>
                  </span>
                ))}{' '}
                están listos para cerrar.
              </p>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/app/periods">Ver Períodos</Link>
            </Button>
            {periods.length === 1 && (
              <Button asChild variant="default" size="sm">
                <Link href={`/app/periods/${periods[0]!.id}`}>Cerrar {formatPeriodMonth(periods[0]!.year, periods[0]!.month)}</Link>
              </Button>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => setDismissed(true)}
          aria-label="Cerrar alerta"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
