/**
 * Formatea un número como moneda
 */
export const formatCurrency = (
  amount: number,
  currency = 'EUR',
  locale = 'es-ES',
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Parsea un string de moneda a número
 */
export const parseCurrency = (value: string): number => {
  // Elimina todo excepto números, puntos y comas
  const cleaned = value.replace(/[^\d,.-]/g, '');
  // Reemplaza coma por punto (formato español)
  const normalized = cleaned.replace(',', '.');
  return parseFloat(normalized) || 0;
};

/**
 * Formatea una fecha en formato español
 */
export const formatDate = (date: Date, locale = 'es-ES'): string => {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};
