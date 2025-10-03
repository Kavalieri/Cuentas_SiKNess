# Fix: Sistema Robusto de Invitaciones

**Fecha**: 3 de octubre de 2025  
**Problemas Identificados**:
1. ❌ Error al cancelar invitación: duplicate key constraint
2. ❌ Cookie de invitación cacheada causa validaciones innecesarias
3. ⏳ Falta soporte para múltiples households por usuario

---

## Problema 1: Constraint de Invitaciones Mal Diseñado

### Síntoma
```
Error al cancelar la invitación: duplicate key value violates unique constraint "invitations_household_email_pending_key"
```

### Causa Raíz

**Constraint Original** (PROBLEMÁTICO):
```sql
constraint invitations_household_email_pending_key 
  unique (household_id, email, status)
```

Este constraint incluye el campo `status` en la clave única, lo que significa:
- ✅ Puedes tener: `(household1, user@email.com, 'pending')`
- ✅ Al cancelar: se convierte en `(household1, user@email.com, 'cancelled')`
- ❌ Al crear nueva: intenta `(household1, user@email.com, 'pending')`
- ❌ **CONFLICTO**: PostgreSQL ve que ya existe una fila con `(household1, user@email.com, *)` y rechaza la inserción

**El problema**: El constraint impide crear nuevas invitaciones después de cancelar/aceptar una anterior, **incluso si la anterior ya no está pendiente**.

### Solución Implementada

**Migración**: `20251003160000_fix_invitations_constraint.sql`

```sql
-- Eliminar constraint problemático
alter table invitations 
  drop constraint if exists invitations_household_email_pending_key;

-- Crear unique index PARCIAL que solo aplica a 'pending'
create unique index if not exists invitations_household_email_pending_unique
  on invitations (household_id, email)
  where status = 'pending';
```

**Beneficios**:
- ✅ Solo puede haber **UNA** invitación `pending` por (household, email)
- ✅ Pueden coexistir múltiples invitaciones `cancelled`, `accepted`, `expired` para el mismo email
- ✅ Después de cancelar, puedes crear nueva inmediatamente
- ✅ Historial completo de todas las invitaciones (no se pierden datos)

### Ejemplo de Uso

```typescript
// Estado inicial: No hay invitaciones
// ✅ OK

// 1. Crear invitación para user@example.com
createInvitation({ email: 'user@example.com' })
// → INSERT (household1, user@example.com, 'pending')
// ✅ OK

// 2. Cancelar invitación
cancelInvitation(invitation_id)
// → UPDATE status='cancelled'
// → Resultado: (household1, user@example.com, 'cancelled')
// ✅ OK

// 3. Crear nueva invitación (ANTES FALLABA, AHORA FUNCIONA)
createInvitation({ email: 'user@example.com' })
// → INSERT (household1, user@example.com, 'pending')
// ✅ OK - El index parcial solo valida 'pending', ignora 'cancelled'

// Estado final:
// - (household1, user@example.com, 'cancelled') - histórico
// - (household1, user@example.com, 'pending')   - nueva invitación
// ✅ Ambas coexisten sin conflicto
```

---

## Problema 2: Cookie de Invitación No Se Limpia

### Síntoma
Después de aceptar una invitación:
1. Usuario es redirigido a `/app` (dashboard)
2. Dashboard detecta cookie `invitation_token` (todavía existe)
3. Intenta validar el token
4. Token tiene `status='accepted'`
5. `getInvitationDetails()` retorna error
6. Muestra mensaje innecesario o comportamiento confuso

### Causa Raíz

**Middleware** guarda cookie con 1 hora de TTL:
```typescript
supabaseResponse.cookies.set('invitation_token', invitationToken, {
  maxAge: 3600, // 1 hora ← Cookie persiste después de usar
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
});
```

**Problema**: La cookie sobrevive después de que la invitación fue aceptada/cancelada.

### Solución Implementada

#### 1. Limpiar Cookie Después de Aceptar Invitación

**Archivo**: `app/app/household/invitations/actions.ts`

