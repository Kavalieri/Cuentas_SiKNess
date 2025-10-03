/**
 * Sistema de tema para gráficos
 * Colores coherentes y semánticos con soporte para dark mode
 */

export const CHART_COLORS = {
  // Paleta principal para categorías (hasta 8 colores únicos)
  primary: [
    '#10b981', // green-500
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#ec4899', // pink-500
    '#14b8a6', // teal-500
    '#f97316', // orange-500
  ],

  // Colores específicos por tipo
  income: '#10b981', // green-500
  expense: '#ef4444', // red-500

  // Balance (positivo/negativo)
  balance: {
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#6b7280', // gray-500
  },

  // Estados de contribución
  contribution: {
    pending: '#f59e0b', // amber-500 - Amarillo
    partial: '#3b82f6', // blue-500 - Azul
    paid: '#10b981', // green-500 - Verde
    overpaid: '#8b5cf6', // violet-500 - Púrpura
  },

  // Grises para elementos neutros
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
} as const;

export const CHART_CONFIG = {
  // Márgenes estándar
  margin: {
    top: 5,
    right: 30,
    left: 20,
    bottom: 5,
  },

  // Animaciones
  animationDuration: 800,
  animationEasing: 'ease-out' as const,

  // Responsive breakpoints
  breakpoints: {
    mobile: 480,
    tablet: 768,
    desktop: 1024,
  },
} as const;

/**
 * Obtiene un color de la paleta primary por índice
 * Hace wrap si el índice excede la cantidad de colores
 */
export function getChartColor(index: number): string {
  return CHART_COLORS.primary[index % CHART_COLORS.primary.length] ?? CHART_COLORS.primary[0];
}

/**
 * Obtiene color basado en tipo de movimiento
 */
export function getMovementColor(type: 'income' | 'expense'): string {
  return type === 'income' ? CHART_COLORS.income : CHART_COLORS.expense;
}

/**
 * Obtiene color basado en balance
 */
export function getBalanceColor(balance: number): string {
  if (balance > 0) return CHART_COLORS.balance.positive;
  if (balance < 0) return CHART_COLORS.balance.negative;
  return CHART_COLORS.balance.neutral;
}

/**
 * Obtiene color basado en estado de contribución
 */
export function getContributionColor(
  status: 'pending' | 'partial' | 'paid' | 'overpaid'
): string {
  return CHART_COLORS.contribution[status];
}

/**
 * Convierte color hex a rgba con opacidad
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
