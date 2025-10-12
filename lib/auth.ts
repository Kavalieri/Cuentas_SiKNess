import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { query, sql } from './db';
import { sendMagicLinkEmail } from './email';

/**
 * Sistema de autenticación propio con Magic Links
 * Reemplaza a Supabase Auth
 */

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-this-secret-in-production',
);
export const SESSION_COOKIE_NAME = 'session';
const MAGIC_LINK_EXPIRY = 3600; // 1 hora en segundos
export const SESSION_EXPIRY = 30 * 24 * 60 * 60; // 30 días en segundos

interface User {
  id: string; // UUID de autenticación (para compatibilidad con código existente)
  profile_id: string; // Primary key profiles.id (UUID) - usado en FKs
  auth_user_id: string; // Alias de id (para compatibilidad)
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfileRow {
  id: string;
  auth_user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

interface SessionPayload {
  userId: string;
  email: string;
  exp: number;
}

interface MagicLinkToken {
  email: string;
  type: 'magic_link';
  exp: number;
}

/**
 * Genera un token JWT para magic link
 */
async function generateMagicLinkToken(email: string): Promise<string> {
  const token = await new SignJWT({ email, type: 'magic_link' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(Math.floor(Date.now() / 1000) + MAGIC_LINK_EXPIRY)
    .setIssuedAt()
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verifica un token de magic link
 */
async function verifyMagicLinkToken(token: string): Promise<MagicLinkToken | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (payload.type !== 'magic_link') {
      return null;
    }

    return payload as unknown as MagicLinkToken;
  } catch {
    return null;
  }
}

/**
 * Genera un token JWT para sesión
 */
async function generateSessionToken(userId: string, email: string): Promise<string> {
  const token = await new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_EXPIRY)
    .setIssuedAt()
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verifica un token de sesión
 */
async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Envía un magic link al email especificado
 */
export async function sendMagicLink(
  email: string,
  redirectUrl?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar que el email existe en la base de datos
    const users = await sql.select<User>('profiles', { email });

    if (users.length === 0) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    // Generar token
    const token = await generateMagicLinkToken(email);

    // Construir URL del magic link
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const callbackUrl = redirectUrl || '/app';
    const magicLinkUrl = `${baseUrl}/auth/verify?token=${token}&redirect=${encodeURIComponent(
      callbackUrl,
    )}`;

    // Enviar email
    await sendMagicLinkEmail(email, magicLinkUrl);

    return { success: true };
  } catch (error) {
    console.error('Error sending magic link:', error);
    return { success: false, error: 'Error al enviar el correo' };
  }
}

/**
 * Verifica un magic link y crea una sesión
 */
export async function verifyMagicLink(
  token: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar token
    const payload = await verifyMagicLinkToken(token);

    if (!payload) {
      return { success: false, error: 'Token inválido o expirado' };
    }

    // Buscar usuario
    const users = await sql.select<User>('profiles', { email: payload.email });

    if (users.length === 0) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    const user = users[0];

    if (!user) {
      return { success: false, error: 'Error al obtener usuario' };
    }

    // Crear sesión
    const sessionToken = await generateSessionToken(user.auth_user_id, user.email);

    // Guardar en cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_EXPIRY,
      path: '/',
    });

    return { success: true };
  } catch (error) {
    console.error('Error verifying magic link:', error);
    return { success: false, error: 'Error al verificar el enlace' };
  }
}

/**
 * Obtiene el usuario autenticado actual
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return null;
    }

    // Verificar token de sesión
    const payload = await verifySessionToken(sessionToken);

    if (!payload) {
      // Token inválido, limpiar cookie
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }

    // Buscar usuario en base de datos
    const profiles = await sql.select<ProfileRow>('profiles', { auth_user_id: payload.userId });

    if (profiles.length === 0) {
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }

    const profile = profiles[0];

    if (!profile) {
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }

    // Mapear a interfaz User (compatibilidad con código existente)
    const user: User = {
      id: profile.auth_user_id, // id = auth UUID (para código existente)
      profile_id: profile.id, // profile_id = profiles.id (PK)
      auth_user_id: profile.auth_user_id,
      email: profile.email,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };

    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Cierra la sesión del usuario actual
 */
export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Verifica si un usuario está autenticado
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Obtiene el household_id activo del usuario autenticado
 */
export async function getUserHouseholdId(): Promise<string | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  // Buscar household activo en user_settings
  const settings = await sql.select<{ active_household_id: string | null }>('user_settings', {
    profile_id: user.profile_id,
  });

  if (settings.length > 0 && settings[0] && settings[0].active_household_id) {
    return settings[0].active_household_id;
  }

  // Si no tiene household activo, buscar el primero disponible
  const memberships = await sql.select<{ household_id: string }>('household_members', {
    profile_id: user.profile_id,
  });

  if (memberships.length > 0 && memberships[0]) {
    const householdId = memberships[0].household_id;

    // Guardar como household activo
    await query(
      `INSERT INTO user_settings (profile_id, active_household_id, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (profile_id)
       DO UPDATE SET active_household_id = $2, updated_at = NOW()`,
      [user.profile_id, householdId],
    );

    return householdId;
  }

  return null;
}

