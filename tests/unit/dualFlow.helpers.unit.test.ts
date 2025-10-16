import { describe, expect, it } from 'vitest';

import { getFlowTypeForTransactionType } from '@/types/dualFlow';

describe('getFlowTypeForTransactionType', () => {
  it('mapea gastos directos a personal_to_common', () => {
    expect(getFlowTypeForTransactionType('gasto_directo')).toBe('personal_to_common');
  });

  it('mapea ingresos directos a common_to_personal', () => {
    expect(getFlowTypeForTransactionType('ingreso_directo')).toBe('common_to_personal');
  });

  it('mantiene common_fund para gastos comunes', () => {
    expect(getFlowTypeForTransactionType('gasto')).toBe('common_fund');
  });
});
