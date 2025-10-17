'use client';

import { useSiKness } from '@/contexts/SiKnessContext';
import { formatCurrency } from '@/lib/format';

type UsePrivateFormat = () => {
  hideAmounts: boolean;
  formatPrivateCurrency: (amount: number, currency?: string, locale?: string) => string;
  formatPrivateNumber: (value: number, locale?: string) => string;
};

/**
 * Hook de formateo que respeta el modo de privacidad global del contexto SiKness.
 * Cuando privacyMode está activo, oculta las cantidades.
 */
export const usePrivateFormat: UsePrivateFormat = () => {
  const { privacyMode } = useSiKness();

  const mask = () => '••••';

  const formatPrivateCurrency = (amount: number, currency = 'EUR', locale = 'es-ES') => {
    if (privacyMode) return mask();
    return formatCurrency(amount, currency, locale);
  };

  const formatPrivateNumber = (value: number, locale = 'es-ES') => {
    if (privacyMode) return mask();
    return new Intl.NumberFormat(locale).format(value);
  };

  return { hideAmounts: privacyMode, formatPrivateCurrency, formatPrivateNumber };
};

export default usePrivateFormat;
