# Magic Link OTP Expired - Troubleshooting Guide

**Date**: October 3, 2025  
**Error**: `otp_expired` - Email link is invalid or has expired  
**Status**: ✅ FIXED

---

## Síntoma

Al hacer clic en el magic link del email, aparece:
```
GET /auth/callback?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
```

---

## Causa Raíz

El callback (`app/auth/callback/route.ts`) solo manejaba el flujo PKCE moderno (parámetro `code`) pero no:
1. Los errores que vienen directamente de Supabase en la URL
2. El flujo OTP antiguo (parámetro `token_hash`)

Después de la refactorización de la base de datos, el callback no estaba preparado para manejar estos casos.

---

## Solución Implementada

### 1. Manejo de Errores Explícito

Actualizado `app/auth/callback/route.ts` para detectar y manejar errores antes de procesar:

```typescript
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
```

### 2. Soporte para Flujo OTP (token_hash)

Agregado soporte para el flujo antiguo de Supabase que usa `token_hash`:

```typescript
// Manejar flujo OTP antiguo (token_hash)
if (token_hash && type) {
  console.log('Using token_hash flow (OTP)');
  const supabase = await supabaseServer();
  
  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type: type as any,
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

  // Verificar sesión y redirigir...
}
```

### 3. Logging Mejorado

Agregados `console.log` para debug:
- Cuando se usa el flujo OTP
- Cuando no se encuentra ni code ni token_hash
- Errores específicos de verificación

---

## Cómo Verificar la Solución

### 1. Solicitar Nuevo Magic Link

```bash
# Asegúrate de que el servidor esté corriendo
npm run dev
```

1. Ve a http://localhost:3000/login
2. Ingresa tu email
3. Espera el email (puede tardar 1-2 minutos)

### 2. Verificar el Email

Revisa que el email contenga un enlace similar a:

**Flujo PKCE (moderno):**
```
http://localhost:3000/auth/callback?code=xxxxx
```

**Flujo OTP (antiguo):**
```
http://localhost:3000/auth/callback?token_hash=xxxxx&type=magiclink
```

Ambos deberían funcionar ahora.

### 3. Hacer Clic en el Enlace

El enlace debería:
- ✅ Procesar correctamente
- ✅ Crear la sesión
- ✅ Redirigir a `/app` (o `/app/household/create` si no tienes hogar)

### 4. Verificar Console del Servidor

Si usas el flujo OTP, deberías ver:
```
Using token_hash flow (OTP)
```

Si hay errores, verás:
```
Auth callback error: { error: '...', error_code: '...', error_description: '...' }
```

---

## Causas Comunes del Error otp_expired

### 1. El Enlace Realmente Expiró
- **Duración**: Los magic links expiran en **1 hora**
- **Solución**: Solicita un nuevo magic link

### 2. El Enlace Ya Fue Usado
- Los magic links son de **un solo uso**
- Si ya hiciste clic y te autenticaste, el enlace se invalida
- **Solución**: Si necesitas volver a autenticarte, solicita uno nuevo

### 3. Configuración de Email Templates Incorrecta

Ver `docs/MAGIC_LINK_SETUP.md` para:
- Verificar templates en Supabase Dashboard
- Asegurar que usan `{{ .SiteURL }}/auth/callback`
- NO usan URLs antiguas como `{{ .ConfirmationURL }}`

### 4. Problemas de Timezone/Clock Skew

Raro pero posible:
- El reloj del servidor está desincronizado
- Supabase rechaza el token por timestamp inválido
- **Solución**: Verificar hora del sistema

---

## Debugging Adicional

### Ver Logs del Callback

Los logs en la consola del servidor mostrarán:

```bash
# Flujo PKCE exitoso
(No log específico, procesa silenciosamente)

# Flujo OTP exitoso
Using token_hash flow (OTP)

# Error detectado
Auth callback error: { error: 'access_denied', error_code: 'otp_expired', ... }

# Token inválido durante verificación
Error verifying OTP: { message: 'Token expired', ... }

# No hay parámetros
No code or token_hash found, redirecting to login
```

### Verificar Configuración de Supabase

1. **URL Configuration** (Dashboard → Authentication → URL Configuration):
   ```
   Site URL: http://localhost:3000
   Redirect URLs:
   - http://localhost:3000/auth/callback
   - http://localhost:3000/**
   ```

2. **Email Templates** (Dashboard → Authentication → Email Templates):
   - "Magic Link" template debe incluir `/auth/callback`
   - "Confirm signup" template debe incluir `/auth/callback`

### Verificar Variables de Entorno

`.env.local` debe contener:
```env
NEXT_PUBLIC_SUPABASE_URL=https://fizxvvtakvmmeflmbwud.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu_anon_key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Testing Checklist

Después de aplicar el fix:

- [ ] Magic link para login funciona (usuario existente)
- [ ] Magic link para signup funciona (nuevo usuario)
- [ ] Errores muestran mensajes amigables en `/login`
- [ ] No hay errores en consola del servidor
- [ ] Sesión se crea correctamente
- [ ] Redirección a `/app` funciona
- [ ] Si hay invitation token, redirige a `/app/invite`

---

## Archivos Modificados

- ✅ `app/auth/callback/route.ts` - Manejo de errores y flujo OTP
- 📝 `docs/MAGIC_LINK_OTP_EXPIRED_FIX.md` - Esta documentación

---

## Commit

```bash
git add app/auth/callback/route.ts docs/MAGIC_LINK_OTP_EXPIRED_FIX.md
git commit -m "fix: handle OTP expired errors and add token_hash flow support in auth callback

- Add explicit error handling for Supabase auth callback errors
- Support both PKCE (code) and OTP (token_hash) flows
- Show user-friendly error messages for expired/invalid links
- Improve logging for debugging auth issues

Fixes magic link authentication after database refactoring.
Resolves 'otp_expired' error when clicking email links."
```

---

## Referencias

- `docs/MAGIC_LINK_SETUP.md` - Configuración inicial de magic links
- `docs/DATABASE_REFACTORING.md` - Refactoring que precedió este fix
- [Supabase Auth Helpers Docs](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase OTP Verification](https://supabase.com/docs/reference/javascript/auth-verifyotp)
