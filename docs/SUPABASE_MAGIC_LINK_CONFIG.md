# CRITICAL FIX: Configuración de Magic Links en Supabase

**Problema**: Los magic links van a `supabase.co/auth/v1/verify` en lugar de usar el flujo PKCE moderno con `localhost:3000/auth/callback`

**Síntoma**: 
- Enlace recibido: `https://fizxvvtakvmmeflmbwud.supabase.co/auth/v1/verify?token=pkce_...`
- Enlace esperado: `http://localhost:3000/auth/callback?code=...`

---

## ⚠️ CONFIGURACIÓN OBLIGATORIA EN SUPABASE

### Paso 1: Configurar Site URL y Redirect URLs

1. Ve a: https://supabase.com/dashboard/project/fizxvvtakvmmeflmbwud/auth/url-configuration

2. **Site URL** (CRÍTICO):
   ```
   http://localhost:3000
   ```
   
3. **Redirect URLs** - Agregar estas URLs (una por línea):
   ```
   http://localhost:3000/**
   http://localhost:3000/auth/callback
   http://localhost:3000/auth/callback/**
   ```

4. **Guardar cambios**

---

### Paso 2: Actualizar Email Templates

#### Template: "Magic Link"

1. Ve a: https://supabase.com/dashboard/project/fizxvvtakvmmeflmbwud/auth/templates

2. Busca el template **"Magic Link"**

3. Reemplaza el contenido con:

```html
<h2>Magic Link</h2>
<p>Follow this link to login:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink">Log In</a></p>
```

**IMPORTANTE**: NO uses `{{ .ConfirmationURL }}` - usa `{{ .SiteURL }}/auth/callback`

#### Template: "Confirm signup"

1. Busca el template **"Confirm signup"**

2. Reemplaza el contenido con:

```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your account:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup">Confirm your email address</a></p>
```

---

### Paso 3: Verificar Configuración de Auth

1. Ve a: https://supabase.com/dashboard/project/fizxvvtakvmmeflmbwud/settings/auth

2. **Verificar**:
   - ✅ "Enable email confirmations" → OFF (para desarrollo)
   - ✅ "Enable email autoconfirm" → ON (para desarrollo)
   - ✅ "Secure email change" → OFF (para desarrollo)

**Para producción**, puedes habilitar confirmaciones.

---

## 🧪 Testing después de configurar

### 1. Limpiar Cache del Navegador

```bash
# En Chrome/Edge: Ctrl + Shift + Delete
# Borrar cookies y cache
```

### 2. Solicitar nuevo Magic Link

```bash
# Asegúrate de que el servidor está corriendo
npm run dev
```

1. Ve a http://localhost:3000/login
2. Ingresa tu email
3. Espera el email (1-2 minutos)

### 3. Verificar el Enlace en el Email

El enlace debería verse así:
```
http://localhost:3000/auth/callback?token_hash=xxxxx&type=magiclink
```

**NO** así:
```
https://fizxvvtakvmmeflmbwud.supabase.co/auth/v1/verify?token=pkce_...
```

---

## 🔍 Debugging

### Ver logs del servidor

En la terminal donde corre `npm run dev`, deberías ver:

**Si el enlace es correcto**:
```
Using token_hash flow (OTP)
```

**Si hay error**:
```
Auth callback error: { error: 'otp_expired', ... }
```

### Probar manualmente el callback

Puedes probar si el callback funciona visitando:
```
http://localhost:3000/auth/callback?error=test
```

Deberías ser redirigido a `/login?error=test`

---

## 🐛 Problemas Comunes

### "Error al enviar el correo" en la UI

**Causa**: Puede ser rate limiting o problema de configuración de Supabase

**Solución**:
1. Espera 1 minuto entre intentos
2. Verifica que `NEXT_PUBLIC_SITE_URL` está en `.env.local`
3. Verifica que las URLs de Supabase son correctas

### El enlace sigue yendo a supabase.co

**Causa**: Templates de email no actualizados

**Solución**:
1. Verifica que guardaste los cambios en los templates
2. Espera 1-2 minutos para que Supabase los actualice
3. Solicita un NUEVO magic link (no uses el anterior)

### El enlace dice "expired" inmediatamente

**Causa**: Clock skew o problema de timezone

**Solución**:
1. Verifica la hora del sistema
2. Intenta con otro navegador
3. Verifica que no estás usando un enlace antiguo

---

## 📋 Checklist de Configuración

Antes de solicitar un magic link, verifica:

- [ ] Site URL configurado: `http://localhost:3000`
- [ ] Redirect URLs incluyen `http://localhost:3000/**`
- [ ] Template "Magic Link" usa `{{ .SiteURL }}/auth/callback`
- [ ] Template "Confirm signup" usa `{{ .SiteURL }}/auth/callback`
- [ ] Email autoconfirm habilitado (desarrollo)
- [ ] Servidor dev corriendo: `npm run dev`
- [ ] `.env.local` tiene `NEXT_PUBLIC_SITE_URL=http://localhost:3000`

---

## 🎯 Resultado Esperado

Después de configurar correctamente:

1. ✅ Solicitas magic link → No error en UI
2. ✅ Recibes email en 1-2 minutos
3. ✅ Enlace apunta a `localhost:3000/auth/callback?token_hash=...`
4. ✅ Click en enlace → Login exitoso
5. ✅ Redirige a `/app` o `/app/household/create`

---

## 🚀 Para Producción (Vercel)

Cuando despliegues a producción, actualiza:

1. **Site URL**:
   ```
   https://tu-dominio.vercel.app
   ```

2. **Redirect URLs**:
   ```
   https://tu-dominio.vercel.app/**
   https://tu-dominio.vercel.app/auth/callback
   ```

3. **Variable de entorno en Vercel**:
   ```
   NEXT_PUBLIC_SITE_URL=https://tu-dominio.vercel.app
   ```

---

## 📞 Si Sigue Sin Funcionar

1. **Captura de pantalla** del dashboard de Supabase:
   - URL Configuration
   - Email Templates (Magic Link y Confirm signup)

2. **Copia el enlace completo** del email

3. **Logs del servidor** cuando haces click

4. **Error exacto** que aparece en pantalla
