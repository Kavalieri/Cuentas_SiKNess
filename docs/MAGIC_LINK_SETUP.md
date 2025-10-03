# Configuración de Magic Links en Supabase

## Problema

Los magic links de **signup** (creación de nuevo usuario) dan 404, mientras que los de login funcionan correctamente.

**Error típico:**
```
404 Not Found
https://fizxvvtakvmmeflmbwud.supabase.co/auth/v1/verify?token=pkce_...&type=signup&redirect_to=http://localhost:3000/auth/callback
```

## Causa

El problema está en el **template de email de confirmación** de Supabase, que usa una URL antigua (`{{ .ConfirmationURL }}`) en lugar de la URL correcta con PKCE flow.

## Solución

### 1. Acceder a Email Templates

Ve a: [Email Templates en Supabase Dashboard](https://supabase.com/dashboard/project/fizxvvtakvmmeflmbwud/auth/templates)

O manualmente:
1. Ve a https://supabase.com/dashboard
2. Selecciona el proyecto `CuentasSiK` (ID: `fizxvvtakvmmeflmbwud`)
3. En el menú lateral: **Authentication** → **Email Templates**

### 2. Editar el template "Confirm signup"

1. Busca el template **"Confirm signup"** en la lista
2. Haz clic en **Edit**
3. Busca la línea que contiene el enlace de confirmación

**❌ Si encuentras esto (ANTIGUO):**
```html
<a href="{{ .ConfirmationURL }}">Confirm your email</a>
```

**✅ Cámbialo por esto (NUEVO):**
```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>
```

### 3. Template completo recomendado

Aquí está el template completo que deberías usar:

```html
<h2>Confirm your signup</h2>

<p>Follow this link to confirm your account:</p>

<p>
  <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup">
    Confirm your email address
  </a>
</p>

<p>Or copy and paste this URL into your browser:</p>
<p>{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup</p>
```

### 4. Guardar cambios

Haz clic en **Save** en la parte inferior de la página.

### 5. Verificar URL Configuration (ya configurado)

Asegúrate de que las **Redirect URLs** en [URL Configuration](https://supabase.com/dashboard/project/fizxvvtakvmmeflmbwud/auth/url-configuration) incluyen:

```
http://localhost:3000/auth/callback
http://localhost:3000/*
https://cuentas-sik.vercel.app/auth/callback
https://cuentas-sik.vercel.app/*
```

✅ **Según tu mensaje, esto ya está configurado correctamente.**

### 6. Probar el signup

1. Ve a `http://localhost:3000/login`
2. Introduce un **email NUEVO** (que no exista en la BD)
3. Revisa tu bandeja de entrada
4. Haz clic en el magic link → Debería funcionar ahora

## Verificación

Si todo está bien configurado:

- ✅ El magic link redirige a `/auth/callback`
- ✅ `/auth/callback` procesa el token
- ✅ Redirige automáticamente a `/app` o `/app/household/create` (si no tiene hogar)

## Troubleshooting

### El signup link sigue dando 404

1. **Verifica que editaste el template "Confirm signup"** (no otro template)
2. **Guarda los cambios** y espera 1-2 minutos
3. **Solicita un nuevo signup** con un email diferente
4. **NO uses el link anterior** (los tokens son de un solo uso)

### El login funciona pero el signup no

✅ **Esto confirma el problema del email template**. El template de "Magic Link" (login) usa la URL correcta, pero el de "Confirm signup" no. Sigue los pasos arriba para arreglarlo.

### Verificar qué template usar

- **"Magic Link"** → Para usuarios existentes (login)
- **"Confirm signup"** → Para nuevos usuarios (registro) ← **Este es el que necesitas cambiar**
- **"Invite user"** → Para invitaciones (si lo usas en el futuro)

### El link funciona pero no inicia sesión

1. Verifica que el archivo `app/auth/callback/route.ts` existe
2. Revisa los logs del servidor de desarrollo (`npm run dev`)
3. Verifica que `.env.local` tiene las variables correctas:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`

### El usuario se crea pero no tiene household

Esto es normal. La primera vez que un usuario inicia sesión:

1. Se redirige a `/app/household/create`
2. Debe crear un hogar nuevo
3. Después puede invitar a otros miembros

## Configuración para Producción

Cuando despliegues a Vercel:

1. En Supabase Dashboard, actualiza **Site URL** a:
   ```
   https://cuentas-sik.vercel.app
   ```

2. Asegúrate de que las **Redirect URLs** incluyen:
   ```
   https://cuentas-sik.vercel.app/auth/callback
   https://cuentas-sik.vercel.app/*
   ```

3. En Vercel, configura las variables de entorno:
   ```
   NEXT_PUBLIC_SITE_URL=https://cuentas-sik.vercel.app
   ```

## Referencias

- [Supabase Auth Deep Dive](https://supabase.com/docs/guides/auth/auth-deep-dive/auth-deep-dive-jwts)
- [Supabase Email Auth with PKCE](https://supabase.com/docs/guides/auth/server-side/email-based-auth-with-pkce-flow-for-ssr)
- [Next.js Redirect URL Configuration](https://supabase.com/docs/guides/auth/redirect-urls)
