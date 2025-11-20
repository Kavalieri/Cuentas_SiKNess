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
  email: string; // Email primario del perfil (profiles.email)
  loginEmail: string; // Email usado para iniciar sesión (puede ser secundario)
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
 * Soporta multi-email: busca en profiles.email Y profile_emails.email
 */
export async function sendMagicLink(
  email: string,
  redirectUrl?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar que el email existe en profiles O profile_emails
    const result = await query(
      `
      SELECT p.id, p.auth_user_id, p.display_name, p.email
      FROM profiles p
      LEFT JOIN profile_emails pe ON pe.profile_id = p.id
      WHERE p.email = $1 OR pe.email = $1
      LIMIT 1
    `,
      [email],
    );

    if (result.rows.length === 0) {
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
 * Soporta multi-email: busca en profiles.email Y profile_emails.email
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

    // Buscar usuario por email en profiles O profile_emails
    const result = await query(
      `
      SELECT p.id, p.auth_user_id, p.display_name, p.email
      FROM profiles p
      LEFT JOIN profile_emails pe ON pe.profile_id = p.id
      WHERE p.email = $1 OR pe.email = $1
      LIMIT 1
    `,
      [payload.email],
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    const user = result.rows[0];

    if (!user) {
      return { success: false, error: 'Error al obtener usuario' };
    }

    // Crear sesión con el email usado para login (puede ser secundario)
    const sessionToken = await generateSessionToken(user.auth_user_id, payload.email);

    // Guardar en cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_EXPIRY,
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.sikwow.com' : undefined,
    });

    return { success: true };
  } catch (error) {
    console.error('Error verifying magic link:', error);
    return { success: false, error: 'Error al verificar el enlace' };
  }
}

/**
 * Obtiene el usuario autenticado actual
 * Soporta multi-email: busca en profiles.email Y profile_emails.email
 */
