/**
 * Utilidades para formateo de datos de gráficos
 */

import { formatCurrency } from '@/lib/format';
import type { CategoryExpense } from './types';

/**
 * Calcula porcentajes de categorías
 */
export function calculateCategoryPercentages(
  categories: Array<Omit<CategoryExpense, 'percentage'>>
): CategoryExpense[] {
  const total = categories.reduce((sum, cat) => sum + cat.total, 0);

  if (total === 0) return categories.map((cat) => ({ ...cat, percentage: 0 }));

  return categories.map((cat) => ({
    ...cat,
    percentage: (cat.total / total) * 100,
  }));
}

/**
 * Formatea valor para tooltip de gráfico
 */
export function formatChartValue(value: number, currency = 'EUR'): string {
  return formatCurrency(value, currency);
}

/**
 * Formatea porcentaje para display
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Calcula cambio porcentual entre dos valores
 */
export function calculatePercentageChange(
  current: number,
  previous: number
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Trunca etiquetas largas para gráficos
 */
export function truncateLabel(label: string, maxLength = 15): string {
  if (label.length <= maxLength) return label;
  return `${label.substring(0, maxLength - 3)}...`;
}

/**
 * Ordena categorías por total (descendente)
 */
export function sortByTotal<T extends { total: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.total - a.total);
}

/**
 * Obtiene top N categorías
 */
export function getTopCategories<T>(items: T[], n = 5): T[] {
  return items.slice(0, n);
}
