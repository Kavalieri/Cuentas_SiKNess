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

  // Construir Date en zona horaria LOCAL (no UTC)
  // El usuario introduce fechas/horas en su zona horaria local (España),
  // y queremos preservar exactamente esos valores.
  // Ejemplo: Usuario introduce "2025-06-01 23:30" en España (UTC+2)
  //   - new Date(2025, 5, 1, 23, 30) crea "2025-06-01T23:30 local"
  //   - toISOString() lo convierte a UTC: "2025-06-01T21:30:00.000Z"
  //   - PostgreSQL lo guarda con TZ: "2025-06-01 23:30:00+02"
  const d = new Date(y, mo - 1, da, hh, mm, ss);
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
  // Soporte para jerarquía de categorías (3 niveles)
  category_id?: string | null; // DEPRECATED: solo para compatibilidad legacy
  subcategory_id?: string | null; // NUEVO: subcategoría (3er nivel) - RECOMENDADO
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

  // SISTEMA DUAL-FIELD (Issue #19, #20)
  // Campo 1: paid_by (origen del dinero)
  paid_by?: string | null; // UUID joint_account o member

  // Campo 2: performed_by_profile_id (ejecutor físico)
  performed_by_profile_id?: string; // UUID del miembro que realizó la transacción

  // Para flujo directo
  creates_balance_pair?: boolean; // Si debe crear transacción de equilibrio
}

// =====================================================
// ESQUEMAS DE VALIDACIÓN UNIFICADOS
// =====================================================

const categoryIdSchema = z.preprocess(
  (val) => (val === '' || val === 'none' || val == null ? null : val),
  z.string().uuid().nullable(),
);

const subcategoryIdSchema = z.preprocess(
  (val) => (val === '' || val === 'none' || val == null ? null : val),
  z.string().uuid().nullable(),
);

const BaseTransactionSchema = z.object({
  category_id: categoryIdSchema.optional(), // Legacy
  subcategory_id: subcategoryIdSchema.optional(), // Nuevo: 3er nivel de jerarquía
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
  performed_by_profile_id: z.string().uuid().optional(), // Ejecutor físico (nuevo)
});

