import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks compartidos
let currentPhase: 'preparing' | 'validation' | 'active' | 'closing' | 'closed' = 'active';

// Mock de next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock de pgServer y helpers de sesión
vi.mock('@/lib/pgServer', () => {
  const supabaseMock = {
    from(table: string) {
      return {
        select(_sel: string) {
          return {
            eq(_col: string, _val: string) {
              return {
                async single() {
                  if (table === 'profiles') {
                    return { data: { id: '11111111-1111-1111-1111-111111111111' }, error: null };
                  }
                  if (table === 'monthly_periods') {
                    return {
                      data: { phase: currentPhase, household_id: 'house-1', status: null },
                      error: null,
                    };
                  }
                  if (table === 'transactions') {
                    // Se determina por última inserción; aquí no se usa .single() tras select directo
                    return { data: { id: 'tx-1' }, error: null };
                  }
                  return { data: null, error: { message: 'tabla no mockeada: ' + table } } as any;
                },
              };
            },
          };
        },
        insert(data: any) {
          const id = data?.type === 'expense_direct' ? 'exp-1' : data?.type === 'income_direct' ? 'inc-1' : 'com-1';
          return {
            select() {
              return {
                async single() {
                  return { data: { id }, error: null };
                },
              };
            },
          };
        },
      } as any;
    },
    rpc: vi.fn().mockResolvedValue({ data: '22222222-2222-2222-2222-222222222222', error: null }),
  } as any;

  return {
    getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-1', email: 'user@example.com' }),
    getUserHouseholdId: vi.fn().mockResolvedValue('house-1'),
    pgServer: vi.fn().mockResolvedValue(supabaseMock),
  };
});

// Importar después de mocks
import { createUnifiedTransaction } from '@/lib/transactions/unified';

describe('createUnifiedTransaction - reglas por fase', () => {
  beforeEach(() => {
    currentPhase = 'active';
  });

    it('bloquea creación si no hay owner en el hogar', async () => {
      // Simular household sin owner
  vi.spyOn(require('@/lib/pgServer'), 'getUserHouseholds').mockResolvedValue([
        {
          household_id: 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228',
          household_name: 'Casa Test',
          user_role: 'member',
          household_created_at: '2025-10-06T18:50:58.715981+02',
          is_active: true,
          member_count: 1,
          owner_count: 0,
        },
      ]);
      const res = await createUnifiedTransaction({
        flow_type: 'direct',
        type: 'expense_direct',
        amount: 10,
        currency: 'EUR',
        occurred_at: '2025-10-10T12:00:00Z',
        real_payer_id: '11111111-1111-1111-1111-111111111111',
        period_id: '22222222-2222-2222-2222-222222222222',
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.message).toMatch(/no hay propietario|owner/i);
      }
  vi.restoreAllMocks();
    });

  it('bloquea todo en preparing (gasto directo)', async () => {
    currentPhase = 'preparing';
    const res = await createUnifiedTransaction({
      flow_type: 'direct',
      type: 'expense_direct',
      amount: 10,
      currency: 'EUR',
      occurred_at: '2025-10-10T12:00:00Z',
      real_payer_id: '11111111-1111-1111-1111-111111111111',
      period_id: '22222222-2222-2222-2222-222222222222',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.message).toMatch(/todavía no está iniciado|bloquearse primero/i);
    }
  });

  it('permite gasto directo en validation y crea par (income_direct)', async () => {
    currentPhase = 'validation';
    const res = await createUnifiedTransaction({
      flow_type: 'direct',
      type: 'expense_direct',
      amount: 25.5,
      currency: 'EUR',
      description: 'Compra súper',
      occurred_at: '2025-10-10T12:00:00Z',
      real_payer_id: '11111111-1111-1111-1111-111111111111',
      creates_balance_pair: true,
      period_id: '22222222-2222-2222-2222-222222222222',
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data?.id).toBe('exp-1');
      expect(res.data?.pair_id).toBeDefined();
    }
  });

  it('permite flujo común solo en active', async () => {
    currentPhase = 'active';
    const res = await createUnifiedTransaction({
      flow_type: 'common',
      type: 'expense',
      amount: 99,
      currency: 'EUR',
      occurred_at: '2025-10-11T12:00:00Z',
      paid_by: '11111111-1111-1111-1111-111111111111',
      category_id: null,
      period_id: '22222222-2222-2222-2222-222222222222',
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data?.id).toBe('com-1');
    }
  });

  it('bloquea flujo común en closing', async () => {
    currentPhase = 'closing';
    const res = await createUnifiedTransaction({
      flow_type: 'common',
      type: 'expense',
      amount: 15,
      currency: 'EUR',
      occurred_at: '2025-10-12T12:00:00Z',
      paid_by: '11111111-1111-1111-1111-111111111111',
      category_id: null,
      period_id: '22222222-2222-2222-2222-222222222222',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.message).toMatch(/solo.*activo/i);
    }
  });

  it('bloquea completamente en closed (periodo cerrado)', async () => {
    currentPhase = 'closed';
    // Intentar flujo común
    const resCommon = await createUnifiedTransaction({
      flow_type: 'common',
      type: 'expense',
      amount: 20,
      currency: 'EUR',
      occurred_at: '2025-10-13T12:00:00Z',
      paid_by: '11111111-1111-1111-1111-111111111111',
      category_id: null,
      period_id: '22222222-2222-2222-2222-222222222222',
    });
    expect(resCommon.ok).toBe(false);
    if (!resCommon.ok) {
      expect(resCommon.message).toMatch(/cerrado/i);
    }

    // Intentar flujo directo
    const resDirect = await createUnifiedTransaction({
      flow_type: 'direct',
      type: 'expense_direct',
      amount: 30,
      currency: 'EUR',
      occurred_at: '2025-10-13T12:00:00Z',
      real_payer_id: '11111111-1111-1111-1111-111111111111',
      period_id: '22222222-2222-2222-2222-222222222222',
    });
    expect(resDirect.ok).toBe(false);
    if (!resDirect.ok) {
      expect(resDirect.message).toMatch(/cerrado/i);
    }
  });
});
