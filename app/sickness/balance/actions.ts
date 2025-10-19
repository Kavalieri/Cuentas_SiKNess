// actions.ts para Balance/Transacciones
// Acciones para editar/eliminar movimientos (gastos directos y compensatorios)

'use server';
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

  await deleteDirectExpenseInternal(movementId, householdId);

  // Revalidar la ruta de balance/transacciones
  // Al eliminar un gasto directo, el movimiento compensatorio debe ser un ingreso (positivo)
  // Si existe lógica que crea el movimiento compensatorio como gasto negativo, cámbiala a ingreso positivo.
  // Ejemplo: Si usas createTransaction({ type: 'expense', ... }), debe ser type: 'income' y amount positivo.
  // Si tienes lógica específica, revisa la función deleteDirectExpenseWithCompensatory y asegúrate que el movimiento compensatorio se crea como ingreso.
  revalidatePath('/app/sickness/balance');
  return ok();
}

// Variante callable desde componentes cliente sin FormData
export async function deleteDirectExpenseById(params: { movementId: string; householdId: string }): Promise<Result> {
  const { movementId, householdId } = params;
  if (!movementId || !householdId) return fail('Parámetros inválidos');
  await deleteDirectExpenseInternal(movementId, householdId);
  revalidatePath('/app/sickness/balance');
  return ok();
}

// Implementación compartida
async function deleteDirectExpenseInternal(movementId: string, householdId: string) {
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

  // Buscar el par compensatorio
  const pairRes = await query(
    `SELECT transaction_pair_id FROM transactions WHERE id = $1 AND household_id = $2 AND flow_type = 'direct'`,
    [movementId, householdId]
  );
  const pairId = pairRes.rows[0]?.transaction_pair_id;

  // Actualizar gasto directo
  await query(
    `UPDATE transactions
     SET amount = $1,
         description = $2,
         category_id = $3,
         occurred_at = $4,
         performed_at = $5,
         updated_at = now()
     WHERE id = $6 AND household_id = $7 AND flow_type = 'direct'`,
    [amount, description || null, categoryId ?? null, occurred_at_date, performed_at_ts, movementId, householdId]
  );

  // Actualizar ingreso compensatorio si existe
  if (pairId) {
    await query(
      `UPDATE transactions
       SET amount = $1,
           description = $2,
           occurred_at = $3,
           performed_at = $4,
           updated_at = now()
       WHERE transaction_pair_id = $5
         AND flow_type = 'direct'
         AND type IN ('income','income_direct')
         AND household_id = $6`,
      [amount, `Ingreso automático por gasto directo: ${description || ''}`, occurred_at_date, performed_at_ts, pairId, householdId]
    );
  }

  // Nota: la ruta real es /sickness/balance (App Router)
  revalidatePath('/sickness/balance');
  return ok();
}
