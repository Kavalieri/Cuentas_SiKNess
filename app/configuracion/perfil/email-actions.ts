'use server';

import { query } from '@/lib/db';
import { fail, ok, type Result } from '@/lib/result';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ============================================
// TIPOS
// ============================================

export type ProfileEmail = {
  id: string;
  profile_id: string;
  email: string;
  is_primary: boolean;
  verified: boolean;
  verified_at: string | null;
  added_at: string;
};

// ============================================
// SCHEMAS DE VALIDACIÓN
// ============================================

const AddEmailSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase().trim(),
});

const SetPrimaryEmailSchema = z.object({
  emailId: z.string().uuid('ID de email inválido'),
});

// ============================================
// ACTIONS
// ============================================

/**
 * Obtiene todos los emails del perfil del usuario actual
 */
export async function getProfileEmails(): Promise<Result<ProfileEmail[]>> {
  const user = await getCurrentUser();
  if (!user?.profile_id) {
    return fail('No autenticado');
  }

  try {
    const result = await query<ProfileEmail>(
      `
      SELECT 
        id, 
        profile_id, 
        email, 
        is_primary, 
        verified, 
        verified_at, 
        added_at
      FROM profile_emails
      WHERE profile_id = $1
      ORDER BY is_primary DESC, added_at ASC
      `,
      [user.profile_id],
    );

    return ok(result.rows);
  } catch (error) {
    console.error('Error al obtener emails del perfil:', error);
    return fail('Error al cargar emails');
  }
}

/**
 * Añade un nuevo email al perfil del usuario actual
 * - Valida que no exista ya en el sistema (profiles.email o profile_emails.email)
 * - Lo añade como email NO primario (is_primary = false)
 * - NO envía email de verificación en esta fase (opcional para el futuro)
 */
export async function addProfileEmail(formData: FormData): Promise<Result> {
  const user = await getCurrentUser();
  if (!user?.profile_id) {
    return fail('No autenticado');
  }

  // Validación de input
  const parsed = AddEmailSchema.safeParse({
    email: formData.get('email'),
  });

  if (!parsed.success) {
    return fail('Email inválido', parsed.error.flatten().fieldErrors);
  }

  const { email } = parsed.data;

  try {
    // 1. Validar que el email NO exista ya en profiles.email
    const existingProfile = await query(
      `SELECT id FROM profiles WHERE LOWER(email) = LOWER($1)`,
      [email],
    );

    if (existingProfile.rows.length > 0) {
      return fail('Este email ya está registrado en el sistema');
    }

    // 2. Validar que el email NO exista ya en profile_emails
    const existingEmailEntry = await query(
      `SELECT id FROM profile_emails WHERE LOWER(email) = LOWER($1)`,
      [email],
    );

    if (existingEmailEntry.rows.length > 0) {
      return fail('Este email ya está asociado a otro perfil');
    }

    // 3. Insertar nuevo email como NO primario
    await query(
      `
      INSERT INTO profile_emails (profile_id, email, is_primary, verified, added_at, added_by)
      VALUES ($1, $2, false, false, NOW(), $1)
      `,
      [user.profile_id, email.toLowerCase()],
    );

    revalidatePath('/configuracion/perfil');
    return ok();
  } catch (error) {
    console.error('Error al añadir email:', error);
    return fail('Error al añadir email');
  }
}

/**
 * Establece un email como primario
 * Solo puede haber UN email primario por perfil
 */
