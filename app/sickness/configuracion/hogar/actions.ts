'use server';
// Server actions para gestión de miembros del hogar - SiKNess
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import type { Result } from '@/lib/result';
import { fail, ok } from '@/lib/result';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export interface HouseholdMemberRow {
  profile_id: string;
  email: string;
  display_name?: string | null;
  role: string;
  current_income?: number;
  joined_at?: string;
}

export async function getHouseholdMembers(householdId: string): Promise<HouseholdMemberRow[]> {
  const res = await query<HouseholdMemberRow>(`SELECT * FROM get_household_members_optimized($1)`, [
    householdId,
  ]);
  return res.rows;
}

// Schema de validación para invitación
const InviteMemberSchema = z.object({
  email: z.string().email('Email inválido'),
  householdId: z.string().uuid(),
});

export async function inviteMember(formData: FormData): Promise<Result<{ inviteCode: string }>> {
  const user = await getCurrentUser();
  if (!user) {
    return fail('Usuario no autenticado');
  }

  const parsed = InviteMemberSchema.safeParse({
    email: formData.get('email'),
    householdId: formData.get('householdId'),
  });

  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const { email, householdId } = parsed.data;

  // Verificar que el usuario actual es owner del hogar
  const roleCheck = await query<{ role: string }>(
    'SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2',
    [householdId, user.profile_id],
  );

  if (roleCheck.rows[0]?.role !== 'owner') {
    return fail('Solo los propietarios pueden invitar miembros');
  }

  // Verificar que el email no es del usuario actual
  if (email.toLowerCase() === user.email.toLowerCase()) {
    return fail('No puedes invitarte a ti mismo');
  }

  // Verificar que el email no está ya en el hogar
  const existingMember = await query(
    `SELECT profile_id FROM household_members hm
     INNER JOIN profiles p ON p.id = hm.profile_id
     WHERE hm.household_id = $1 AND LOWER(p.email) = LOWER($2)`,
    [householdId, email],
  );

  if (existingMember.rows.length > 0) {
    return fail('Este usuario ya es miembro del hogar');
  }

  // Generar token único
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 días de validez

  // Crear invitación
  await query(
    `INSERT INTO invitations (household_id, email, token, status, invited_by, invited_by_profile_id, expires_at, type)
     VALUES ($1, $2, $3, 'pending', $4, $5, $6, 'household')`,
    [householdId, email, token, user.profile_id, user.profile_id, expiresAt],
  );

  revalidatePath('/sickness/configuracion/hogar');
  return ok({ inviteCode: token });
}

// Schema para cambio de rol
const ChangeMemberRoleSchema = z.object({
  householdId: z.string().uuid(),
  targetProfileId: z.string().uuid(),
  newRole: z.enum(['owner', 'member']),
});

export async function changeMemberRole(formData: FormData): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) {
    return fail('Usuario no autenticado');
  }

  const parsed = ChangeMemberRoleSchema.safeParse({
    householdId: formData.get('householdId'),
    targetProfileId: formData.get('targetProfileId'),
    newRole: formData.get('newRole'),
  });

  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const { householdId, targetProfileId, newRole } = parsed.data;

  // Verificar que el usuario actual es owner
  const roleCheck = await query<{ role: string }>(
    'SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2',
    [householdId, user.profile_id],
  );

  if (roleCheck.rows[0]?.role !== 'owner') {
    return fail('Solo los propietarios pueden cambiar roles');
  }

  // No permitir que un owner se degrade a sí mismo si es el único owner
  if (newRole === 'member' && targetProfileId === user.profile_id) {
    const ownerCount = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM household_members WHERE household_id = $1 AND role = $2',
      [householdId, 'owner'],
    );

    if (parseInt(ownerCount.rows[0]?.count || '0') === 1) {
      return fail('No puedes degradarte si eres el único propietario');
    }
  }

  // Actualizar rol
  await query(
    'UPDATE household_members SET role = $1, updated_at = NOW() WHERE household_id = $2 AND profile_id = $3',
    [newRole, householdId, targetProfileId],
  );

  revalidatePath('/sickness/configuracion/hogar');
  return ok();
}

// Schema para eliminar miembro
const RemoveMemberSchema = z.object({
  householdId: z.string().uuid(),
  targetProfileId: z.string().uuid(),
});

export async function removeMember(formData: FormData): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) {
    return fail('Usuario no autenticado');
  }

  const parsed = RemoveMemberSchema.safeParse({
    householdId: formData.get('householdId'),
    targetProfileId: formData.get('targetProfileId'),
  });

  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const { householdId, targetProfileId } = parsed.data;

  // Verificar que el usuario actual es owner
  const roleCheck = await query<{ role: string }>(
    'SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2',
    [householdId, user.profile_id],
  );

  if (roleCheck.rows[0]?.role !== 'owner') {
    return fail('Solo los propietarios pueden eliminar miembros');
  }

  // Verificar que no es el único miembro
  const memberCount = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM household_members WHERE household_id = $1',
    [householdId],
  );

  if (parseInt(memberCount.rows[0]?.count || '0') === 1) {
    return fail('No puedes eliminar el último miembro del hogar');
  }

  // Si el miembro a eliminar es owner, verificar que hay al menos otro owner
  const targetRole = await query<{ role: string }>(
    'SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2',
    [householdId, targetProfileId],
  );

  if (targetRole.rows[0]?.role === 'owner') {
    const ownerCount = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM household_members WHERE household_id = $1 AND role = $2',
      [householdId, 'owner'],
    );

    if (parseInt(ownerCount.rows[0]?.count || '0') === 1) {
      return fail('No puedes eliminar el único propietario del hogar');
    }
  }

  // Eliminar miembro
  await query('DELETE FROM household_members WHERE household_id = $1 AND profile_id = $2', [
    householdId,
    targetProfileId,
  ]);

  revalidatePath('/sickness/configuracion/hogar');
  return ok();
}
