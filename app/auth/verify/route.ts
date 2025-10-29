import { SESSION_COOKIE_NAME, SESSION_EXPIRY, verifyMagicLink } from '@/lib/auth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Endpoint para verificar magic links
 * GET /auth/verify?token=xxx&redirect=/app
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  // Usar redirect dinámico o default a /sickness
  const redirect = searchParams.get('redirect') || '/sickness';

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing_token', request.url));
  }

  // Verificar el token y crear sesión
  const result = await verifyMagicLink(token);

  if (!result.success) {
    console.error('Verification failed:', result.error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(result.error || 'invalid_token')}`, request.url),
    );
  }

  // Crear respuesta de redirección
  // Usar el origin del request (respeta proxy/dominio) en lugar de request.url directo
  const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
  const proto =
    request.headers.get('x-forwarded-proto') ||
    (request.headers.get('x-forwarded-ssl') === 'on' ? 'https' : null) ||
    (host?.includes('localhost') ? 'http' : 'https');

  const origin = `${proto}://${host}`;
  const redirectUrl = new URL(redirect, origin);

  const response = NextResponse.redirect(redirectUrl);

  // CRÍTICO: Copiar la cookie de sesión a la respuesta
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
    console.warn('⚠️  Session cookie not found after verification!');
  }

  return response;
}