const DirectFlowSchema = BaseTransactionSchema.extend({
  type: z.enum(['income_direct', 'expense_direct']),
  flow_type: z.literal('direct'),
  performed_by_profile_id: z.string().uuid(), // Obligatorio: quien pagó de su bolsillo (Issue #30)
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
  const parsed = UnifiedTransactionSchema.safeParse(data);
  if (!parsed.success) {
    console.error('[createUnifiedTransaction] Validation failed:', parsed.error);
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const user = await getCurrentUser();
  if (!user) {
    return fail('No autenticado');
  }

  const householdId = await getUserHouseholdId();
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

  if (!profile) {
    return fail('Usuario no encontrado');
  }

  // Nota: No validamos owner_count aquí; la regla global del sistema ya garantiza al menos un propietario.

  // Validaciones específicas por flujo
  const userEmail = userEmailOrNull(user);

  if (parsed.data.flow_type === 'common') {
    return await createCommonFlowTransaction(
      parsed.data,
      householdId,
      profile.id,
      userEmail,
      supabase,
    );
  } else {
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

  // ❌ Issue #33: paid_by DEPRECADO - Ya no se escribe, se calcula dinámicamente
  // REGLA DE CÁLCULO:
  //   - Gastos: paid_by = joint_account_id (dinero sale de Cuenta Común)
  //   - Ingresos: paid_by = performed_by_profile_id (dinero sale del miembro)

  let performedBy: string;

  if (data.type === 'expense') {
    // Gastos comunes: el dinero SALE de la Cuenta Común
    // Ejecutor: quien pasó la tarjeta (default: usuario actual)
    performedBy = data.performed_by_profile_id || profileId;
  } else if (data.type === 'income') {
    // Ingresos comunes: el dinero SALE del miembro (entra a Cuenta Común)
    // Ejecutor: mismo que aporta (quien hizo el ingreso)
    if (!data.paid_by || data.paid_by === 'common') {
      return fail('Los ingresos comunes deben tener un miembro asignado');
    }
    performedBy = data.performed_by_profile_id || data.paid_by;
  } else {
    return fail('Tipo de transacción común inválido');
  }

  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert({
      household_id: householdId,
      profile_id: profileId, // Quien registró la transacción
      // Priorizar subcategory_id si está disponible, sino usar category_id (legacy)
      category_id: data.subcategory_id || data.category_id || null,
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      description: data.description || null,
      occurred_at: occurred_at_date,
      performed_at: performed_at_ts,
      period_id: periodId,
      // paid_by: paidBy, // ❌ Issue #33: DEPRECADO - Se calcula dinámicamente
      performed_by_profile_id: performedBy, // ✅ Campo único de verdad
      flow_type: 'common',
      // created_by_profile_id: profileId, // ❌ Issue #31: DEPRECADO - Usa profile_id
      updated_by_profile_id: profileId,
      created_by_member_id: profileId,
      // performed_by_email: ❌ ELIMINADO - Campo deprecado que no existe en BD
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
  // Revalidar endpoints de resumen para evitar tarjetas en 0 temporalmente
  revalidatePath('/api/sickness/balance/period-summary');
  revalidatePath('/api/sickness/balance/global');
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

  // ❌ Issue #33: paid_by DEPRECADO - Ya no se escribe
  // ❌ Issue #30: real_payer_id DEPRECADO - Ya no se escribe
  // ❌ performed_by_email DEPRECADO - Ya no existe en BD

  // Generar UUID para emparejar las transacciones
  const pairId = crypto.randomUUID();

  // 1. Crear el gasto directo (real)
  const insertData = {
    household_id: householdId,
    profile_id: profileId, // Quien registró
    // Priorizar subcategory_id si está disponible, sino usar category_id (legacy)
    category_id: data.subcategory_id || data.category_id || null,
    type: 'expense_direct',
    amount: data.amount,
    currency: data.currency,
    description: data.description || null,
    occurred_at: occurred_at_date,
    performed_at: performed_at_ts,
    period_id: periodId,
    performed_by_profile_id: data.performed_by_profile_id, // ✅ Campo único de verdad - quien pagó
    // performed_by_email: ❌ ELIMINADO - Campo deprecado que no existe en BD
    // Metadata
    flow_type: 'direct',
    transaction_pair_id: pairId,
    created_by_member_id: profileId,
    updated_by_profile_id: profileId,
  };

  const { data: expenseTransaction, error: expenseError } = await supabase
    .from('transactions')
    .insert(insertData)
    .select('id')
    .single();

  if (expenseError) {
    return fail('Error al crear gasto directo: ' + expenseError.message);
  }

  if (!expenseTransaction) {
    return fail('Error al crear gasto directo');
  }

  // 2. Crear el ingreso directo de equilibrio (si se solicita)
  if (data.creates_balance_pair) {
    // Intentar asignar la categoría "Aportación Cuenta Conjunta" para el ingreso compensatorio
    let compensatoryCategoryId: string | null = null;
    try {
      const { data: compCat, error: compCatErr } = await supabase
        .from('categories')
        .select('id')
        .eq('household_id', householdId)
        .eq('name', 'Aportación Cuenta Conjunta')
        .eq('type', 'income')
        .maybeSingle();
      if (!compCatErr && compCat?.id) {
        compensatoryCategoryId = compCat.id as string;
      }
    } catch (e) {
      console.error('[createDirectFlowTransaction] No se pudo resolver categoría compensatoria:', e);
    }

    const { data: _incomeTransaction, error: incomeError } = await supabase
      .from('transactions')
      .insert({
        household_id: householdId,
        profile_id: profileId,
        category_id: compensatoryCategoryId, // Categoría compensatoria por defecto
        type: 'income_direct',
        amount: data.amount,
        currency: data.currency,
        description: `Equilibrio: ${data.description || 'Gasto directo'}`,
        occurred_at: occurred_at_date,
        performed_at: performed_at_ts,
        period_id: periodId,
        performed_by_profile_id: data.performed_by_profile_id, // ✅ Campo único de verdad - quien pagó
        // performed_by_email: ❌ ELIMINADO - Campo deprecado que no existe en BD
        // Metadata
        flow_type: 'direct',
        transaction_pair_id: pairId,
        is_compensatory_income: true, // ✨ Issue #26: Marcar como ingreso compensatorio automático
        created_by_member_id: profileId,
        updated_by_profile_id: profileId,
      })
      .select('id')
      .single();

    if (incomeError) {
      // Rollback: eliminar el gasto creado
      await supabase.from('transactions').delete().eq('id', expenseTransaction.id);
      return fail('Error al crear ingreso de equilibrio: ' + incomeError.message);
    }
  }

  revalidatePath('/app');
  revalidatePath('/app/expenses');
  revalidatePath('/app/contributions');
  // Revalidar página de balance Sickness
  revalidatePath('/sickness/balance');
  // Revalidar endpoints de resumen para evitar tarjetas en 0 temporalmente
  revalidatePath('/api/sickness/balance/period-summary');
  revalidatePath('/api/sickness/balance/global');

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
