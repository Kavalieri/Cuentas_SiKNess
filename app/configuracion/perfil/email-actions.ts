'use server';

import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { fail, ok, type Result } from '@/lib/result';
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
    // Verificar en ambas tablas (excluir perfiles eliminados en profiles)
    const result = await query<{ exists: boolean }>(
      `
      SELECT EXISTS(
        SELECT 1 FROM profiles WHERE LOWER(email) = $1 AND deleted_at IS NULL
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

// ============================================
// ELIMINACIÓN DE CUENTA
// ============================================

/**
 * Elimina completamente la cuenta del usuario actual.
 *
 * Validaciones:
 * - No puede ser el único owner de un hogar activo
 *
 * Eliminación:
 * - Soft delete: profiles (deleted_at)
 * - Hard delete: profile_emails, household_members, user_settings,
 *                contributions, member_incomes, member_credits, invitations
 * - Preserva: journals, logs (auditoría)
 *
 * @returns Result con mensaje de éxito o error
 */
export async function deleteAccount(): Promise<Result> {
  const user = await getCurrentUser();
  if (!user?.profile_id) {
    return fail('No autenticado');
  }

  try {
    // 1. Verificar que no es el único owner de algún hogar
    const soloOwnerCheck = await query<{ household_id: string; household_name: string }>(
      `
      SELECT h.id as household_id, h.name as household_name
      FROM household_members hm
      JOIN households h ON h.id = hm.household_id
      WHERE hm.profile_id = $1
        AND hm.role = 'owner'
        AND h.deleted_at IS NULL
        AND (
          SELECT COUNT(*)
          FROM household_members
          WHERE household_id = hm.household_id
            AND role = 'owner'
        ) = 1
      `,
      [user.profile_id],
    );

    if (soloOwnerCheck.rows.length > 0) {
      const householdNames = soloOwnerCheck.rows.map((r) => r.household_name).join(', ');
      return fail(
        `No puedes eliminar tu cuenta porque eres el único propietario de estos hogares: ${householdNames}. Transfiere la propiedad o elimina los hogares primero.`,
      );
    }

    // 2. Soft delete en profiles
    await query(
      `
      UPDATE profiles
      SET deleted_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      `,
      [user.profile_id],
    );

    // 3. Hard delete en tablas relacionadas (cascade automático configurado en FK)
    // Las FK con ON DELETE CASCADE se encargan de:
    // - profile_emails
    // - household_members
    // - user_settings
    // - user_active_household

    // Para las que no tienen cascade, eliminamos manualmente:
    await query('DELETE FROM contributions WHERE profile_id = $1', [user.profile_id]);
    await query('DELETE FROM member_incomes WHERE profile_id = $1', [user.profile_id]);
    await query('DELETE FROM member_credits WHERE profile_id = $1', [user.profile_id]);

    // Invitaciones donde es el invitador (cambiar a NULL para mantener historial)
    await query(
      'UPDATE invitations SET invited_by_profile_id = NULL WHERE invited_by_profile_id = $1',
      [user.profile_id],
    );

    // 4. Revalidar rutas
    revalidatePath('/sickness', 'layout');
    revalidatePath('/configuracion/perfil');

    return ok({ message: 'Cuenta eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar cuenta:', error);
    return fail('Error al eliminar la cuenta. Por favor, contacta con soporte.');
  }
}

// ============================================
// INVITACIONES DE EMAIL COMPARTIDO
// ============================================

export type EmailInvitation = {
  id: string;
  profile_id: string;
  invited_email: string;
  token: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
};

const InviteEmailSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase().trim(),
});

/**
 * Genera una invitación para añadir un email secundario a este perfil
 * El email invitado podrá aceptar y se añadirá como alias secundario del perfil invitador
 * @param formData - Debe incluir: email (string), origin (string)
 * @param origin - Origen del request (ej: "https://cuentasdev.sikwow.com" o "http://localhost:3001")
 */
export async function generateEmailInvitation(
  formData: FormData,
  origin?: string,
): Promise<Result<{ invitationUrl: string; expiresAt: string }>> {
  const user = await getCurrentUser();
  if (!user?.profile_id) {
    return fail('No autenticado');
  }

  // Validar input
  const emailRaw = formData.get('email');
  const originRaw = origin || formData.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
  
  const parsed = InviteEmailSchema.safeParse({ email: emailRaw });
  if (!parsed.success) {
    return fail('Email inválido', parsed.error.flatten().fieldErrors);
  }

  const { email: invitedEmail } = parsed.data;

  try {
    // 1. Verificar que el email no existe ya en el sistema
    const emailCheck = await checkEmailExists(invitedEmail);
    if (emailCheck.ok && emailCheck.data?.exists) {
      return fail(
        'Este email ya está registrado en el sistema. No se puede invitar un email que ya pertenece a otro perfil.',
      );
    }

    // 2. Verificar que el email no es el propio email primario del usuario
    const userPrimaryEmail = await query<{ email: string }>(
      'SELECT email FROM profiles WHERE id = $1',
      [user.profile_id],
    );
    if (userPrimaryEmail.rows[0]?.email === invitedEmail) {
      return fail('No puedes invitar tu propio email primario');
    }

    // 3. Cancelar invitaciones pendientes anteriores para este email
    await query(
      `
      UPDATE email_invitations
      SET status = 'cancelled',
          metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{cancelled_reason}',
            '"Reemplazada por nueva invitación"'
          )
      WHERE profile_id = $1
        AND invited_email = $2
        AND status = 'pending'
      `,
      [user.profile_id, invitedEmail],
    );

    // 4. Generar token único y fecha de expiración (7 días)
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 5. Crear invitación
    const invitationResult = await query<EmailInvitation>(
      `
      INSERT INTO email_invitations (
        profile_id,
        invited_email,
        token,
        expires_at,
        status
      ) VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
      `,
      [user.profile_id, invitedEmail, token, expiresAt.toISOString()],
    );

    if (invitationResult.rows.length === 0) {
      return fail('Error al crear la invitación');
    }

    // 6. Generar URL de invitación usando el origin proporcionado
    const invitationUrl = `${originRaw}/api/auth/accept-email-invitation/${token}`;

    return ok({
      invitationUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Error al generar invitación de email:', error);
    return fail('Error al generar la invitación');
  }
}

/**
 * Obtiene las invitaciones pendientes del usuario actual
 */
export async function getPendingEmailInvitations(): Promise<Result<EmailInvitation[]>> {
  const user = await getCurrentUser();
  if (!user?.profile_id) {
    return fail('No autenticado');
  }

  try {
    const result = await query<EmailInvitation>(
      `
      SELECT *
      FROM email_invitations
      WHERE profile_id = $1
        AND status = 'pending'
        AND expires_at > NOW()
      ORDER BY created_at DESC
      `,
      [user.profile_id],
    );

    return ok(result.rows);
  } catch (error) {
    console.error('Error al obtener invitaciones:', error);
    return fail('Error al obtener invitaciones');
  }
}

/**
 * Cancela una invitación pendiente
 */
export async function cancelEmailInvitation(invitationId: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user?.profile_id) {
    return fail('No autenticado');
  }

  try {
    const result = await query(
      `
      UPDATE email_invitations
      SET status = 'cancelled',
          metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{cancelled_at}',
            to_jsonb(NOW())
          )
      WHERE id = $1
        AND profile_id = $2
        AND status = 'pending'
      `,
      [invitationId, user.profile_id],
    );

    if (result.rowCount === 0) {
      return fail('Invitación no encontrada o ya procesada');
    }

    revalidatePath('/configuracion/perfil');
    return ok({ message: 'Invitación cancelada' });
  } catch (error) {
    console.error('Error al cancelar invitación:', error);
    return fail('Error al cancelar la invitación');
  }
}
