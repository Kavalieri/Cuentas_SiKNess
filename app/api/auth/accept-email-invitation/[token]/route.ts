import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/pgServer';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    // Verificar que el usuario esté autenticado
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      // Redirigir al login con el token como parámetro para procesarlo después
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('invitation', token);
      return NextResponse.redirect(loginUrl);
    }

    // Buscar la invitación por token
    const invitationResult = await query<{
      id: string;
      profile_id: string;
      invited_email: string;
      expires_at: string;
      status: string;
    }>(
      `
      SELECT id, profile_id, invited_email, expires_at, status
      FROM email_invitations
      WHERE token = $1
    `,
      [token]
    );

    if (invitationResult.rows.length === 0) {
      return NextResponse.redirect(
        new URL('/configuracion/perfil?error=invitation_not_found', request.url)
      );
    }

    const invitation = invitationResult.rows[0];

    // TypeScript: verificar que invitation existe
    if (!invitation) {
      return NextResponse.redirect(
        new URL('/configuracion/perfil?error=invitation_not_found', request.url)
      );
    }

    // Verificar que la invitación esté pendiente
    if (invitation.status !== 'pending') {
      return NextResponse.redirect(
        new URL(
          `/configuracion/perfil?error=invitation_already_used`,
          request.url
        )
      );
    }

    // Verificar que no haya expirado
    if (new Date(invitation.expires_at) < new Date()) {
      // Actualizar estado a expirado
      await query(
        `
        UPDATE email_invitations
        SET status = 'expired',
            metadata = jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{expired_at}',
              to_jsonb(NOW())
            )
        WHERE id = $1
      `,
        [invitation.id]
      );

      return NextResponse.redirect(
        new URL('/configuracion/perfil?error=invitation_expired', request.url)
      );
    }

    // Verificar que el email del usuario actual coincida con el email invitado
    if (currentUser.email !== invitation.invited_email) {
      return NextResponse.redirect(
        new URL(
          `/configuracion/perfil?error=email_mismatch&expected=${encodeURIComponent(invitation.invited_email)}`,
          request.url
        )
      );
    }

    // Verificar si el email ya existe en profile_emails o profiles
    const emailExistsResult = await query(
      `
      SELECT 1 FROM profile_emails WHERE email = $1
      UNION
      SELECT 1 FROM profiles WHERE email = $1
    `,
      [invitation.invited_email]
    );

    if (emailExistsResult.rows.length > 0) {
      return NextResponse.redirect(
        new URL(
          '/configuracion/perfil?error=email_already_exists',
          request.url
        )
      );
    }

    // Añadir el email como secundario al perfil del invitador
    await query(
      `
      INSERT INTO profile_emails (profile_id, email, verified, verified_at)
      VALUES ($1, $2, true, NOW())
    `,
      [invitation.profile_id, invitation.invited_email]
    );

    // Actualizar la invitación como aceptada
    await query(
      `
      UPDATE email_invitations
      SET status = 'accepted',
          accepted_at = NOW(),
          accepted_by_profile_id = $1,
          metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{accepted_from_ip}',
            to_jsonb($2::text)
          )
      WHERE id = $3
    `,
      [
        currentUser.id,
        request.headers.get('x-forwarded-for') || 'unknown',
        invitation.id,
      ]
    );

    // Verificar si el usuario actual tiene household
    const householdCheckResult = await query<{ household_id: string }>(
      `
      SELECT household_id
      FROM household_members
      WHERE profile_id = $1
      LIMIT 1
    `,
      [currentUser.id]
    );

    // Si el usuario actual no tiene household, eliminar su perfil temporal
    // porque ahora accederá con el perfil del invitador
    if (householdCheckResult.rows.length === 0) {
      // Marcar el perfil como eliminado (soft delete)
      await query(
        `
        UPDATE profiles
        SET deleted_at = NOW()
        WHERE id = $1
      `,
        [currentUser.id]
      );
    }

    // Redirigir a la página de éxito
    return NextResponse.redirect(
      new URL(
        '/configuracion/perfil?success=invitation_accepted',
        request.url
      )
    );
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.redirect(
      new URL('/configuracion/perfil?error=unexpected_error', request.url)
    );
  }
}
