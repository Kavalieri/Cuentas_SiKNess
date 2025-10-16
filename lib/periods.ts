/**
 * Utilidades para trabajar con períodos mensuales
 */

import { toNumber } from '@/lib/format';
import type { Database } from '@/types/database';

// Importar tipo generado desde Supabase
export type MonthlyPeriod = Database['public']['Tables']['monthly_periods']['Row'];

export type MonthlyPeriodPhase = 'preparing' | 'validation' | 'active' | 'closing' | 'closed';

export type LegacyMonthlyPeriodStatus = 'open' | 'pending_close' | 'closed' | 'active' | 'future';

const KNOWN_PHASES: readonly MonthlyPeriodPhase[] = [
  'preparing',
  'validation',
  'active',
  'closing',
  'closed',
];

const KNOWN_PHASE_SET = new Set<MonthlyPeriodPhase>(KNOWN_PHASES);

const LEGACY_STATUS_TO_PHASE: Record<LegacyMonthlyPeriodStatus, MonthlyPeriodPhase> = {
  open: 'active',
  active: 'active',
  future: 'preparing',
  pending_close: 'closing',
  closed: 'closed',
};

const DEFAULT_LEGACY_STATUS_BY_PHASE: Record<MonthlyPeriodPhase, LegacyMonthlyPeriodStatus> = {
  preparing: 'future',
  validation: 'open',
  active: 'open',
  closing: 'pending_close',
  closed: 'closed',
};

export type NormalizedPeriodPhase = {
  phase: MonthlyPeriodPhase | 'unknown';
  legacyStatus: LegacyMonthlyPeriodStatus | 'unknown';
};

const sanitizePhaseValue = (value?: string | null): string | null =>
  value ? value.toString().trim().toLowerCase() : null;

export function normalizePeriodPhase(
  phase?: string | null,
  status?: string | null,
): NormalizedPeriodPhase {
  const normalizedPhase = sanitizePhaseValue(phase);
  if (normalizedPhase && KNOWN_PHASE_SET.has(normalizedPhase as MonthlyPeriodPhase)) {
    const matchedPhase = normalizedPhase as MonthlyPeriodPhase;
    return {
      phase: matchedPhase,
      legacyStatus: DEFAULT_LEGACY_STATUS_BY_PHASE[matchedPhase],
    };
  }

  const normalizedStatus = sanitizePhaseValue(status);
  if (normalizedStatus) {
    if (KNOWN_PHASE_SET.has(normalizedStatus as MonthlyPeriodPhase)) {
      const matchedPhase = normalizedStatus as MonthlyPeriodPhase;
      return {
        phase: matchedPhase,
        legacyStatus: DEFAULT_LEGACY_STATUS_BY_PHASE[matchedPhase],
      };
    }

    if (normalizedStatus in LEGACY_STATUS_TO_PHASE) {
      const legacyStatus = normalizedStatus as LegacyMonthlyPeriodStatus;
      return {
        phase: LEGACY_STATUS_TO_PHASE[legacyStatus],
        legacyStatus,
      };
    }
  }

  return { phase: 'unknown', legacyStatus: 'unknown' };
}

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
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * Formatea un período como string corto
 * @example formatPeriodMonthShort(2025, 10) // "Oct 2025"
 */
export function formatPeriodMonthShort(year: number, month: number, locale = 'es-ES'): string {
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
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
  b: { year: number; month: number },
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
  const totalIncome = toNumber(period.total_income);
  const totalExpenses = toNumber(period.total_expenses);
  return totalIncome - totalExpenses;
}

/**
 * Calcula el porcentaje de ahorro del mes
 */
export function calculateSavingsPercentage(period: MonthlyPeriod): number {
  const totalIncome = toNumber(period.total_income);
  if (totalIncome === 0) return 0;

  const savings = calculateMonthlySavings(period);
  return (savings / totalIncome) * 100;
}

const PHASE_BADGE_INFO: Record<
  MonthlyPeriodPhase,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: string }