export async function getCurrentUser(): Promise<User | null> {
  console.log('[getCurrentUser] 🔍 Iniciando...');
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      console.log('[getCurrentUser] ❌ No hay token de sesión');
      return null;
    }

    console.log('[getCurrentUser] 🔑 Token encontrado, verificando...');
    // Verificar token de sesión
    const payload = await verifySessionToken(sessionToken);

    if (!payload) {
      console.log('[getCurrentUser] ❌ Token inválido, limpiando cookie');
      // Token inválido, limpiar cookie
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }

    console.log('[getCurrentUser] ✅ Token válido, email:', payload.email);
    // Buscar usuario por email en profiles (email primario) O profile_emails (email secundario)
    const result = await query<ProfileRow & { login_email: string }>(
      `
      SELECT
        p.id,
        p.auth_user_id,
        p.email,
        p.display_name,
        p.avatar_url,
        p.bio,
        p.created_at,
        p.updated_at,
        $1 as login_email
      FROM profiles p
      LEFT JOIN profile_emails pe ON pe.profile_id = p.id AND pe.email = $1
      WHERE (p.email = $1 OR pe.email = $1) AND p.deleted_at IS NULL
      LIMIT 1
    `,
      [payload.email],
    );

    console.log('[getCurrentUser] Query ejecutada, filas:', result.rows.length);
    if (result.rows.length === 0) {
      console.log('[getCurrentUser] ❌ Perfil no encontrado para email:', payload.email);
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }

    const profile = result.rows[0];

    if (!profile) {
      console.log('[getCurrentUser] ❌ Profile es null/undefined');
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }

    console.log('[getCurrentUser] ✅ Usuario encontrado:', profile.display_name, 'profile_id:', profile.id);
    // Mapear a interfaz User (compatibilidad con código existente)
    const user: User = {
      id: profile.auth_user_id, // id = auth UUID (para código existente)
      profile_id: profile.id, // profile_id = profiles.id (PK)
      auth_user_id: profile.auth_user_id,
      email: profile.email, // Email primario del perfil
      loginEmail: profile.login_email, // Email usado para login (puede ser secundario)
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };

    console.log('[getCurrentUser] ✅ Retornando usuario completo');
    return user;
  } catch (error) {
    console.error('[getCurrentUser] ❌ Error:', error);
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
  const settingsResult = await query<{ active_household_id: string | null }>(
    `SELECT active_household_id FROM user_settings WHERE profile_id = $1`,
    [user.profile_id],
  );

  if (settingsResult.rows.length > 0 && settingsResult.rows[0]?.active_household_id) {
    return settingsResult.rows[0].active_household_id;
  }

  // Si no tiene household activo, buscar el primero disponible
  const membershipsResult = await query<{ household_id: string }>(
    `SELECT hm.household_id
     FROM household_members hm
     INNER JOIN households h ON h.id = hm.household_id
     WHERE hm.profile_id = $1 AND h.deleted_at IS NULL
     LIMIT 1`,
    [user.profile_id],
  );

  if (membershipsResult.rows.length > 0 && membershipsResult.rows[0]) {
    const householdId = membershipsResult.rows[0].household_id;

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
    // Verificar que el email no existe en profiles
    const existingResult = await query(
      `
      SELECT email
      FROM profiles
      WHERE email = $1
      LIMIT 1
    `,
      [email],
    );

    if (existingResult.rows.length > 0) {
      return { success: false, error: 'El email ya está registrado' };
    }

    // Generar UUID para el usuario y crear perfil con email
    const profileResult = await query<{ id: string; auth_user_id: string }>(
      `INSERT INTO profiles (auth_user_id, display_name, email, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
       RETURNING id, auth_user_id`,
      [displayName || email.split('@')[0], email],
    );

    if (!profileResult.rows[0]) {
      return { success: false, error: 'Error al crear el usuario' };
    }

    const profile = profileResult.rows[0];

    return { success: true, userId: profile.auth_user_id };
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
 * @param origin - Origen del request (ej: "https://cuentasdev.sikwow.com" o "http://localhost:3001")
 */
export function getGoogleAuthUrl(origin: string, state?: string): string {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google OAuth no configurado. Verifica GOOGLE_CLIENT_ID');
  }

  // Construir redirect_uri dinámicamente basado en el origen del request
  const redirectUri = `${origin}/auth/google/callback`;

  const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
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
 * @param code - Código de autorización de Google
 * @param redirectUri - Mismo redirect_uri usado en la solicitud inicial (requerido por OAuth)
 */
async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<GoogleTokens> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
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
      redirect_uri: redirectUri,
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
 * @param code - Código de autorización de Google
 * @param origin - Origen del request para construir redirect_uri
 */
export async function authenticateWithGoogle(
  code: string,
  origin: string,
): Promise<{ success: boolean; error?: string; userId?: string; sessionToken?: string }> {
  try {
    // Construir redirect_uri (debe coincidir con el usado en la solicitud inicial)
    const redirectUri = `${origin}/auth/google/callback`;

    // Intercambiar código por tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Decodificar id_token para obtener info básica
    const userInfo = decodeJwt(tokens.id_token) as GoogleUserInfo;

    if (!userInfo.email_verified) {
      return { success: false, error: 'Email no verificado en Google' };
    }

    // Buscar usuario por email en profiles (email primario) O profile_emails (email secundario)
    const userResult = await query<ProfileRow>(
      `
      SELECT
        p.id,
        p.auth_user_id,
        p.display_name,
        p.email,
        p.avatar_url,
        p.bio,
        p.created_at,
        p.updated_at
      FROM profiles p
      LEFT JOIN profile_emails pe ON pe.profile_id = p.id AND pe.email = $1
      WHERE (p.email = $1 OR pe.email = $1) AND p.deleted_at IS NULL
      LIMIT 1
    `,
      [userInfo.email],
    );

    let userId: string;

    if (userResult.rows.length > 0) {
      // Usuario existe
      const existingUser = userResult.rows[0];
      if (!existingUser) {
        return { success: false, error: 'Error al obtener usuario existente' };
      }
      userId = existingUser.auth_user_id;

      // Actualizar SOLO si los campos están vacíos (primer login desde Google)
      // Si el usuario ya personalizó su nombre, respetarlo
      const updates: { avatar_url?: string; display_name?: string; updated_at: string } = {
        updated_at: new Date().toISOString(),
      };

      // Solo actualizar avatar si el usuario no tiene uno
      if (userInfo.picture && !existingUser.avatar_url) {
        updates.avatar_url = userInfo.picture;
      }

      // Solo actualizar display_name si está vacío o es el email (caso default)
      const isDefaultName = !existingUser.display_name || existingUser.display_name === existingUser.email.split('@')[0];
      if (userInfo.name && isDefaultName) {
        updates.display_name = userInfo.name;
      }

      // Solo hacer update si hay cambios más allá de updated_at
      if (updates.avatar_url || updates.display_name) {
        await sql.update(
          'profiles',
          updates,
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

    // Crear sesión y establecer cookie (igual que verifyMagicLink)
    const sessionToken = await generateSessionToken(userId, userInfo.email);

    // Guardar en cookie (CRÍTICO para Next.js 15)
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_EXPIRY,
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.sikwow.com' : undefined,
    });

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
    // Crear perfil con email directamente en profiles
    const profileResult = await query(
      `
      INSERT INTO profiles (auth_user_id, display_name, email, avatar_url, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
      RETURNING id, auth_user_id
      `,
      [googleUser.name, googleUser.email, googleUser.picture],
    );

    if (profileResult.rows.length === 0) {
      return { success: false, error: 'Error al crear el usuario' };
    }

    const createdProfile = profileResult.rows[0];

    if (!createdProfile || !createdProfile.auth_user_id) {
      return { success: false, error: 'Error al obtener usuario creado' };
    }

    return { success: true, userId: createdProfile.auth_user_id };
  } catch (error) {
    console.error('Error creating user from Google:', error);
    return { success: false, error: 'Error al crear el usuario' };
  }
}

/**
 * Verifica si el usuario actual es el owner del hogar
 * @returns true si el usuario es owner, false en caso contrario
 */
export async function isHouseholdOwner(): Promise<boolean> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return false;

    const householdId = await getUserHouseholdId();
    if (!householdId) return false;

    const result = await query<{ owner_profile_id: string }>(
      `SELECT owner_profile_id FROM households WHERE id = $1`,
      [householdId],
    );

    if (result.rows.length === 0 || !result.rows[0]) return false;

    return result.rows[0].owner_profile_id === currentUser.profile_id;
  } catch (error) {
    console.error('Error checking household ownership:', error);
    return false;
  }
}
