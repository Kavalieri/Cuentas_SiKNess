'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseServer, getCurrentUser, getUserHouseholdId } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';
import { isOwner } from '@/lib/adminCheck';
import crypto from 'crypto';

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

const InvitationSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase(),
});

/**
 * Crea una invitación flexible (household o app)
 * - type='household': Invita a un household específico (requiere ser owner)
 * - type='app': Invita a probar la app (cualquier usuario autenticado puede crear)
 */
export async function createFlexibleInvitation(
  options: CreateInvitationOptions
): Promise<Result<{ token: string; invitationUrl: string }>> {
  const supabase = await supabaseServer();
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
      const { data: existingInvitation } = await supabase
        .from('invitations')
        .select('id, status')
        .eq('email', options.email)
        .eq('household_id', options.householdId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInvitation) {
        return fail('Ya existe una invitación pendiente para este email en este hogar. Cancela la anterior antes de crear una nueva.');
      }
    }
  }

  // Generar token único
  const token = crypto.randomBytes(32).toString('hex');

  // Calcular fecha de expiración
  const expiresInDays = options.expiresInDays || 7;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // Preparar metadata
  const metadata: Record<string, unknown> = {};
  if (options.personalMessage) {
    metadata.personalMessage = options.personalMessage;
  }

  // Crear invitación
  // @ts-ignore - Los tipos se regenerarán después de aplicar la migración
  const { error } = await supabase.from('invitations').insert({
    type: options.type,
    token,
    email: options.email || null,
    household_id: options.householdId || null,
    invited_by: user.id,
    expires_at: expiresAt.toISOString(),
    max_uses: options.maxUses || null,
    current_uses: 0,
    status: 'pending',
    metadata,
  });

  if (error) {
    console.error('Error creating invitation:', error);
    return fail('Error al crear la invitación');
  }

  // Generar URL de invitación
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const invitationUrl = `${baseUrl}/app/invite?token=${token}`;

  revalidatePath('/app/household');
  revalidatePath('/app/admin/members');

  return ok({ token, invitationUrl });
}

/**
 * Crea una invitación para un nuevo miembro (legacy, usa createFlexibleInvitation)
 * Solo owners pueden invitar
 */
export async function createInvitation(formData: FormData): Promise<Result<{ token: string }>> {
  // Verificar permisos
  const userIsOwner = await isOwner();
  if (!userIsOwner) {
    return fail('Solo los propietarios pueden invitar nuevos miembros');
  }

  // Validar datos
  const parsed = InvitationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Email inválido', parsed.error.flatten().fieldErrors);
  }

  const { email } = parsed.data;

  const user = await getCurrentUser();
  const householdId = await getUserHouseholdId();

  if (!user || !householdId) {
    return fail('Usuario o hogar no encontrado');
  }

  const supabase = await supabaseServer();

  // Verificar que el email no pertenece a un miembro actual
  // Usamos una query a auth.users (requiere service_role) o simplemente verificamos por email
  // Por ahora, solo verificamos invitaciones duplicadas
  // La verificación de miembro existente se hará al aceptar la invitación

  // Verificar que no hay una invitación pendiente para este email
  // @ts-ignore - Tabla invitations aún no en types
  const { data: pendingInvitation } = await supabase
    .from('invitations')
    .select('id')
    .eq('household_id', householdId)
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle();

  if (pendingInvitation) {
    return fail('Ya existe una invitación pendiente para este email');
  }

  // Generar token único
  const token = crypto.randomBytes(32).toString('hex');

  // Calcular fecha de expiración (7 días)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Crear invitación
  const { error } = await supabase
    .from('invitations')
    .insert({
      household_id: householdId,
      email,
      token,
      invited_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating invitation:', error);
    return fail('Error al crear la invitación: ' + error.message);
  }

  // Obtener información del hogar para el email
  const { data: household } = await supabase
    .from('households')
    .select('name')
    .eq('id', householdId)
    .single();

  // Enviar email con Supabase (si está configurado)
  try {
    await sendInvitationEmail({
      to: email,
      householdName: household?.name || 'el hogar',
      inviterEmail: user.email || 'Un miembro',
      token,
    });
  } catch (emailError) {
    console.error('Error sending invitation email:', emailError);
    // No fallar la invitación si el email falla, solo loguear
  }

  revalidatePath('/app/household');
  return ok({ token });
}

/**
 * Cancela una invitación pendiente
 * Solo owners pueden cancelar
 */
