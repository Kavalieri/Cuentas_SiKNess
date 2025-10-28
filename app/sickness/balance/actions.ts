// actions.ts para Balance/Transacciones
// Acciones para editar/eliminar movimientos (gastos directos y compensatorios)

'use server';
import { getCurrentProfileId, isHouseholdOwner } from '@/lib/adminCheck';
import { query } from '@/lib/db';
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
  const txRes = await query<{ real_payer_id: string | null; profile_id: string | null }>(
    `SELECT real_payer_id, profile_id FROM transactions WHERE id = $1 AND household_id = $2 AND flow_type = 'direct'`,
    [movementId, householdId]
  );

  if (txRes.rows.length === 0) return fail('Movimiento directo no encontrado');

  const tx = txRes.rows[0]!;

  // Verificar permisos: owner O propietario del gasto directo
  const isOwner = await isHouseholdOwner(profileId, householdId);
  const isRealPayer = tx.real_payer_id === profileId;
  const isProfileOwner = tx.profile_id === profileId;

  if (!isOwner && !isRealPayer && !isProfileOwner) {
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
  categoryId: z
    .preprocess((v) => (v === '' || v == null ? null : v), z.string().uuid().nullable())
    .optional(),
  occurredAt: z.string().min(1, 'Fecha/hora requerida'),
});

// Edita movimiento directo y su compensatorio si existe
export async function editDirectExpenseWithCompensatory(formData: FormData): Promise<Result> {
  const parsed = EditMovementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }
  const { movementId, householdId, amount, description, categoryId, occurredAt } = parsed.data;

  const { occurred_at_date, performed_at_ts } = parseDateTimeInput(occurredAt);

  // Verificar permisos: obtener información del movimiento
  const profileId = await getCurrentProfileId();
  if (!profileId) return fail('No autenticado');

  const txRes = await query<{ real_payer_id: string | null; profile_id: string | null }>(
    `SELECT real_payer_id, profile_id FROM transactions WHERE id = $1 AND household_id = $2 AND flow_type = 'direct'`,
    [movementId, householdId]
  );

  if (txRes.rows.length === 0) return fail('Movimiento directo no encontrado');

  const tx = txRes.rows[0]!;

  // Verificar permisos: owner O propietario del gasto directo
  const isOwner = await isHouseholdOwner(profileId, householdId);
  const isRealPayer = tx.real_payer_id === profileId;
  const isProfileOwner = tx.profile_id === profileId;

  if (!isOwner && !isRealPayer && !isProfileOwner) {
    return fail('No autorizado: solo puedes editar tus propios gastos directos');
  }

  // Buscar el par compensatorio
  const pairRes = await query(
    `SELECT transaction_pair_id FROM transactions WHERE id = $1 AND household_id = $2 AND flow_type = 'direct'`,
    [movementId, householdId]
  );
  const pairId = pairRes.rows[0]?.transaction_pair_id;

  // Actualizar gasto directo (con auditoría)
  await query(
    `UPDATE transactions
     SET amount = $1,
         description = $2,
         category_id = $3,
         occurred_at = $4,
         performed_at = $5,
         updated_at = now(),
         updated_by_profile_id = $6
     WHERE id = $7 AND household_id = $8 AND flow_type = 'direct'`,
    [amount, description || null, categoryId ?? null, occurred_at_date, performed_at_ts, profileId ?? null, movementId, householdId]
  );

  // Actualizar ingreso compensatorio si existe
  if (pairId) {
    await query(
      `UPDATE transactions
       SET amount = $1,
           description = $2,
           occurred_at = $3,
           performed_at = $4,
           updated_at = now(),
           updated_by_profile_id = $5
       WHERE transaction_pair_id = $6
         AND flow_type = 'direct'
         AND type IN ('income','income_direct')
         AND household_id = $7`,
      [amount, `Ingreso automático por gasto directo: ${description || ''}`, occurred_at_date, performed_at_ts, profileId ?? null, pairId, householdId]
    );
  }

  // Nota: la ruta real es /sickness/balance (App Router)
  revalidatePath('/sickness/balance');
  revalidatePath('/api/sickness/balance/period-summary');
  revalidatePath('/api/sickness/balance/global');
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
  categoryId: z
    .preprocess((v) => (v === '' || v == null ? null : v), z.string().uuid().nullable())
    .optional(),
  occurredAt: z.string().min(1, 'Fecha/hora requerida'),
  // paidBy: 'common' | uuid
  paidBy: z.string().optional(),
});

// Edita un movimiento del flujo común (income/expense)
export async function editCommonMovement(formData: FormData): Promise<Result> {
  const parsed = EditCommonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const { movementId, householdId, amount, description, categoryId, occurredAt, paidBy } = parsed.data;

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

  // Resolver paid_by
  let paid_by: string | null = null;
  if (paidBy && paidBy !== '' && paidBy !== 'common') {
    paid_by = paidBy; // UUID
  } else if (paidBy === 'common' || !paidBy) {
    paid_by = null; // cuenta común
  }

  // Reglas: ingresos requieren paid_by no nulo
  if (tx && tx.type === 'income' && paid_by === null) {
    return fail('Los ingresos comunes deben tener un miembro asignado');
  }

  await query(
    `UPDATE transactions
     SET amount = $1,
         description = $2,
         category_id = $3,
         occurred_at = $4,
         performed_at = $5,
         period_id = $6,
         paid_by = $7,
         updated_at = now(),
         updated_by_profile_id = $8
     WHERE id = $9 AND household_id = $10 AND flow_type = 'common'`,
    [amount, description || null, categoryId ?? null, occurred_at_date, performed_at_ts, newPeriodId, paid_by, profileId, movementId, householdId]
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
