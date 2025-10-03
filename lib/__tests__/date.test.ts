import { describe, it, expect } from 'vitest';
import { startOfMonth, endOfMonth, getMonthRange, toISODate, fromISODate } from '@/lib/date';

describe('startOfMonth', () => {
  it('retorna el primer día del mes', () => {
    const date = new Date('2024-03-15');
    const result = startOfMonth(date);
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(2); // Marzo (0-indexed)
  });

  it('mantiene el mes y año correctos', () => {
    const date = new Date('2024-12-31');
    const result = startOfMonth(date);
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(11); // Diciembre
    expect(result.getFullYear()).toBe(2024);
  });
});

describe('endOfMonth', () => {
  it('retorna el último día del mes', () => {
    const date = new Date('2024-03-15');
    const result = endOfMonth(date);
    expect(result.getDate()).toBe(31);
  });

  it('maneja correctamente febrero en año bisiesto', () => {
    const date = new Date('2024-02-15');
    const result = endOfMonth(date);
    expect(result.getDate()).toBe(29);
  });

  it('maneja correctamente febrero en año no bisiesto', () => {
    const date = new Date('2023-02-15');
    const result = endOfMonth(date);
    expect(result.getDate()).toBe(28);
  });
});

describe('getMonthRange', () => {
  it('retorna el rango completo del mes', () => {
    const date = new Date('2024-03-15');
    const result = getMonthRange(date);
    
    expect(result.start.getDate()).toBe(1);
    expect(result.end.getDate()).toBe(31);
    expect(result.start.getMonth()).toBe(2);
    expect(result.end.getMonth()).toBe(2);
  });
});

describe('toISODate', () => {
  it('formatea fecha a string ISO', () => {
    const date = new Date('2024-03-15');
    const result = toISODate(date);
    expect(result).toBe('2024-03-15');
  });

  it('formatea correctamente meses y días de un dígito', () => {
    const date = new Date('2024-01-05');
    const result = toISODate(date);
    expect(result).toBe('2024-01-05');
  });
});

describe('fromISODate', () => {
  it('parsea correctamente string ISO', () => {
    const result = fromISODate('2024-03-15');
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(2); // Marzo
    expect(result.getDate()).toBe(15);
  });
});
