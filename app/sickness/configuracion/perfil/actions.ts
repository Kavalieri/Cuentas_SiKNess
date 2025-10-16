'use server';

import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { toNumber } from '@/lib/format';
import { fail, ok, type Result } from '@/lib/result';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ============================================================================
// SCHEMAS
// ============================================================================

const UpdateDisplayNameSchema = z.object({
  displayName: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
});

const UpdateMemberIncomeSchema = z.object({
  householdId: z.string().uuid('ID de hogar inválido'),
  monthlyIncome: z
    .number()
    .min(0, 'El ingreso debe ser positivo o cero')
    .max(999999999, 'Valor muy alto'),
});

// ============================================================================
// TYPES
// ============================================================================

export interface UserProfile {
  id: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isSystemAdmin: boolean;
  createdAt: string;
}

export interface MemberIncome {
  id: string;
  householdId: string;
  profileId: string;
  monthlyIncome: number;
  effectiveFrom: string;
  createdAt: string;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Obtener el perfil del usuario actual
 */
export async function getUserProfile(): Promise<Result<UserProfile>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('Usuario no autenticado');
    }

    const result = await query<UserProfile>(
      `SELECT
        id,
        display_name as "displayName",
        email,
        avatar_url as "avatarUrl",
        bio,
        is_system_admin as "isSystemAdmin",
        created_at as "createdAt"
      FROM profiles
      WHERE id = $1`,
      [user.profile_id], // Usar profile_id en lugar de id
    );

    if (result.rows.length === 0) {
      return fail('Perfil no encontrado');
    }

    return ok(result.rows[0]);
  } catch (error) {
    console.error('[getUserProfile] Error:', error);
    return fail('Error al obtener el perfil');
  }
}

/**
 * Obtener el ingreso mensual actual del miembro en un hogar
 */
export async function getMemberIncome(householdId: string): Promise<Result<MemberIncome | null>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('Usuario no autenticado');
    }

    // Obtener el ingreso más reciente vigente
    const result = await query<MemberIncome>(
      `SELECT
        id,
        household_id as "householdId",
        profile_id as "profileId",
        monthly_income as "monthlyIncome",
        effective_from as "effectiveFrom",
        created_at as "createdAt"
      FROM member_incomes
      WHERE household_id = $1
        AND profile_id = $2
        AND effective_from <= CURRENT_DATE
      ORDER BY effective_from DESC
      LIMIT 1`,
      [householdId, user.profile_id], // Usar profile_id
    );

    if (result.rows.length === 0) {
      return ok(null); // No hay ingreso configurado aún
    }

    // Convertir monthly_income a número (PostgreSQL devuelve numeric como string)
    const rawIncome = result.rows[0];
    if (!rawIncome) {
      return ok(null);
    }

    const income: MemberIncome = {
      id: rawIncome.id || '',
      householdId: rawIncome.householdId || '',
      profileId: rawIncome.profileId || '',
      monthlyIncome: toNumber(rawIncome.monthlyIncome),
      effectiveFrom: rawIncome.effectiveFrom || '',
      createdAt: rawIncome.createdAt || '',
    };

    return ok(income);
  } catch (error) {
    console.error('[getMemberIncome] Error:', error);
    return fail('Error al obtener el ingreso del miembro');
  }
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Actualizar el nombre visible del usuario
 */
export async function updateDisplayName(formData: FormData): Promise<Result> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('Usuario no autenticado');
    }

    // Validar datos
    const parsed = UpdateDisplayNameSchema.safeParse({
      displayName: formData.get('displayName'),
    });

    if (!parsed.success) {
      return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
    }

    // Actualizar perfil
    await query(
      `UPDATE profiles
       SET display_name = $1,
           updated_at = now()
       WHERE id = $2`,
      [parsed.data.displayName, user.profile_id], // Usar profile_id
    );

    revalidatePath('/sickness/configuracion/perfil');
    return ok();
  } catch (error) {
    console.error('[updateDisplayName] Error:', error);
    return fail('Error al actualizar el nombre');
  }
}

/**
 * Actualizar o crear el ingreso mensual del miembro en el hogar activo
 */
export async function updateMemberIncome(formData: FormData): Promise<Result> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('Usuario no autenticado');
    }

    // Validar datos
    const rawIncome = formData.get('monthlyIncome');
    const parsed = UpdateMemberIncomeSchema.safeParse({
      householdId: formData.get('householdId'),
      monthlyIncome: toNumber(typeof rawIncome === 'string' ? rawIncome : null),
    });

    if (!parsed.success) {
      return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
    }

    const { householdId, monthlyIncome } = parsed.data;

    // Verificar que el usuario pertenece al hogar
    const memberCheck = await query(
      `SELECT 1 FROM household_members
       WHERE household_id = $1 AND profile_id = $2`,
      [householdId, user.profile_id],
    );

    if (memberCheck.rows.length === 0) {
      return fail('No perteneces a este hogar');
    }

    // Insertar nuevo ingreso con fecha efectiva desde hoy
    // Los ingresos NO se actualizan, se crea un nuevo registro con nueva fecha efectiva
    await query(
      `INSERT INTO member_incomes (household_id, profile_id, monthly_income, effective_from)
       VALUES ($1, $2, $3, CURRENT_DATE)`,
      [householdId, user.profile_id, monthlyIncome],
    );

    // Revalidar TODAS las rutas que muestren datos de ingresos
    revalidatePath('/sickness/configuracion/perfil');
    revalidatePath('/sickness/configuracion');
    revalidatePath('/sickness/inicio');
    revalidatePath('/sickness');
    
    return ok();
  } catch (error) {
    console.error('[updateMemberIncome] Error:', error);
    return fail('Error al actualizar el ingreso mensual');
  }
}
