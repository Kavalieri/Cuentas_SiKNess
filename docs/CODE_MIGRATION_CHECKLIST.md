# Checklist de Migración de Código

## Cambios Aplicados en la Base de Datos ✅

1. ✅ `profiles` table creada (source of truth para usuarios)
2. ✅ `movements` → `transactions` 
3. ✅ `movements.note` → `transactions.description`
4. ✅ `*`.`user_id` → `profile_id` en todas las tablas
5. ✅ RLS policies actualizadas para usar `profile_id`
6. ✅ Helper functions creadas:
   - `get_current_profile_id()` - Retorna profile.id desde auth.uid()
   - `get_current_profile()` - Retorna perfil completo
7. ✅ View `v_transactions_with_profile` creada
8. ✅ Trigger `sync_auth_user_to_profile` instalado

## Cambios Necesarios en el Código de Aplicación

### 1. Reemplazar `movements` → `transactions`

**Archivos a actualizar:**
- [ ] `app/app/expenses/actions.ts` (5 ocurrencias)
- [ ] `app/app/periods/actions.ts` (1 ocurrencia)
- [ ] `app/app/contributions/actions.ts` (5 ocurrencias)
- [ ] `app/app/admin/page.tsx` (1 ocurrencia)
- [ ] `app/app/admin/households/page.tsx` (1 ocurrencia)

**Patrón:**
```typescript
// ANTES
.from('movements')

// DESPUÉS
.from('transactions')
```

### 2. Reemplazar `note` → `description`

**Archivos a actualizar:**
- [ ] `app/app/expenses/actions.ts` - Schema Zod
- [ ] `app/app/expenses/actions.ts` - Inserción de datos
- [ ] `app/app/expenses/page.tsx` - Renderizado
- [ ] `app/app/components/DashboardContent.tsx` - Tipo
- [ ] `app/app/components/MovementsList.tsx` - Tipo y renderizado
- [ ] `app/app/contributions/actions.ts` - Inserción (3 ocurrencias)

**Patrón:**
```typescript
// ANTES - Tipos
type Movement = {
  note: string | null;
}

// DESPUÉS
type Movement = {
  description: string | null;
}

// ANTES - Schema Zod
note: z.string().optional(),

// DESPUÉS
description: z.string().optional(),

// ANTES - Inserción
note: parsed.data.note || null,

// DESPUÉS
description: parsed.data.description || null,

// ANTES - Renderizado
{movement.note && <p>{movement.note}</p>}

// DESPUÉS
{movement.description && <p>{movement.description}</p>}
```

### 3. Reemplazar `user_id` → `profile_id`

**IMPORTANTE**: Solo en contexto de household_members, transactions, contributions, etc.
**NO CAMBIAR**: `system_admins.user_id` (este apunta a auth.users directamente)

**Archivos a actualizar:**
- [ ] `app/app/household/page.tsx` - Tipos y referencias
- [ ] `app/app/household/components/MembersList.tsx` - Tipos
- [ ] `app/app/household/components/MonthlyFundStatus.tsx` - Tipos y referencias
- [ ] `app/app/contributions/page.tsx` - Tipos
- [ ] `app/app/contributions/components/ContributionsContent.tsx` - Tipos
- [ ] `app/app/expenses/actions.ts` - Inserción
- [ ] `lib/supabaseServer.ts` - Inserción de household_members
- [ ] `lib/actions/user-settings.ts` - user_id (verificar contexto)
- [ ] `app/app/household/actions.ts` - Varios usos
- [ ] `app/app/profile/page.tsx` - RPC calls

**Patrón:**
```typescript
// ANTES
interface Member {
  user_id: string;
}

// DESPUÉS  
interface Member {
  profile_id: string;
}

// ANTES - Inserción en household_members
{
  household_id,
  user_id: user.id,
  role: 'owner'
}

// DESPUÉS
{
  household_id,
  profile_id: user.id,  // El user.id de auth ya está mapeado a profile.id
  role: 'owner'
}
```

### 4. Actualizar `lib/supabaseServer.ts`

