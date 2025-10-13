'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { query } from '@/lib/supabaseServer';
import { getCurrentUser, getUserHouseholdId } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';
import { createFlexibleInvitation, cancelInvitation } from '@/app/app/household/invitations/actions';
import crypto from 'crypto';

// Schemas de validación
const CreateInvitationSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase().optional(),
  personalMessage: z.string().max(500, 'El mensaje no puede superar los 500 caracteres').optional(),
  expiresInDays: z.number().int().min(1).max(30).default(7),
  maxUses: z.number().int().min(1).max(100).optional(),
});

const SendEmailInvitationSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase(),
  personalMessage: z.string().max(500, 'El mensaje no puede superar los 500 caracteres').optional(),
});

// Tipos para las invitaciones en settings
export interface SettingsInvitation {
  id: string;
  email: string | null;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  created_at: string;
  expires_at: string;
  max_uses: number | null;
  current_uses: number;
  invited_by_email: string;
  accepted_by_email: string | null;
  accepted_at: string | null;
  personal_message: string | null;
}

// Obtener invitaciones del hogar activo
export async function getHouseholdInvitations(): Promise<Result<SettingsInvitation[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('Usuario no autenticado');
    }

    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No hay hogar activo');
    }

    const result = await query(`
      SELECT 
        i.id,
        i.email,
        i.token,
        i.status,
        i.created_at,
        i.expires_at,
        i.max_uses,
        i.current_uses,
        p1.email as invited_by_email,
        p2.email as accepted_by_email,
        i.accepted_at,
        i.metadata->>'personalMessage' as personal_message
      FROM invitations i
      LEFT JOIN profiles p1 ON i.invited_by_profile_id = p1.id
      LEFT JOIN profiles p2 ON i.accepted_by = p2.id
      WHERE i.household_id = $1
        AND i.type = 'household'
      ORDER BY i.created_at DESC
    `, [householdId]);

    return ok(result.rows as SettingsInvitation[]);
  } catch (error) {
    console.error('Error al obtener invitaciones:', error);
    return fail('Error al obtener las invitaciones');
  }
}

// Verificar si el usuario es owner del hogar activo
export async function isOwnerOfHousehold(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) return false;

    const householdId = await getUserHouseholdId();
    if (!householdId) return false;

    const result = await query(`
      SELECT role 
      FROM household_members 
      WHERE household_id = $1 AND profile_id = $2
    `, [householdId, user.profile_id]);

    return result.rows.length > 0 && result.rows[0]?.role === 'owner';
  } catch {
    return false;
  }
}

// Crear invitación general (con o sin email)
export async function createHouseholdInvitation(formData: FormData): Promise<Result<{ token: string; invitationUrl: string }>> {
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
    const isOwner = await isOwnerOfHousehold();
    if (!isOwner) {
      return fail('Solo el propietario puede crear invitaciones');
    }

    const parsed = CreateInvitationSchema.safeParse({
      email: formData.get('email') ? String(formData.get('email')) : undefined,
      personalMessage: formData.get('personalMessage') ? String(formData.get('personalMessage')) : undefined,
      expiresInDays: formData.get('expiresInDays') ? parseInt(String(formData.get('expiresInDays'))) : 7,
      maxUses: formData.get('maxUses') ? parseInt(String(formData.get('maxUses'))) : undefined,
    });

    if (!parsed.success) {
      return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
    }

    const { email, personalMessage, expiresInDays, maxUses } = parsed.data;

    // Crear invitación usando la función existente
    const result = await createFlexibleInvitation({
      type: 'household',
      email,
      householdId,
      maxUses,
      expiresInDays,
      personalMessage,
    });

    if (result.ok) {
      revalidatePath('/app/settings');
    }

    return result;
  } catch (error) {
    console.error('Error al crear invitación:', error);
    return fail('Error al crear la invitación');
  }
}

// Enviar invitación por email (crear usuario si no existe + magic link)
export async function sendEmailInvitation(formData: FormData): Promise<Result> {
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
    const isOwner = await isOwnerOfHousehold();
    if (!isOwner) {
      return fail('Solo el propietario puede enviar invitaciones');
    }

    const parsed = SendEmailInvitationSchema.safeParse({
      email: String(formData.get('email')),
      personalMessage: formData.get('personalMessage') ? String(formData.get('personalMessage')) : undefined,
    });

    if (!parsed.success) {
      return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
    }

    const { email, personalMessage } = parsed.data;

    // Verificar si el usuario ya existe
    const existingUser = await query(`
      SELECT id, email FROM profiles WHERE email = $1
    `, [email]);

    if (existingUser.rows.length === 0) {
      // Crear usuario nuevo
      const newUserId = crypto.randomUUID();
      await query(`
        INSERT INTO profiles (id, email, created_at)
        VALUES ($1, $2, NOW())
      `, [newUserId, email]);
    }

    // Crear invitación
    const invitationResult = await createFlexibleInvitation({
      type: 'household',
      email,
      householdId,
      maxUses: 1,
      expiresInDays: 7,
      personalMessage,
    });

    if (!invitationResult.ok) {
      return invitationResult;
    }

    // Por ahora solo creamos la invitación, el envío de email se implementará después
    // TODO: Implementar envío de email con magic link

    revalidatePath('/app/settings');
    return ok();
  } catch (error) {
    console.error('Error al enviar invitación por email:', error);
    return fail('Error al procesar la invitación por email');
  }
}

// Cancelar invitación
export async function cancelHouseholdInvitation(formData: FormData): Promise<Result> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('Usuario no autenticado');
    }

    // Verificar que es owner
    const isOwner = await isOwnerOfHousehold();
    if (!isOwner) {
      return fail('Solo el propietario puede cancelar invitaciones');
    }

    const invitationId = String(formData.get('invitationId'));
    if (!invitationId) {
      return fail('ID de invitación requerido');
    }

    const result = await cancelInvitation(invitationId);

    if (result.ok) {
      revalidatePath('/app/settings');
    }

    return result;
  } catch (error) {
    console.error('Error al cancelar invitación:', error);
    return fail('Error al cancelar la invitación');
  }
}

// Obtener estadísticas del hogar
export async function getHouseholdStats(): Promise<Result<{
  totalMembers: number;
  totalInvitations: number;
  pendingInvitations: number;
}>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('Usuario no autenticado');
    }

    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return fail('No hay hogar activo');
    }

    // Contar miembros
    const membersResult = await query(`
      SELECT COUNT(*) as total
      FROM household_members 
      WHERE household_id = $1
    `, [householdId]);

    // Contar invitaciones
    const invitationsResult = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
      FROM invitations 
      WHERE household_id = $1 AND type = 'household'
    `, [householdId]);

    const stats = {
      totalMembers: parseInt(membersResult.rows[0]?.total || '0'),
      totalInvitations: parseInt(invitationsResult.rows[0]?.total || '0'),
      pendingInvitations: parseInt(invitationsResult.rows[0]?.pending || '0'),
    };

    return ok(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return fail('Error al obtener estadísticas del hogar');
  }
}