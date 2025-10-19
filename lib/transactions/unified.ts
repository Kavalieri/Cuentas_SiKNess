// lib/transactions/unified.ts
// Sistema unificado de transacciones que reemplaza la duplicidad actual

'use server';

import { normalizePeriodPhase } from '@/lib/periods';
import { getCurrentUser, getUserHouseholdId, pgServer } from '@/lib/pgServer';
import type { Result } from '@/lib/result';
import { fail, ok } from '@/lib/result';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// =====================================================
// HELPERS DE FECHA/HORA
// =====================================================

/**
 * Normaliza un input de fecha/hora proveniente de un input `datetime-local` o ISO.
 * - occurred_at: SOLO fecha (YYYY-MM-DD) en zona local del usuario preservando día/mes/año
 * - performed_at: Timestamp completo ISO en UTC (para auditoría)
 */
function normalizeDateInputs(
  input: string,
): { occurredDate: Date; occurred_at_date: string; performed_at_ts: string } {
  // Preservar día/mes/año exactamente como viene del formulario
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) {
    // Fallback robusto
    const d = new Date(input);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    const occurred_at_date = `${y}-${mo}-${da}`;
    const performed_at_ts = new Date(d.getTime()).toISOString();
    return { occurredDate: d, occurred_at_date, performed_at_ts };
  }

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  const hh = m[4] ? Number(m[4]) : 0;
  const mm = m[5] ? Number(m[5]) : 0;
  const ss = m[6] ? Number(m[6]) : 0;

  // Construir Date local con componentes (evita sesgos de parsing ISO ambiguo)
  // Importante: tratamos la fecha/hora introducida por el usuario como "naive" (sin TZ)
  // y la fijamos en UTC para preservar exactamente la hora tecleada (12:30 -> 12:30Z),
  // evitando desplazamientos por la zona horaria del servidor.
  const d = new Date(Date.UTC(y, mo - 1, da, hh, mm, ss));
  const occurred_at_date = `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
  const performed_at_ts = d.toISOString();
  return { occurredDate: d, occurred_at_date, performed_at_ts };
}

// =====================================================
// TIPOS UNIFICADOS
// =====================================================

export type TransactionFlowType = 'common' | 'direct';
export type TransactionType = 'income' | 'expense' | 'income_direct' | 'expense_direct';

export interface UnifiedTransactionData {
  category_id?: string | null;
  type: TransactionType;
  amount: number;
  currency: string;
  description?: string;
  // ISO string o 'YYYY-MM-DDTHH:mm' desde input datetime-local
  occurred_at: string;
  flow_type: TransactionFlowType;

  // CRÍTICO: period_id explícito desde UI (selectedPeriod)
  // Si no se proporciona, se calcula desde occurred_at (legacy behavior)
  period_id?: string;

  // Para flujo común
  paid_by?: string | null; // NULL = cuenta común, UUID = usuario específico

  // Para flujo directo
  real_payer_id?: string; // Quien pagó realmente de su bolsillo
  creates_balance_pair?: boolean; // Si debe crear transacción de equilibrio
}

// =====================================================
// ESQUEMAS DE VALIDACIÓN UNIFICADOS
// =====================================================

const categoryIdSchema = z.preprocess(
  (val) => (val === '' || val === 'none' || val == null ? null : val),
  z.string().uuid().nullable(),
);

const BaseTransactionSchema = z.object({
  category_id: categoryIdSchema.optional(),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  currency: z.string().min(1).default('EUR'),
  description: z.string().optional(),
  occurred_at: z.string().min(1, 'La fecha es requerida'),
  period_id: z.string().uuid().optional(), // Periodo explícito desde UI
});

const CommonFlowSchema = BaseTransactionSchema.extend({
  type: z.enum(['income', 'expense']),
  flow_type: z.literal('common'),
  paid_by: z.string().optional(), // UUID del pagador o 'common'
});

const DirectFlowSchema = BaseTransactionSchema.extend({
  type: z.enum(['income_direct', 'expense_direct']),
  flow_type: z.literal('direct'),
  real_payer_id: z.string().uuid(), // Obligatorio: quien pagó de su bolsillo
  creates_balance_pair: z.boolean().default(true),
});

const UnifiedTransactionSchema = z.discriminatedUnion('flow_type', [
  CommonFlowSchema,
  DirectFlowSchema,
]);

// =====================================================
// FUNCIÓN PRINCIPAL UNIFICADA
// =====================================================

export async function createUnifiedTransaction(
  data: UnifiedTransactionData,
): Promise<Result<{ id: string; pair_id?: string }>> {
  console.log('[createUnifiedTransaction] Starting with data:', JSON.stringify(data, null, 2));

  const parsed = UnifiedTransactionSchema.safeParse(data);
  if (!parsed.success) {
    console.error('[createUnifiedTransaction] Validation failed:', parsed.error);
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const user = await getCurrentUser();
  console.log('[createUnifiedTransaction] Current user:', user?.id);
  if (!user) {
    return fail('No autenticado');
  }

  const householdId = await getUserHouseholdId();
  console.log('[createUnifiedTransaction] Household ID:', householdId);
  if (!householdId) {
    return fail('No tienes un hogar configurado');
  }

  const supabase = await pgServer();

  // Obtener profile_id del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  console.log('[createUnifiedTransaction] Profile:', profile);
  if (!profile) {
    return fail('Usuario no encontrado');
  }

  // Nota: No validamos owner_count aquí; la regla global del sistema ya garantiza al menos un propietario.

  // Validaciones específicas por flujo
  const userEmail = userEmailOrNull(user);

  if (parsed.data.flow_type === 'common') {
    console.log('[createUnifiedTransaction] Calling common flow');
    return await createCommonFlowTransaction(
      parsed.data,
      householdId,
      profile.id,
      userEmail,
      supabase,
    );
  } else {
    console.log('[createUnifiedTransaction] Calling direct flow');
    return await createDirectFlowTransaction(
      parsed.data,
      householdId,
      profile.id,
      userEmail,
      supabase,
    );
  }
}

// =====================================================
// HELPER: Obtener fase normalizada del período (sin usar status legacy)
// =====================================================

async function getNormalizedPeriodPhase(
  supabase: Awaited<ReturnType<typeof pgServer>>,
  periodId: string,
): Promise<{
  phase: 'preparing' | 'validation' | 'active' | 'closing' | 'closed' | 'unknown';
  year?: number;
  month?: number;
  household_id?: string;
  error?: string;
}> {
  // Leer únicamente la columna phase (fuente de verdad) y metadatos año/mes
  const { data } = await supabase
    .from('monthly_periods')
    .select('phase, year, month, household_id')
    .eq('id', periodId)
    .maybeSingle();

  const row = (data ?? null) as {
    phase: string | null;
    year: number | null;
    month: number | null;
    household_id: string | null;
  } | null;

  if (!row) {
    // Intentar obtener metadatos mínimos para mensajes
    const metaRes = await supabase
      .from('monthly_periods')
      .select('year, month, household_id')
      .eq('id', periodId)
      .maybeSingle();

    const meta = (metaRes.data ?? null) as {
      year?: number | null;
      month?: number | null;
      household_id?: string | null;
    } | null;

    return {
      phase: 'unknown',
      year: meta?.year ?? undefined,
      month: meta?.month ?? undefined,
      household_id: meta?.household_id ?? undefined,
      error: 'No se pudo determinar la fase del período',
    };
  }

  const phaseNorm = normalizePeriodPhase(row.phase);
  return {
    phase: phaseNorm,
    year: row.year ?? undefined,
    month: row.month ?? undefined,
    household_id: row.household_id ?? undefined,
  };
}

// =====================================================
// FLUJO COMÚN (reemplaza expenses/actions.ts)
// =====================================================

async function createCommonFlowTransaction(
  data: z.infer<typeof CommonFlowSchema>,
  householdId: string,
  profileId: string,
  userEmail: string | null,
  supabase: Awaited<ReturnType<typeof pgServer>>,
): Promise<Result<{ id: string }>> {
  // Determinar período desde la fecha del formulario (ignorando cualquier selección de UI)
  const { occurred_at_date, performed_at_ts } = normalizeDateInputs(data.occurred_at);
  // SIEMPRE derivar periodo desde occurred_at (ignorar period_id para evitar inconsistencias UI)
  const year = Number(occurred_at_date.slice(0, 4));
  const month = Number(occurred_at_date.slice(5, 7));
  const { data: calculatedPeriodId, error: periodError } = await supabase.rpc('ensure_monthly_period', {
    p_household_id: householdId,
    p_year: year,
    p_month: month,
  });
  if (periodError) {
    return fail(`Error al crear período mensual: ${periodError.message}`);
  }
  const periodId = calculatedPeriodId as string;

  // Comprobar fase del período y reglas de flujo
  const periodInfo = await getNormalizedPeriodPhase(supabase, periodId);
  if (periodInfo.error || !periodInfo.household_id || periodInfo.household_id !== householdId) {
    return fail('Período inválido o no pertenece al hogar');
  }

  // Bloqueos por fase para flujo común (income/expense)
  if (periodInfo.phase === 'preparing') {
    return fail('El período está en configuración inicial; no se permiten movimientos.');
  }
  if (periodInfo.phase === 'closed') {
    return fail('El período está cerrado; no se pueden registrar movimientos.');
  }
  // En validation y closing también permitimos movimientos comunes

  // Determinar paid_by
  let paidBy: string | null = profileId; // Default: usuario actual
  if (data.paid_by === 'common') {
    paidBy = null; // Cuenta común
  } else if (data.paid_by && data.paid_by !== '') {
    paidBy = data.paid_by; // Usuario específico
  }

  // Validación: Si es ingreso, paid_by NO puede ser NULL
  if (data.type === 'income' && paidBy === null) {
    return fail('Los ingresos deben tener un usuario asignado para trazabilidad');
  }

  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert({
      household_id: householdId,
      profile_id: profileId, // Quien registró la transacción
      category_id: data.category_id,
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      description: data.description || null,
      occurred_at: occurred_at_date,
      performed_at: performed_at_ts,
      period_id: periodId,
      paid_by: paidBy,
      flow_type: 'common',
      created_by_profile_id: profileId,
      updated_by_profile_id: profileId,
      created_by_member_id: profileId,
      performed_by_email: userEmail,
    })
    .select('id')
    .single();

  if (error) {
    return fail(error.message);
  }

  if (!transaction) {
    return fail('Error al crear transacción');
  }

  revalidatePath('/app');
  revalidatePath('/app/expenses');
  // Revalidar página de balance Sickness
  revalidatePath('/sickness/balance');
  return ok({ id: transaction.id });
}

// =====================================================
// FLUJO DIRECTO (reemplaza adjustment-actions.ts)
// =====================================================

async function createDirectFlowTransaction(
  data: z.infer<typeof DirectFlowSchema>,
  householdId: string,
  profileId: string,
  userEmail: string | null,
  supabase: Awaited<ReturnType<typeof pgServer>>,
): Promise<Result<{ id: string; pair_id?: string }>> {
  console.log('[createDirectFlowTransaction] Starting with:', {
    householdId,
    profileId,
    data,
  });

  // Solo permitir expense_direct (el sistema crea automáticamente el income_direct)
  if (data.type !== 'expense_direct') {
    return fail(
      'En flujo directo solo se pueden crear gastos directos. El ingreso se genera automáticamente.',
    );
  }

  // Determinar periodo siempre desde occurred_at (ignorar period_id de UI)
  const { occurred_at_date, performed_at_ts } = normalizeDateInputs(data.occurred_at);
  const year = Number(occurred_at_date.slice(0, 4));
  const month = Number(occurred_at_date.slice(5, 7));
  const { data: calculatedPeriodId, error: periodError } = await supabase.rpc('ensure_monthly_period', {
    p_household_id: householdId,
    p_year: year,
    p_month: month,
  });
  if (periodError) {
    console.error('[createDirectFlowTransaction] Period error:', periodError);
    return fail(`Error al crear período mensual: ${periodError.message}`);
  }
  const periodId = calculatedPeriodId as string;

  console.log('[createDirectFlowTransaction] Period ID:', periodId);

  // Reglas de fase para gastos directos
  const periodInfo = await getNormalizedPeriodPhase(supabase, periodId);
  if (periodInfo.error || !periodInfo.household_id || periodInfo.household_id !== householdId) {
    return fail('Período inválido o no pertenece al hogar');
  }

  // BLOQUEO TOTAL en preparing: nadie puede crear nada
  if (periodInfo.phase === 'preparing') {
    return fail('El período está en configuración inicial; no se permiten movimientos.');
  }

  // Bloqueo si está cerrado
  if (periodInfo.phase === 'closed') {
    return fail('El período está cerrado; no se pueden registrar movimientos.');
  }

  // Permitir direct en validation, active y closing

  // Generar UUID para emparejar las transacciones
  const pairId = crypto.randomUUID();
  console.log('[createDirectFlowTransaction] Pair ID:', pairId);

  // 1. Crear el gasto directo (real)
  const insertData = {
    household_id: householdId,
    profile_id: profileId, // Quien registró
    category_id: data.category_id,
    type: 'expense_direct',
    amount: data.amount,
    currency: data.currency,
    description: data.description || null,
    occurred_at: occurred_at_date,
    performed_at: performed_at_ts,
    period_id: periodId,
    flow_type: 'direct',
    transaction_pair_id: pairId,
    created_by_member_id: profileId,
    real_payer_id: data.real_payer_id, // Quien pagó realmente
    created_by_profile_id: profileId,
    updated_by_profile_id: profileId,
    performed_by_email: userEmail,
  };

  console.log('[createDirectFlowTransaction] Insert data:', insertData);

  const { data: expenseTransaction, error: expenseError } = await supabase
    .from('transactions')
    .insert(insertData)
    .select('id')
    .single();

  console.log('[createDirectFlowTransaction] Expense result:', {
    transaction: expenseTransaction,
    error: expenseError,
  });

  if (expenseError) {
    return fail('Error al crear gasto directo: ' + expenseError.message);
  }

  if (!expenseTransaction) {
    return fail('Error al crear gasto directo');
  }

  // 2. Crear el ingreso directo de equilibrio (si se solicita)
  if (data.creates_balance_pair) {
    console.log('[createDirectFlowTransaction] Creating balance pair');
    const { data: _incomeTransaction, error: incomeError } = await supabase
      .from('transactions')
      .insert({
        household_id: householdId,
        profile_id: profileId,
        category_id: null, // Los ingresos de equilibrio no necesitan categoría específica
        type: 'income_direct',
        amount: data.amount,
        currency: data.currency,
        description: `Equilibrio: ${data.description || 'Gasto directo'}`,
        occurred_at: occurred_at_date,
        performed_at: performed_at_ts,
        period_id: periodId,
        flow_type: 'direct',
        transaction_pair_id: pairId,
        created_by_member_id: profileId,
        real_payer_id: data.real_payer_id, // Mismo pagador real
        paid_by: data.real_payer_id, // El ingreso se atribuye al que pagó
        created_by_profile_id: profileId,
        updated_by_profile_id: profileId,
        performed_by_email: userEmail,
      })
      .select('id')
      .single();

    console.log('[createDirectFlowTransaction] Income result:', {
      transaction: _incomeTransaction,
      error: incomeError,
    });

    if (incomeError) {
      // Rollback: eliminar el gasto creado
      await supabase.from('transactions').delete().eq('id', expenseTransaction.id);
      return fail('Error al crear ingreso de equilibrio: ' + incomeError.message);
    }
  }

  console.log('[createDirectFlowTransaction] Success, revalidating paths');
  revalidatePath('/app');
  revalidatePath('/app/expenses');
  revalidatePath('/app/contributions');
  // Revalidar página de balance Sickness
  revalidatePath('/sickness/balance');

  return ok({
    id: expenseTransaction.id,
    pair_id: data.creates_balance_pair ? pairId : undefined,
  });
}

// Utilidad local para obtener email de usuario actual (si está disponible)
function userEmailOrNull(user: { email?: string | null } | null | undefined): string | null {
  try {
    return user?.email ?? null;
  } catch {
    return null;
  }
}

// =====================================================
// UTILIDADES PARA MIGRACIÓN
// =====================================================

/**
 * Migra transacciones existentes de ajustes al nuevo sistema
 */
export async function migrateAdjustmentTransactions(): Promise<Result> {
  // TODO: Implementar migración de adjustment-actions.ts al sistema unificado
  return ok();
}

/**
 * Helper para obtener transacciones emparejadas
 */
export async function getTransactionPairs(householdId: string, pairId: string) {
  const supabase = await pgServer();

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('household_id', householdId)
    .eq('transaction_pair_id', pairId)
    .order('type', { ascending: false }); // expense_direct primero

  if (error) return null;
  return data;
}
