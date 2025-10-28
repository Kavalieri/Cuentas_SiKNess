import { getGoogleAuthUrl } from '@/lib/auth';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Detecta el origen correcto del request para OAuth
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

export async function GET(request: NextRequest) {
  try {
    // Detectar origen del request (localhost o producción)
    const origin = detectOrigin(request);

    console.log('[OAuth] Detected origin:', origin);

    // Capturar token de invitación si existe (para pasarlo como state)
    const invitationToken = request.nextUrl.searchParams.get('invitation');
    const state = invitationToken ? `invitation:${invitationToken}` : undefined;

    if (state) {
      console.log('[OAuth] Invitation detected, will pass as state:', invitationToken);
    }

    // Generar URL de autorización de Google con redirect_uri correcto
    const authUrl = getGoogleAuthUrl(origin, state);

    // Redireccionar a Google
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error generating Google auth URL:', error);

    // Redireccionar al login con error
    const loginUrl = new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001');
    loginUrl.searchParams.set('error', 'oauth_config_error');
    return NextResponse.redirect(loginUrl);
  }
}
