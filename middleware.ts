import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-this-secret-in-production'
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

  const isProtectedRoute = request.nextUrl.pathname.startsWith('/app');
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth/verify');
  const isLoginRoute = request.nextUrl.pathname.startsWith('/login');

  if (isProtectedRoute && !isAuthRoute) {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      await jwtVerify(sessionToken, JWT_SECRET);
    } catch {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'session_expired');
      loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname);
      response = NextResponse.redirect(loginUrl);
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }
  }

  if (isLoginRoute) {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (sessionToken) {
      try {
        await jwtVerify(sessionToken, JWT_SECRET);
        return NextResponse.redirect(new URL('/app', request.url));
      } catch {
        response.cookies.delete(SESSION_COOKIE_NAME);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
