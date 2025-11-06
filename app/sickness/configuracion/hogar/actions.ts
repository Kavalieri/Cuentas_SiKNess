'use server';

// --- Unión por código de invitación ---
const AcceptInvitationCodeSchema = z.object({
  inviteCode: z.string().min(10, 'Código inválido'),
  householdId: z.string().uuid().optional(),
});

export async function acceptInvitationByCode(formData: FormData): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) {
    return fail('Usuario no autenticado');
  }

  const parsed = AcceptInvitationCodeSchema.safeParse({
    inviteCode: formData.get('inviteCode'),
    householdId: formData.get('householdId'),
  });
  if (!parsed.success) {
    return fail('Código inválido', parsed.error.flatten().fieldErrors);
  }
  const { inviteCode } = parsed.data;

  // Buscar invitación
  const invRes = await query<{
    id: string;
    household_id: string;
    status: string;
    expires_at: string | null;
    max_uses: number | null;
    current_uses: number;
    invited_by_profile_id: string | null;
  }>(
    `SELECT id, household_id, status, expires_at, max_uses, current_uses, invited_by_profile_id
     FROM invitations
     WHERE token = $1 AND type = 'household'`,
    [inviteCode],
  );
  const invitation = invRes.rows[0];
  if (!invitation) {
    return fail('Invitación no encontrada');
  }
  if (invitation.status !== 'pending') {
    return fail('Invitación no disponible');
  }
  if (invitation.expires_at) {
    const expired = new Date(invitation.expires_at) < new Date();
    if (expired) {
      await query(`UPDATE invitations SET status = 'expired' WHERE id = $1 AND status = 'pending'`, [invitation.id]);
      return fail('Invitación expirada');
    }
  }
  if (invitation.max_uses !== null && invitation.current_uses >= invitation.max_uses) {
    await query(`UPDATE invitations SET status = 'expired' WHERE id = $1 AND status = 'pending'`, [invitation.id]);
    return fail('Invitación sin usos disponibles');
  }
  // Si ya es miembro, solo activar hogar
  const existsRes = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM household_members WHERE household_id = $1 AND profile_id = $2`,
    [invitation.household_id, user.profile_id],
  );
  const alreadyMember = parseInt(existsRes.rows[0]?.count || '0', 10) > 0;
  if (!alreadyMember) {
    await query(
      `INSERT INTO household_members (household_id, profile_id, role, is_owner, invited_by_profile_id, joined_at)
       VALUES ($1, $2, 'member', FALSE, $3, NOW())
       ON CONFLICT (household_id, profile_id) DO NOTHING`,
      [invitation.household_id, user.profile_id, invitation.invited_by_profile_id],
    );
  }
  // Marcar uso de invitación
  await query(
    `UPDATE invitations
     SET current_uses = current_uses + 1,
         accepted_at = NOW(),
         accepted_by = $1,
         status = CASE
           WHEN max_uses IS NOT NULL AND current_uses + 1 >= max_uses THEN 'accepted'
           ELSE status
         END
     WHERE id = $2`,
    [user.profile_id, invitation.id],
  );
  // Activar hogar para el usuario
  await query(
    `INSERT INTO user_settings (profile_id, active_household_id, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (profile_id)
     DO UPDATE SET active_household_id = EXCLUDED.active_household_id, updated_at = NOW()`,
    [user.profile_id, invitation.household_id],
  );
  // Revalidar rutas afectadas
  revalidatePath('/sickness', 'layout');
  revalidatePath('/sickness', 'page');
  revalidatePath('/sickness/balance', 'layout');
  revalidatePath('/sickness/balance', 'page');
  return ok({ joinedHouseholdId: invitation.household_id });
}
// Server actions para gestión de miembros del hogar - SiKNess
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import type { Result } from '@/lib/result';
import { fail, ok } from '@/lib/result';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

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

  // Solo owners pueden cambiar roles
  const roleCheck = await query<{ role: string }>(
    'SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2',
    [householdId, user.profile_id],
  );
  if (roleCheck.rows[0]?.role !== 'owner') {
    return fail('Solo los propietarios pueden cambiar roles');
  }

  // No permitir que el último owner se degrade a member
  if (newRole === 'member') {
    const targetRole = await query<{ role: string }>(
      'SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2',
      [householdId, targetProfileId],
    );
    if (targetRole.rows[0]?.role === 'owner') {
      const ownerCount = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM household_members WHERE household_id = $1 AND role = $2',
        [householdId, 'owner'],
      );
      if (parseInt(ownerCount.rows[0]?.count || '0', 10) <= 1) {
        return fail('Debe haber al menos un propietario en el hogar');
      }
    }
  }

  // Actualizar el rol
  await query(
    'UPDATE household_members SET role = $1 WHERE household_id = $2 AND profile_id = $3',
    [newRole, householdId, targetProfileId],
  );

  revalidatePath('/sickness/configuracion/hogar');
  return ok();
}

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

// Tipos y acciones para invitaciones pendientes
export interface PendingInvitationRow {
  id: string;
  token: string;
  email: string | null;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
  status: string;
}

export async function getPendingInvitations(householdId: string): Promise<PendingInvitationRow[]> {
  const res = await query<PendingInvitationRow>(
    `SELECT id, token, email, expires_at, max_uses, current_uses, status
     FROM invitations
     WHERE household_id = $1
       AND type = 'household'
       AND status = 'pending'
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (max_uses IS NULL OR current_uses < max_uses)
     ORDER BY created_at DESC NULLS LAST`,
    [householdId],
  );
  return res.rows;
}

// Schema de validación para invitación (soporta modo código o email)
const InviteMemberSchema = z.object({
  householdId: z.string().uuid(),
  mode: z.enum(['email', 'code']).default('email'),
  email: z.string().email('Email inválido').optional(),
  maxUses: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined ? undefined : Number(v)))
    .refine((v) => v === undefined || (Number.isFinite(v) && v > 0 && v <= 100), {
      message: 'maxUses debe ser un número entre 1 y 100',
    }),
});

export async function inviteMember(formData: FormData): Promise<Result<{ inviteCode: string }>> {
  const user = await getCurrentUser();
  if (!user) {
    return fail('Usuario no autenticado');
  }

  const mode = formData.get('mode') === 'code' ? 'code' : 'email';
  const emailRaw = formData.get('email');
  const email = typeof emailRaw === 'string' ? emailRaw : (emailRaw ? emailRaw.toString() : '');
  const householdIdRaw = formData.get('householdId');
  const householdId = typeof householdIdRaw === 'string' ? householdIdRaw : (householdIdRaw ? householdIdRaw.toString() : '');
  const maxUsesRaw = formData.get('maxUses');
  const maxUsesVal = typeof maxUsesRaw === 'string' ? maxUsesRaw : maxUsesRaw != null ? String(maxUsesRaw) : undefined;

  // Validación flexible según modo
  if (mode === 'email') {
    const parsed = InviteMemberSchema.safeParse({
      email,
      householdId,
      mode,
      maxUses: maxUsesVal,
    });
    if (!parsed.success) {
      return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
    }
  } else {
    // Validamos maxUses en modo código si se proporciona
    const parsed = InviteMemberSchema.pick({ householdId: true, maxUses: true }).safeParse({
      householdId,
      maxUses: maxUsesVal,
    });
    if (!parsed.success) {
      return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
    }
  }

  // Verificar que el usuario actual es owner del hogar
  const roleCheck = await query<{ role: string }>(
    'SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2',
    [householdId, user.profile_id],
  );
  if (roleCheck.rows[0]?.role !== 'owner') {
    return fail('Solo los propietarios pueden invitar miembros');
  }

  if (mode === 'email') {
    // Verificar que el email no es del usuario actual
    if (email && email.toLowerCase() === user.email.toLowerCase()) {
      return fail('No puedes invitarte a ti mismo');
    }
    // Verificar que el email no está ya en el hogar
    if (email) {
      const existingMember = await query(
        `SELECT profile_id FROM household_members hm
         INNER JOIN profiles p ON p.id = hm.profile_id
         WHERE hm.household_id = $1 AND LOWER(p.email) = LOWER($2)`,
        [householdId, email],
      );
      if (existingMember.rows.length > 0) {
        return fail('Este usuario ya es miembro del hogar');
      }
    }
  }

  // Generar token único
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 días de validez

  // Email vacío o dummy si es modo código
  const invitationEmail = mode === 'code' ? '' : email;

  // Crear invitación con límite de usos opcional
  const maxUsesNumber = maxUsesVal ? Number(maxUsesVal) : 1; // por defecto 1 uso
  await query(
    `INSERT INTO invitations (household_id, email, token, status, invited_by, invited_by_profile_id, expires_at, type, max_uses)
     VALUES ($1, $2, $3, 'pending', $4, $5, $6, 'household', $7)`,
    [householdId, invitationEmail, token, user.profile_id, user.profile_id, expiresAt, maxUsesNumber],
  );

  revalidatePath('/sickness/configuracion/hogar');
  return ok({ inviteCode: token });
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

// Cancelar invitación pendiente (owner only)
const CancelInvitationSchema = z.object({
  householdId: z.string().uuid(),
  invitationId: z.string().uuid(),
});

export async function cancelInvitation(formData: FormData): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) {
    return fail('Usuario no autenticado');
  }

  const parsed = CancelInvitationSchema.safeParse({
    householdId: formData.get('householdId'),
    invitationId: formData.get('invitationId'),
  });
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }
  const { householdId, invitationId } = parsed.data;

  // Verificar owner
  const roleCheck = await query<{ role: string }>(
    'SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2',
    [householdId, user.profile_id],
  );
  if (roleCheck.rows[0]?.role !== 'owner') {
    return fail('Solo los propietarios pueden cancelar invitaciones');
  }

  // Cancelar si sigue pendiente
  await query(
    `UPDATE invitations SET status = 'cancelled'
     WHERE id = $1 AND household_id = $2 AND status = 'pending'`,
    [invitationId, householdId],
  );

  revalidatePath('/sickness/configuracion/hogar');
  return ok();
}

// Actualizar nombre del hogar y presupuesto mensual
const UpdateHouseholdSchema = z.object({
  householdId: z.string().uuid(),
  name: z.string().min(3, 'Mínimo 3 caracteres').max(80, 'Máximo 80 caracteres'),
  monthlyBudget: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'number' ? v : Number(v)))
    .refine((n) => Number.isFinite(n) && n >= 0 && n <= 1_000_000, {
      message: 'Presupuesto entre 0 y 1.000.000',
    }),
  calculationType: z.enum(['equal', 'proportional', 'custom']).default('equal'),
});

export async function updateHouseholdSettings(formData: FormData): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) {
    return fail('Usuario no autenticado');
  }

  const parsed = UpdateHouseholdSchema.safeParse({
    householdId: formData.get('householdId'),
    name: formData.get('name'),
    monthlyBudget: formData.get('monthlyBudget'),
    calculationType: formData.get('calculationType'),
  });
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }
  const { householdId, name, monthlyBudget, calculationType } = parsed.data;

  // Verificar owner
  const roleCheck = await query<{ role: string }>(
    'SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2',
    [householdId, user.profile_id],
  );
  if (roleCheck.rows[0]?.role !== 'owner') {
    return fail('Solo los propietarios pueden editar el hogar');
  }

  // Actualizar nombre del hogar
  await query(`UPDATE households SET name = $1, updated_by_profile_id = $2, updated_at = NOW() WHERE id = $3`, [
    name,
    user.profile_id,
    householdId,
  ]);

  // Upsert presupuesto mensual y tipo de cálculo en household_settings
  // Escribir en AMBAS columnas durante transición (budget + goal)
  await query(
    `INSERT INTO household_settings (household_id, monthly_budget, monthly_contribution_goal, currency, calculation_type, updated_at, updated_by)
     VALUES ($1, $2, $2, 'EUR', $3, NOW(), $4)
     ON CONFLICT (household_id) DO UPDATE
       SET monthly_budget = EXCLUDED.monthly_budget,
           monthly_contribution_goal = EXCLUDED.monthly_contribution_goal,
           calculation_type = EXCLUDED.calculation_type,
           updated_at = NOW(),
           updated_by = EXCLUDED.updated_by`,
    [householdId, monthlyBudget, calculationType, user.profile_id],
  );

  revalidatePath('/sickness/configuracion/hogar');
  return ok();
}
