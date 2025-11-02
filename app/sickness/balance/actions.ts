// actions.ts para Balance/Transacciones
// Acciones para editar/eliminar movimientos (gastos directos y compensatorios)

'use server';
import { getCurrentProfileId, isHouseholdOwner } from '@/lib/adminCheck';
import { query } from '@/lib/db';
import { getJointAccountId } from '@/lib/jointAccount';
import { normalizePeriodPhase } from '@/lib/periods';
import type { Result } from '@/lib/result';
import { fail, ok } from '@/lib/result';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Normaliza un input de fecha/hora 'YYYY-MM-DDTHH:mm' o ISO
function parseDateTimeInput(input?: string | null): { occurred_at_date: string | null; performed_at_ts: string | null } {
  if (!input) return { occurred_at_date: null, performed_at_ts: null };
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return { occurred_at_date: null, performed_at_ts: null };
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
    const da = String(d.getUTCDate()).padStart(2, '0');
    return { occurred_at_date: `${y}-${mo}-${da}`, performed_at_ts: d.toISOString() };
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  const hh = m[4] ? Number(m[4]) : 0;
  const mm = m[5] ? Number(m[5]) : 0;
  const ss = m[6] ? Number(m[6]) : 0;
  const d = new Date(Date.UTC(y, mo - 1, da, hh, mm, ss));
  const occurred_at_date = `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
  const performed_at_ts = d.toISOString();
  return { occurred_at_date, performed_at_ts };
}

// Esquema para eliminar movimiento
const DeleteMovementSchema = z.object({
  movementId: z.string().uuid(),
  householdId: z.string().uuid(),
});

// Elimina movimiento y su compensatorio si existe
export async function deleteDirectExpenseWithCompensatory(formData: FormData): Promise<Result> {
  const parsed = DeleteMovementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }
  const { movementId, householdId } = parsed.data;

  const result = await deleteDirectExpenseInternal(movementId, householdId);
  if (!result.ok) {
    return result;
  }

  // Revalidar la ruta de balance/transacciones
  // Al eliminar un gasto directo, el movimiento compensatorio debe ser un ingreso (positivo)
  // Si existe lógica que crea el movimiento compensatorio como gasto negativo, cámbiala a ingreso positivo.
  // Ejemplo: Si usas createTransaction({ type: 'expense', ... }), debe ser type: 'income' y amount positivo.
  // Si tienes lógica específica, revisa la función deleteDirectExpenseWithCompensatory y asegúrate que el movimiento compensatorio se crea como ingreso.
  revalidatePath('/sickness/balance');
  // Revalidar endpoints usados por tarjetas de resumen
  revalidatePath('/api/sickness/balance/period-summary');
  revalidatePath('/api/sickness/balance/global');
  return ok();
}

// Variante callable desde componentes cliente sin FormData
export async function deleteDirectExpenseById(params: { movementId: string; householdId: string }): Promise<Result> {
  const { movementId, householdId } = params;
  if (!movementId || !householdId) return fail('Parámetros inválidos');

  const result = await deleteDirectExpenseInternal(movementId, householdId);
  if (!result.ok) {
    return result;
  }

  revalidatePath('/sickness/balance');
  revalidatePath('/api/sickness/balance/period-summary');
  revalidatePath('/api/sickness/balance/global');
  return ok();
}

// Implementación compartida
async function deleteDirectExpenseInternal(movementId: string, householdId: string): Promise<Result> {
  const profileId = await getCurrentProfileId();
  if (!profileId) return fail('No autenticado');

  // Verificar permisos antes de eliminar
  const txRes = await query<{ performed_by_profile_id: string | null; profile_id: string | null }>(
    `SELECT performed_by_profile_id, profile_id FROM transactions WHERE id = $1 AND household_id = $2 AND flow_type = 'direct'`,
    [movementId, householdId]
  );

  if (txRes.rows.length === 0) return fail('Movimiento directo no encontrado');

  const tx = txRes.rows[0]!;

  // Verificar permisos: owner O propietario del gasto directo
  const isOwner = await isHouseholdOwner(profileId, householdId);
  const isPerformedBy = tx.performed_by_profile_id === profileId;
  const isProfileOwner = tx.profile_id === profileId;

  if (!isOwner && !isPerformedBy && !isProfileOwner) {
    return fail('No autorizado: solo puedes eliminar tus propios gastos directos');
  }

  // Asegurar auditoría: marcar quién elimina antes del borrado
  await query(
    `UPDATE transactions
     SET updated_by_profile_id = $1, updated_at = now()
     WHERE (id = $2 OR (transaction_pair_id = (SELECT transaction_pair_id FROM transactions WHERE id = $2) AND flow_type = 'direct'))
       AND household_id = $3`,
    [profileId, movementId, householdId]
  );

  // Buscar el par compensatorio
  const pairRes = await query(
    `SELECT transaction_pair_id FROM transactions WHERE id = $1 AND household_id = $2 AND flow_type = 'direct'`,
    [movementId, householdId]
  );
  const pairId = pairRes.rows[0]?.transaction_pair_id;

  // Eliminar ambos movimientos (gasto + ingreso compensatorio)
  await query(
    `DELETE FROM transactions WHERE (id = $1 OR (transaction_pair_id = $2 AND flow_type = 'direct')) AND household_id = $3`,
    [movementId, pairId, householdId]
  );

  return ok();
}


// Esquema para editar movimiento directo
const EditMovementSchema = z.object({
  movementId: z.string().uuid(),
  householdId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
  subcategoryId: z
    .preprocess((v) => (v === '' || v == null ? null : v), z.string().uuid().nullable())
    .optional(),
  occurredAt: z.string().min(1, 'Fecha/hora requerida'),
  realPayerId: z.string().uuid().optional(), // ✨ NUEVO: pagador para gastos directos
});

// Edita movimiento directo y su compensatorio si existe
export async function editDirectExpenseWithCompensatory(formData: FormData): Promise<Result> {
  console.log('[editDirectExpenseWithCompensatory] Starting with formData entries:', Array.from(formData.entries()));

  const parsed = EditMovementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    console.error('[editDirectExpenseWithCompensatory] Validation failed:', parsed.error);
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }
  const { movementId, householdId, amount, description, subcategoryId, occurredAt, realPayerId } = parsed.data;

  console.log('[editDirectExpenseWithCompensatory] Parsed data:', { movementId, householdId, amount, description, subcategoryId, occurredAt, realPayerId });

  const { occurred_at_date, performed_at_ts } = parseDateTimeInput(occurredAt);

  // Verificar permisos: obtener información del movimiento
  const profileId = await getCurrentProfileId();
  console.log('[editDirectExpenseWithCompensatory] Current profile ID:', profileId);
  if (!profileId) return fail('No autenticado');

  // Obtener el period_id Y performed_by_profile_id de la transacción
  const periodRes = await query<{ period_id: string | null; performed_by_profile_id: string | null }>(
    `SELECT period_id, performed_by_profile_id FROM transactions WHERE id = $1 AND household_id = $2`,
    [movementId, householdId]
  );

  const periodId = periodRes.rows[0]?.period_id;
  const existingPerformedBy = periodRes.rows[0]?.performed_by_profile_id;
  console.log('[editDirectExpenseWithCompensatory] Period ID:', periodId, 'Existing performed_by:', existingPerformedBy);

  if (!periodId) {
    return fail('No se pudo determinar el período de la transacción');
  }

  // Validar fase del período
  const periodResult = await query<{ phase: string; household_id: string }>(
    'SELECT phase, household_id FROM monthly_periods WHERE id = $1',
    [periodId]
  );

  if (periodResult.rows.length === 0) {
    return fail('Período no encontrado');
  }

  const periodInfo = periodResult.rows[0]!;
  const normalizedPhase = normalizePeriodPhase(periodInfo.phase);

  if (periodInfo.household_id !== householdId) {
    return fail('Período no pertenece al hogar');
  }

  // Bloqueos por fase para edición
  if (normalizedPhase === 'preparing') {
    return fail('El período está en configuración inicial; no se permiten modificaciones de movimientos.');
  }

  if (normalizedPhase === 'closed') {
    return fail('El período está cerrado; no se permiten modificaciones.');
  }

  const txRes = await query<{ performed_by_profile_id: string | null; profile_id: string | null }>(
    `SELECT performed_by_profile_id, profile_id FROM transactions WHERE id = $1 AND household_id = $2 AND flow_type = 'direct'`,
    [movementId, householdId]
  );

  console.log('[editDirectExpenseWithCompensatory] Transaction query result:', txRes.rows);
  if (txRes.rows.length === 0) return fail('Movimiento directo no encontrado');

  const tx = txRes.rows[0]!;

  // Verificar permisos: owner O propietario del gasto directo
  const isOwner = await isHouseholdOwner(profileId, householdId);
  const isPerformedBy = tx.performed_by_profile_id === profileId;
  const isProfileOwner = tx.profile_id === profileId;

  console.log('[editDirectExpenseWithCompensatory] Permissions check:', { isOwner, isPerformedBy, isProfileOwner, performed_by_profile_id: tx.performed_by_profile_id, profile_id: tx.profile_id });

  if (!isOwner && !isPerformedBy && !isProfileOwner) {
    console.log('[editDirectExpenseWithCompensatory] Permission denied');
    return fail('No autorizado: solo puedes editar tus propios gastos directos');
  }

  // Buscar el par compensatorio
  const pairRes = await query(
    `SELECT transaction_pair_id FROM transactions WHERE id = $1 AND household_id = $2 AND flow_type = 'direct'`,
    [movementId, householdId]
  );
  const pairId = pairRes.rows[0]?.transaction_pair_id;
  console.log('[editDirectExpenseWithCompensatory] Pair ID found:', pairId);

  // Recalcular period_id basándose en la nueva fecha
  if (!occurred_at_date) {
    return fail('Fecha de ocurrencia no válida');
  }

  const y = Number(occurred_at_date.slice(0, 4));
  const m = Number(occurred_at_date.slice(5, 7));
  const newPeriodIdRes = await query<{ ensure_monthly_period: string }>(
    `SELECT ensure_monthly_period($1::uuid, $2::int, $3::int)`,
    [householdId, y, m]
  );
  const newPeriodId = newPeriodIdRes.rows[0]?.ensure_monthly_period;
  if (!newPeriodId) {
    return fail('No se pudo determinar el período de la nueva fecha');
  }

  // Obtener Cuenta Común para asegurar que gastos directos usen paid_by correcto (Issue #18)
  const jointResult = await getJointAccountId(householdId);
  if (!jointResult.ok) {
    return fail('No se pudo obtener la Cuenta Común del hogar');
  }
  const jointAccountId = jointResult.data!;

  // Actualizar gasto directo (con auditoría, nuevo period_id y dual-field preservado)
  const updateResult = await query(
    `UPDATE transactions
     SET amount = $1,
         description = $2,
         subcategory_id = $3,
         occurred_at = $4,
         performed_at = $5,
         period_id = $6,
         updated_at = now(),
         updated_by_profile_id = $7,
         performed_by_profile_id = COALESCE($8, $9, performed_by_profile_id)
     WHERE id = $10 AND household_id = $11 AND flow_type = 'direct'`,
    [
      amount,
      description || null,
      subcategoryId ?? null,
      occurred_at_date,
      performed_at_ts,
      newPeriodId,
      profileId ?? null,
      existingPerformedBy, // Preservar performed_by existente
      realPayerId, // Fallback a realPayerId si no existe performed_by
      movementId,
      householdId
    ]
  );
  console.log('[editDirectExpenseWithCompensatory] Update result:', { rowCount: updateResult.rowCount });

  // Actualizar ingreso compensatorio si existe
  if (pairId) {
    console.log('[editDirectExpenseWithCompensatory] Updating compensatory income');
    await query(
      `UPDATE transactions
       SET amount = $1,
           description = $2,
           occurred_at = $3,
           performed_at = $4,
           period_id = $5,
           updated_at = now(),
           updated_by_profile_id = $6,
           performed_by_profile_id = $7
       WHERE transaction_pair_id = $8
         AND flow_type = 'direct'
         AND type IN ('income','income_direct')
         AND household_id = $9`,
      [
        amount,
        `Equilibrio: ${description || 'Gasto directo'}`,
        occurred_at_date,
        performed_at_ts,
        newPeriodId,
        profileId ?? null,
        realPayerId || tx.performed_by_profile_id, // Quien pagó de su bolsillo
        pairId,
        householdId
      ]
    );
  }

  // Nota: la ruta real es /sickness/balance (App Router)
  console.log('[editDirectExpenseWithCompensatory] Revalidating paths');
  revalidatePath('/sickness/balance');
  revalidatePath('/api/sickness/balance/period-summary');
  revalidatePath('/api/sickness/balance/global');

  console.log('[editDirectExpenseWithCompensatory] Success - returning ok()');
  return ok();
}

// ==============================
// FLUJO COMÚN: EDITAR / BORRAR
// ==============================

const EditCommonSchema = z.object({
  movementId: z.string().uuid(),
  householdId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
  subcategoryId: z
    .preprocess((v) => (v === '' || v == null ? null : v), z.string().uuid().nullable())
    .optional(),
  occurredAt: z.string().min(1, 'Fecha/hora requerida'),
  // ✅ Issue #29: performedBy (ejecutor físico) - obligatorio
  performedBy: z.string().uuid('Debe ser un UUID válido'),
});

// Edita un movimiento del flujo común (income/expense)
export async function editCommonMovement(formData: FormData): Promise<Result> {
  const parsed = EditCommonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const { movementId, householdId, amount, description, subcategoryId, occurredAt, performedBy } = parsed.data;

  // Validación: performedBy obligatorio
  if (!performedBy) {
    return fail('Debes indicar quién gastó/ingresó');
  }

  // Permisos: members pueden editar sus propios movimientos, owners pueden editar todos
  const profileId = await getCurrentProfileId();
  if (!profileId) return fail('No autenticado');

  // Verificar movimiento y tipo
  const txRes = await query<{ type: string; flow_type: string; profile_id: string | null }>(
    `SELECT type, flow_type, profile_id FROM transactions WHERE id = $1 AND household_id = $2`,
    [movementId, householdId]
  );
  if (txRes.rows.length === 0) return fail('Movimiento no encontrado');
  const tx = txRes.rows[0];
  if (!tx || tx.flow_type !== 'common') return fail('El movimiento no pertenece al flujo común');

  // Verificar permisos: owner O dueño del movimiento
  const owner = await isHouseholdOwner(profileId, householdId);
  const isMembersOwnMovement = tx.profile_id === profileId;
  if (!owner && !isMembersOwnMovement) {
    return fail('No autorizado: solo puedes editar tus propios movimientos');
  }

  // Parsear fecha/hora y recalcular periodo
  const { occurred_at_date, performed_at_ts } = parseDateTimeInput(occurredAt);
  if (!occurred_at_date || !performed_at_ts) return fail('Fecha inválida');
  const y = Number(occurred_at_date.slice(0, 4));
  const m = Number(occurred_at_date.slice(5, 7));
  const periodIdRes = await query<{ ensure_monthly_period: string }>(
    `SELECT ensure_monthly_period($1::uuid, $2::int, $3::int)`,
    [householdId, y, m]
  );
  const newPeriodId = periodIdRes.rows[0]?.ensure_monthly_period;
  if (!newPeriodId) return fail('No se pudo determinar el período de la fecha indicada');

  // ✅ Issue #29 + #33: paid_by se calcula automáticamente según tipo
  let paid_by: string;

  if (tx.type === 'expense') {
    // Gastos comunes: dinero sale de Cuenta Común
    const jointResult = await getJointAccountId(householdId);
    if (!jointResult.ok) {
      return fail('No se pudo obtener la Cuenta Común');
    }
    paid_by = jointResult.data!;
  } else if (tx.type === 'income') {
    // Ingresos comunes: dinero ingresado por el miembro (performedBy)
    paid_by = performedBy;
  } else {
    return fail('Tipo de transacción inválido');
  }

  await query(
    `UPDATE transactions
     SET amount = $1,
         description = $2,
         subcategory_id = $3,
         occurred_at = $4,
         performed_at = $5,
         period_id = $6,
         performed_by_profile_id = $7, 
         paid_by = $8,
         updated_at = now(),
         updated_by_profile_id = $9
     WHERE id = $10 AND household_id = $11 AND flow_type = 'common'`,
    [amount, description || null, subcategoryId ?? null, occurred_at_date, performed_at_ts, newPeriodId, performedBy, paid_by, profileId, movementId, householdId]
  );

  // Revalidaciones necesarias
  revalidatePath('/sickness/balance');
  revalidatePath('/api/sickness/balance/period-summary');
  revalidatePath('/api/sickness/balance/global');
  return ok();
}

const DeleteCommonSchema = z.object({
  movementId: z.string().uuid(),
  householdId: z.string().uuid(),
});

// Elimina un movimiento del flujo común (requiere owner)
export async function deleteCommonMovement(formData: FormData): Promise<Result> {
  const parsed = DeleteCommonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }
  const { movementId, householdId } = parsed.data;

  const profileId = await getCurrentProfileId();
  if (!profileId) return fail('No autenticado');
  const owner = await isHouseholdOwner(profileId, householdId);
  if (!owner) return fail('No autorizado: se requiere ser owner del hogar');

  // Auditoría: marcar quién elimina
  await query(
    `UPDATE transactions SET updated_by_profile_id = $1, updated_at = now()
     WHERE id = $2 AND household_id = $3 AND flow_type = 'common'`,
    [profileId, movementId, householdId]
  );

  await query(
    `DELETE FROM transactions WHERE id = $1 AND household_id = $2 AND flow_type = 'common'`,
    [movementId, householdId]
  );

  revalidatePath('/sickness/balance');
  revalidatePath('/api/sickness/balance/period-summary');
  revalidatePath('/api/sickness/balance/global');
  return ok();
}

// Variante callable desde cliente sin FormData
export async function deleteCommonById(params: { movementId: string; householdId: string }): Promise<Result> {
  const { movementId, householdId } = params;
  if (!movementId || !householdId) return fail('Parámetros inválidos');

  const form = new FormData();
  form.append('movementId', movementId);
  form.append('householdId', householdId);
  return deleteCommonMovement(form);
}
