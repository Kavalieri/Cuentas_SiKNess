import { authenticateWithGoogle, SESSION_COOKIE_NAME, SESSION_EXPIRY } from '@/lib/auth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Usar NEXT_PUBLIC_SITE_URL para construir URLs correctamente
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.url;

    // Verificar si hay error de OAuth
    if (error) {
      console.error('OAuth error:', error);
      const loginUrl = new URL('/login', baseUrl);
      loginUrl.searchParams.set('error', `oauth_error_${error}`);
      return NextResponse.redirect(loginUrl);
    }

    // Verificar que tenemos el código
    if (!code) {
      console.error('No authorization code received');
      const loginUrl = new URL('/login', baseUrl);
      loginUrl.searchParams.set('error', 'no_code');
      return NextResponse.redirect(loginUrl);
    }

    // Autenticar con Google
    const result = await authenticateWithGoogle(code);

    if (!result.success || !result.sessionToken) {
      console.error('Google authentication failed:', result.error);
      const loginUrl = new URL('/login', baseUrl);
      loginUrl.searchParams.set('error', result.error || 'auth_failed');
      return NextResponse.redirect(loginUrl);
    }

    // Crear respuesta con redirección
    const redirectUrl = state || '/app';

    // En lugar de redirect HTTP, devolver HTML que establece cookie y redirige en el cliente
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Autenticando...</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: #f9fafb;
    }
    .container {
      text-align: center;
    }
    .spinner {
      border: 3px solid #f3f4f6;
      border-top: 3px solid #3b82f6;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <p>Autenticación exitosa. Redirigiendo...</p>
  </div>
  <script>
    // Esperar un momento para asegurar que la cookie se establezca
    setTimeout(() => {
      window.location.href = '${redirectUrl}';
    }, 100);
  </script>
</body>
</html>`;

    const response = new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });

    // Establecer cookie de sesión en la respuesta
    response.cookies.set(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_EXPIRY,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.url;
    const loginUrl = new URL('/login', baseUrl);
    loginUrl.searchParams.set('error', 'server_error');
    return NextResponse.redirect(loginUrl);
  }
}
