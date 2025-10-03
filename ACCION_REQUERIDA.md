# 🚨 ACCIÓN REQUERIDA: Configurar Supabase Dashboard

## Problema Identificado

El magic link que recibes va a la URL antigua de Supabase:
```
https://fizxvvtakvmmeflmbwud.supabase.co/auth/v1/verify?token=pkce_...
```

Esto hace que el enlace expire inmediatamente. **Necesitas configurar Supabase Dashboard**.

---

## ✅ Fixes Aplicados en el Código

### 1. Build Corregido
- ✅ Error de TypeScript en auth callback resuelto
- ✅ Build pasa sin errores

### 2. Middleware Corregido
- ✅ Ahora usa `profile_id` en lugar de `user_id`
- ✅ Usuarios nuevos sin household → redirigen a `/app/onboarding`

### 3. Flujo de Onboarding
- ✅ Página de onboarding existe
- ✅ Permite crear hogar o aceptar invitación

---

## 🔧 PASOS OBLIGATORIOS EN SUPABASE

### Paso 1: URL Configuration

1. **Abre**: https://supabase.com/dashboard/project/fizxvvtakvmmeflmbwud/auth/url-configuration

2. **Site URL** - Cambiar a:
   ```
   http://localhost:3000
   ```

3. **Redirect URLs** - Agregar (una por línea):
   ```
   http://localhost:3000/**
   http://localhost:3000/auth/callback
   ```

4. **Guardar**

### Paso 2: Email Templates

1. **Abre**: https://supabase.com/dashboard/project/fizxvvtakvmmeflmbwud/auth/templates

2. **Template "Magic Link"** - Reemplazar por:
   ```html
   <h2>Magic Link</h2>
   <p>Follow this link to login:</p>
   <p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink">Log In</a></p>
   ```

3. **Template "Confirm signup"** - Reemplazar por:
   ```html
   <h2>Confirm your signup</h2>
   <p>Follow this link to confirm your account:</p>
   <p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup">Confirm your email address</a></p>
   ```

4. **Guardar ambos**

---

## 🧪 Después de Configurar

### 1. Reiniciar el servidor
```bash
# Presiona Ctrl+C en el terminal donde corre npm run dev
npm run dev
```

### 2. Limpiar cache del navegador
- Chrome/Edge: `Ctrl + Shift + Delete`
- Borrar cookies y cache

### 3. Solicitar NUEVO magic link
- Ve a http://localhost:3000/login
- Ingresa tu email
- Espera el email (1-2 min)

### 4. Verificar el enlace
El enlace debería verse así:
```
http://localhost:3000/auth/callback?token_hash=xxxxx&type=magiclink
```

**NO** así:
```
https://fizxvvtakvmmeflmbwud.supabase.co/auth/v1/verify?token=pkce_...
```

---

## 🎯 Flujo Esperado para Usuario Nuevo

1. **Login**: Ingresas email → Recibes magic link
2. **Click enlace**: Te autenticas exitosamente
3. **Onboarding**: Redirige a `/app/onboarding`
4. **Elegir opción**:
   - "Crear un Hogar Nuevo" → Creas tu hogar
   - "Usar un Código de Invitación" → Te unes a hogar existente
5. **Dashboard**: Redirige a `/app` con tu household activo

---

## 📊 Commits Realizados

- **6c5d202**: Fix TypeScript + Middleware + Config guide
- **Build**: ✅ PASSING
- **Estado**: Código listo, falta configurar Supabase Dashboard

---

## 📁 Documentación

Ver guía completa: `docs/SUPABASE_MAGIC_LINK_CONFIG.md`

---

## ⚠️ Importante

- NO puedes reutilizar enlaces antiguos (expiran en 1 hora y son de un solo uso)
- Después de configurar Supabase, espera 1-2 minutos antes de solicitar nuevo link
- Si el problema persiste, verifica que guardaste los cambios en todos los templates

---

## 🆘 Si Sigue Sin Funcionar

1. Captura de pantalla del:
   - Dashboard URL Configuration
   - Email Templates (Magic Link y Confirm signup)

2. Copia el enlace completo que recibes en el email

3. Comparte los logs del servidor cuando haces click en el enlace
