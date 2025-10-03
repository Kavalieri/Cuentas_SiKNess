import {
  startOfMonth as dateFnsStartOfMonth,
  endOfMonth as dateFnsEndOfMonth,
  format,
  parseISO,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const DEFAULT_TIMEZONE = 'Europe/Madrid';

/**
 * Obtiene el primer día del mes en la zona horaria especificada
 */
export const startOfMonth = (date: Date, timezone = DEFAULT_TIMEZONE): Date => {
  const zonedDate = toZonedTime(date, timezone);
  return dateFnsStartOfMonth(zonedDate);
};

/**
 * Obtiene el último día del mes en la zona horaria especificada
 */
export const endOfMonth = (date: Date, timezone = DEFAULT_TIMEZONE): Date => {
  const zonedDate = toZonedTime(date, timezone);
  return dateFnsEndOfMonth(zonedDate);
};

/**
 * Obtiene el rango completo de un mes (primer y último día)
 */
export const getMonthRange = (
  date: Date,
  timezone = DEFAULT_TIMEZONE,
): { start: Date; end: Date } => {
  return {
    start: startOfMonth(date, timezone),
    end: endOfMonth(date, timezone),
  };
};

/**
 * Convierte una fecha a string ISO (YYYY-MM-DD) para usar en inputs de tipo date
 */
export const toISODate = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

/**
 * Convierte un string ISO a Date
 */
export const fromISODate = (isoDate: string): Date => {
  return parseISO(isoDate);
};

/**
 * Formatea una fecha para mostrar al usuario
 */
export const formatDate = (date: Date, formatStr = 'dd/MM/yyyy'): string => {
  return format(date, formatStr);
};
