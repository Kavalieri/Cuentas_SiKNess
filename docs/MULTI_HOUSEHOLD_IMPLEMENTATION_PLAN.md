# Plan de Implementación: Múltiples Hogares + Fix RLS Invitaciones

**Fecha**: 3 de octubre de 2025  
**Decisión**: Opción A - Implementar múltiples hogares  
**Tiempo estimado**: 4-6 horas

---

## 🔴 PROBLEMA CRÍTICO DETECTADO: RLS Invitations

### Error Actual
```
Invitación inválida
Invitación no encontrada
```

### Causa Raíz
Las políticas RLS de `invitations` **NO permiten lectura pública por token**.

**Política actual**:
```sql
create policy "read_invitations" on invitations for select using (
  exists (
    select 1 from household_members hm
    where hm.household_id = invitations.household_id
      and hm.user_id = auth.uid()
      and hm.role = 'owner'
  )
);
```

**Problema**: Solo owners autenticados del household pueden leer invitaciones. Un usuario nuevo (sin household) NO puede leer la invitación por token.

### Solución INMEDIATA

**Nueva política pública**:
```sql
-- Permitir lectura pública de invitaciones por token
-- Esto es seguro porque el token es secreto (64 chars hex)
drop policy if exists "read_invitations_by_token" on invitations;
create policy "read_invitations_by_token" on invitations 
  for select 
  using (true);  -- Permite lectura pública
```

**Seguridad**: 
- ✅ Token es secreto (64 caracteres hex = 2^256 posibilidades)
- ✅ Solo expone datos de la invitación (household name, inviter)
- ✅ NO expone datos sensibles del household
- ✅ Invitaciones expiran automáticamente

**Alternativa más restrictiva**:
```sql
-- Solo permitir si no está autenticado O es owner del household
create policy "read_invitations_by_token" on invitations 
  for select 
  using (
    auth.uid() is null  -- Usuario no autenticado puede ver por token
    OR 
    exists (
      select 1 from household_members hm
      where hm.household_id = invitations.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'owner'
    )
  );
```

---

## 📋 FASE 1: Fix RLS Invitations (CRÍTICO)

**Prioridad**: 🔴 INMEDIATA (bloquea testing)

### Tarea 1.1: Migración RLS ⏱️ 5 min

**Archivo**: `supabase/migrations/20251003180000_fix_invitations_rls.sql`

```sql
-- =====================================================
-- Fix: Permitir lectura pública de invitaciones por token
-- =====================================================

-- Eliminar política restrictiva actual
drop policy if exists "read_invitations" on invitations;

-- Política 1: Owners pueden ver invitaciones de su household
create policy "read_invitations_owners" on invitations 
  for select 
  using (
    exists (
      select 1 from household_members hm
      where hm.household_id = invitations.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'owner'
    )
  );

-- Política 2: CUALQUIER usuario (incluso sin auth) puede leer por token
-- Esto permite que usuarios nuevos vean la invitación antes de unirse
create policy "read_invitations_public" on invitations 
  for select 
  using (true);

-- Nota: Es seguro porque:
-- 1. Token es secreto (64 chars hex)
-- 2. Solo expone: household_name, invited_by, expires_at
-- 3. NO expone datos sensibles (movimientos, saldos, etc)
-- 4. Invitaciones expiran automáticamente
```

### Tarea 1.2: Aplicar y Verificar ⏱️ 2 min

```bash
npx supabase db push --include-all
```

### Tarea 1.3: Testing Inmediato ⏱️ 3 min

1. Crear invitación como owner
2. Copiar link
3. **LOGOUT** (importante)
4. Pegar link en navegador
5. ✅ Debe mostrar página de invitación (sin "no encontrada")

---

## 📋 FASE 2: Arquitectura Múltiples Hogares

**Prioridad**: 🟡 ALTA (después de fix RLS)

### Tarea 2.1: Tabla user_settings ⏱️ 15 min

**Archivo**: `supabase/migrations/20251003190000_add_user_settings.sql`