export async function cancelInvitation(invitationId: string): Promise<Result> {
  const userIsOwner = await isOwner();
  if (!userIsOwner) {
    return fail('No tienes permisos para esta acción');
  }

  const supabase = await supabaseServer();

  const { error } = await supabase
    .from('invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId)
    .eq('status', 'pending');

  if (error) {
    return fail('Error al cancelar la invitación: ' + error.message);
  }

  revalidatePath('/app/household');
  return ok();
}

/**
 * Obtiene los detalles de una invitación por su token
 * NO requiere autenticación para permitir que nuevos usuarios vean la invitación
 */
export async function getInvitationDetails(token: string): Promise<Result<InvitationDetails>> {
  if (!token || token.length !== 64) {
    return fail('Token inválido');
  }

  // Usar supabaseBrowser para evitar problemas con cookies de sesión
  const { createBrowserClient } = await import('@supabase/ssr');
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // @ts-ignore - Tipos pendientes de regenerar después de aplicar migración
  const { data, error } = await supabase
    .from('invitations')
    .select(
      `
      id,
      type,
      token,
      email,
      household_id,
      invited_by,
      status,
      created_at,
      expires_at,
      max_uses,
      current_uses,
      metadata,
      households (
        name
      )
    `
    )
    .eq('token', token)
    .maybeSingle();

  if (error) {
    console.error('Error fetching invitation:', error);
    return fail('Error al obtener la invitación');
  }

  if (!data) {
    return fail('Invitación no encontrada');
  }

  // @ts-ignore - Tipos pendientes
  const expiresAt = new Date(data.expires_at);
  const now = new Date();
  
  // Verificar si está expirada
  if (expiresAt < now) {
    // @ts-ignore
    await supabase.from('invitations').update({ status: 'expired' }).eq('id', data.id);
    return fail('La invitación ha expirado');
  }

  // @ts-ignore - Tipos pendientes
  if (data.max_uses !== null && data.current_uses >= data.max_uses) {
    return fail('Esta invitación ha alcanzado el límite de usos');
  }

  // @ts-ignore - Tipos pendientes
  if (data.status !== 'pending') {
    // @ts-ignore
    return fail(`Esta invitación está ${data.status === 'cancelled' ? 'cancelada' : data.status}`);
  }

  // @ts-ignore - Tipos pendientes
  const householdName = data.households?.name || null;
  const invitedByEmail = 'Usuario de CuentasSiK';

  // @ts-ignore - Todos los accesos a data requieren regenerar tipos
  return ok({
    // @ts-ignore
    id: data.id,
    // @ts-ignore
    type: data.type as InvitationType,
    // @ts-ignore
    token: data.token,
    // @ts-ignore
    email: data.email,
    // @ts-ignore
    household_id: data.household_id,
    household_name: householdName,
    invited_by_email: invitedByEmail,
    // @ts-ignore
    status: data.status,
    // @ts-ignore
    created_at: data.created_at,
    // @ts-ignore
    expires_at: data.expires_at,
    // @ts-ignore
    max_uses: data.max_uses,
    // @ts-ignore
    current_uses: data.current_uses,
    // @ts-ignore
    metadata: (data.metadata as Record<string, unknown>) || {},
  });
}

/**
 * Acepta una invitación por token
 * El usuario debe estar autenticado y su email debe coincidir
 * IMPORTANTE: Limpia la cookie de invitación después de usarla
 */
export async function acceptInvitation(token: string): Promise<Result<{ householdId: string; householdName: string }>> {
  const user = await getCurrentUser();
  if (!user) {
    return fail('Debes iniciar sesión para aceptar la invitación');
  }

  const supabase = await supabaseServer();

  // Llamar a la función SQL que hace todas las validaciones
  const { data, error } = await supabase.rpc('accept_invitation', {
    p_token: token,
  });

  if (error) {
    console.error('Error accepting invitation:', error);
    return fail('Error al aceptar la invitación: ' + error.message);
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return fail('Error al procesar la invitación');
  }

  const result = data[0] as { success: boolean; household_id?: string; household_name?: string; message: string };

  if (!result || !result.success) {
    return fail(result?.message || 'Error desconocido');
  }

  // CRÍTICO: Limpiar la cookie de invitación después de aceptarla
  // Esto previene que el dashboard intente validar un token ya usado
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  cookieStore.delete('invitation_token');

  revalidatePath('/app');
  revalidatePath('/app/household');

  return ok({
    householdId: result.household_id!,
    householdName: result.household_name!,
  });
}

/**
 * Obtiene las invitaciones pendientes del hogar actual
 * Solo para owners
 */
export async function getPendingInvitations() {
  const userIsOwner = await isOwner();
  if (!userIsOwner) {
    return [];
  }

  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return [];
  }

  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('household_id', householdId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invitations:', error);
    return [];
  }

  return data || [];
}

/**
 * Envía email de invitación usando Supabase Auth
 * (requiere configuración de SMTP en Supabase)
 */
async function sendInvitationEmail({
  to,
  householdName,
  inviterEmail,
  token,
}: {
  to: string;
  householdName: string;
  inviterEmail: string;
  token: string;
}) {
  // URL base de la aplicación
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', 'https://') || 'http://localhost:3000';
  const inviteUrl = `${baseUrl}/app/invite/${token}`;

  // Nota: Supabase no tiene un método directo para enviar emails custom
  // Por ahora, solo guardamos el token. El email se puede implementar con:
  // 1. Resend (https://resend.com)
  // 2. SendGrid
  // 3. Supabase Edge Functions
  
  // TODO: Implementar envío real de email
  // Por ahora, el owner puede copiar el link y enviarlo manualmente
  
  console.log('Invitation email would be sent:');
  console.log(`To: ${to}`);
  console.log(`Household: ${householdName}`);
  console.log(`Invited by: ${inviterEmail}`);
  console.log(`Link: ${inviteUrl}`);
  
  return { success: true, inviteUrl };
}
