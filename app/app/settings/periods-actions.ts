'use server';

import type { Result } from '@/lib/result';
import { fail, ok } from '@/lib/result';
import { getCurrentUser, getUserHouseholdId, query } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Schemas de validación
const LockPeriodSchema = z.object({
  year: z.number().int().min(2020).max(2030),
  month: z.number().int().min(1).max(12),
});

const ClosePeriodSchema = z.object({
  year: z.number().int().min(2020).max(2030),
  month: z.number().int().min(1).max(12),
});

// Tipos para los datos
export interface ContributionPeriod {
  id: string;
  household_id: string;
  year: number;
  month: number;
  status: 'SETUP' | 'LOCKED' | 'CLOSED';
  created_at: string;
  locked_at: string | null;
  locked_by_email: string | null;
  closed_at: string | null;
  closed_by_email: string | null;
  flow_description: string;
}

// Obtener períodos del hogar activo
export async function getContributionPeriods(): Promise<Result<ContributionPeriod[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('Usuario no autenticado');
    }

    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No hay hogar activo');
    }

    const result = await query(
      `
      SELECT
        cp.id,
        cp.household_id,
        cp.year,
        cp.month,
        cp.status,
        cp.created_at,
        cp.locked_at,
        p1.email as locked_by_email,
        cp.closed_at,
        p2.email as closed_by_email,
        CASE
          WHEN cp.status = 'SETUP' THEN '🔓 Solo flujos directos'
          WHEN cp.status = 'LOCKED' THEN '🔒 Ambos flujos permitidos'
          WHEN cp.status = 'CLOSED' THEN '❌ Ningún flujo permitido'
        END as flow_description
      FROM contribution_periods cp
      LEFT JOIN profiles p1 ON cp.locked_by = p1.id
      LEFT JOIN profiles p2 ON cp.closed_by = p2.id
      WHERE cp.household_id = $1
      ORDER BY cp.year DESC, cp.month DESC
    `,
      [householdId],
    );

    return ok(result.rows as ContributionPeriod[]);
  } catch (error) {
    console.error('Error al obtener períodos:', error);
    return fail('Error al obtener períodos de contribución');
  }
}

// Verificar si el usuario es owner del hogar activo
export async function isOwnerOfActiveHousehold(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) return false;

    const householdId = await getUserHouseholdId();
    if (!householdId) return false;

    const result = await query(
      `
      SELECT role
      FROM household_members
      WHERE household_id = $1 AND profile_id = $2
    `,
      [householdId, user.profile_id],
    );

    return result.rows.length > 0 && result.rows[0]?.role === 'owner';
  } catch (error) {
    console.error('Error al verificar ownership:', error);
    return false;
  }
}

// Crear o obtener período actual
export async function getOrCreateCurrentPeriod(): Promise<Result<ContributionPeriod>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('Usuario no autenticado');
    }

    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No hay hogar activo');
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Intentar obtener período existente
    let result = await query(
      `
      SELECT
        cp.id,
        cp.household_id,
        cp.year,
        cp.month,
        cp.status,
        cp.created_at,
        cp.locked_at,
        p1.email as locked_by_email,
        cp.closed_at,
        p2.email as closed_by_email,
        CASE
          WHEN cp.status = 'SETUP' THEN '🔓 Solo flujos directos'
          WHEN cp.status = 'LOCKED' THEN '🔒 Ambos flujos permitidos'
          WHEN cp.status = 'CLOSED' THEN '❌ Ningún flujo permitido'
        END as flow_description
      FROM contribution_periods cp
      LEFT JOIN profiles p1 ON cp.locked_by = p1.id
      LEFT JOIN profiles p2 ON cp.closed_by = p2.id
      WHERE cp.household_id = $1 AND cp.year = $2 AND cp.month = $3
    `,
      [householdId, year, month],
    );

    if (result.rows.length > 0) {
      return ok(result.rows[0] as ContributionPeriod);
    }

    // Crear nuevo período si no existe
    result = await query(
      `
      INSERT INTO contribution_periods (household_id, year, month, status)
      VALUES ($1, $2, $3, 'SETUP')
      RETURNING
        id,
        household_id,
        year,
        month,
        status,
        created_at,
        locked_at,
        closed_at,
        '🔓 Solo flujos directos' as flow_description
    `,
      [householdId, year, month],
    );

    const newPeriod: ContributionPeriod = {
      ...result.rows[0],
      locked_by_email: null,
      closed_by_email: null,
    } as ContributionPeriod;

    revalidatePath('/app/settings');
    return ok(newPeriod);
  } catch (error) {
    console.error('Error al crear/obtener período:', error);
    return fail('Error al gestionar período de contribución');
  }
}

// Bloquear período (SETUP → LOCKED)
export async function lockContributionPeriod(formData: FormData): Promise<Result> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('Usuario no autenticado');
    }

    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No hay hogar activo');
    }

    // Verificar que es owner
    const isOwner = await isOwnerOfActiveHousehold();
    if (!isOwner) {
      return fail('Solo el propietario puede bloquear períodos');
    }

    const parsed = LockPeriodSchema.safeParse({
      year: parseInt(formData.get('year') as string),
      month: parseInt(formData.get('month') as string),
    });

    if (!parsed.success) {
      return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
    }

    const { year, month } = parsed.data;

    // Actualizar período a LOCKED
    const result = await query(
      `
      UPDATE contribution_periods
      SET status = 'LOCKED',
          locked_at = NOW(),
          locked_by = $1
      WHERE household_id = $2
        AND year = $3
        AND month = $4
        AND status = 'SETUP'
      RETURNING id
    `,
      [user.profile_id, householdId, year, month],
    );

    if (result.rows.length === 0) {
      return fail('No se pudo bloquear el período. Verifique que esté en estado SETUP.');
    }

    revalidatePath('/app/settings');
    return ok();
  } catch (error) {
    console.error('Error al bloquear período:', error);
    return fail('Error al bloquear período de contribución');
  }
}

// Cerrar período (LOCKED → CLOSED)
export async function closeContributionPeriod(formData: FormData): Promise<Result> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('Usuario no autenticado');
    }

    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No hay hogar activo');
    }

    // Verificar que es owner
    const isOwner = await isOwnerOfActiveHousehold();
    if (!isOwner) {
      return fail('Solo el propietario puede cerrar períodos');
    }

    const parsed = ClosePeriodSchema.safeParse({
      year: parseInt(formData.get('year') as string),
      month: parseInt(formData.get('month') as string),
    });

    if (!parsed.success) {
      return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
    }

    const { year, month } = parsed.data;

    // Actualizar período a CLOSED
    const result = await query(
      `
      UPDATE contribution_periods
      SET status = 'CLOSED',
          closed_at = NOW(),
          closed_by = $1
      WHERE household_id = $2
        AND year = $3
        AND month = $4
        AND status = 'LOCKED'
      RETURNING id
    `,
      [user.profile_id, householdId, year, month],
    );

    if (result.rows.length === 0) {
      return fail('No se pudo cerrar el período. Verifique que esté en estado LOCKED.');
    }

    revalidatePath('/app/settings');
    return ok();
  } catch (error) {
    console.error('Error al cerrar período:', error);
    return fail('Error al cerrar período de contribución');
  }
}
