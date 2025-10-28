# Fix Completo: Invitations Acceptance Flow

**Fecha**: 14 Enero 2025  
**Commits**: c203b58, ad006e3  
**Estado**: ✅ COMPLETADO - Listo para testing end-to-end

---

## 📋 Problema Original

Usuario "fumetas.sik" intentó aceptar invitación de Sara. Resultado:

- ❌ Perfil temporal creado pero invitación NO aceptada
- ❌ Error "email_belongs_to_another_user" en retry
- ❌ Invitación quedó en estado `pending`
- ❌ Email NO añadido a profile_emails de Sara

**Causa raíz**: Uso incorrecto de campos en queries (currentUser.id vs currentUser.profile_id)

---

## 🔧 Estructura de User Object

**CRÍTICO**: Entender diferencia entre `id` y `profile_id`:

```typescript
interface User {
  id: string;              // auth_user_id (UUID para compatibilidad)
  profile_id: string;      // profiles.id (PK - USAR PARA FKs)
  auth_user_id: string;    // alias de id
  email: string;           // profiles.email (primario)
  loginEmail: string;      // email usado en login (puede ser secundario)
}
```

**REGLA**: Siempre usar `currentUser.profile_id` para queries con FKs, NUNCA `currentUser.id`

---

## 🎯 Cambios Implementados (Commit ad006e3)

### 1. Corrección de Referencias de Campos

**Archivo**: `app/api/auth/accept-email-invitation/[token]/route.ts`

```diff
// ANTES (INCORRECTO):
-[invitation.invited_email, currentUser.id]
+[invitation.invited_email, currentUser.profile_id]

// Líneas afectadas:
// - 137: Validación profiles check
// - 175: UPDATE invitation.accepted_by_profile_id
// - 186: SELECT household_members WHERE profile_id = ...
// - 197: UPDATE profiles SET deleted_at WHERE id = ...
```

### 2. Validación de Email con loginEmail

```typescript
// ANTES: currentUser.email !== invitation.invited_email
// AHORA: currentUser.loginEmail !== invitation.invited_email

// Razón: Soporta login con emails secundarios después de aceptar invitación
```

### 3. Filtro de Perfiles Eliminados

```sql
-- ANTES:
SELECT id FROM profiles WHERE email = $1 AND id != $2

-- AHORA:
SELECT id FROM profiles WHERE email = $1 AND id != $2 AND deleted_at IS NULL
```

**Beneficio**: Permite reutilizar email después de soft delete

### 4. Validación de Inviter

**Nueva validación** para prevenir que inviter comparta su propio email primario:

```typescript
const inviterProfileResult = await query<{ email: string }>(
  `SELECT email FROM profiles WHERE id = $1`,
  [invitation.profile_id]
);

const inviterEmail = inviterProfileResult.rows[0]?.email;

if (inviterEmail === invitation.invited_email) {
  return NextResponse.redirect(
    new URL('/configuracion/perfil?error=cannot_share_own_primary_email', origin)
  );
}
```

### 5. Corrección de Cookie Name

```diff
-response.cookies.delete('auth_token');
+response.cookies.delete(SESSION_COOKIE_NAME);

// Importado desde:
import { getCurrentUser, SESSION_COOKIE_NAME } from '@/lib/auth';
```

### 6. OAuth Multi-Email Support

**Archivo**: `lib/auth.ts`, función `authenticateWithGoogle()`

```typescript
// ANTES: Solo buscaba en profiles.email
const userResult = await query<ProfileRow>(
  `SELECT * FROM profiles WHERE email = $1 LIMIT 1`,
  [userInfo.email]
);

// AHORA: Busca en profiles.email Y profile_emails.email
const userResult = await query<ProfileRow>(
  `SELECT p.* FROM profiles p
   LEFT JOIN profile_emails pe ON pe.profile_id = p.id AND pe.email = $1
   WHERE (p.email = $1 OR pe.email = $1) AND p.deleted_at IS NULL
   LIMIT 1`,
  [userInfo.email]
);
```

**Beneficio**: Permite re-login con email secundario después de aceptar invitación

---

## 📊 Flujo Completo Corregido

### Paso 1: Aceptación de Invitación

```
1. fumetas.sik abre URL → /login?invitation=TOKEN
2. Click Google OAuth → crea perfil temporal fumetas
3. Callback → redirect a /api/auth/accept-email-invitation/TOKEN
4. Validaciones (TODAS CORREGIDAS):
   ✅ loginEmail === invited_email
   ✅ Email NO en profile_emails (no compartido ya)
   ✅ Email NO en profiles activos de otro usuario (deleted_at IS NULL)
   ✅ Inviter NO comparte su propio email
5. Ejecución:
   - INSERT profile_emails (Sara + fumetas.sik, verified=true)
   - UPDATE invitation (status=accepted, accepted_by_profile_id=fumetas.profile_id)
   - SELECT household_members (fumetas.profile_id) → NO household
   - UPDATE profiles SET deleted_at=NOW() WHERE id=fumetas.profile_id
   - DELETE SESSION_COOKIE_NAME
   - REDIRECT /login?invitation_accepted=true&email=fumetas.sik@gmail.com
```

### Paso 2: Re-login con Email Secundario

```
6. fumetas.sik click Google OAuth (segunda vez)
7. authenticateWithGoogle():
   - Busca fumetas.sik en profiles.email → NOT FOUND (perfil eliminado)
   - Busca fumetas.sik en profile_emails → ✅ FOUND (vinculado a Sara)
   - profile_id → obtiene perfil de Sara
   - Crea sesión con:
     * currentUser.id = Sara.auth_user_id
     * currentUser.profile_id = Sara.id
     * currentUser.email = Sara.email (primario)
     * currentUser.loginEmail = fumetas.sik@gmail.com (login usado)
8. REDIRECT /sickness → Acceso completo a datos de Sara
```

