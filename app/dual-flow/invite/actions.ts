'use server';

import { isOwner } from '@/lib/adminCheck';
import { getCurrentUser, getUserHouseholdId } from '@/lib/auth';
import { query } from '@/lib/db';
import type { Result } from '@/lib/result';
import { fail, ok } from '@/lib/result';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

/**
 * Tipos de invitación soportados
 */
export type InvitationType = 'household' | 'app';

/**
 * Detalles de una invitación
 */
export interface InvitationDetails {
  id: string;
  type: InvitationType;
  token: string;
  email: string | null;
  household_id: string | null;
  household_name: string | null;
  invited_by_email: string;
  status: string;
  created_at: string;
  expires_at: string;
  max_uses: number | null;
  current_uses: number;
  metadata: Record<string, unknown>;
}

/**
 * Opciones para crear una invitación
 */
interface CreateInvitationOptions {
  type: InvitationType;
  email?: string; // Opcional: si se especifica, la invitación es para ese email específico
  householdId?: string; // Requerido si type='household'
  maxUses?: number; // Opcional: null = ilimitado, número = límite de usos
  expiresInDays?: number; // Días hasta expiración (default: 7)
  personalMessage?: string; // Mensaje personalizado (se guarda en metadata)
}

const _InvitationSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase(),
});

/**
 * Crea una invitación flexible (household o app)
 * - type='household': Invita a un household específico (requiere ser owner)
 * - type='app': Invita a probar la app (cualquier usuario autenticado puede crear)
 */
