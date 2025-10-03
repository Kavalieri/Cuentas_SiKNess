# Fixes Críticos del Sistema de Invitaciones y Múltiples Hogares
**Fecha**: 3 de octubre de 2025  
**Commit**: c72d68a

## 🐛 Problemas Reportados y Soluciones

### 1. Error SQL: "column reference household_id is ambiguous"

**Problema**: Al aceptar una invitación, se producía un error SQL debido a ambigüedad en el nombre de columna.

**Causa**: La función `accept_invitation()` retornaba una columna llamada `household_id` y también la usaba internamente en queries con joins, causando ambigüedad.

**Solución**:
- Migración: `20251003200000_fix_accept_invitation_ambiguous.sql`
- Renombrar variables internas a `v_result_household_id` y `v_result_household_name`
- Usar alias explícitos en todas las subqueries (`hm.household_id`, `hm.user_id`)
- Añadir `household_name` al retorno de la función

**Código**:
```sql
create or replace function accept_invitation(p_token text)
returns table(
  success boolean,
  message text,
  household_id uuid,
  household_name text  -- NUEVO
)
```

---

### 2. Nombre del usuario invitador no se muestra

**Problema**: En la vista de invitación, el email del invitador estaba hardcodeado como "Usuario de CuentasSiK".

**Causa**: El código no consultaba la tabla `auth.users` para obtener el email real del invitador.

**Solución**:
- Usar `supabaseAdmin.auth.admin.getUserById()` para obtener el email del invitador
- Implementar en `getInvitationDetails()` y `getUserPendingInvitations()`

**Código**:
```typescript
// Obtener email del invitador
if (invitation.invited_by) {
  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(
    invitation.invited_by
  );
  if (userData?.user?.email) {
    invitedByEmail = userData.user.email;
  }
}
```

---

### 3. Rol del perfil incorrecto (global en lugar de por hogar)

**Problema**: El perfil mostraba un solo "rol en el hogar", cuando un usuario puede ser owner en un hogar y member en otro.

**Causa**: La UI asumía un solo hogar con un solo rol.

**Solución**:
- Crear componente `HouseholdsList.tsx` que muestra TODOS los hogares del usuario
- Mostrar rol individual con iconos:
  - 👑 **Crown** (amarillo) para `owner`
  - 👥 **Users** (azul) para `member`
- Badge "Activo" para el hogar actualmente seleccionado
- Fecha de creación para cada hogar

**UI**:
```
🏠 Mis Hogares
┌─────────────────────────────────┐
│ 👑 Casa Familiar        [Activo]│
│ Propietario · Desde oct. 2025   │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ 👥 Oficina                       │
│ Miembro · Desde oct. 2025       │
└─────────────────────────────────┘
```

---

### 4. Invitaciones perdidas al cerrar la página

**Problema**: Si el usuario cerraba la página de invitación, perdía acceso a ella permanentemente.

**Causa**: Las invitaciones solo se mostraban desde una cookie temporal.

**Solución**:
- Crear `getUserPendingInvitations()` que consulta la DB por email del usuario
- Mostrar invitaciones pendientes en el **Dashboard** con `PendingInvitationsCard`
- Las invitaciones persisten hasta que el usuario las acepte o rechace
- Acceso permanente desde cualquier sesión

**Funcionalidad**:
```typescript
// Obtener invitaciones del usuario por email
const { data } = await supabase
  .from('invitations')
  .select('...')
  .eq('email', user.email)
  .eq('status', 'pending')
  .gt('expires_at', now());
```

**UI en Dashboard**:
```
📧 Invitaciones Pendientes
┌─────────────────────────────────┐
│ Casa Familiar                    │
│ Invitado por juan@example.com   │
│ 🕒 Expira el 10 de octubre 2025 │
│ [✓ Aceptar] [✗ Rechazar]        │
└─────────────────────────────────┘
```

---

## 📦 Nuevos Componentes

### `PendingInvitationsCard.tsx`
- Muestra todas las invitaciones pendientes del usuario
- Botones Aceptar/Rechazar
- Información: hogar, invitador, fecha de expiración
- Mensaje personalizado si existe

### `HouseholdsList.tsx`
- Lista todos los hogares del usuario
- Iconos por rol (Crown/Users)
- Badge "Activo" para el hogar actual
- Información de fecha de creación

---

## 🔄 Funciones Nuevas

### `getUserPendingInvitations()`
**Ubicación**: `app/app/household/invitations/actions.ts`

