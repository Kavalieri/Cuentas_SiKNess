'use server';

import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const AcceptInvitationSchema = z.object({
  code: z.string().min(10, 'Código inválido'),
});

export async function acceptInvitationByCode(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const parsed = AcceptInvitationSchema.safeParse({ code: formData.get('code') });
  if (!parsed.success) {
    redirect('/sickness/onboarding?error=invalid');
  }

  const { code } = parsed.data;

  // Obtener invitación
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
     WHERE token = $1 AND type = 'household'`
  , [code]);

  const invitation = invRes.rows[0];
  if (!invitation) {
    redirect('/sickness/onboarding?error=not_found');
  }

  // Validaciones de estado/expiración/uso
  if (invitation.status !== 'pending') {
    redirect('/sickness/onboarding?error=unavailable');
  }

  // Expiración
  if (invitation.expires_at) {
    const expired = new Date(invitation.expires_at) < new Date();
    if (expired) {
      await query(`UPDATE invitations SET status = 'expired' WHERE id = $1 AND status = 'pending'`, [
        invitation.id,
      ]);
      redirect('/sickness/onboarding?error=expired');
    }
  }

  // Límite de usos
  if (invitation.max_uses !== null && invitation.current_uses >= invitation.max_uses) {
    await query(
      `UPDATE invitations SET status = 'expired' WHERE id = $1 AND status = 'pending'`,
      [invitation.id],
    );
    redirect('/sickness/onboarding?error=maxed');
  }

  // Si ya es miembro, simplemente activar su hogar y finalizar
  const existsRes = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM household_members
     WHERE household_id = $1 AND profile_id = $2`,
    [invitation.household_id, user.profile_id],
  );
  const alreadyMember = parseInt(existsRes.rows[0]?.count || '0', 10) > 0;

  if (!alreadyMember) {
    // Insertar miembro como 'member'
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

  // Revalidar rutas afectadas (layout y página) para evitar estados estancados
  revalidatePath('/sickness', 'layout');
  revalidatePath('/sickness', 'page');
  revalidatePath('/sickness/balance', 'layout');
  revalidatePath('/sickness/balance', 'page');
  redirect('/sickness?onboarded=1');
}

const CreateHouseholdSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres').max(80, 'Máximo 80 caracteres'),
});

export async function createHousehold(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const parsed = CreateHouseholdSchema.safeParse({ name: formData.get('name') });
  if (!parsed.success) {
    redirect('/sickness/onboarding?error=invalid');
  }
  const { name } = parsed.data;

  // Usar función atómica create_household_with_owner
  const res = await query<{ create_household_with_owner: string }>(
    `SELECT create_household_with_owner($1, $2) as create_household_with_owner`,
    [name, user.profile_id],
  );
  const householdId = res.rows[0]?.create_household_with_owner;
  if (!householdId) {
    redirect('/sickness/onboarding?error=create_failed');
  }

  // Activar hogar
  await query(
    `INSERT INTO user_settings (profile_id, active_household_id, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (profile_id)
     DO UPDATE SET active_household_id = EXCLUDED.active_household_id, updated_at = NOW()`,
    [user.profile_id, householdId],
  );

  // Revalidar rutas afectadas (layout y página) para evitar estados estancados
  revalidatePath('/sickness', 'layout');
  revalidatePath('/sickness', 'page');
  revalidatePath('/sickness/balance', 'layout');
  revalidatePath('/sickness/balance', 'page');
  redirect('/sickness?onboarded=1');
}