export async function setPrimaryEmail(formData: FormData): Promise<Result> {
  const user = await getCurrentUser();
  if (!user?.profile_id) {
    return fail('No autenticado');
  }

  // Validar input
  const parsed = SetPrimaryEmailSchema.safeParse({
    emailId: formData.get('emailId'),
  });

  if (!parsed.success) {
    return fail('ID de email inválido', parsed.error.flatten().fieldErrors);
  }

  const { emailId } = parsed.data;

  try {
    // 1. Verificar que el email pertenece al usuario
    const emailCheck = await query<{ profile_id: string }>(
      `SELECT profile_id FROM profile_emails WHERE id = $1`,
      [emailId],
    );

    if (emailCheck.rows.length === 0) {
      return fail('Email no encontrado');
    }

    const emailData = emailCheck.rows[0];
    if (!emailData) {
      return fail('Email no encontrado');
    }

    if (emailData.profile_id !== user.profile_id) {
      return fail('No tienes permiso para modificar este email');
    }

    // 2. Transacción: quitar is_primary de todos y ponerlo en el seleccionado
    await query('BEGIN');

    try {
      // Quitar is_primary de todos los emails del perfil
      await query(
        `UPDATE profile_emails SET is_primary = false WHERE profile_id = $1`,
        [user.profile_id],
      );

      // Establecer el seleccionado como primario
      await query(
        `UPDATE profile_emails SET is_primary = true WHERE id = $1`,
        [emailId],
      );

      // 3. Actualizar el email en la tabla profiles para mantener sincronía
      const newPrimaryEmail = await query<{ email: string }>(
        `SELECT email FROM profile_emails WHERE id = $1`,
        [emailId],
      );

      if (newPrimaryEmail.rows.length > 0) {
        const newEmail = newPrimaryEmail.rows[0];
        if (newEmail) {
          await query(
            `UPDATE profiles SET email = $1, updated_at = NOW() WHERE id = $2`,
            [newEmail.email, user.profile_id],
          );
        }
      }

      await query('COMMIT');

      revalidatePath('/configuracion/perfil');
      revalidatePath('/configuracion/hogar');
      return ok();
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error al establecer email primario:', error);
    return fail('Error al establecer email primario');
  }
}

/**
 * Elimina un email secundario del perfil
 * NO permite eliminar el email primario (debe cambiarse primero)
 */
export async function removeProfileEmail(formData: FormData): Promise<Result> {
  const user = await getCurrentUser();
  if (!user?.profile_id) {
    return fail('No autenticado');
  }

  const emailId = formData.get('emailId') as string;

  if (!emailId) {
    return fail('ID de email requerido');
  }

  try {
    // 1. Verificar que el email pertenece al usuario y NO es primario
    const emailCheck = await query<{ profile_id: string; is_primary: boolean }>(
      `SELECT profile_id, is_primary FROM profile_emails WHERE id = $1`,
      [emailId],
    );

    if (emailCheck.rows.length === 0) {
      return fail('Email no encontrado');
    }

    const emailData = emailCheck.rows[0];
    if (!emailData) {
      return fail('Email no encontrado');
    }

    if (emailData.profile_id !== user.profile_id) {
      return fail('No tienes permiso para eliminar este email');
    }

    if (emailData.is_primary) {
      return fail('No puedes eliminar el email primario. Establece otro email como primario primero.');
    }

    // 2. Eliminar email
    await query(
      `DELETE FROM profile_emails WHERE id = $1`,
      [emailId],
    );

    revalidatePath('/configuracion/perfil');
    return ok();
  } catch (error) {
    console.error('Error al eliminar email:', error);
    return fail('Error al eliminar email');
  }
}

/**
 * Verifica si un email existe en el sistema (profiles o profile_emails)
 * Útil para validación en tiempo real
 */
export async function checkEmailExists(email: string): Promise<Result<{ exists: boolean }>> {
  if (!email || typeof email !== 'string') {
    return fail('Email inválido');
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Verificar en ambas tablas
    const result = await query<{ exists: boolean }>(
      `
      SELECT EXISTS(
        SELECT 1 FROM profiles WHERE LOWER(email) = $1
        UNION
        SELECT 1 FROM profile_emails WHERE LOWER(email) = $1
      ) as exists
      `,
      [normalizedEmail],
    );

    return ok({ exists: result.rows[0]?.exists ?? false });
  } catch (error) {
    console.error('Error al verificar email:', error);
    return fail('Error al verificar email');
  }
}