```typescript
export async function acceptInvitation(token: string) {
  // ... validaciones y aceptación ...

  if (!result || !result.success) {
    return fail(result?.message || 'Error desconocido');
  }

  // CRÍTICO: Limpiar cookie después de aceptar
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  cookieStore.delete('invitation_token'); // ← NUEVO

  revalidatePath('/app');
  return ok({ ... });
}
```

#### 2. Limpiar Cookie Si Invitación Es Inválida

**Archivo**: `app/app/page.tsx`

```typescript
if (!householdId) {
  const cookieStore = await cookies();
  const invitationToken = cookieStore.get('invitation_token')?.value;

  let pendingInvitation = undefined;
  if (invitationToken) {
    const result = await getInvitationDetails(invitationToken);
    
    if (result.ok) {
      // Invitación válida - mostrarla
      pendingInvitation = { ... };
    } else {
      // Invitación inválida - limpiar cookie ← NUEVO
      cookieStore.delete('invitation_token');
    }
  }

  return <DashboardOnboarding pendingInvitation={pendingInvitation} />;
}
```

### Resultado

- ✅ Cookie se limpia automáticamente después de aceptar invitación
- ✅ Cookie se limpia si la invitación está expirada/cancelada/usada
- ✅ Dashboard no intenta validar tokens obsoletos
- ✅ Experiencia de usuario más limpia

---

## Problema 3: Múltiples Households por Usuario

### Estado Actual (Limitación)

**Arquitectura actual asume 1 usuario = 1 household**:

```typescript
// lib/supabaseServer.ts
export async function getUserHouseholdId(): Promise<string | undefined> {
  const { data } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .maybeSingle(); // ← Asume UN SOLO household

  return data?.household_id;
}
```

**Problemas**:
- ❌ Usuario no puede pertenecer a múltiples hogares
- ❌ Usuario no puede ser owner de un hogar y member de otro
- ❌ No hay forma de "cambiar" entre hogares activos

### Casos de Uso Faltantes

1. **Pareja con hogar + trabajo compartido**
   - Usuario tiene hogar con pareja
   - Usuario comparte gastos de oficina con compañeros
   - Necesita 2 hogares: "Casa" y "Oficina"

2. **Usuario crea hogar nuevo siendo miembro de otro**
   - Usuario es member del hogar A
   - Usuario quiere crear hogar B (se convierte en owner)
   - Necesita mantener membresía en ambos

3. **Usuario recibe múltiples invitaciones**
   - Invitado al hogar de la pareja
   - Invitado al hogar de roommates
   - Necesita aceptar/gestionar múltiples

### Arquitectura Propuesta (Fase 2)

#### 1. Nueva Tabla: `user_settings`

```sql
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_household_id uuid references households(id) on delete set null,
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: Usuario solo puede ver/editar sus propios settings
alter table user_settings enable row level security;

create policy "read_own_settings" on user_settings
  for select using (user_id = auth.uid());

create policy "update_own_settings" on user_settings
  for update using (user_id = auth.uid());
```

**Campo clave**: `active_household_id` - El hogar que el usuario está viendo actualmente

#### 2. Modificar `getUserHouseholdId()`

```typescript
// lib/supabaseServer.ts
export async function getUserHouseholdId(): Promise<string | undefined> {
  const user = await getCurrentUser();
  if (!user) return undefined;

  const supabase = await supabaseServer();

  // 1. Intentar obtener el household activo desde settings
  const { data: settings } = await supabase
    .from('user_settings')
    .select('active_household_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (settings?.active_household_id) {
    // Verificar que todavía es miembro
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .eq('household_id', settings.active_household_id)
      .maybeSingle();

    if (membership) {
      return settings.active_household_id;
    }
  }

  // 2. Fallback: Obtener el primer household del usuario
  const { data: firstHousehold } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  // 3. Si encontró household, guardarlo como activo
  if (firstHousehold) {
    await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        active_household_id: firstHousehold.household_id,
      });
    
    return firstHousehold.household_id;
  }

  return undefined;
}
```

#### 3. Nuevo Componente: `HouseholdSelector`

