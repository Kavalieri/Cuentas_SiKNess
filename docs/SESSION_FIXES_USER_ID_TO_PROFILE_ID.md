# Sesión de Fixes: user_id → profile_id + RLS

**Fecha**: 4 de octubre de 2025  
**Commits**: `6189039`, `502a81d`

---

## 🎯 Resumen Ejecutivo

Auditoría completa y corrección de referencias `user_id` obsoletas tras el refactoring arquitectónico. Se corrigieron 4 archivos críticos y se arregló la política RLS faltante en `household_settings`.

---

## ✅ Fixes Aplicados

### 1. Auditoría Completa de Referencias `user_id`

**Herramienta utilizada**: Supabase CLI para inspeccionar schema real  
**Comando**: `npx supabase gen types typescript --project-id fizxvvtakvmmeflmbwud`

**Hallazgos**:

| Tabla | Campo Correcto | Status |
|-------|----------------|--------|
| `transactions` | `profile_id` (nullable) | ✅ Verificado |
| `household_members` | `profile_id` | ✅ Verificado |
| `profiles` | `auth_user_id` | ✅ Correcto |
| `system_admins` | `user_id` | ✅ Correcto (referencia directa a auth.users) |
| `member_incomes` | `profile_id` | ✅ Verificado |
| `contributions` | `profile_id` | ✅ Verificado |
| `pre_payments` | `profile_id` | ✅ Verificado |

### 2. Correcciones de Código (Commit `6189039`)

#### **A. `app/app/settings/page.tsx`**

**Problema**: Query a `household_members` con `user_id` inexistente

**Antes**:
```typescript
const { data: household } = await supabase
  .from('household_members')
  .select('household_id')
  .eq('user_id', user.id)  // ❌ Campo no existe
  .maybeSingle();
```

**Después**:
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

#### **B. `app/app/contributions/actions.ts` (2 funciones)**

**Funciones afectadas**:
1. `createPrePayment()` - Línea ~520
2. `deletePrePayment()` - Línea ~660

**Problema**: Validación de owner con `user_id` inexistente

**Patrón aplicado**:
```typescript
// Obtener profile_id del usuario
const { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('auth_user_id', user.id)
  .single();

if (!profile) return fail('Usuario no encontrado');

// Verificar que el usuario es owner
const { data: memberData } = await supabase
  .from('household_members')
  .select('role')
  .eq('household_id', householdId)
  .eq('profile_id', profile.id)  // ✅ Correcto
  .single();
```

#### **C. `app/app/expenses/actions.ts`**

**Función**: `createMovement()`

**Problema**: INSERT en `transactions` con campo `user_id` incorrecto

**Antes**:
```typescript
.insert({
  household_id: householdId,
  user_id: user.id,  // ❌ Debería ser profile_id
  category_id: parsed.data.category_id,
  // ...
})
```

**Después**:
```typescript
// Obtener profile_id del usuario
const { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('auth_user_id', user.id)
  .single();

if (!profile) {
  return fail('Usuario no encontrado');
}

.insert({
  household_id: householdId,
  profile_id: profile.id,  // ✅ Correcto
  category_id: parsed.data.category_id,
  // ...
})
```

### 3. Fix RLS en `household_settings` (Commit `502a81d`)

**Problema Reportado**:
```
new row violates row-level security policy for table "household_settings"
```

**Causa Raíz**: La tabla solo tenía políticas `SELECT` y `UPDATE`, **faltaba política `INSERT`**

**Migración creada**: `supabase/migrations/20251004010000_fix_household_settings_rls.sql`

**Políticas añadidas**:

```sql
-- INSERT: Solo owners pueden crear household settings
CREATE POLICY "Owners can insert household settings" ON household_settings
  FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id() AND role = 'owner'
    )
  );

-- UPDATE: Solo owners pueden actualizar (con WITH CHECK añadido)
CREATE POLICY "Owners can update household settings" ON household_settings
  FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id() AND role = 'owner'
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id() AND role = 'owner'
    )
  );
```

**Resultado**: Ahora los owners pueden:
- ✅ Crear la configuración inicial del hogar (INSERT)
- ✅ Modificar la meta mensual (UPDATE)
- ✅ Ver la configuración (SELECT - ya existía)

---

## 📊 Archivos Modificados

### Código (Commit `6189039`)
- `app/app/settings/page.tsx` - 1 fix
- `app/app/contributions/actions.ts` - 2 fixes
- `app/app/expenses/actions.ts` - 1 fix

### Documentación
- `docs/USER_ID_AUDIT_AND_FIXES.md` - Análisis completo de auditoría
- `docs/FIX_ADMINCHECK_PROFILE_ID.md` - Fix previo de adminCheck.ts (sesión anterior)