export async function createFlexibleInvitation(
  options: CreateInvitationOptions,
): Promise<Result<{ token: string; invitationUrl: string }>> {
  const user = await getCurrentUser();

  if (!user) {
    return fail('Usuario no autenticado');
  }

  // Validaciones según tipo
  if (options.type === 'household') {
    if (!options.householdId) {
      return fail('Se requiere householdId para invitaciones de tipo household');
    }

    // Verificar que el usuario sea owner del household
    const householdId = await getUserHouseholdId();
    if (!householdId || householdId !== options.householdId) {
      return fail('No tienes permiso para invitar a este hogar');
    }

    const isHouseholdOwner = await isOwner();
    if (!isHouseholdOwner) {
      return fail('Solo los propietarios pueden invitar a su hogar');
    }

    // Si se especificó email, verificar que no haya invitación pendiente
    if (options.email) {
      const existingInvitation = await query(
        'SELECT id, status FROM invitations WHERE email = $1 AND household_id = $2 AND status = $3',
        [options.email, options.householdId, 'pending'],
      );

      if (existingInvitation.rows.length > 0) {
        return fail(
          'Ya existe una invitación pendiente para este email en este hogar. Cancela la anterior antes de crear una nueva.',
        );
      }
    }
  }

  // Generar token único
  const token = crypto.randomBytes(32).toString('hex');

  // Calcular fecha de expiración
  const expiresInDays = options.expiresInDays || 7;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  try {
    // Insertar invitación
    const insertResult = await query(
      `INSERT INTO invitations (
        type, token, email, household_id, invited_by_email,
        status, expires_at, max_uses, current_uses, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        options.type,
        token,
        options.email || null,
        options.householdId || null,
        user.email,
        'pending',
        expiresAt.toISOString(),
        options.maxUses || null,
        0,
        options.personalMessage ? { personalMessage: options.personalMessage } : {},
      ],
    );

    if (insertResult.rows.length === 0) {
      return fail('Error al crear la invitación');
    }

    // Generar URL de invitación
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const invitationUrl =
      options.type === 'household'
        ? `${baseUrl}/dual-flow/invite?token=${token}`
        : `${baseUrl}/app/invite?token=${token}`;

    revalidatePath('/dual-flow/invite');
    revalidatePath('/app/household/invitations');

    return ok({ token, invitationUrl });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return fail('Error al crear la invitación');
  }
}

/**
 * Obtiene detalles de una invitación por token
 */
export async function getInvitationDetails(
  token: string,
): Promise<Result<InvitationDetails | null>> {
  try {
    const result = await query(
      `SELECT
        i.id, i.type, i.token, i.email, i.household_id,
        h.name as household_name,
        i.invited_by_email, i.status, i.created_at, i.expires_at,
        i.max_uses, i.current_uses, i.metadata
       FROM invitations i
       LEFT JOIN households h ON i.household_id = h.id
       WHERE i.token = $1`,
      [token],
    );

    if (result.rows.length === 0) {
      return ok(null);
    }

    const invitation = result.rows[0] as InvitationDetails;
    return ok(invitation);
  } catch (error) {
    console.error('Error getting invitation details:', error);
    return fail('Error al obtener detalles de la invitación');
  }
}

/**
 * Acepta una invitación (para household)
 */
export async function acceptHouseholdInvitation(
  token: string,
  userEmail: string,
): Promise<Result<{ householdId: string; householdName: string }>> {
  const user = await getCurrentUser();
  if (!user) {
    return fail('Usuario no autenticado');
  }

  try {
    // Obtener detalles de la invitación
    const invitationResult = await getInvitationDetails(token);
    if (!invitationResult.ok || !invitationResult.data) {
      return fail('Invitación no encontrada o inválida');
    }

    const invitation = invitationResult.data;

    // Validaciones
    if (invitation.type !== 'household') {
      return fail('Esta invitación no es para unirse a un hogar');
    }

    if (invitation.status !== 'pending') {
      return fail('Esta invitación ya no está disponible');
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return fail('Esta invitación ha expirado');
    }

    if (invitation.email && invitation.email !== userEmail) {
      return fail('Esta invitación es para un email diferente');
    }

    if (invitation.max_uses && invitation.current_uses >= invitation.max_uses) {
      return fail('Esta invitación ha alcanzado el límite de usos');
    }

    // Verificar que el usuario no esté ya en el hogar
    const existingMember = await query(
      'SELECT id FROM household_members WHERE household_id = $1 AND user_id = $2',
      [invitation.household_id, user.id],
    );

    if (existingMember.rows.length > 0) {
      return fail('Ya eres miembro de este hogar');
    }

    // Agregar usuario al hogar
    await query(
      'INSERT INTO household_members (household_id, user_id, role, status) VALUES ($1, $2, $3, $4)',
      [invitation.household_id, user.id, 'member', 'active'],
    );

    // Actualizar contador de usos de la invitación
    await query('UPDATE invitations SET current_uses = current_uses + 1 WHERE id = $1', [
      invitation.id,
    ]);

    // Marcar como completada si alcanzó el límite
    if (invitation.max_uses && invitation.current_uses + 1 >= invitation.max_uses) {
      await query('UPDATE invitations SET status = $1 WHERE id = $2', ['completed', invitation.id]);
    }

    revalidatePath('/dual-flow');
    revalidatePath('/app/household');

    return ok({
      householdId: invitation.household_id!,
      householdName: invitation.household_name!,
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return fail('Error al aceptar la invitación');
  }
}

/**
 * Lista invitaciones activas de un hogar
 */
export async function getHouseholdInvitations(
  householdId: string,
): Promise<Result<InvitationDetails[]>> {
  const user = await getCurrentUser();
  if (!user) {
    return fail('Usuario no autenticado');
  }

  // Verificar permisos
  const userHouseholdId = await getUserHouseholdId();
  if (!userHouseholdId || userHouseholdId !== householdId) {
    return fail('No tienes acceso a este hogar');
  }

  const isHouseholdOwner = await isOwner();
  if (!isHouseholdOwner) {
    return fail('Solo los propietarios pueden ver las invitaciones');
  }

  try {
    const result = await query(
      `SELECT
        i.id, i.type, i.token, i.email, i.household_id,
        h.name as household_name,
        i.invited_by_email, i.status, i.created_at, i.expires_at,
        i.max_uses, i.current_uses, i.metadata
       FROM invitations i
       LEFT JOIN households h ON i.household_id = h.id
       WHERE i.household_id = $1 AND i.status = 'pending'
       ORDER BY i.created_at DESC`,
      [householdId],
    );

    const invitations = result.rows as InvitationDetails[];
    return ok(invitations);
  } catch (error) {
    console.error('Error getting household invitations:', error);
    return fail('Error al obtener invitaciones');
  }
}

/**
 * Cancela una invitación
 */
export async function cancelInvitation(invitationId: string): Promise<Result<void>> {
  const user = await getCurrentUser();
  if (!user) {
    return fail('Usuario no autenticado');
  }

  // Verificar que sea owner del hogar de la invitación
  const isHouseholdOwner = await isOwner();
  if (!isHouseholdOwner) {
    return fail('Solo los propietarios pueden cancelar invitaciones');
  }

  try {
    await query('UPDATE invitations SET status = $1 WHERE id = $2', ['cancelled', invitationId]);

    revalidatePath('/dual-flow/invite');
    revalidatePath('/app/household/invitations');

    return ok(undefined);
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    return fail('Error al cancelar la invitación');
  }
}
