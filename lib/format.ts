/**
 * Formatea un número como moneda
 */
export const formatCurrency = (amount: number, currency = 'EUR', locale = 'es-ES'): string => {
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
 * Convierte un valor numeric de PostgreSQL a number
 *
 * PostgreSQL devuelve los valores de tipo 'numeric' como strings
 * para preservar precisión exacta. Este helper hace la conversión
 * de forma segura.
 *
 * @param value - Valor que puede ser string (de PostgreSQL) o ya number
 * @returns number - El valor como número de JavaScript
 *
 * @example
 * const income = toNumber(row.monthly_income); // "1500.00" → 1500
 */
export const toNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
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