```sql
-- =====================================================
-- Tabla de configuración de usuario
-- =====================================================
-- Almacena el household activo y preferencias del usuario

create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_household_id uuid references households(id) on delete set null,
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índice para búsquedas rápidas
create index if not exists idx_user_settings_active_household 
  on user_settings(active_household_id);

-- RLS
alter table user_settings enable row level security;

-- Usuario solo puede ver/editar sus propios settings
drop policy if exists "read_own_settings" on user_settings;
create policy "read_own_settings" on user_settings
  for select using (user_id = auth.uid());

drop policy if exists "insert_own_settings" on user_settings;
create policy "insert_own_settings" on user_settings
  for insert with check (user_id = auth.uid());

drop policy if exists "update_own_settings" on user_settings;
create policy "update_own_settings" on user_settings
  for update using (user_id = auth.uid());

-- Función para actualizar updated_at automáticamente
create or replace function update_user_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_settings_updated_at on user_settings;
create trigger user_settings_updated_at
  before update on user_settings
  for each row
  execute function update_user_settings_updated_at();

-- Poblar con datos existentes (migración de data)
-- Cada usuario existente tendrá como activo su primer household
insert into user_settings (user_id, active_household_id)
select 
  hm.user_id,
  hm.household_id
from household_members hm
on conflict (user_id) do nothing;

-- Comentarios
comment on table user_settings is 
'Configuración de usuario incluyendo household activo y preferencias';

comment on column user_settings.active_household_id is 
'Household que el usuario está viendo actualmente. NULL si no tiene households.';

comment on column user_settings.preferences is 
'Preferencias del usuario en formato JSON (tema, idioma, etc)';
```

### Tarea 2.2: Modificar getUserHouseholdId() ⏱️ 20 min

**Archivo**: `lib/supabaseServer.ts`

```typescript
/**
 * Obtiene el household_id activo del usuario actual
 * Si el usuario pertenece a múltiples households, retorna el seleccionado activamente
 * Si no tiene household activo configurado, retorna el primero disponible
 * @returns household_id o undefined si no pertenece a ningún household
 */
export async function getUserHouseholdId(): Promise<string | undefined> {
  const user = await getCurrentUser();
  if (!user) return undefined;

  const supabase = await supabaseServer();

  // 1. Intentar obtener household activo desde user_settings
  const { data: settings } = await supabase
    .from('user_settings')
    .select('active_household_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (settings?.active_household_id) {
    // Verificar que todavía es miembro de ese household
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

  // 2. Fallback: Obtener el primer household disponible
  const { data: firstHousehold } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (firstHousehold) {
    // Guardar como activo para próxima vez
    await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        active_household_id: firstHousehold.household_id,
        updated_at: new Date().toISOString(),
      });

    return firstHousehold.household_id;
  }

  return undefined;
}

/**
 * Obtiene todos los households a los que pertenece el usuario
 * @returns Array de households con id, name, role
 */
export async function getUserHouseholds() {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await supabaseServer();

  const { data: memberships, error } = await supabase
    .from('household_members')
    .select(`
      household_id,
      role,
      households (
        id,
        name,
        created_at
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error || !memberships) {
    console.error('Error fetching user households:', error);
    return [];
  }

  return memberships.map((m: any) => ({
    id: m.household_id,
    name: m.households.name,
    role: m.role as 'owner' | 'member',
    created_at: m.households.created_at,
  }));
}
```

### Tarea 2.3: Server Action setActiveHousehold() ⏱️ 15 min

**Archivo**: `lib/actions/user-settings.ts` (NUEVO)

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer, getCurrentUser } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';

/**
 * Cambia el household activo del usuario
 * Solo puede cambiar a households de los que es miembro
 */
export async function setActiveHousehold(householdId: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) {
    return fail('Usuario no autenticado');
  }

  const supabase = await supabaseServer();

  // Verificar que el usuario es miembro de este household
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id, role')
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

  // Revalidar layout completo (afecta navegación y todos los datos)
  revalidatePath('/app', 'layout');

  return ok();
}

/**
 * Obtiene el household activo del usuario desde settings
 */
export async function getActiveHouseholdId(): Promise<string | undefined> {
  const user = await getCurrentUser();
  if (!user) return undefined;

  const supabase = await supabaseServer();

  const { data: settings } = await supabase
    .from('user_settings')
    .select('active_household_id')
    .eq('user_id', user.id)
    .maybeSingle();

  return settings?.active_household_id || undefined;
}
```

