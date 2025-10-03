import { describe, it, expect } from 'vitest';
import { formatCurrency, parseCurrency } from '@/lib/format';

describe('formatCurrency', () => {
  it('formatea correctamente números enteros', () => {
    const result = formatCurrency(100);
    expect(result).toContain('100,00');
    expect(result).toContain('€');
  });

  it('formatea correctamente números decimales', () => {
    const result = formatCurrency(123.45);
    expect(result).toContain('123,45');
    expect(result).toContain('€');
  });

  it('formatea correctamente números negativos', () => {
    const result = formatCurrency(-50.25);
    expect(result).toContain('-');
    expect(result).toContain('50,25');
    expect(result).toContain('€');
  });

  it('formatea correctamente cero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0,00');
    expect(result).toContain('€');
  });

  it('respeta la moneda especificada', () => {
    expect(formatCurrency(100, 'USD', 'en-US')).toBe('$100.00');
  });
});

describe('parseCurrency', () => {
  it('parsea correctamente string con símbolo de euro', () => {
    expect(parseCurrency('100,00 €')).toBe(100);
  });

  it('parsea correctamente string con decimales', () => {
    expect(parseCurrency('123,45')).toBe(123.45);
  });

  it('parsea correctamente números negativos', () => {
    expect(parseCurrency('-50,25 €')).toBe(-50.25);
  });

  it('retorna 0 para strings inválidos', () => {
    expect(parseCurrency('abc')).toBe(0);
  });

  it('parsea correctamente strings sin decimales', () => {
    expect(parseCurrency('100 €')).toBe(100);
  });
});
