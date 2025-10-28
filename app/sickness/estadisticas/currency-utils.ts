/**
 * Currency formatting utilities for statistics queries
 */

import { getPool } from '@/lib/db';

/**
 * Get household currency setting
 */
export async function getHouseholdCurrency(householdId: string): Promise<string> {
  const pool = getPool();
  const result = await pool.query(
    'SELECT currency FROM household_settings WHERE household_id = $1',
    [householdId]
  );
  return result.rows[0]?.currency || 'EUR';
}

/**
 * Format currency value with symbol
 */
export function formatCurrency(value: number, currency: string = 'EUR'): string {
  const symbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    JPY: '¥',
  };
  
  const symbol = symbols[currency] || currency;
  const formatted = value.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  // EUR goes after the amount in Spanish locale
  if (currency === 'EUR') {
    return `${formatted} ${symbol}`;
  }
  
  return `${symbol}${formatted}`;
}
