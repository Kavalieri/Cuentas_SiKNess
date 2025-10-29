import { authenticateWithGoogle, SESSION_COOKIE_NAME, SESSION_EXPIRY } from '@/lib/auth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Detecta el origen correcto del request para OAuth
 * Misma lógica que en auth/google/route.ts para consistencia
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
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Detectar origen del request
    const origin = detectOrigin(request);

    // Verificar si hay error de OAuth
    if (error) {
      console.error('OAuth error:', error);
      const loginUrl = new URL('/login', origin);
      loginUrl.searchParams.set('error', `oauth_error_${error}`);
      return NextResponse.redirect(loginUrl);
    }

    // Verificar que tenemos el código
    if (!code) {
      console.error('❌ No authorization code received');
      const loginUrl = new URL('/login', origin);
      loginUrl.searchParams.set('error', 'no_code');
      return NextResponse.redirect(loginUrl);
    }

    // Autenticar con Google (establece cookie internamente)
    const result = await authenticateWithGoogle(code, origin);

    if (!result.success || !result.sessionToken) {
      console.error('Google authentication failed:', result.error);
      const loginUrl = new URL('/login', origin);
      loginUrl.searchParams.set('error', result.error || 'auth_failed');
      return NextResponse.redirect(loginUrl);
    }

    // Verificar si hay un token de invitación en el state
    let redirectUrl: URL;
    if (state && state.startsWith('invitation:')) {
      const invitationToken = state.replace('invitation:', '');
      redirectUrl = new URL(`/api/auth/accept-email-invitation/${invitationToken}`, origin);
    } else {
      // Redirigir SIEMPRE a la nueva interfaz /sickness
      redirectUrl = new URL('/sickness', origin);
    }

    // Crear respuesta de redirect
    const response = NextResponse.redirect(redirectUrl);

    // CRÍTICO: Copiar la cookie de sesión a la respuesta (igual que /auth/verify)
    // En Next.js 15, las cookies del Route Handler no se propagan automáticamente
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (sessionCookie) {
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: sessionCookie.value,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_EXPIRY,
        path: '/',
      });
    } else {
      console.warn('⚠️  Session cookie not found after authentication!');
    }

    return response;
  } catch (error) {
    console.error('❌ Error in Google OAuth callback:', error);

    // En caso de error, usar detección básica de origen
    const origin = detectOrigin(request);
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', 'server_error');
    return NextResponse.redirect(loginUrl);
  }
}
