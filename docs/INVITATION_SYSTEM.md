# Sistema de Invitaciones

Sistema completo para que los owners de un hogar puedan invitar nuevos miembros mediante links únicos y seguros.

## Características

✅ **Invitaciones por email** - Los owners pueden crear invitaciones ingresando el email del futuro miembro  
✅ **Links únicos y seguros** - Cada invitación genera un token criptográfico único  
✅ **Expiración automática** - Los links expiran en 7 días para mayor seguridad  
✅ **Validaciones completas** - Verifica email, expiración, duplicados y permisos  
✅ **UI intuitiva** - Diálogo para crear, copiar y gestionar invitaciones  
✅ **Lista de pendientes** - Los owners ven las invitaciones que aún no han sido aceptadas  
✅ **Cancelación** - Los owners pueden cancelar invitaciones pendientes  

## Arquitectura

### Base de Datos

**Tabla: `invitations`**
```sql
create table invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  email text not null,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  
  constraint invitations_household_email_pending_key unique (household_id, email, status)
);
```

**Función SQL: `accept_invitation(p_token text)`**
- Valida que el token existe y está pendiente
- Verifica que no ha expirado
- Comprueba que el email del usuario autenticado coincide con la invitación
- Verifica que el usuario no es ya miembro del hogar
- Agrega al usuario como `member` del hogar
- Marca la invitación como `accepted`
- Retorna éxito/error con mensaje descriptivo

### Row Level Security (RLS)

✅ **read_invitations** - Solo owners del household pueden ver sus invitaciones  
✅ **insert_invitations** - Solo owners pueden crear invitaciones  
✅ **update_invitations** - Solo owners pueden cancelar invitaciones  

## Flujo de Uso

### 1. Owner Crea Invitación

**Ubicación**: `/app/household` → Tab "Miembros" → Botón "Invitar Miembro"

1. Click en "Invitar Miembro"
2. Diálogo se abre con input de email
3. Ingresar email del invitado
4. Click "Crear Invitación"
5. Sistema genera token único y guarda en DB
6. Diálogo muestra el link de invitación
7. Owner copia el link y lo envía manualmente (email, WhatsApp, etc.)

**Server Action**: `createInvitation(formData)`
- Valida que el usuario es owner
- Valida formato de email
- Verifica que no hay invitación pendiente duplicada
- Genera token criptográfico (32 bytes hex)
- Calcula fecha de expiración (7 días)
- Inserta en DB
- Retorna token para construir el link

### 2. Invitado Acepta Invitación

**Ubicación**: `/app/invite/[token]`

1. Invitado recibe el link y lo abre
2. Si no está autenticado → Redirige a `/login?returnUrl=/app/invite/[token]`
3. Usuario hace login con su email
4. Vuelve a `/app/invite/[token]` automáticamente
5. Sistema valida el token
6. Si válido → Agrega al usuario como member del hogar
7. Muestra mensaje de éxito con botón para ir al dashboard
8. Si inválido → Muestra error con causas posibles

**Server Action**: `acceptInvitation(token)`
- Verifica que el usuario está autenticado
- Llama a función SQL `accept_invitation(p_token)`
- La función hace todas las validaciones
- Retorna éxito con `householdId` y `householdName`

### 3. Owner Gestiona Invitaciones

**Ubicación**: `/app/household` → Tab "Miembros" → Card "Invitaciones Pendientes"

- Lista visible solo si hay invitaciones pendientes
- Cada invitación muestra:
  - Email del invitado
  - Badge con tiempo restante hasta expiración
  - Cuándo fue creada
  - Botón "Copiar Link" → Copia el link al portapapeles
  - Botón "X" → Cancela la invitación

**Server Action**: `cancelInvitation(invitationId)`
- Verifica que el usuario es owner
- Actualiza status a `cancelled`
- Revalida la página

**Server Action**: `getPendingInvitations()`
- Retorna todas las invitaciones con status `pending` del hogar
- Solo accesible para owners

