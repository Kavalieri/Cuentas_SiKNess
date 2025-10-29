import { pgServer } from '@/lib/pgServer';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  // Nota: el parámetro `next` se lee más abajo; evitar variable sin uso para ESLint
  // Redirigir a la interfaz principal
  const next = requestUrl.searchParams.get('next') || '/dual-flow/inicio';

  // Manejar errores que vienen directamente de Supabase
  const error = requestUrl.searchParams.get('error');
  const error_code = requestUrl.searchParams.get('error_code');
  const error_description = requestUrl.searchParams.get('error_description');

  if (error) {
    console.error('Auth callback error:', { error, error_code, error_description });

    // Mensajes de error más amigables
    let friendlyMessage = error_description || error;
    if (error_code === 'otp_expired') {
      friendlyMessage = 'El enlace ha expirado. Por favor, solicita uno nuevo.';
    } else if (error === 'access_denied') {
      friendlyMessage = 'El enlace es inválido o ya fue usado. Solicita uno nuevo.';
    }

    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(friendlyMessage)}`, request.url),
    );
  }

  // Manejar flujo PKCE (code)
  if (code) {
    const supabase = await pgServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url),
      );
    }

    // Verificar que la sesión se creó correctamente
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      console.error('No session after exchange');
      return NextResponse.redirect(new URL('/login?error=no_session', request.url));
    }

    // CRÍTICO: Asegurar que existe profile (fallback si trigger falla)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', session.user.id)
      .maybeSingle();

    if (!existingProfile) {
      console.log('Creating missing profile for user:', session.user.id);
      const { error: profileError } = await supabase.from('profiles').insert({
        auth_user_id: session.user.id,
        email: session.user.email ?? '',
        display_name: session.user.email?.split('@')[0] ?? 'Usuario',
      });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // No bloqueamos el flujo, el trigger debería haberlo creado
      }
    }

    // ADMIN REDIRECTION: Redirigir admin directamente a la interfaz dual-flow
    const systemAdminEmail = process.env.NEXT_PUBLIC_SYSTEM_ADMIN_EMAIL;
    if (systemAdminEmail && session.user.email === systemAdminEmail) {
      return NextResponse.redirect(new URL('/dual-flow/inicio', request.url));
    }

    // NUEVO: Verificar si hay token de invitación guardado en cookie
    const cookieStore = await cookies();
    const invitationToken = cookieStore.get('invitation_token');

    if (invitationToken?.value) {
      // Si hay token de invitación, redirigir a la página de invitación
      return NextResponse.redirect(
        new URL(`/app/invite?token=${invitationToken.value}`, request.url),
      );
    }

    // Sesión creada exitosamente, redirigir al flujo principal (o next)
    return NextResponse.redirect(new URL(next, request.url));
  }

  // Manejar flujo OTP antiguo (token_hash) - para compatibilidad
  if (token_hash && type) {
    console.log('Using token_hash flow (OTP)');
    const supabase = await pgServer();

    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'signup' | 'magiclink' | 'recovery' | 'email_change',
    });

    if (error) {
      console.error('Error verifying OTP:', error);
      let friendlyMessage = error.message;
      if (error.message.includes('expired')) {
        friendlyMessage = 'El enlace ha expirado. Por favor, solicita uno nuevo.';
      }
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(friendlyMessage)}`, request.url),
      );
    }

    // Verificar sesión después de OTP
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      console.error('No session after OTP verification');
      return NextResponse.redirect(new URL('/login?error=no_session', request.url));
    }

    // ADMIN REDIRECTION: Redirigir admin directamente a la interfaz dual-flow (OTP flow)
    const systemAdminEmail = process.env.NEXT_PUBLIC_SYSTEM_ADMIN_EMAIL;
    if (systemAdminEmail && session.user.email === systemAdminEmail) {
      return NextResponse.redirect(new URL('/dual-flow/inicio', request.url));
    }

    // NUEVO: Verificar si hay token de invitación guardado en cookie
    const cookieStore = await cookies();
    const invitationToken = cookieStore.get('invitation_token');

    if (invitationToken?.value) {
      return NextResponse.redirect(
        new URL(`/app/invite?token=${invitationToken.value}`, request.url),
      );
    }

    return NextResponse.redirect(new URL(next, request.url));
  }

  // Si no hay código ni token_hash, redirigir al login
  console.log('No code or token_hash found, redirecting to login');
  return NextResponse.redirect(new URL('/login', request.url));
}