```tsx
// components/shared/HouseholdSelector.tsx
'use client';

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { setActiveHousehold } from '@/lib/actions/user-settings';

interface Household {
  id: string;
  name: string;
  role: 'owner' | 'member';
}

interface HouseholdSelectorProps {
  households: Household[];
  activeHouseholdId: string;
}

export function HouseholdSelector({ households, activeHouseholdId }: HouseholdSelectorProps) {
  if (households.length <= 1) return null; // Solo mostrar si hay múltiples

  const handleChange = async (householdId: string) => {
    await setActiveHousehold(householdId);
    window.location.reload(); // Recargar para actualizar todos los datos
  };

  return (
    <Select value={activeHouseholdId} onValueChange={handleChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {households.map((h) => (
          <SelectItem key={h.id} value={h.id}>
            {h.name} {h.role === 'owner' && '👑'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

#### 4. Server Action: `setActiveHousehold`

```typescript
// lib/actions/user-settings.ts
'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer, getCurrentUser } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';

export async function setActiveHousehold(householdId: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) {
    return fail('Usuario no autenticado');
  }

  const supabase = await supabaseServer();

  // Verificar que el usuario es miembro de este household
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .eq('household_id', householdId)
    .maybeSingle();

  if (!membership) {
    return fail('No eres miembro de este hogar');
  }

  // Actualizar settings
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      active_household_id: householdId,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error updating active household:', error);
    return fail('Error al cambiar de hogar');
  }

  // Revalidar todas las rutas que dependen del household
  revalidatePath('/app', 'layout');

  return ok();
}
```

#### 5. Integrar en Layout

```tsx
// app/app/layout.tsx
export default async function AppLayout({ children }) {
  const user = await getCurrentUser();
  const activeHouseholdId = await getUserHouseholdId();
  
  // Obtener TODOS los households del usuario
  const supabase = await supabaseServer();
  const { data: memberships } = await supabase
    .from('household_members')
    .select(`
      household_id,
      role,
      households (
        id,
        name
      )
    `)
    .eq('user_id', user.id);

  const households = memberships?.map(m => ({
    id: m.household_id,
    name: m.households.name,
    role: m.role,
  })) || [];

  return (
    <div>
      <header>
        {/* Navegación existente */}
        
        {/* NUEVO: Selector de household si tiene múltiples */}
        {households.length > 1 && (
          <HouseholdSelector 
            households={households} 
            activeHouseholdId={activeHouseholdId!} 
          />
        )}
      </header>
      
      {children}
    </div>
  );
}
```

### Cambios Necesarios en Todo el Codebase

**TODOS los Server Actions que usan `getUserHouseholdId()` ya funcionarán**:
- ✅ `createMovement()` filtrará por active_household_id
- ✅ `getMonthlyTotals()` filtrará por active_household_id
- ✅ `getPendingInvitations()` filtrará por active_household_id
- ✅ Dashboard mostrará datos del household activo

**NO requiere cambios** en la mayoría del código porque:
- `getUserHouseholdId()` sigue retornando UN household (el activo)
- Todas las queries siguen filtrando por `household_id`
- La única diferencia es que el usuario puede cambiar cuál es el activo

### Migración de Datos

```sql
-- Migración: Crear tabla user_settings y poblar con households actuales
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_household_id uuid references households(id) on delete set null,
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Poblar con households actuales de cada usuario
insert into user_settings (user_id, active_household_id)
select 
  user_id,
  household_id
from household_members
on conflict (user_id) do nothing;

-- RLS
alter table user_settings enable row level security;

create policy "read_own_settings" on user_settings
  for select using (user_id = auth.uid());

create policy "update_own_settings" on user_settings
  for update using (user_id = auth.uid());
