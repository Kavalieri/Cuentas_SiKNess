import { getCurrentUser, SESSION_COOKIE_NAME } from '@/lib/auth';
import { query } from '@/lib/pgServer';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Detecta el origen correcto del request
 */
function detectOrigin(request: NextRequest): string {
  // Prioridad 1: Headers del proxy (Apache)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');

  if (forwardedHost && forwardedProto) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  // Prioridad 2: Headers directos
  const host = request.headers.get('host');
  if (host) {
    const proto = host.includes('localhost') ? 'http' : 'https';
    return `${proto}://${host}`;
  }

  // Prioridad 3: URL del request
  return request.nextUrl.origin;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Next.js 15: params debe ser awaited
    const { token } = await params;

    // Detectar origen correcto del request
    const origin = detectOrigin(request);

    // Verificar que el usuario esté autenticado
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      // Redirigir al login con el token como parámetro para procesarlo después
      const loginUrl = new URL('/login', origin);
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
        new URL('/configuracion/perfil?error=invitation_not_found', origin)
      );
    }

    const invitation = invitationResult.rows[0];

    // TypeScript: verificar que invitation existe
    if (!invitation) {
      return NextResponse.redirect(
        new URL('/configuracion/perfil?error=invitation_not_found', origin)
      );
    }

    // Verificar que la invitación esté pendiente
    if (invitation.status !== 'pending') {
      return NextResponse.redirect(
        new URL(
          `/configuracion/perfil?error=invitation_already_used`,
          origin
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
        new URL('/configuracion/perfil?error=invitation_expired', origin)
      );
    }

    // Verificar que el email del usuario actual coincida con el email invitado
    // IMPORTANTE: Esto valida que quien acepta es el dueño del email
    if (currentUser.loginEmail !== invitation.invited_email) {
      return NextResponse.redirect(
        new URL(
          `/configuracion/perfil?error=email_mismatch&expected=${encodeURIComponent(invitation.invited_email)}`,
          origin
        )
      );
    }

    // Verificar si el email ya está compartido en profile_emails
    const emailInProfileEmailsResult = await query<{ profile_id: string }>(
      `SELECT profile_id FROM profile_emails WHERE email = $1`,
      [invitation.invited_email]
    );

    if (emailInProfileEmailsResult.rows.length > 0) {
      // El email ya está compartido con otro perfil
      return NextResponse.redirect(
        new URL('/configuracion/perfil?error=email_already_shared', origin)
      );
    }

    // Verificar si el email pertenece a otro perfil activo (que NO sea el usuario actual)
    // Esto previene que Sara comparta el email de otro usuario activo
    const emailInProfilesResult = await query<{ id: string }>(
      `SELECT id FROM profiles WHERE email = $1 AND id != $2 AND deleted_at IS NULL`,
      [invitation.invited_email, currentUser.profile_id]
    );

    if (emailInProfilesResult.rows.length > 0) {
      // El email pertenece a otro usuario diferente que está ACTIVO
      return NextResponse.redirect(
        new URL('/configuracion/perfil?error=email_belongs_to_another_user', origin)
      );
    }

    // Verificar que el invitador no esté intentando compartir su propio email primario
    const inviterProfileResult = await query<{ email: string }>(
      `SELECT email FROM profiles WHERE id = $1`,
      [invitation.profile_id]
    );

    if (inviterProfileResult.rows.length > 0 && inviterProfileResult.rows[0]) {
      const inviterEmail = inviterProfileResult.rows[0].email;
      if (inviterEmail === invitation.invited_email) {
        return NextResponse.redirect(
          new URL('/configuracion/perfil?error=cannot_share_own_primary_email', origin)
        );
      }
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
        currentUser.profile_id,
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
      [currentUser.profile_id]
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
        [currentUser.profile_id]
      );

      // Invalidar la sesión actual (eliminar cookie)
      const response = NextResponse.redirect(
        new URL(
          '/login?invitation_accepted=true&email=' + encodeURIComponent(invitation.invited_email),
          origin
        )
      );

      // Eliminar cookie de autenticación
      response.cookies.delete(SESSION_COOKIE_NAME);

      return response;
    }

    // Si el usuario SÍ tiene household (caso donde email ya estaba compartido y ahora se acepta formalmente)
    // Redirigir a la página de éxito
    return NextResponse.redirect(
      new URL(
        '/configuracion/perfil?success=invitation_accepted',
        origin
      )
    );
  } catch (error) {
    console.error('Error accepting invitation:', error);

    // Detectar origen para redirect de error
    const origin = detectOrigin(request);

    return NextResponse.redirect(
      new URL('/configuracion/perfil?error=unexpected_error', origin)
    );
  }
}