**Propósito**: Obtener todas las invitaciones pendientes del usuario desde la base de datos.

**Lógica**:
1. Obtener email del usuario actual
2. Buscar invitaciones con `status='pending'` y `email=user.email`
3. Filtrar por `expires_at > now()`
4. Para cada invitación, obtener email del invitador desde `auth.users`
5. Retornar array de `InvitationDetails`

**Retorno**:
```typescript
Result<InvitationDetails[]>
```

---

## 📊 Cambios en el Dashboard

**Antes**:
```
Dashboard
├─ Resumen mensual
├─ Gastos/Ingresos
└─ Últimos movimientos
```

**Después**:
```
Dashboard
├─ 📧 Invitaciones Pendientes (si existen)  ⭐ NEW
├─ Resumen mensual
├─ Gastos/Ingresos
└─ Últimos movimientos
```

---

## 📊 Cambios en el Perfil

**Antes**:
```
Información Básica
├─ Email: user@example.com
└─ Rol en el Hogar: 👑 Propietario

💰 Ingresos Mensuales
└─ 1500€
```

**Después**:
```
Información Básica
└─ Email: user@example.com

🏠 Mis Hogares                              ⭐ NEW
├─ 👑 Casa Familiar [Activo]
│  └─ Propietario · Desde oct. 2025
└─ 👥 Oficina
   └─ Miembro · Desde sept. 2025

💰 Ingresos Mensuales
└─ 1500€ (del hogar activo)
```

---

## 🗄️ Migraciones Aplicadas

### 1. `20251003180000_fix_invitations_rls.sql`
- Fix RLS policies para permitir lectura pública de invitaciones
- Seguro porque el token es secreto (64 caracteres hex = 2^256)

### 2. `20251003190000_add_user_settings.sql`
- Crear tabla `user_settings` para rastrear hogar activo
- Migración de datos: asignar primer hogar a usuarios existentes
- RLS: usuarios solo ven sus propios settings

### 3. `20251003200000_fix_accept_invitation_ambiguous.sql` ⭐ NEW
- Fix ambigüedad en `accept_invitation()`
- Retornar `household_name` además de `household_id`
- Variables internas con nombres explícitos

---

## ✅ Testing Manual Requerido

### Test 1: Aceptar Invitación
1. Crear invitación desde Usuario A
2. Abrir link como Usuario B
3. ✅ Ver email real de Usuario A (no "Usuario de CuentasSiK")
4. Aceptar invitación
5. ✅ No error "column reference ambiguous"
6. ✅ Usuario B añadido al hogar
7. ✅ Hogar se activa automáticamente

### Test 2: Invitaciones Persistentes
1. Crear invitación para usuario@example.com
2. Cerrar navegador/página
3. Login como usuario@example.com
4. Ir al Dashboard
5. ✅ Invitación aparece en "Invitaciones Pendientes"
6. Poder aceptar o rechazar desde allí

### Test 3: Perfil Multi-Hogar
1. Usuario pertenece a 2+ hogares con diferentes roles
2. Ir a `/app/profile`
3. ✅ Ver lista de TODOS los hogares
4. ✅ Cada hogar muestra rol correcto (Crown/Users)
5. ✅ Hogar activo tiene badge "Activo"
6. ✅ Fechas de creación visibles

### Test 4: Rechazar Invitación
1. Tener invitación pendiente en dashboard
2. Click "Rechazar"
3. ✅ Invitación cambia a status='cancelled'
4. ✅ Desaparece del dashboard
5. ✅ No se puede volver a ver (está cancelada)

---

## 📚 Documentación Actualizada

- ✅ `README.md`: Añadido sistema de múltiples hogares
- ✅ `.github/copilot-instructions.md`: Documentado funciones y patrones
- ✅ `docs/MULTI_HOUSEHOLD_IMPLEMENTATION_COMPLETE.md`: Guía completa

---

## 🚀 Deploy

**Status**: ✅ Cambios pusheados a `main`  
**Build**: ✅ Exitoso (23 páginas)  
**Vercel**: Auto-deploy activado  
**Supabase**: Migraciones aplicadas ✅

---

## 🔍 Próximos Pasos

1. Testing manual de todos los flujos
2. Verificar que el nombre del invitador se muestra correctamente
3. Confirmar que las invitaciones persisten en el dashboard
4. Validar que el perfil muestra todos los hogares con roles correctos
5. Probar flujo completo de aceptar/rechazar desde dashboard