```

---

## Plan de Implementación

### ✅ FASE 1: Arreglos Críticos (COMPLETADO)

- [x] Migración: Fix constraint de invitaciones
- [x] Limpiar cookie después de aceptar invitación
- [x] Limpiar cookie si invitación es inválida
- [x] Mensaje más claro cuando hay invitación pendiente duplicada
- [x] Documentación completa del problema y solución

### ⏳ FASE 2: Múltiples Households (PENDIENTE)

**Tiempo estimado**: 4-6 horas

**Tareas**:
1. [ ] Crear migración: tabla `user_settings` con `active_household_id`
2. [ ] Migración de datos: poblar settings con households actuales
3. [ ] Modificar `getUserHouseholdId()` para usar settings
4. [ ] Crear componente `HouseholdSelector`
5. [ ] Crear server action `setActiveHousehold()`
6. [ ] Integrar selector en layout principal
7. [ ] Agregar helper `getUserHouseholds()` para obtener lista completa
8. [ ] Testing exhaustivo:
   - Usuario con 1 household (comportamiento actual, sin cambios)
   - Usuario con 2+ households (puede cambiar entre ellos)
   - Crear household nuevo (se convierte en activo automáticamente)
   - Aceptar invitación (household se convierte en activo)
9. [ ] Actualizar documentación

**Decisiones de diseño**:
- ✅ Cuando usuario acepta invitación, el nuevo household se vuelve activo automáticamente
- ✅ Cuando usuario crea household nuevo, se vuelve activo automáticamente
- ✅ Selector solo aparece si tiene 2+ households (no molestar con 1)
- ✅ Cambiar de household recarga la página (más simple que state management)
- ✅ Si usuario es removido de household activo, fallback al primero disponible

**Impacto en código existente**: 
- ✅ **MÍNIMO** - La mayoría del código ya usa `getUserHouseholdId()`
- ✅ No requiere modificar Server Actions individuales
- ✅ Solo agregar componente selector y lógica de user_settings

---

## Testing

### Test 1: Constraint de Invitaciones

```bash
# 1. Aplicar migración
npx supabase db push

# 2. En la app:
# a) Crear invitación para test@example.com
# b) Cancelar invitación
# c) Crear NUEVA invitación para test@example.com
# ✅ Debe funcionar sin error duplicate key
```

### Test 2: Cookie de Invitación

```bash
# 1. Como owner, crear invitación
# 2. Copiar link
# 3. Abrir en incógnito
# 4. Login con email de la invitación
# 5. Aceptar invitación
# 6. Dashboard recarga
# ✅ NO debe mostrar alerta de invitación pendiente
# ✅ Cookie debe estar eliminada (verificar en DevTools)

# 7. Crear nueva invitación
# 8. Abrir link en incógnito
# 9. Login
# 10. NO aceptar, navegar directamente a /app
# ✅ Debe mostrar dashboard onboarding con invitación
# 11. Cancelar la invitación desde owner
# 12. Refrescar dashboard del usuario invitado
# ✅ Alerta de invitación debe desaparecer
# ✅ Cookie debe estar eliminada
```

---

## Resumen

### Arreglos Implementados

1. **Constraint Fix** (`20251003160000_fix_invitations_constraint.sql`)
   - Usa unique index parcial en lugar de constraint completo
   - Permite múltiples invitaciones cancelled/accepted/expired
   - Solo 1 invitación pending por (household, email)

2. **Cookie Cleanup** (`actions.ts`, `page.tsx`)
   - Limpia cookie después de aceptar invitación exitosamente
   - Limpia cookie si invitación es inválida (expirada/cancelada/usada)
   - Previene validaciones innecesarias de tokens obsoletos

3. **Mensajes Mejorados**
   - Error más claro cuando hay invitación pendiente duplicada
   - Indica al usuario que debe cancelar la anterior antes de crear nueva

### Próximos Pasos

- Aplicar migración: `npx supabase db push`
- Testing manual de los escenarios críticos
- Decidir si implementar soporte multi-household (Fase 2)

### Decisión Pendiente: ¿Implementar Multi-Household?

**Preguntas para el usuario**:
1. ¿Es prioritario soportar múltiples households por usuario?
2. ¿Casos de uso reales donde esto es necesario?
3. ¿O podemos mantener modelo simple de 1 household por usuario?

**Si sí**: Implementar Fase 2 (4-6 horas)
**Si no**: Mantener modelo actual con arreglos de Fase 1

---

**Autor**: GitHub Copilot  
**Fecha**: 3 de octubre de 2025  
**Status**: Fase 1 ✅ Completada | Fase 2 ⏳ Pendiente de decisión