/**
 * Crea una nueva cuenta de usuario
 */
export async function createUser(
  email: string,
  displayName?: string,
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    // Verificar que el email no existe
    const existing = await sql.select<User>('profiles', { email });

    if (existing.length > 0) {
      return { success: false, error: 'El email ya está registrado' };
    }

    // Generar UUID para el usuario
    const result = await query<{ auth_user_id: string }>(
      `INSERT INTO profiles (auth_user_id, email, display_name, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
       RETURNING auth_user_id`,
      [email, displayName || email.split('@')[0]],
    );

    if (!result.rows[0]) {
      return { success: false, error: 'Error al crear el usuario' };
    }

    return { success: true, userId: result.rows[0].auth_user_id };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: 'Error al crear el usuario' };
  }
}

/**
 * GOOGLE OAUTH 2.0 - CONFIGURACIÓN Y FUNCIONES
 */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

interface GoogleTokens {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
}

interface GoogleUserInfo {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

/**
 * Genera URL de autorización de Google OAuth
 */
export function getGoogleAuthUrl(state?: string): string {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    throw new Error('Google OAuth no configurado. Verifica GOOGLE_CLIENT_ID y GOOGLE_REDIRECT_URI');
  }

  const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  if (state) {
    params.set('state', state);
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Intercambia código de autorización por tokens de acceso
 */
async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error('Google OAuth no configurado');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error exchanging code for tokens: ${error}`);
  }

  return response.json();
}

/**
 * Decodifica JWT id_token para obtener información del usuario
 */
function decodeJwt(token: string): GoogleUserInfo {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const base64Url = parts[1];
    if (!base64Url) {
      throw new Error('Invalid JWT payload');
    }

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    throw new Error('Error decodificando JWT');
  }
}

/**
 * Obtiene información del usuario desde Google
 */
async function _getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error obteniendo información del usuario de Google');
  }

  return response.json();
}

/**
 * Autentica usuario con Google OAuth
 */
export async function authenticateWithGoogle(
  code: string,
): Promise<{ success: boolean; error?: string; userId?: string; sessionToken?: string }> {
  try {
    // Intercambiar código por tokens
    const tokens = await exchangeCodeForTokens(code);

    // Decodificar id_token para obtener info básica
    const userInfo = decodeJwt(tokens.id_token) as GoogleUserInfo;

    if (!userInfo.email_verified) {
      return { success: false, error: 'Email no verificado en Google' };
    }

    // Buscar o crear usuario
    const existingUsers = await sql.select<User>('profiles', { email: userInfo.email });

    let userId: string;

    if (existingUsers.length > 0) {
      // Usuario existe, actualizar información si es necesario
      const existingUser = existingUsers[0];
      if (!existingUser) {
        return { success: false, error: 'Error al obtener usuario existente' };
      }
      userId = existingUser.auth_user_id;

      // Actualizar avatar y nombre si cambiaron
      if (userInfo.picture || userInfo.name) {
        await sql.update(
          'profiles',
          {
            display_name: userInfo.name,
            avatar_url: userInfo.picture,
            updated_at: new Date().toISOString(),
          },
          { auth_user_id: userId },
        );
      }
    } else {
      // Crear nuevo usuario
      const createResult = await createUserFromGoogle(userInfo);
      if (!createResult.success) {
        return { success: false, error: createResult.error };
      }
      userId = createResult.userId!;
    }

    // Crear sesión y retornar el token (el callback lo establecerá en la cookie)
    const sessionToken = await generateSessionToken(userId, userInfo.email);

    return { success: true, userId, sessionToken };
  } catch (error) {
    console.error('Error authenticating with Google:', error);
    return { success: false, error: 'Error en autenticación con Google' };
  }
}

/**
 * Crea un nuevo usuario desde información de Google
 */
async function createUserFromGoogle(
  googleUser: GoogleUserInfo,
): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    // Generar UUID para auth_user_id
    const authUserId = crypto.randomUUID();

    // Insertar en profiles
    const result = await query(
      `
      INSERT INTO profiles (auth_user_id, email, display_name, avatar_url, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING auth_user_id
      `,
      [authUserId, googleUser.email, googleUser.name, googleUser.picture],
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Error al crear el usuario' };
    }

    const createdUser = result.rows[0];
    if (!createdUser || !createdUser.auth_user_id) {
      return { success: false, error: 'Error al obtener usuario creado' };
    }

    return { success: true, userId: createdUser.auth_user_id };
  } catch (error) {
    console.error('Error creating user from Google:', error);
    return { success: false, error: 'Error al crear el usuario' };
  }
}