## Componentes

### `InviteMemberDialog`
**Ubicación**: `app/app/household/components/InviteMemberDialog.tsx`

Diálogo modal con dos estados:
1. **Estado inicial**: Form con input de email
2. **Estado post-creación**: Muestra el link generado con botón para copiar

**Props**: Ninguna (obtiene permisos internamente)

**Comportamiento**:
- Deshabilita botón submit mientras carga
- Valida email en el frontend (type="email")
- Al crear exitosamente, cambia a mostrar el link
- Permite copiar el link con feedback visual (icono check)
- Al cerrar, refresca la página para mostrar la nueva invitación en la lista

### `PendingInvitationsList`
**Ubicación**: `app/app/household/components/PendingInvitationsList.tsx`

Lista de invitaciones pendientes con acciones.

**Props**:
```typescript
interface PendingInvitationsListProps {
  invitations: Invitation[];
}
```

**Comportamiento**:
- No renderiza nada si no hay invitaciones
- Muestra badge rojo si expira en < 24h
- Formato de fechas con `date-fns` (relativo: "hace 2 días", "en 5 días")
- Botón copiar link con estado de "copiado" temporal (2 segundos)
- Botón cancelar con confirmación antes de ejecutar

### `AcceptInvitePage`
**Ubicación**: `app/app/invite/[token]/page.tsx`

Página dinámica que maneja la aceptación de invitaciones.

**Props**:
```typescript
interface AcceptInvitePageProps {
  params: Promise<{ token: string }>;
}
```

**Comportamiento**:
- Extrae token de la URL
- Verifica autenticación (redirect a login si necesario)
- Llama a `acceptInvitation(token)`
- Renderiza dos estados:
  - **Éxito**: Card verde con check, nombre del hogar, botón al dashboard
  - **Error**: Card rojo con X, mensaje de error, ayuda contextual, botones a dashboard/settings

## Seguridad

✅ **Token criptográfico** - 32 bytes aleatorios en hexadecimal (64 caracteres)  
✅ **Expiración automática** - Links válidos por 7 días  
✅ **Verificación de email** - Solo el usuario con el email invitado puede aceptar  
✅ **Permisos estrictos** - Solo owners pueden crear/cancelar invitaciones  
✅ **Constraint DB** - Un email solo puede tener una invitación pendiente por household  
✅ **RLS habilitado** - Todas las operaciones pasan por Row Level Security  
✅ **SECURITY DEFINER** - La función `accept_invitation` se ejecuta con permisos elevados para insertar en `household_members`  

## Validaciones

### Al Crear Invitación
- ✅ Usuario es owner del hogar
- ✅ Email es válido (formato)
- ✅ No existe invitación pendiente para ese email en el hogar
- ✅ Token es único

### Al Aceptar Invitación
- ✅ Usuario está autenticado
- ✅ Token existe en la DB
- ✅ Estado es `pending` (no aceptada/cancelada/expirada)
- ✅ No ha expirado (expires_at > now())
- ✅ Email del usuario coincide con el de la invitación (case insensitive)
- ✅ Usuario no es ya miembro del hogar

## Estados de Invitación

| Estado | Descripción | Acción Posible |
|--------|-------------|----------------|
| `pending` | Invitación creada y esperando aceptación | Aceptar, Cancelar |
| `accepted` | Invitación aceptada, usuario unido al hogar | Ninguna |
| `expired` | Invitación expirada por tiempo (> 7 días) | Crear nueva |
| `cancelled` | Owner canceló la invitación manualmente | Crear nueva |

## Próximas Mejoras (Futuro)

### Fase 2: Email Automático
**Objetivo**: Enviar email automático al crear la invitación

