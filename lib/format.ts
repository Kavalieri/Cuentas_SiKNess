import type { Numeric } from '@/types/database.generated';

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
 * @param value - Valor que puede ser string (de PostgreSQL), number, o tipo Numeric de Kysely
 * @returns number - El valor como número de JavaScript
 *
 * @example
 * const income = toNumber(row.monthly_income); // "1500.00" → 1500
 */
export const toNumber = (value: string | number | Numeric | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  // Numeric de Kysely es ColumnType que en runtime es string
  const stringValue = typeof value === 'string' ? value : String(value);
  const parsed = parseFloat(stringValue);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Parsea una fecha/datetime en zona horaria local para evitar shifts de UTC
 *
 * Problema: new Date('2025-06-01') interpreta como UTC medianoche,
 * que al convertir a local (UTC+2) se convierte en 2025-05-31 22:00.
 *
 * Esta función parsea los componentes y construye la fecha en local.
 *
 * @param dateString - Fecha en formato 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:MM:SS'
 * @returns Date - Fecha parseada en zona horaria local
 */
export const parseLocalDate = (dateString: string): Date => {
  // Extraer componentes
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);

  if (!match) {
    // Fallback al comportamiento por defecto
    return new Date(dateString);
  }

  const year = match[1]!;
  const month = match[2]!;
  const day = match[3]!;
  const hour = match[4] || '0';
  const minute = match[5] || '0';
  const second = match[6] || '0';

  // Crear fecha en zona horaria local (NO UTC)
  return new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1, // Meses son 0-indexed
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(minute, 10),
    parseInt(second, 10),
  );
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
