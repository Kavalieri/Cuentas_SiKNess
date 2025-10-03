import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/app';

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error);
      // Si hay error, redirigir al login con mensaje de error
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

    // NUEVO: Verificar si hay token de invitación guardado en cookie
    const cookieStore = await cookies();
    const invitationToken = cookieStore.get('invitation_token');
    
    if (invitationToken?.value) {
      // Si hay token de invitación, redirigir a la página de invitación
      return NextResponse.redirect(
        new URL(`/app/invite?token=${invitationToken.value}`, request.url)
      );
    }

    // Sesión creada exitosamente, redirigir a /app (o next)
    return NextResponse.redirect(new URL(next, request.url));
  }

  // Si no hay código, redirigir al login
  return NextResponse.redirect(new URL('/login', request.url));
}
