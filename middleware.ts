import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // CAPTURAR TOKEN DE INVITACIÓN EN URL
  // Si la URL contiene ?token=xxx, guardarlo en cookie temporal
  const invitationToken = request.nextUrl.searchParams.get('token');
  if (invitationToken) {
    supabaseResponse.cookies.set('invitation_token', invitationToken, {
      maxAge: 3600, // 1 hora
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  // En Next.js 15, las variables de entorno no están disponibles en middleware
  // Usar directamente las variables desde el request
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si no hay credenciales, permitir el acceso (evitar bloqueo en desarrollo)
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not found in middleware');
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refrescar la sesión si es necesario
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si el usuario no está autenticado y está intentando acceder a /app, redirigir a login
  // EXCEPTO /app/invite que debe ser accesible sin auth
  if (!user && request.nextUrl.pathname.startsWith('/app') && !request.nextUrl.pathname.startsWith('/app/invite')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Preservar returnUrl para volver después del login
    url.searchParams.set('returnUrl', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Si el usuario está autenticado y está en login, redirigir a /app
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/app';
    return NextResponse.redirect(url);
  }

  // Si el usuario está autenticado y accede a /app sin household, redirigir a onboarding
  // (excepto si ya está en onboarding, household/create, o settings)
  if (
    user &&
    request.nextUrl.pathname === '/app' &&
    !request.nextUrl.pathname.startsWith('/app/onboarding') &&
    !request.nextUrl.pathname.startsWith('/app/household/create') &&
    !request.nextUrl.pathname.startsWith('/app/settings')
  ) {
    // Primero obtener el profile_id del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (profile) {
      // Verificar si el usuario tiene household
      const { data: household } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      // Si no tiene household, redirigir a onboarding
      if (!household) {
        const url = request.nextUrl.clone();
        url.pathname = '/app/onboarding';
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
