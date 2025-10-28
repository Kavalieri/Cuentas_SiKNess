# Sistema Multi-Email de CuentasSiK

**Fecha**: 28 Octubre 2025
**Estado**: ✅ PRODUCCIÓN
**Versión**: 1.1.0

---

## 📋 Descripción General

Sistema completo de autenticación multi-email que permite a los usuarios:
- Compartir acceso a su cuenta con múltiples direcciones de email
- Invitar emails secundarios mediante URLs únicas
- Autenticarse con cualquiera de sus emails vinculados (OAuth Google o Magic Link)
- Mantener un único perfil con múltiples identidades de acceso

---

## 🏗️ Arquitectura

### Tabla Principal: `profile_emails`

```sql
CREATE TABLE profile_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_email_per_profile UNIQUE(profile_id, email),
  CONSTRAINT unique_email_global UNIQUE(email)
);
```

**Características**:
- Un email solo puede pertenecer a un perfil (unique_email_global)
- Un perfil puede tener múltiples emails
- Un solo email marcado como `is_primary = true` por perfil
- `CASCADE DELETE`: Si se elimina el perfil, se eliminan todos sus emails

### Tabla de Invitaciones: `email_invitations`

```sql
CREATE TABLE email_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, accepted, expired, cancelled
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by_profile_id UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Características**:
- Token único generado con `crypto.randomUUID()`
- Expiración configurable (por defecto 7 días)
- Metadata JSONB para información adicional (source, ip, etc.)
- Constraint único: Un email solo puede tener una invitación pendiente por perfil

---

## 🔐 Flujo de Autenticación

### 1. Login con Email Primario (Flujo Normal)
```
Usuario → OAuth Google/Magic Link → profiles.email match
→ Session creada con user.email = profiles.email
→ Redirect a dashboard
```

### 2. Login con Email Secundario
```
Usuario → OAuth Google/Magic Link → profile_emails.email match
→ Cargar perfil completo por profile_id
→ Session creada con:
   - user.email = profiles.email (primary)
   - user.loginEmail = profile_emails.email (actual login)
→ Redirect a dashboard
```

### Función: `getCurrentUser()`
```typescript
// lib/auth.ts
export async function getCurrentUser(): Promise<User | null> {
  const payload = await verifySession();
  if (!payload?.email) return null;

  const result = await query<ProfileRow>(
    `SELECT
      p.id, p.auth_user_id, p.display_name, p.email, p.avatar_url,
      p.bio, p.created_at, p.updated_at,
      $1 as login_email
    FROM profiles p
    LEFT JOIN profile_emails pe ON pe.profile_id = p.id AND pe.email = $1
    WHERE (p.email = $1 OR pe.email = $1) AND p.deleted_at IS NULL
    LIMIT 1`,
    [payload.email],
  );

  // Retorna perfil con loginEmail = email usado en login
  // y email = primaryEmail del perfil
}
```

---

## 📧 Flujo de Invitación

### Paso 1: Generar Invitación
```typescript
// app/configuracion/perfil/email-actions.ts
const result = await generateEmailInvitation(email);
// Retorna: { ok: true, data: { token, url, expiresAt } }
```

**URL generada**: `https://cuentasdev.sikwow.com/login?invitation=TOKEN`

### Paso 2: Usuario Receptor Abre URL
1. **Sin login**: Redirect a `/login?invitation=TOKEN`
2. **Ya logueado**: Redirect directo a `/api/auth/accept-email-invitation/TOKEN`

### Paso 3: Autenticación con OAuth/Magic Link
- OAuth Google: Pasa `invitation=TOKEN` en `state` parameter
- Magic Link: Incluye `invitation=TOKEN` en `redirectUrl`

### Paso 4: Callback de Autenticación
```typescript
// app/api/auth/callback/route.ts o app/api/auth/verify/route.ts
if (invitationToken) {
  return NextResponse.redirect(
    `${origin}/api/auth/accept-email-invitation/${invitationToken}`
  );
}
```