### Tarea 2.4: Componente HouseholdSelector ⏱️ 30 min

**Archivo**: `components/shared/HouseholdSelector.tsx` (NUEVO)

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Home, Crown, Users } from 'lucide-react';
import { setActiveHousehold } from '@/lib/actions/user-settings';
import { toast } from 'sonner';

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
  const router = useRouter();
  const [isChanging, setIsChanging] = useState(false);

  // No mostrar selector si solo tiene 1 household
  if (households.length <= 1) {
    return null;
  }

  const handleChange = async (householdId: string) => {
    if (householdId === activeHouseholdId) return;

    setIsChanging(true);
    const result = await setActiveHousehold(householdId);
    
    if (!result.ok) {
      toast.error(result.message);
      setIsChanging(false);
      return;
    }

    toast.success('Hogar cambiado correctamente');
    
    // Recargar página para actualizar todos los datos
    router.refresh();
    setIsChanging(false);
  };

  const activeHousehold = households.find(h => h.id === activeHouseholdId);

  return (
    <div className="flex items-center gap-2">
      <Home className="h-4 w-4 text-muted-foreground" />
      <Select
        value={activeHouseholdId}
        onValueChange={handleChange}
        disabled={isChanging}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue>
            <div className="flex items-center gap-2">
              {activeHousehold?.role === 'owner' && (
                <Crown className="h-3 w-3 text-yellow-500" />
              )}
              {activeHousehold?.role === 'member' && (
                <Users className="h-3 w-3 text-blue-500" />
              )}
              <span className="truncate">{activeHousehold?.name}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {households.map((household) => (
            <SelectItem key={household.id} value={household.id}>
              <div className="flex items-center gap-2">
                {household.role === 'owner' && (
                  <Crown className="h-3 w-3 text-yellow-500" title="Propietario" />
                )}
                {household.role === 'member' && (
                  <Users className="h-3 w-3 text-blue-500" title="Miembro" />
                )}
                <span>{household.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

### Tarea 2.5: Integrar en Layout ⏱️ 15 min

**Archivo**: `app/app/layout.tsx`

```typescript
import { HouseholdSelector } from '@/components/shared/HouseholdSelector';
import { getUserHouseholdId, getUserHouseholds } from '@/lib/supabaseServer';

export default async function AppLayout({ children }) {
  const user = await getCurrentUser();
  const activeHouseholdId = await getUserHouseholdId();
  const userHouseholds = await getUserHouseholds();

  return (
    <div>
      <header>
        {/* Navegación existente */}
        <Link href="/app">Dashboard</Link>
        
        {activeHouseholdId && (
          <Link href="/app/household">Hogar</Link>
        )}
        
        <Link href="/app/profile">Perfil</Link>

        {/* NUEVO: Selector de household */}
        {userHouseholds.length > 0 && activeHouseholdId && (
          <HouseholdSelector
            households={userHouseholds}
            activeHouseholdId={activeHouseholdId}
          />
        )}

        {/* Theme toggle, user menu, etc */}
      </header>

      {children}
    </div>
  );
}
```

### Tarea 2.6: Actualizar acceptInvitation() ⏱️ 10 min

**Archivo**: `app/app/household/invitations/actions.ts`

```typescript
export async function acceptInvitation(token: string) {
  // ... código existente de validación ...

  if (!result || !result.success) {
    return fail(result?.message || 'Error desconocido');
  }

  // CRÍTICO: Limpiar cookie
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  cookieStore.delete('invitation_token');

  // NUEVO: Establecer el nuevo household como activo automáticamente
  await supabase.from('user_settings').upsert({
    user_id: user.id,
    active_household_id: result.household_id!,
    updated_at: new Date().toISOString(),
  });

  revalidatePath('/app');
  revalidatePath('/app/household');

  return ok({
    householdId: result.household_id!,
    householdName: result.household_name!,
  });
}
```

### Tarea 2.7: Actualizar createHousehold() ⏱️ 10 min

**Archivo**: `app/app/household/create/actions.ts` (o donde esté)

```typescript
export async function createHousehold(formData: FormData) {
  // ... código existente de creación ...

  // NUEVO: Establecer el nuevo household como activo automáticamente
  await supabase.from('user_settings').upsert({
    user_id: user.id,
    active_household_id: householdId,
    updated_at: new Date().toISOString(),
  });

  revalidatePath('/app');
  return ok({ householdId });
}
```

---

## 📋 FASE 3: Testing Completo

### Test 3.1: RLS Fix ⏱️ 5 min

1. Crear invitación como owner
2. **LOGOUT**
3. Abrir link de invitación en navegador
4. ✅ Debe mostrar página de invitación (NO "no encontrada")
5. Login con email de invitación
6. ✅ Debe aceptar correctamente

### Test 3.2: Múltiples Households - Crear Segundo ⏱️ 10 min

1. Login como usuario con 1 household existente
2. Ir a Dashboard → verificar selector NO aparece (solo 1 household)
3. Crear nuevo household (nombre: "Mi Hogar Personal")
4. ✅ Debe cambiar automáticamente a ese household
5. ✅ Selector debe aparecer (ahora tiene 2 households)
6. Dashboard debe mostrar datos del nuevo household (vacío)

### Test 3.3: Cambiar Entre Households ⏱️ 10 min

1. Crear gastos en "Mi Hogar Personal"
2. Usar selector para cambiar a household original
3. ✅ Dashboard debe mostrar gastos del household original
4. ✅ No debe mostrar gastos de "Mi Hogar Personal"
5. Cambiar de nuevo a "Mi Hogar Personal"
6. ✅ Dashboard debe mostrar sus gastos

### Test 3.4: Aceptar Invitación con Household Existente ⏱️ 15 min

1. Usuario A (owner) crea household "Oficina"
2. Usuario A invita a Usuario B (que ya tiene "Casa")
3. Usuario B recibe invitación
4. Usuario B acepta invitación
5. ✅ Usuario B ahora tiene 2 households: "Casa" y "Oficina"
6. ✅ Selector aparece automáticamente
7. ✅ "Oficina" se vuelve el activo (el recién aceptado)
8. Usuario B cambia a "Casa"
9. ✅ Dashboard muestra datos de "Casa"

---

## 📊 Checklist Final

### Fase 1: Fix RLS (CRÍTICO)
- [ ] Migración `20251003180000_fix_invitations_rls.sql` creada
- [ ] Migración aplicada con `npx supabase db push`
- [ ] Test: Link de invitación funciona sin login
- [ ] Test: Invitación se acepta correctamente

### Fase 2: Múltiples Households
- [ ] Migración `20251003190000_add_user_settings.sql` creada
- [ ] Migración aplicada
- [ ] `getUserHouseholdId()` modificado
- [ ] `getUserHouseholds()` creado
- [ ] `setActiveHousehold()` creado
- [ ] `HouseholdSelector` componente creado
- [ ] Layout integrado con selector
- [ ] `acceptInvitation()` actualizado
- [ ] `createHousehold()` actualizado
- [ ] Tests 3.1 a 3.4 ejecutados ✅

### Fase 3: Documentación
- [ ] Actualizar `README.md` con múltiples households
- [ ] Actualizar `.github/copilot-instructions.md`
- [ ] Crear `docs/MULTIPLE_HOUSEHOLDS.md` con guía

---

## ⏱️ Tiempo Total Estimado

- **Fase 1 (RLS Fix)**: 10 minutos 🔴 CRÍTICO
- **Fase 2 (Multi-Household)**: 2-3 horas 🟡 ALTA
- **Fase 3 (Testing)**: 40 minutos 🟢 VERIFICACIÓN

**Total**: 3-4 horas (en lugar de 4-6 estimado originalmente)

---

## 🚀 Orden de Ejecución

1. **AHORA**: Fase 1 (Fix RLS) - 10 min
2. **Verificar**: Test simple de invitaciones
3. **SI OK**: Fase 2 (Multi-Household) - 2-3 horas
4. **Después**: Fase 3 (Testing completo) - 40 min

---

**¿Comenzamos con Fase 1 (Fix RLS)?** Es crítico para poder testear cualquier cosa.
