import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { query, sql } from './db';
import { sendMagicLinkEmail } from './email';

/**
 * Sistema de autenticación propio con Magic Links
 * Reemplaza a Supabase Auth
 */

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-this-secret-in-production'
);
export const SESSION_COOKIE_NAME = 'session';
const MAGIC_LINK_EXPIRY = 3600; // 1 hora en segundos
export const SESSION_EXPIRY = 30 * 24 * 60 * 60; // 30 días en segundos

interface User {
  id: string;              // UUID de autenticación (para compatibilidad con código existente)
  profile_id: string;      // Primary key profiles.id (UUID) - usado en FKs
  auth_user_id: string;    // Alias de id (para compatibilidad)
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
export async function sendMagicLink(email: string, redirectUrl?: string): Promise<{ success: boolean; error?: string }> {
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
    const magicLinkUrl = `${baseUrl}/auth/verify?token=${token}&redirect=${encodeURIComponent(callbackUrl)}`;

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
export async function verifyMagicLink(token: string): Promise<{ success: boolean; error?: string }> {
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
      id: profile.auth_user_id,         // id = auth UUID (para código existente)
      profile_id: profile.id,            // profile_id = profiles.id (PK)
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
  const settings = await sql.select<{ active_household_id: string | null }>(
    'user_settings',
    { profile_id: user.profile_id }
  );

  if (settings.length > 0 && settings[0] && settings[0].active_household_id) {
    return settings[0].active_household_id;
  }

  // Si no tiene household activo, buscar el primero disponible
  const memberships = await sql.select<{ household_id: string }>(
    'household_members',
    { profile_id: user.profile_id }
  );

  if (memberships.length > 0 && memberships[0]) {
    const householdId = memberships[0].household_id;

    // Guardar como household activo
    await query(
      `INSERT INTO user_settings (profile_id, active_household_id, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (profile_id)
       DO UPDATE SET active_household_id = $2, updated_at = NOW()`,
      [user.profile_id, householdId]
    );

    return householdId;
  }

  return null;
}

/**
 * Crea una nueva cuenta de usuario
 */
export async function createUser(email: string, displayName?: string): Promise<{ success: boolean; userId?: string; error?: string }> {
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
      [email, displayName || email.split('@')[0]]
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