### Paso 5: Validación y Aceptación
```typescript
// app/api/auth/accept-email-invitation/[token]/route.ts

// 1. Validar token y expiración
const invitation = await query(...);
if (!invitation || invitation.status !== 'pending') {
  return error response;
}

// 2. Validar ownership del email
const sessionUser = await getCurrentUser();
if (sessionUser.loginEmail !== invitation.invited_email) {
  return error('email_mismatch');
}

// 3. Verificar que email no esté en uso
const existingEmail = await query('profile_emails', ...);
if (existingEmail) return error('email_already_in_use');

// 4. Insertar en profile_emails
await query(`
  INSERT INTO profile_emails (profile_id, email, verified_at)
  VALUES ($1, $2, NOW())
`, [invitation.profile_id, invitation.invited_email]);

// 5. Actualizar invitación a 'accepted'
await query(`UPDATE email_invitations SET status = 'accepted' ...`);

// 6. Si es perfil temporal sin household → Eliminar
if (userHasNoHousehold) {
  await query(`DELETE FROM profiles WHERE id = $1`, [sessionUser.profile_id]);
}

// 7. Invalidar sesión actual
cookies().delete(SESSION_COOKIE_NAME);

// 8. Redirect a re-login
return NextResponse.redirect('/login?invitation_accepted=true');
```

### Paso 6: Re-login del Usuario
- Usuario se autentica nuevamente con el email invitado
- `getCurrentUser()` encuentra el email en `profile_emails`
- Carga el perfil del invitador (no el temporal eliminado)
- Session creada con `loginEmail = email invitado` y `email = primaryEmail del invitador`

---

## 🛡️ Validaciones y Seguridad

### 1. Validaciones en `generateEmailInvitation()`
- ✅ Email no puede ser el primario del invitador
- ✅ Email no puede ya estar en `profile_emails`
- ✅ Email no puede ya estar en `profiles.email` (otro usuario activo)
- ✅ Solo una invitación pendiente por email

### 2. Validaciones en Accept Endpoint
- ✅ Token válido y no expirado
- ✅ Status = 'pending'
- ✅ Usuario actual es dueño del email invitado (`loginEmail === invited_email`)
- ✅ Email no ha sido añadido a otro perfil mientras tanto
- ✅ Perfil invitador no ha sido eliminado (soft delete check)

### 3. Protección contra Race Conditions
- Unique constraints en BD evitan duplicados
- Transacciones atómicas para operaciones críticas
- Validación de ownership en el momento exacto de aceptación

### 4. Cleanup de Perfiles Temporales
- Perfiles sin `household_members` se consideran temporales
- Se eliminan **después** de insertar email en `profile_emails`
- Session invalidada para forzar re-login con perfil correcto

---

## 🔄 Casos de Uso

### Caso 1: Pareja Compartiendo Cuenta
```
Sara (getrecek@gmail.com) → Invita → fumetas.sik@gmail.com
1. Sara genera invitación
2. Comparte URL con Kava
3. Kava abre URL, hace login con Google (fumetas.sik)
4. Sistema crea perfil temporal para fumetas.sik
5. Callback redirect a accept-email-invitation
6. Validaciones pasan
7. fumetas.sik añadido a profile_emails de Sara
8. Perfil temporal eliminado
9. Kava re-login → Ahora accede como Sara con loginEmail=fumetas.sik
```

### Caso 2: Usuario con Múltiples Emails Personales
```
Usuario principal: juan@personal.com
Invita: juan.trabajo@empresa.com

Resultado:
- Puede hacer login con juan@personal.com O juan.trabajo@empresa.com
- Ambos acceden al mismo perfil
- Mismo household, mismas transacciones, mismos permisos
```

### Caso 3: Invitación Rechazada/Expirada
```
1. Usuario recibe invitación
2. No la acepta durante 7 días
3. Token expira (expires_at < NOW())
4. Intento de acceso → Error "invitation_expired"
5. Invitador debe generar nueva invitación
```

---

## 📊 Estructura de Usuario en Session

