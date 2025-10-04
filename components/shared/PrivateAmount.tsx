'use client';

import { usePrivateFormat } from '@/lib/hooks/usePrivateFormat';

interface PrivateAmountProps {
  amount: number;
  currency?: string;
  locale?: string;
  className?: string;
}

/**
 * Componente para mostrar cantidades que respeta la configuración de privacidad
 * Uso: <PrivateAmount amount={1500.50} />
 */
export function PrivateAmount({
  amount,
  currency = 'EUR',
  locale = 'es-ES',
  className,
}: PrivateAmountProps) {
  const { formatPrivateCurrency } = usePrivateFormat();

  return <span className={className}>{formatPrivateCurrency(amount, currency, locale)}</span>;
}