**Cambios necesarios:**
- [ ] `getUserHouseholdId()` - usar `get_current_profile_id()` en lugar de `auth.uid()`
- [ ] `createHousehold()` - insertar con `profile_id`

### 5. Actualizar Server Actions

**Archivos críticos:**
- [ ] `app/app/household/actions.ts` - createHousehold, deleteMember
- [ ] `app/app/household/invitations/actions.ts` - acceptInvitation
- [ ] `app/app/expenses/actions.ts` - createMovement, updateMovement, deleteMovement
- [ ] `app/app/contributions/actions.ts` - todas las funciones
- [ ] `lib/actions/user-settings.ts` - setActiveHousehold

### 6. Actualizar Componentes UI

**Componentes que muestran usuario:**
- [ ] `app/app/components/MovementsList.tsx` - Mostrar display_name
- [ ] `app/app/components/DashboardContent.tsx` - Mostrar display_name  
- [ ] `app/app/household/components/MembersList.tsx` - Mostrar display_name
- [ ] `app/app/household/components/MonthlyFundStatus.tsx` - Mostrar display_name

**Patrón recomendado:**
Usar JOIN con profiles o la view `v_transactions_with_profile`:

```typescript
// Opción 1: JOIN manual
const { data } = await supabase
  .from('transactions')
  .select(`
    *,
    profile:profiles(id, display_name, email, avatar_url)
  `)
  .eq('household_id', householdId);

// Opción 2: Usar view
const { data } = await supabase
  .from('v_transactions_with_profile')
  .select('*')
  .eq('household_id', householdId);
```

### 7. NO CAMBIAR (Excepciones)

**Estos archivos usan `user_id` correctamente apuntando a `auth.users`:**
- ✅ `system_admins` tabla - apunta directamente a auth.users
- ✅ `app/app/admin/system-admins/page.tsx`
- ✅ `app/app/admin/actions.ts` - admin management
- ✅ Todas las migraciones en `/supabase/migrations/` (son históricas)
- ✅ Documentación en `/docs/` (es referencia histórica)

### 8. Actualizar `.github/copilot-instructions.md`

- [ ] Actualizar ejemplos de código con `transactions` y `profile_id`
- [ ] Documentar el sistema de profiles
- [ ] Actualizar patrones de Server Actions

## Plan de Ejecución

### Fase 1: Core (Crítico para funcionar)
1. ✅ Migración DB aplicada
2. ✅ Tipos TypeScript regenerados
3. [ ] `lib/supabaseServer.ts` - Funciones core
4. [ ] `app/app/expenses/actions.ts` - CRUD movimientos
5. [ ] `app/app/household/actions.ts` - Gestión hogar

### Fase 2: UI (Para mostrar correctamente)
6. [ ] `app/app/components/MovementsList.tsx`
7. [ ] `app/app/components/DashboardContent.tsx`
8. [ ] `app/app/expenses/page.tsx`

### Fase 3: Features (Contribuciones, períodos)
9. [ ] `app/app/contributions/actions.ts`
10. [ ] `app/app/contributions/page.tsx`
11. [ ] `app/app/periods/actions.ts`

### Fase 4: Polish (UX mejorado)
12. [ ] Todos los componentes para mostrar `display_name`
13. [ ] Actualizar documentación
14. [ ] Testing completo

## Verificación Post-Migración

- [ ] Build exitoso (`npm run build`)
- [ ] Typecheck pasa (`npm run typecheck` si existe)
- [ ] Lint pasa (`npm run lint`)
- [ ] Login funciona
- [ ] Crear hogar funciona
- [ ] Crear gasto funciona
- [ ] Ver dashboard funciona
- [ ] Contribuciones funcionan
- [ ] Períodos funcionan

## Notas Importantes

- **profiles.id === auth.uid()** NO. `profiles.auth_user_id === auth.uid()`
- Usar `get_current_profile_id()` en RLS policies y queries
- `display_name` es el nombre a mostrar en UI, NO `email`
- La tabla `profiles` se auto-sincroniza con `auth.users` via trigger
