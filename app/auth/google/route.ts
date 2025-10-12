import { getGoogleAuthUrl } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Generar URL de autorización de Google
    const authUrl = getGoogleAuthUrl();

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
