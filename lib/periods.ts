/**
 * Utilidades para trabajar con períodos mensuales
 */

import type { Database } from '@/types/database';

export type MonthlyPeriodStatus = 'open' | 'pending_close' | 'closed';

// Importar tipo generado desde Supabase
export type MonthlyPeriod = Database['public']['Tables']['monthly_periods']['Row'];

export interface MonthInfo {
  year: number;
  month: number;
}

/**
 * Obtiene el mes actual
 */
export function getCurrentMonth(): MonthInfo {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

/**
 * Obtiene el mes anterior
 */
export function getPreviousMonth(year: number, month: number): MonthInfo {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}

/**
 * Obtiene el mes siguiente
 */
export function getNextMonth(year: number, month: number): MonthInfo {
  if (month === 12) {
    return { year: year + 1, month: 1 };
  }
  return { year, month: month + 1 };
}

/**
 * Verifica si un mes es el mes actual
 */
export function isCurrentMonth(year: number, month: number): boolean {
  const current = getCurrentMonth();
  return year === current.year && month === current.month;
}

/**
 * Verifica si un mes está en el pasado
 */
export function isPastMonth(year: number, month: number): boolean {
  const current = getCurrentMonth();
  if (year < current.year) return true;
  if (year === current.year && month < current.month) return true;
  return false;
}

/**
 * Verifica si un mes está en el futuro
 */
export function isFutureMonth(year: number, month: number): boolean {
  const current = getCurrentMonth();
  if (year > current.year) return true;
  if (year === current.year && month > current.month) return true;
  return false;
}

/**
 * Formatea un período como string legible
 * @example formatPeriodMonth(2025, 10) // "Octubre 2025"
 */
export function formatPeriodMonth(year: number, month: number, locale = 'es-ES'): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

/**
 * Formatea un período como string corto
 * @example formatPeriodMonthShort(2025, 10) // "Oct 2025"
 */
export function formatPeriodMonthShort(year: number, month: number, locale = 'es-ES'): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
}

/**
 * Obtiene el primer día del mes como Date
 */
export function getMonthStartDate(year: number, month: number): Date {
  return new Date(year, month - 1, 1);
}

/**
 * Obtiene el último día del mes como Date
 */
export function getMonthEndDate(year: number, month: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

/**
 * Obtiene el rango de fechas de un mes como ISO strings
 */
export function getMonthDateRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1).toISOString().split('T')[0] as string;
  const end = new Date(year, month, 0).toISOString().split('T')[0] as string;
  return { start, end };
}

/**
 * Compara dos períodos mensuales
 * @returns -1 si a < b, 0 si a === b, 1 si a > b
 */
export function compareMonths(
  a: { year: number; month: number },
  b: { year: number; month: number }
): number {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
}

/**
 * Genera un array de períodos mensuales entre dos fechas
 * @param start Fecha de inicio
 * @param end Fecha de fin
 * @returns Array de { year, month }
 */
export function getMonthRange(start: MonthInfo, end: MonthInfo): MonthInfo[] {
  const months: MonthInfo[] = [];
  let current = { ...start };

  while (compareMonths(current, end) <= 0) {
    months.push({ ...current });
    current = getNextMonth(current.year, current.month);
  }

  return months;
}

/**
 * Calcula el ahorro del mes
 */
export function calculateMonthlySavings(period: MonthlyPeriod): number {
  return period.total_income - period.total_expenses;
}

/**
 * Calcula el porcentaje de ahorro del mes
 */
export function calculateSavingsPercentage(period: MonthlyPeriod): number {
  if (period.total_income === 0) return 0;
  return ((period.total_income - period.total_expenses) / period.total_income) * 100;
}

/**
 * Obtiene el badge de estado de un período
 */
export function getPeriodStatusInfo(status: string): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: string;
} {
  switch (status as MonthlyPeriodStatus) {
    case 'open':
      return {
        label: 'Abierto',
        variant: 'default',
        icon: '🟢',
      };
    case 'pending_close':
      return {
        label: 'Pendiente',
        variant: 'secondary',
        icon: '🟡',
      };
    case 'closed':
      return {
        label: 'Cerrado',
        variant: 'outline',
        icon: '🔒',
      };
    default:
      return {
        label: 'Desconocido',
        variant: 'outline',
        icon: '❓',
      };
  }
}

/**
 * Determina el estado inicial de un período al crearlo
 */
export function getInitialPeriodStatus(year: number, month: number): MonthlyPeriodStatus {
  if (isCurrentMonth(year, month)) {
    return 'open';
  } else if (isPastMonth(year, month)) {
    return 'pending_close';
  } else {
    return 'open'; // Meses futuros también abiertos
  }
}
