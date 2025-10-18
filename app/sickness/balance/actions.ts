// actions.ts para Balance/Transacciones
// Acciones para editar/eliminar movimientos (gastos directos y compensatorios)

'use server';
import { query } from '@/lib/db';
import type { Result } from '@/lib/result';
import { fail, ok } from '@/lib/result';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

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
  amount: z.number().positive(),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  occurredAt: z.string().optional(),
});

// Edita movimiento directo y su compensatorio si existe
export async function editDirectExpenseWithCompensatory(formData: FormData): Promise<Result> {
  const parsed = EditMovementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }
  const { movementId, householdId, amount, description, categoryId, occurredAt } = parsed.data;

  // Buscar el par compensatorio
  const pairRes = await query(
    `SELECT transaction_pair_id FROM transactions WHERE id = $1 AND household_id = $2 AND flow_type = 'direct'`,
    [movementId, householdId]
  );
  const pairId = pairRes.rows[0]?.transaction_pair_id;

  // Actualizar gasto directo
  await query(
    `UPDATE transactions SET amount = $1, description = $2, category_id = $3, occurred_at = $4 WHERE id = $5 AND household_id = $6 AND flow_type = 'direct'`,
    [amount, description || null, categoryId || null, occurredAt, movementId, householdId]
  );

  // Actualizar ingreso compensatorio si existe
  if (pairId) {
    await query(
      `UPDATE transactions SET amount = $1, description = $2, occurred_at = $3 WHERE transaction_pair_id = $4 AND flow_type = 'direct' AND type = 'income' AND household_id = $5`,
      [amount, `Ingreso automático por gasto directo: ${description || ''}`, occurredAt, pairId, householdId]
    );
  }

  revalidatePath('/app/sickness/balance');
  return ok();
}