---

## 🧹 Script de Limpieza

**Archivo**: `scripts/clean_invitation_test.sql`

```sql
-- 1. Eliminar perfil temporal sin household
DELETE FROM profiles 
WHERE email = 'fumetas.sik@gmail.com'
  AND id NOT IN (SELECT profile_id FROM household_members);

-- 2. Resetear invitación a pending (si no está ya)
UPDATE email_invitations 
SET status = 'pending',
    accepted_at = NULL,
    accepted_by_profile_id = NULL
WHERE invited_email = 'fumetas.sik@gmail.com';

-- 3. Eliminar email de profile_emails (si existe)
DELETE FROM profile_emails 
WHERE email = 'fumetas.sik@gmail.com';

-- 4. Verificar estado final
SELECT * FROM profiles WHERE email = 'fumetas.sik@gmail.com';
SELECT * FROM profile_emails WHERE email = 'fumetas.sik@gmail.com';
SELECT id, token, status, invited_email, expires_at 
FROM email_invitations 
WHERE invited_email = 'fumetas.sik@gmail.com';
```

**Resultado de ejecución**:
- DELETE 1 (perfil fumetas eliminado)
- UPDATE 0 (invitación ya estaba en pending)
- DELETE 0 (no había profile_emails)
- Estado limpio y listo para retry

---

## ✅ Edge Cases Manejados

1. **Perfil temporal sin household**  
   → Eliminado después de aceptar + invalidación de sesión

2. **Perfiles eliminados (soft delete)**  
   → Excluidos de validación "belongs to another user"

3. **Login con email secundario**  
   → Validación usa `loginEmail` en vez de `email`

4. **Inviter comparte su propio email**  
   → Error explícito `cannot_share_own_primary_email`

5. **Email ya compartido**  
   → Verificado primero en profile_emails

6. **Confusión profile_id vs id**  
   → Todas las queries usan `profile_id` correctamente

7. **Cookie de sesión**  
   → Usa constante `SESSION_COOKIE_NAME`

---

## 📝 Checklist de Testing

### Pre-requisitos
- [ ] Base de datos limpia (script ejecutado)
- [ ] Invitación válida (token: 81944351-0627-47cb-8aed-07181a56d040)
- [ ] Sesión cerrada (logout completo)

### Flujo OAuth
- [ ] Abrir URL invitación → redirect a /login?invitation=TOKEN
- [ ] Click "Continuar con Google"
- [ ] Autenticar con fumetas.sik@gmail.com
- [ ] Perfil temporal fumetas creado
- [ ] Redirect a accept-email-invitation
- [ ] Validaciones pasan (loginEmail, profile_emails, profiles, inviter)
- [ ] Email añadido a Sara's profile_emails (verified=true)
- [ ] Invitación marcada como accepted
- [ ] Perfil fumetas soft deleted (deleted_at NOT NULL)
- [ ] Cookie de sesión eliminada
- [ ] Redirect a /login?invitation_accepted=true&email=...

### Re-login
- [ ] Click "Continuar con Google" (segunda vez)
- [ ] Autenticar con fumetas.sik@gmail.com
- [ ] authenticateWithGoogle() encuentra email en profile_emails
- [ ] Login como Sara exitoso
- [ ] currentUser.email = Sara's primary email
- [ ] currentUser.loginEmail = fumetas.sik@gmail.com
- [ ] Redirect a /sickness
- [ ] Acceso completo a datos de Sara

### Verificación DB
```sql
-- Debe mostrar fumetas.sik vinculado a Sara
SELECT pe.*, p.display_name 
FROM profile_emails pe
JOIN profiles p ON p.id = pe.profile_id
WHERE pe.email = 'fumetas.sik@gmail.com';

-- Debe estar accepted
SELECT status, accepted_at, accepted_by_profile_id
FROM email_invitations
WHERE token = '81944351-0627-47cb-8aed-07181a56d040';

-- Debe tener deleted_at
SELECT id, email, deleted_at
FROM profiles
WHERE email = 'fumetas.sik@gmail.com';
```

---

## 🎯 Próximos Pasos

1. **Test end-to-end** (PRIORITARIO)
   - Usuario real abre invitación con fumetas.sik
   - Verificar cada paso del flujo
   - Confirmar queries DB correctas

2. **Limpiar debug code** (después de test exitoso)
   - Remover alert() de login/page.tsx
   - Remover console.logs innecesarios
   - Commit: "chore(login): remove debug code"

3. **Test Magic Link** (después de OAuth)
   - Mismo flujo pero con enlace mágico
   - Verificar redirectUrl parameter funciona

4. **Test otros edge cases**
   - Usuario con household acepta (no debe eliminar perfil)
   - Account deleted re-invitation
   - Email ya compartido
   - Inviter comparte propio email

---

## 📚 Referencias

- **Commit inicial**: c203b58 (fix validation "email_already_exists")
- **Commit completo**: ad006e3 (fix all field usage + edge cases)
- **Script limpieza**: scripts/clean_invitation_test.sql
- **Endpoint**: app/api/auth/accept-email-invitation/[token]/route.ts
- **OAuth**: lib/auth.ts (authenticateWithGoogle)

---

**Estado actual**: ✅ Código corregido, DB limpia, listo para testing completo
