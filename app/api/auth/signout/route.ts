import { NextResponse } from 'next/server';
import { signOut } from '@/lib/auth';

/**
 * Endpoint para cerrar sesión
 * GET /api/auth/signout
 */
export async function GET() {
  await signOut();
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
}
