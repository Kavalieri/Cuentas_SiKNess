# 📋 Configuración OAuth Google - URLs Autorizadas

## ⚙️ URLs que DEBEN estar configuradas en Google Console

Para que el sistema OAuth funcione correctamente desde todos los entornos, configura estas URLs en:
**Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs**

### 🔗 **Authorized redirect URIs**

```
http://localhost:3000/auth/google/callback
http://localhost:3001/auth/google/callback
https://cuentasdev.sikwow.com/auth/google/callback
https://cuentas.sikwow.com/auth/google/callback
```

### 🌐 **Authorized JavaScript origins**

```
http://localhost:3000
http://localhost:3001
https://cuentasdev.sikwow.com
https://cuentas.sikwow.com
```

## 🔄 **Sistema Dinámico Implementado**

### ✅ **Cambios Realizados:**

1. **Eliminada variable `GOOGLE_REDIRECT_URI`** de:

   - `.env.development.local`
   - `ecosystem.config.js`
   - `scripts/load-env.js`

2. **Sistema completamente dinámico:**

   - Detección automática de origen por headers
   - `redirect_uri` construido dinámicamente: `${origin}/auth/google/callback`
   - Funciona desde cualquier dominio sin configuración adicional

3. **Lógica de detección mejorada:**
   - Prioridad 1: Headers del proxy Apache (`x-forwarded-host` + `x-forwarded-proto`)
   - Prioridad 2: Headers directos (`host`)
   - Prioridad 3: URL del request (`request.nextUrl.origin`)

### 🧹 **Beneficios de la limpieza:**

- ❌ **Eliminados elementos conflictivos**: Variables estáticas que contradecían lógica dinámica
- ✅ **Sistema consistente**: Misma lógica en `/auth/google/route.ts` y `/auth/google/callback/route.ts`
- ✅ **Sin variables innecesarias**: PM2 no pasa `GOOGLE_REDIRECT_URI` porque no se usa
- ✅ **Funciona automáticamente**: Desde localhost, desarrollo y producción sin cambios

## 🚀 **Testing**

Después de aplicar estos cambios:

1. **Reiniciar PM2** para cargar nueva configuración:

   ```bash
   ./scripts/pm2-start.sh dev   # Puerto 3001
   ./scripts/pm2-start.sh prod  # Puerto 3000
   ```

2. **Probar OAuth desde**:

   - `http://localhost:3000/auth/google` (Producción local)
   - `http://localhost:3001/auth/google` (Desarrollo local)
   - `https://cuentasdev.sikwow.com/auth/google` (Desarrollo remoto)
   - `https://cuentas.sikwow.com/auth/google` (Producción remoto)

3. **Verificar logs** para confirmar URLs detectadas correctamente

## ⚠️ **CRÍTICO: Google Console**

**ASEGÚRATE** de que las 4 redirect URIs estén configuradas en Google Console, sino los requests fallarán con error `redirect_uri_mismatch`:

- ✅ `http://localhost:3000/auth/google/callback` (Producción local)
- ✅ `http://localhost:3001/auth/google/callback` (Desarrollo local)
- ✅ `https://cuentasdev.sikwow.com/auth/google/callback` (Desarrollo remoto)
- ✅ `https://cuentas.sikwow.com/auth/google/callback` (Producción remoto)
