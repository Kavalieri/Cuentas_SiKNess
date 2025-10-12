# Autenticación por Gmail - Setup OAuth 2.0

## 📋 Configuración en Google Cloud Console

### 1. Crear Proyecto

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google+ API (necesaria para obtener perfil)

### 2. Configurar OAuth Consent Screen

1. Ve a "APIs & Services" → "OAuth consent screen"
2. Elige "External" (para usuarios externos)
3. Completa la información:
   - **App name**: CuentasSiK
   - **User support email**: tu-email@ejemplo.com
   - **Developer contact**: tu-email@ejemplo.com
4. En "Scopes", añade: `openid`, `email`, `profile`
5. Añade usuarios de prueba si es necesario

### 3. Crear Credenciales OAuth 2.0

1. Ve a "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Configura:
   - **Application type**: Web application
   - **Name**: CuentasSiK OAuth
   - **Authorized JavaScript origins**: `http://localhost:3001`, `https://tu-dominio.com`
   - **Authorized redirect URIs**:
     - Desarrollo: `http://localhost:3001/auth/google/callback`
     - Producción: `https://tu-dominio.com/auth/google/callback`

### 4. Obtener Credenciales

Después de crear, obtendrás:

- **Client ID**: `tu-client-id.apps.googleusercontent.com`
- **Client Secret**: `tu-client-secret`

## 🔧 Variables de Entorno

Añade estas variables a tus archivos `.env`:

### Desarrollo (.env.development.local)

```bash
# Google OAuth
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
```

### Producción (.env.production.local)

```bash
# Google OAuth
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
GOOGLE_REDIRECT_URI=https://tu-dominio.com/auth/google/callback
```

## 🔄 Flujo OAuth

1. **Usuario clickea "Continuar con Google"**
2. **Redirect a Google** con scopes: `openid email profile`
3. **Usuario autoriza** la aplicación
4. **Google redirect** a `/auth/google/callback` con `code`
5. **Intercambio code por tokens** (access_token, id_token)
6. **Decodificar id_token** para obtener información del usuario
7. **Crear/actualizar usuario** en base de datos
8. **Crear sesión** y redirect al dashboard

## 🛡️ Seguridad

- **State parameter**: Protección CSRF con parámetro `state`
- **PKCE**: No implementado (opcional para web apps)
- **HTTPS**: Obligatorio en producción
- **Token validation**: Verificación de firma y expiración

## 📝 Notas de Implementación

- **Scopes mínimos**: `openid email profile` (suficiente para autenticación)
- **Token storage**: Solo almacenamos sesión JWT propia, no tokens de Google
- **User creation**: Automática si el email no existe
- **Profile sync**: Actualización automática de avatar y nombre

## 🐛 Troubleshooting

### Error: redirect_uri_mismatch

- Verifica que las URIs autorizadas en Google Console coincidan exactamente
- Incluye protocolo (http/https) y puerto si es necesario

### Error: invalid_client

- Verifica GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET
- Asegúrate de que las credenciales no tengan espacios extra

### Error: access_denied

- El usuario canceló la autorización
- Redirigir de vuelta al login con mensaje apropiado

### Error: invalid_grant

- El código de autorización expiró (10 minutos)
- El código ya fue usado
- Redirigir al login para reintentar
