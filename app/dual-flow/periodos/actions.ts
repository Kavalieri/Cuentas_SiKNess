'use server';

import { getUserHouseholdId } from '@/lib/auth';
import { query } from '@/lib/db';
import { fail, ok, type Result } from '@/lib/result';
import { revalidatePath } from 'next/cache';

interface MonthlyPeriodData {
  id: string;
  year: number;
  month: number;
  phase: string;
  status: string;
  contribution_disabled: boolean;
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
 * Crea un nuevo período mensual con categorías base
 * NO se llama automáticamente - solo desde confirmación del usuario
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
    // Verificar que no exista ya
    const existsCheck = await checkPeriodExists(householdId, year, month);
    if (!existsCheck.ok) {
      return existsCheck;
    }

    if (existsCheck.data?.exists) {
      return fail('El período ya existe');
    }

    // Crear el período
    const insertResult = await query(
      `
      INSERT INTO monthly_periods (
        household_id,
        year,
        month,
        phase,
        status,
        opening_balance,
        closing_balance,
        contribution_disabled
      ) VALUES ($1, $2, $3, 'preparing', 'active', 0, 0, $4)
      RETURNING id
    `,
      [householdId, year, month, options?.contribution_disabled ?? false],
    );

    if (insertResult.rows.length === 0) {
      return fail('Error al crear el período');
    }

    const periodId = insertResult.rows[0]?.id;
    if (!periodId) {
      return fail('Error al obtener ID del período creado');
    }

    // Copiar categorías del household al período
    // (Las categorías ya existen en la tabla categories, vinculadas por household_id)
    // No es necesario duplicarlas, se usan directamente

    revalidatePath('/dual-flow/periodos');
    revalidatePath('/dual-flow/transacciones');

    return ok({ periodId });
  } catch (error) {
    console.error('Error creating period:', error);
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
        mp.phase,
        mp.status,
        mp.contribution_disabled,
        COUNT(DISTINCT t.id) as transaction_count,
        COUNT(DISTINCT CASE WHEN t.flow_type = 'direct' THEN t.id END) > 0 as has_direct_expenses,
        COUNT(DISTINCT CASE WHEN t.flow_type = 'common' THEN t.id END) > 0 as has_common_transactions
      FROM monthly_periods mp
      LEFT JOIN transactions t ON
        t.household_id = mp.household_id
        AND EXTRACT(YEAR FROM t.occurred_at) = mp.year
        AND EXTRACT(MONTH FROM t.occurred_at) = mp.month
      WHERE mp.household_id = $1
      GROUP BY mp.id, mp.year, mp.month, mp.phase, mp.status, mp.contribution_disabled
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