**Opciones**:
1. **Resend** (https://resend.com) - API simple, gratuito hasta 100 emails/día
2. **SendGrid** - Más robusto, requiere configuración
3. **Supabase Edge Function** - Sin dependencias externas

**Implementación**:
```typescript
// En sendInvitationEmail()
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'CuentasSiK <invites@cuentas-sik.com>',
  to: [email],
  subject: `${inviterEmail} te invita a unirte a ${householdName}`,
  html: `
    <h1>¡Te han invitado a un hogar!</h1>
    <p>${inviterEmail} quiere que te unas a <strong>${householdName}</strong> en CuentasSiK.</p>
    <p><a href="${inviteUrl}">Aceptar invitación</a></p>
    <p><small>Este link expira en 7 días</small></p>
  `,
});
```

### Fase 3: Notificaciones In-App
- Badge en el avatar/header si hay invitación pendiente
- Panel de notificaciones con invitaciones recibidas

### Fase 4: Gestión Avanzada
- Re-enviar invitación expirada con nuevo token
- Cambiar rol del invitado antes de enviar (owner vs member)
- Invitaciones con límite de usos (N personas pueden usar el mismo link)

## Testing Manual

### Test 1: Crear y Aceptar Invitación (Happy Path)
1. Login como owner
2. Ir a `/app/household` → Tab "Miembros"
3. Click "Invitar Miembro"
4. Ingresar email válido (ejemplo: `test@example.com`)
5. Click "Crear Invitación"
6. Verificar que aparece el link
7. Copiar el link
8. Abrir en ventana incógnito
9. Login con el email invitado
10. Verificar redirect a `/app/invite/[token]`
11. Verificar mensaje de éxito
12. Click "Ir al Dashboard"
13. Verificar que el usuario está en el hogar

### Test 2: Invitación Expirada
1. En DB, crear invitación con `expires_at` en el pasado
2. Intentar aceptarla
3. Verificar mensaje de error "La invitación ha expirado"

### Test 3: Email Incorrecto
1. Crear invitación para `userA@example.com`
2. Intentar aceptarla con `userB@example.com` autenticado
3. Verificar error "Esta invitación fue enviada a otro email"

### Test 4: Cancelar Invitación
1. Owner crea invitación
2. Va a lista de invitaciones pendientes
3. Click en "X" para cancelar
4. Confirmar
5. Verificar que desaparece de la lista
6. Intentar usar el link → Error "Invitación no encontrada"

### Test 5: Duplicados
1. Owner intenta crear invitación para email ya invitado
2. Verificar error "Ya existe una invitación pendiente para este email"

## Archivos Modificados/Creados

### Migraciones
- ✅ `supabase/migrations/20251003150000_add_invitations_system.sql`

### Server Actions
- ✅ `app/app/household/invitations/actions.ts`

### Componentes
- ✅ `app/app/household/components/InviteMemberDialog.tsx` (actualizado)
- ✅ `app/app/household/components/PendingInvitationsList.tsx` (nuevo)
- ✅ `app/app/admin/members/components/InviteMemberDialog.tsx` (actualizado)

### Páginas
- ✅ `app/app/invite/[token]/page.tsx` (nuevo)
- ✅ `app/app/household/page.tsx` (actualizado para mostrar invitaciones)

### Tipos
- ✅ `types/database.ts` (regenerado con tabla invitations)

## Comandos de Deployment

```bash
# 1. Aplicar migración
npx supabase db push

# 2. Regenerar tipos
npx supabase gen types typescript --project-id fizxvvtakvmmeflmbwud | Out-File -FilePath types/database.ts -Encoding utf8

# 3. Build y verificar
npm run build

# 4. Commit y push
git add -A
git commit -m "feat: implement invitation system for household members

- Add invitations table with token-based invite links
- Create invite dialog for owners to send invitations
- Add accept invitation page with validations
- Display pending invitations list with management
- Implement RLS policies and SQL function for secure acceptance
- Add 7-day expiration and cancellation support"
git push
```

## Referencias

- Migration: `supabase/migrations/20251003150000_add_invitations_system.sql`
- Actions: `app/app/household/invitations/actions.ts`
- UI Components: `app/app/household/components/`
- Accept Page: `app/app/invite/[token]/page.tsx`
