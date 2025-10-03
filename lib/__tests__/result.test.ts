import { describe, it, expect } from 'vitest';
import { ok, fail } from '@/lib/result';

describe('Result pattern', () => {
  describe('ok', () => {
    it('crea un resultado exitoso sin data', () => {
      const result = ok();
      expect(result.ok).toBe(true);
      expect(result.data).toBeUndefined();
    });

    it('crea un resultado exitoso con data', () => {
      const result = ok({ id: '123', name: 'Test' });
      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ id: '123', name: 'Test' });
    });

    it('maneja diferentes tipos de data', () => {
      const stringResult = ok('success');
      const numberResult = ok(42);
      const arrayResult = ok([1, 2, 3]);

      expect(stringResult.data).toBe('success');
      expect(numberResult.data).toBe(42);
      expect(arrayResult.data).toEqual([1, 2, 3]);
    });
  });

  describe('fail', () => {
    it('crea un resultado fallido con mensaje', () => {
      const result = fail('Error message');
      expect(result.ok).toBe(false);
      expect(result.message).toBe('Error message');
      expect(result.fieldErrors).toBeUndefined();
    });

    it('crea un resultado fallido con mensaje y fieldErrors', () => {
      const result = fail('Validation failed', {
        email: ['Email is required'],
        password: ['Password is too short'],
      });

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Validation failed');
      expect(result.fieldErrors).toEqual({
        email: ['Email is required'],
        password: ['Password is too short'],
      });
    });
  });

  describe('Type guards', () => {
    it('permite distinguir entre ok y fail con type narrowing', () => {
      const successResult = ok({ value: 123 });
      const errorResult = fail('Error');

      if (successResult.ok) {
        // En este bloque, TypeScript sabe que data existe
        expect(successResult.data?.value).toBe(123);
      }

      if (!errorResult.ok) {
        // En este bloque, TypeScript sabe que message existe
        expect(errorResult.message).toBe('Error');
      }
    });
  });
});
