'use server';

import { getUserHouseholdId } from '@/lib/auth';
import { query } from '@/lib/db';
import { fail, ok, type Result } from '@/lib/result';
import { revalidatePath } from 'next/cache';

interface MonthlyPeriodData {
  id: string;
  year: number;
  month: number;
  phase?: string;
  status: string;
  contribution_disabled?: boolean;
  created_at: string;
}

/**
 * Verifica si existe un período para el household, año y mes especificados
 */
export async function checkPeriodExists(
  householdId: string,
  year: number,
  month: number,
): Promise<Result<{ exists: boolean; period?: MonthlyPeriodData }>> {
  try {
    const result = await query(
      `
      SELECT
        id,
        year,
        month,
        phase,
        status,
        contribution_disabled,
        created_at
      FROM monthly_periods
      WHERE household_id = $1
        AND year = $2
        AND month = $3
      LIMIT 1
    `,
      [householdId, year, month],
    );

    if (result.rows.length > 0) {
      return ok({
        exists: true,
        period: result.rows[0] as MonthlyPeriodData,
      });
    }

    return ok({ exists: false });
  } catch (error) {
    console.error('Error checking period existence:', error);
    return fail('Error al verificar existencia del período');
  }
}

/**
 * Crea un nuevo período mensual
 * Se invoca cuando el usuario selecciona un mes que no existe
 */
export async function createPeriodWithCategories(
  householdId: string,
  year: number,
  month: number,
  options?: {
    contribution_disabled?: boolean;
  },
): Promise<Result<{ periodId: string }>> {
  try {
    console.log(`[createPeriodWithCategories] Starting for household=${householdId}, year=${year}, month=${month}`);

    // Verificar que no exista ya
    const existsCheck = await checkPeriodExists(householdId, year, month);
    if (!existsCheck.ok) {
      console.error('[createPeriodWithCategories] Error checking existence:', existsCheck.message);
      return existsCheck;
    }

    if (existsCheck.data?.exists) {
      console.warn('[createPeriodWithCategories] Period already exists');
      return fail('El período ya existe');
    }

    console.log('[createPeriodWithCategories] Period does not exist, creating...');

    // Crear el período en estado SETUP
    const insertResult = await query(
      `
      INSERT INTO monthly_periods (
        household_id,
        year,
        month,
        status,
        opening_balance,
        closing_balance,
        created_at
      ) VALUES ($1, $2, $3, 'active', 0, 0, NOW())
      RETURNING id
    `,
      [householdId, year, month],
    );

    if (insertResult.rows.length === 0) {
      console.error('[createPeriodWithCategories] Insert returned no rows');
      return fail('Error al crear el período');
    }

    const periodId = insertResult.rows[0]?.id;
    if (!periodId) {
      console.error('[createPeriodWithCategories] No ID returned from insert');
      return fail('Error al obtener ID del período creado');
    }

    console.log(`[createPeriodWithCategories] ✅ Period created with ID: ${periodId}`);

    revalidatePath('/sickness');
    revalidatePath('/sickness/credito-deuda');
    revalidatePath('/sickness/transacciones');

    console.log('[createPeriodWithCategories] ✅ Cache revalidated');

    return ok({ periodId });
  } catch (error) {
    console.error('[createPeriodWithCategories] Exception:', error);
    return fail('Error al crear el período');
  }
}

interface MonthlyPeriodWithStats extends MonthlyPeriodData {
  transaction_count: number;
  has_direct_expenses: boolean;
  has_common_transactions: boolean;
}

/**
 * Obtiene todos los períodos de un household con información de transacciones
 */
export async function getHouseholdPeriods(): Promise<
  Result<MonthlyPeriodWithStats[]>
> {
  try {
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No hay hogar activo');
    }

    const result = await query(
      `
      SELECT
        mp.id,
        mp.year,
        mp.month,
        COALESCE(mp.status, 'active') as status,
        COUNT(DISTINCT t.id) as transaction_count,
        COUNT(DISTINCT CASE WHEN t.flow_type = 'direct' THEN t.id END) > 0 as has_direct_expenses,
        COUNT(DISTINCT CASE WHEN t.flow_type = 'common' THEN t.id END) > 0 as has_common_transactions,
        mp.created_at
      FROM monthly_periods mp
      LEFT JOIN transactions t ON
        t.household_id = mp.household_id
        AND EXTRACT(YEAR FROM t.occurred_at) = mp.year
        AND EXTRACT(MONTH FROM t.occurred_at) = mp.month
      WHERE mp.household_id = $1
      GROUP BY mp.id, mp.year, mp.month, mp.status, mp.created_at
      ORDER BY mp.year DESC, mp.month DESC
    `,
      [householdId],
    );

    return ok(result.rows as unknown as MonthlyPeriodWithStats[]);
  } catch (error) {
    console.error('Error fetching household periods:', error);
    return fail('Error al obtener períodos');
  }
}