```typescript
interface User {
  profile_id: string;          // UUID del perfil real
  auth_user_id: string | null; // UUID de auth (si aplica)
  display_name: string | null;
  email: string;               // PRIMARY email del perfil
  loginEmail: string;          // Email usado en este login específico
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}
```

**Importante**:
- `email` siempre es el email primario del perfil (`profiles.email`)
- `loginEmail` es el email específico usado para autenticarse
- Para verificar permisos de gestión de emails: `user.loginEmail === user.email` (es el owner)

---

## 🧪 Testing y Debugging

### Script de Limpieza (Testing)
```sql
-- Eliminar perfil temporal sin household
DELETE FROM profiles
WHERE email = 'fumetas.sik@gmail.com'
  AND id NOT IN (SELECT profile_id FROM household_members);

-- Resetear invitación a pending
UPDATE email_invitations
SET status = 'pending',
    accepted_at = NULL,
    accepted_by_profile_id = NULL
WHERE invited_email = 'fumetas.sik@gmail.com';

-- Eliminar email de profile_emails
DELETE FROM profile_emails
WHERE email = 'fumetas.sik@gmail.com';

-- Verificar estado
SELECT * FROM profiles WHERE email = 'fumetas.sik@gmail.com';
SELECT * FROM profile_emails WHERE email = 'fumetas.sik@gmail.com';
SELECT * FROM email_invitations WHERE invited_email = 'fumetas.sik@gmail.com';
```

### Queries de Verificación
```sql
-- Ver todos los emails de un perfil
SELECT pe.*, p.display_name
FROM profile_emails pe
JOIN profiles p ON p.id = pe.profile_id
WHERE p.email = 'getrecek@gmail.com';

-- Ver invitaciones pendientes
SELECT * FROM email_invitations
WHERE status = 'pending'
  AND expires_at > NOW();

-- Ver perfiles sin household (temporales)
SELECT p.* FROM profiles p
WHERE p.id NOT IN (SELECT profile_id FROM household_members)
  AND p.deleted_at IS NULL;
```

---

## 📚 Migraciones Aplicadas

1. **20241027_000000_create_profile_emails.sql**
   - Crea tabla `profile_emails`
   - Añade índices y constraints
   - Trigger de validación `is_primary`

2. **20251028_154704_create_email_invitations.sql**
   - Crea tabla `email_invitations`
   - Índices por status, expires_at, profile_id
   - Constraint único por profile+email pendiente

3. **20251028_164500_fix_soft_delete_and_permissions.sql**
   - Añade `deleted_at` a `profiles`
   - Grants y comentarios de auditoría

4. **20251028_170000_fix_profile_emails_cascade_and_cleanup.sql**
   - Corrige CASCADE DELETE en profile_emails
   - Limpia registros huérfanos

---

## 🚀 Próximos Pasos (Opcional)

### Features Potenciales
- [ ] Permitir al usuario marcar cualquier email como primario
- [ ] Transferir ownership de cuenta (cambiar email primario)
- [ ] Notificaciones por email al aceptar invitación
- [ ] Dashboard de "sesiones activas" por email
- [ ] Revocar acceso de un email específico

### Mejoras de UX
- [ ] Mostrar badge "Acceso compartido" si `loginEmail !== email`
- [ ] Restringir gestión de emails solo al email primario
- [ ] Toast de bienvenida "Ahora accedes como [loginEmail]"

---

## 📖 Referencias

- **Código principal**: `lib/auth.ts`, `app/configuracion/perfil/email-actions.ts`
- **API endpoints**: `app/api/auth/accept-email-invitation/[token]/route.ts`
- **Componentes UI**: `app/configuracion/perfil/page.tsx` (EmailManagementCard)
- **Documentación detallada**: `docs/TO-DO/DONE/INVITATION_ACCEPTANCE_FIX.md`
- **Database schema**: `database/migrations/applied/`

---

**✅ SISTEMA COMPLETAMENTE FUNCIONAL Y TESTEADO**
**🔒 LISTO PARA PRODUCCIÓN**
