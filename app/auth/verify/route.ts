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
  // Redirigir SIEMPRE a la nueva interfaz /sickness
  const redirect = '/sickness';

  console.log('🔍 Verify endpoint called');
  console.log('Token received:', token?.substring(0, 20) + '...');
  console.log('Redirect URL:', redirect);

  if (!token) {
    console.log('❌ No token provided');
    return NextResponse.redirect(new URL('/login?error=missing_token', request.url));
  }

  // Verificar el token y crear sesión
  console.log('Verifying token...');
  const result = await verifyMagicLink(token);

  console.log('Verification result:', result);

  if (!result.success) {
    console.log('❌ Verification failed:', result.error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(result.error || 'invalid_token')}`, request.url),
    );
  }

  console.log('✅ Verification successful, creating response with cookie');

  // DEBUG: Ver todos los headers recibidos
  console.log('📋 Headers recibidos:');
  request.headers.forEach((value, key) => {
    if (key.includes('host') || key.includes('forward') || key.includes('proto')) {
      console.log(`  ${key}: ${value}`);
    }
  });
  console.log('  request.url:', request.url);

  // Crear respuesta de redirección
  // Usar el origin del request (respeta proxy/dominio) en lugar de request.url directo
  const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
  const proto =
    request.headers.get('x-forwarded-proto') ||
    (request.headers.get('x-forwarded-ssl') === 'on' ? 'https' : null) ||
    (host?.includes('localhost') ? 'http' : 'https');

  const origin = `${proto}://${host}`;
  const redirectUrl = new URL(redirect, origin);
  console.log('🔗 Redirecting to:', redirectUrl.toString());

  const response = NextResponse.redirect(redirectUrl);

  // CRÍTICO: Copiar la cookie de sesión a la respuesta
  // En Next.js 15, las cookies del Route Handler no se propagan automáticamente
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (sessionCookie) {
    console.log('🍪 Setting session cookie in response');
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
