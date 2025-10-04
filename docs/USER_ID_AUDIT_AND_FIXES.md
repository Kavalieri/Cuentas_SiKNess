# Auditoría y Fixes de user_id vs profile_id

## 📋 Análisis Completo del Esquema

### Tablas que DEBEN usar `profile_id` (referencia a `profiles.id`)

Después del refactoring `20251003230000_refactor_database_architecture.sql`:

1. ✅ **household_members** - Usa `profile_id` (FK a profiles.id)
2. ✅ **transactions** (antes movements) - Usa `profile_id`
3. ✅ **member_incomes** - Usa `profile_id`
4. ✅ **contributions** - Usa `profile_id`
5. ✅ **pre_payments** - Usa `profile_id`
6. ✅ **contribution_adjustments** - Usa `profile_id`

### Tablas que DEBEN usar `user_id` (referencia directa a `auth.users.id`)

Estas tablas NO pasaron por el refactoring porque necesitan referenciar directamente auth.users:

1. ✅ **system_admins** - Usa `user_id` (referencia a auth.users.id)
   - Razón: Sistema de autenticación, no pertenece a profiles

2. ✅ **profiles** - Usa `auth_user_id` (referencia a auth.users.id)
   - Razón: Es el enlace entre auth y profiles

### Políticas RLS que usan `user_id` (PENDIENTES DE ACTUALIZAR)

El archivo `db/schema.sql` tiene políticas RLS antiguas que aún usan `user_id`:

```sql
-- ❌ INCORRECTO - Política en categories
create policy "read_categories" on categories for select using (
  exists (
    select 1 from household_members hm
    where hm.household_id = categories.household_id
      and hm.user_id = auth.uid()  -- ❌ Debería ser profile_id
  )
);
```

**Nota**: Estas políticas fueron recreadas en las migraciones. El archivo `db/schema.sql` es solo referencia histórica.

## 🔍 Archivos de Código con Referencias a `user_id`

### CRÍTICOS - Requieren Fix Inmediato ⚠️

#### 1. `app/app/settings/page.tsx` (línea 24)

**Problema**:
```typescript
const { data: household } = await supabase
  .from('household_members')
  .select('household_id')
  .eq('user_id', user.id)  // ❌ Campo user_id no existe
  .maybeSingle();
```

**Fix**:
```typescript
// Obtener profile_id
const { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('auth_user_id', user.id)
  .single();

if (!profile) {
  redirect('/login');
}

const { data: household } = await supabase
  .from('household_members')
  .select('household_id')
  .eq('profile_id', profile.id)  // ✅ Correcto
  .maybeSingle();
```

#### 2. `app/app/contributions/actions.ts` (2 ocurrencias)

**Problema 1 (línea 523)**:
```typescript
const { data: memberData } = await supabase
  .from('household_members')
  .select('role')
  .eq('household_id', parsed.data.household_id)
  .eq('user_id', user.id)  // ❌ Campo no existe
  .single();
```

**Problema 2 (línea 659)**:
```typescript
const { data: memberData } = await supabase
  .from('household_members')
  .select('role')
  .eq('household_id', prePayment.household_id)
  .eq('user_id', user.id)  // ❌ Campo no existe
  .single();
```

**Fix para ambos**:
```typescript
// Obtener profile_id
const { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('auth_user_id', user.id)
  .single();

if (!profile) return fail('Usuario no encontrado');

const { data: memberData } = await supabase
  .from('household_members')
  .select('role')
  .eq('household_id', parsed.data.household_id)
  .eq('profile_id', profile.id)  // ✅ Correcto
  .single();
```

### CORRECTOS - No requieren cambios ✅

#### 1. `lib/adminCheck.ts` - `isSystemAdmin()` (línea 22-23)

**Código actual**:
```typescript
const { data, error } = await supabase
  .from('system_admins')
  .select('user_id')
  .eq('user_id', user.id)  // ✅ CORRECTO
  .single();
```

**Razón**: La tabla `system_admins` usa `user_id` que referencia directamente a `auth.users.id`.

#### 2. `app/app/admin/users/page.tsx` (líneas 22, 56, 60)

**Código actual**:
```typescript
const { data: isAdmin } = await supabase
  .from('system_admins')
  .select('user_id')
  .eq('user_id', user.id)  // ✅ CORRECTO
  .single();
```

**Razón**: Consulta a `system_admins` que usa `user_id`.

#### 3. `app/app/admin/actions.ts` (línea 246)

**Código actual**:
```typescript
const { error } = await supabase
  .from('system_admins')
  .delete()
  .eq('user_id', user_id);  // ✅ CORRECTO
```

**Razón**: Operación en `system_admins`.

### DUDOSO - Requiere Verificación 🤔

#### `app/app/expenses/actions.ts` (línea 49)

**Código actual**:
```typescript
const { data, error } = await supabase
  .from('transactions')
  .insert({
    household_id: householdId,
    user_id: user.id,  // 🤔 ¿Correcto o debería ser profile_id?
    category_id: parsed.data.category_id,
    // ...
  });
```

**Investigación necesaria**: 
- Verificar schema de `transactions` en migraciones
- Si la tabla fue renombrada de `movements`, debería usar `profile_id`

## 🎯 Plan de Acción

### Fix 1: app/app/settings/page.tsx ⚠️ CRÍTICO

**Archivo**: `app/app/settings/page.tsx`  
**Líneas**: 15-30  
**Cambio**: Añadir lookup de profile_id antes de consultar household_members

### Fix 2: app/app/contributions/actions.ts ⚠️ CRÍTICO

**Archivo**: `app/app/contributions/actions.ts`  
**Función 1**: `createPrePayment()` línea ~523  
**Función 2**: `deletePrePayment()` línea ~659  
**Cambio**: Añadir lookup de profile_id en ambas funciones

### Fix 3: app/app/expenses/actions.ts 🤔 INVESTIGAR

**Archivo**: `app/app/expenses/actions.ts`  
**Línea**: ~49  
**Acción**: 
1. Verificar schema de `transactions` en migrations
2. Si usa `profile_id`, hacer lookup y cambiar
3. Si usa `user_id`, dejar como está

## 📊 Estado Actual

### Archivos Revisados

- ✅ `lib/adminCheck.ts` - Verificado, system_admins usa user_id correctamente
- ✅ `app/app/admin/users/page.tsx` - Correcto, usa system_admins
- ✅ `app/app/admin/actions.ts` - Correcto, usa system_admins
- ⚠️ `app/app/settings/page.tsx` - REQUIERE FIX
- ⚠️ `app/app/contributions/actions.ts` - REQUIERE FIX (2 lugares)
- 🤔 `app/app/expenses/actions.ts` - REQUIERE INVESTIGACIÓN

### Archivos Documentación

Todos los archivos en `docs/` contienen ejemplos históricos y no requieren cambios.

## 🚀 Siguiente Paso

Después de aplicar estos fixes, el usuario solicitó:

1. **Mover configuración de ingresos** de hogar/contribución → perfil de usuario
2. **Fix RLS en household_settings**: Error "new row violates row-level security policy"
3. **Trabajar en Session 3**: Contributions Professional UI

---

**Status**: Análisis completo ✅  
**Pending**: Aplicar 3 fixes + verificar transactions schema