> = {
  preparing: {
    label: 'Configuración',
    variant: 'secondary',
    icon: '🛠️',
  },
  validation: {
    label: 'Validación',
    variant: 'secondary',
    icon: '🧪',
  },
  active: {
    label: 'Activo',
    variant: 'default',
    icon: '🟢',
  },
  closing: {
    label: 'Cierre en curso',
    variant: 'secondary',
    icon: '⏳',
  },
  closed: {
    label: 'Cerrado',
    variant: 'outline',
    icon: '🔒',
  },
};

export type PeriodStatusInfo = {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: string;
  phase: MonthlyPeriodPhase | 'unknown';
  legacyStatus: LegacyMonthlyPeriodStatus | 'unknown';
};

export interface PeriodGrouping {
  all: MonthlyPeriod[];
  open: MonthlyPeriod[];
  closing: MonthlyPeriod[];
  closed: MonthlyPeriod[];
  upcoming: MonthlyPeriod[];
  actionable: MonthlyPeriod[];
}

/**
 * Obtiene el badge de estado de un período con soporte para fase y status legacy
 */
export function getPeriodStatusInfo(
  input:
    | string
    | null
    | undefined
    | {
        phase?: string | null;
        status?: string | null;
      },
): PeriodStatusInfo {
  const payload =
    typeof input === 'string' || input == null ? { status: input ?? undefined } : input;

  const normalized = normalizePeriodPhase(payload.phase, payload.status);

  if (normalized.phase !== 'unknown') {
    const info = PHASE_BADGE_INFO[normalized.phase];
    return {
      ...info,
      phase: normalized.phase,
      legacyStatus: normalized.legacyStatus,
    };
  }

  if (normalized.legacyStatus !== 'unknown') {
    const derivedPhase = LEGACY_STATUS_TO_PHASE[normalized.legacyStatus];
    const info = PHASE_BADGE_INFO[derivedPhase];
    return {
      ...info,
      phase: derivedPhase,
      legacyStatus: normalized.legacyStatus,
    };
  }

  return {
    label: 'Desconocido',
    variant: 'outline',
    icon: '❓',
    phase: 'unknown',
    legacyStatus: normalized.legacyStatus,
  };
}

const OPEN_PHASE_LOOKUP: Record<MonthlyPeriodPhase, boolean> = {
  preparing: true,
  validation: true,
  active: true,
  closing: false,
  closed: false,
};

const UPCOMING_PHASE_LOOKUP: Record<MonthlyPeriodPhase, boolean> = {
  preparing: true,
  validation: true,
  active: false,
  closing: false,
  closed: false,
};

/**
 * Agrupa una colección de períodos según la fase normalizada y detecta aquellos que requieren acción.
 */
export function groupPeriodsByPhase(periods: MonthlyPeriod[]): PeriodGrouping {
  const open: MonthlyPeriod[] = [];
  const closing: MonthlyPeriod[] = [];
  const closed: MonthlyPeriod[] = [];
  const upcoming: MonthlyPeriod[] = [];
  const actionable: MonthlyPeriod[] = [];

  for (const period of periods) {
    const normalized = normalizePeriodPhase(period.phase, period.status);
    const { phase } = normalized;

    if (phase !== 'unknown') {
      if (OPEN_PHASE_LOOKUP[phase]) {
        open.push(period);
      }

      if (phase === 'closing') {
        closing.push(period);
        actionable.push(period);
      }

      if (phase === 'closed') {
        closed.push(period);
      }

      if (UPCOMING_PHASE_LOOKUP[phase]) {
        upcoming.push(period);
      }

      continue;
    }

    const statusValue = period.status?.toLowerCase();
    if (statusValue === 'pending_close') {
      closing.push(period);
      actionable.push(period);
    }
  }

  return {
    all: periods,
    open,
    closing,
    closed,
    upcoming,
    actionable,
  };
}

/**
 * Determina el estado inicial de un período al crearlo
 */
export function getInitialPeriodStatus(year: number, month: number): LegacyMonthlyPeriodStatus {
  if (isCurrentMonth(year, month)) {
    return 'open';
  }

  if (isPastMonth(year, month)) {
    return 'pending_close';
  }

  return 'open';
}