### Migraciones (Commit `502a81d`)
- `supabase/migrations/20251004010000_fix_household_settings_rls.sql` - Fix RLS

### Documentación de Seguimiento
- `docs/POST_AUDIT_ADJUSTMENTS.md` - Plan de acción para siguientes pasos

---

## 🧪 Verificación

### Build Status
```bash
npm run build
# ✅ Compiled successfully in 6.9s
# ✅ Linting and checking validity of types    
# ✅ 24 routes generated
```

### Migration Status
```bash
npx supabase db push
# ✅ Applying migration 20251004010000_fix_household_settings_rls.sql...
# ✅ Finished supabase db push
```

### Testing Manual Requerido

**Usuario debe verificar**:

1. ✅ **Household page accesible** (fix previo de adminCheck.ts)
2. ✅ **Configurar meta mensual** (fix RLS household_settings)
   - Ir a Hogar → Contribuciones
   - Establecer meta mensual (ej: 2000€)
   - Verificar que se guarda sin errores
3. ✅ **Crear movimiento** (fix transactions con profile_id)
   - Crear gasto o ingreso
   - Verificar que aparece en dashboard
4. ✅ **Pre-pagos** (fix contributions/actions.ts)
   - Owner puede crear pre-pago
   - Owner puede eliminar pre-pago

---

## 🔍 Lecciones Aprendidas

### 1. Usar CLI en lugar de asumir

**Antes**: Buscar en migraciones y asumir estructura  
**Después**: Usar `supabase gen types` para ver schema real  
**Resultado**: Se detectó que `transactions` existe y usa `profile_id`

### 2. Políticas RLS necesitan las 4 operaciones

Las tablas con mutaciones necesitan políticas para:
- `SELECT` - Ver datos
- `INSERT` - Crear nuevos registros ⚠️ **A menudo olvidada**
- `UPDATE` - Modificar existentes
- `DELETE` - Eliminar (opcional según caso)

### 3. Patrón de 2 pasos para profile_id

Establecer patrón estándar:
```typescript
// PASO 1: auth.uid() → profile_id
const { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('auth_user_id', user.id)
  .single();

if (!profile) return fail('Usuario no encontrado');

// PASO 2: Usar profile.id en queries
const { data } = await supabase
  .from('tabla')
  .select('*')
  .eq('profile_id', profile.id);
```

### 4. Validar creación de profiles

**Issue detectado**: Usuario `fumetas.sik` creado automáticamente sin onboarding

**Solución propuesta** (en `docs/POST_AUDIT_ADJUSTMENTS.md`):
- Añadir flag `onboarding_completed` en profiles
- Modificar trigger para validar `confirmed_at` antes de crear profile
- Implementar query de "perfiles huérfanos"
- Opcional: Cleanup job periódico

---

## 📋 Pendientes (Siguiente Sesión)

### 1. Mover Ingresos al Perfil de Usuario ⚠️ PRIORITARIO

**Razón**: Los ingresos son personales del usuario, no específicos del hogar

**Plan**:
1. Crear tabla `user_incomes` o campo en `profiles`
2. Migrar datos de `member_incomes`
3. Actualizar UI en `/app/profile`
4. Eliminar de `/app/contributions`
5. Actualizar `calculate_monthly_contributions()`

**Estimación**: 2-3 horas

### 2. Investigar Usuario `fumetas.sik`

**Acciones**:
1. Verificar origen (auth.users manual o trigger)
2. Verificar si tiene household
3. Decidir: eliminar o completar onboarding
4. Implementar robustez (flag `onboarding_completed`)

**Estimación**: 30 minutos

### 3. Session 3: Contributions Professional UI

**Después** de mover ingresos al perfil:
1. Diseñar componentes profesionales
2. Implementar con Recharts + Framer Motion
3. Integrar con sistema actualizado
4. Testing completo

**Estimación**: 4-5 horas

---

## 🔗 Referencias

- **Commit auditoría**: `6189039` - "fix: actualizar todas las referencias user_id → profile_id en queries"
- **Commit RLS**: `502a81d` - "fix: añadir política RLS INSERT para household_settings"
- **Documentación**:
  - `docs/USER_ID_AUDIT_AND_FIXES.md` - Análisis técnico detallado
  - `docs/POST_AUDIT_ADJUSTMENTS.md` - Plan de siguientes pasos
  - `docs/FIX_ADMINCHECK_PROFILE_ID.md` - Fix previo de adminCheck.ts
- **Schema real**: Usar `npx supabase gen types typescript --project-id <id>`

---

**Status**: ✅ Auditoría completa | ✅ Fixes aplicados | ✅ RLS corregido  
**Siguiente**: Mover ingresos a perfil + Session 3 UI profesional  
**Testing**: Usuario debe verificar las 4 funcionalidades listadas arriba
