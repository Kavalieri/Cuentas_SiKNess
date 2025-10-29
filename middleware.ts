import { jwtVerify } from 'jose';
import { NextResponse, type NextRequest } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-this-secret-in-production',
);
const SESSION_COOKIE_NAME = 'session';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const invitationToken = request.nextUrl.searchParams.get('token');
  if (invitationToken) {
    response.cookies.set('invitation_token', invitationToken, {
      maxAge: 3600,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  const pathname = request.nextUrl.pathname;
  console.log('[MIDDLEWARE] 🔍 Procesando:', pathname);
  
  const isApiRoute = pathname.startsWith('/api') || pathname.startsWith('/app/api');
  const isProtectedRoute = pathname.startsWith('/app');
  const isDualFlowRoute = pathname.startsWith('/dual-flow');
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth/verify');
  const isLoginRoute = request.nextUrl.pathname.startsWith('/login');
  const requiresAuth = (isProtectedRoute || isDualFlowRoute) && !isAuthRoute;
  
  console.log('[MIDDLEWARE] Flags:', { isApiRoute, isProtectedRoute, isDualFlowRoute, requiresAuth });

  if (isApiRoute) {
    console.log('[MIDDLEWARE] ✅ API route, dejando pasar');
    return response;
  }

  if (requiresAuth) {
    console.log('[MIDDLEWARE] 🔐 Ruta requiere autenticación');
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      console.log('[MIDDLEWARE] ❌ No hay token de sesión, redirigiendo a login');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    console.log('[MIDDLEWARE] 🔑 Token encontrado, verificando...');
    try {
      await jwtVerify(sessionToken, JWT_SECRET);
      console.log('[MIDDLEWARE] ✅ Token válido');

      // Redirigir SOLO si está en /app raíz (legacy) a /sickness
      if (pathname === '/app' || pathname === '/app/') {
        console.log('[MIDDLEWARE] 🔄 Redirigiendo /app legacy a /sickness');
        return NextResponse.redirect(new URL('/sickness', request.url));
      }

      // Para rutas /sickness/* y /dual-flow/*, dejar pasar
      console.log('[MIDDLEWARE] ✅ Dejando pasar a:', pathname);
      return response;
    } catch (error) {
      console.log('[MIDDLEWARE] ❌ Token inválido o expirado:', error);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'session_expired');
      loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname);
      response = NextResponse.redirect(loginUrl);
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }
  }

  if (isLoginRoute) {
    console.log('[MIDDLEWARE] 🔓 Ruta de login');
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (sessionToken) {
      console.log('[MIDDLEWARE] Token existe en login, verificando...');
      try {
        await jwtVerify(sessionToken, JWT_SECRET);
        console.log('[MIDDLEWARE] ✅ Token válido, redirigiendo a /sickness');

        // Redirigir SIEMPRE a la nueva interfaz /sickness
        return NextResponse.redirect(new URL('/sickness', request.url));
      } catch {
        console.log('[MIDDLEWARE] ❌ Token inválido en login, limpiando');
        response.cookies.delete(SESSION_COOKIE_NAME);
      }
    }
  }

  console.log('[MIDDLEWARE] ✅ Dejando pasar sin cambios');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
