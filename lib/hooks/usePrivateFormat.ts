import { usePrivacy } from '@/components/shared/PrivacyProvider';
import { formatCurrency } from '@/lib/format';

/**
 * Hook para formatear monedas respetando la configuración de privacidad
 * Si hideAmounts está activo, muestra "•••" en lugar del monto
 */
export function usePrivateFormat() {
  const { hideAmounts } = usePrivacy();

  const formatPrivateCurrency = (
    amount: number,
    currency: string = 'EUR',
    locale: string = 'es-ES'
  ): string => {
    if (hideAmounts) {
      return '•••';
    }
    return formatCurrency(amount, currency, locale);
  };

  const formatPrivateNumber = (value: number | string): string => {
    if (hideAmounts) {
      return '•••';
    }
    return value.toString();
  };

  return {
    formatPrivateCurrency,
    formatPrivateNumber,
    hideAmounts,
  };
}
