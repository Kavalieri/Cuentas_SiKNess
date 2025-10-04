# Fix: adminCheck.ts - Migration to profile_id

## 🐛 Bug Crítico Detectado

**Fecha**: 2025-01-XX  
**Reportado por**: Usuario en testing post Session 1 (Professional Charts)  
**Severidad**: CRÍTICA - Bloqueaba acceso completo a gestión de hogar

## 📋 Síntoma

Al hacer clic en la pestaña "Hogar" en la navegación, el sistema redireccionaba automáticamente a `/app/household/create` a pesar de que el usuario **YA TENÍA un household creado y asignado**.

**Comportamiento esperado**: Mostrar página de gestión del hogar con tabs (Resumen, Miembros, Categorías, Contribuciones, Configuración)

**Comportamiento real**: Redirect 307 a página de creación

## 🔍 Análisis del Problema

### Root Cause

El archivo `lib/adminCheck.ts` **NO fue actualizado** durante el refactoring masivo de `user_id` → `profile_id` en las sesiones previas.

**Contexto del Refactoring Previo**:
- En sesiones anteriores se migraron 31 archivos del sistema
- Se cambió el esquema de autenticación de:
  ```
  ANTES: auth.users.id → household_members.user_id
  DESPUÉS: auth.users.id → profiles.auth_user_id → profiles.id (profile_id) → household_members.profile_id
  ```
- `lib/adminCheck.ts` fue **omitido por error** en este refactoring

### Funciones Afectadas

Tres funciones críticas en `adminCheck.ts` estaban rompiendo:

#### 1. `isOwner()` (línea 37-60)
```typescript
// ❌ CÓDIGO INCORRECTO (antes del fix)
const { data, error } = await supabase
  .from('household_members')
  .select('role')
  .eq('user_id', user.id)  // ❌ Campo user_id no existe en household_members
  .single();
```

**Impacto**: 
- Retornaba `false` siempre
- Owner no podía ejecutar acciones privilegiadas (invitar miembros, cambiar settings)

#### 2. `getCurrentHouseholdId()` (línea 67-90)
```typescript
// ❌ CÓDIGO INCORRECTO (antes del fix)
const { data, error } = await supabase
  .from('household_members')
  .select('household_id')
  .eq('user_id', user.id)  // ❌ Campo user_id no existe
  .single();
```

**Impacto**: 
- Retornaba `null` siempre
- `household/page.tsx` checkeaba: `if (!householdId) redirect('/app/household/create')`
- **Usuario con household válido era redirigido a página de creación**
- UX desastrosa: usuario pensaba que había perdido su hogar

#### 3. `getCurrentUserMembership()` (línea 95-125)
```typescript
// ❌ CÓDIGO INCORRECTO (antes del fix)
const { data, error } = await supabase
  .from('household_members')
  .select('household_id, role')
  .eq('user_id', user.id)  // ❌ Campo user_id no existe
  .single();
```

**Impacto**:
- Retornaba `null` siempre
- Funcionalidades dependientes (invitaciones, permisos) no funcionaban

### Por Qué No Se Detectó Antes

1. **Archivo de utilidades aislado**: `adminCheck.ts` no está en los directorios principales de features (`expenses/`, `household/`, etc.)
2. **Testing manual limitado**: El household ya estaba creado y asignado en sesiones previas
3. **No hay tests unitarios** (todavía) para estas funciones
4. **Refactoring por grep**: Se buscaron archivos con `user_id` pero este archivo pudo pasarse por alto

## ✅ Solución Implementada

### Patrón Aplicado

Todas las funciones ahora siguen el patrón de 2 pasos:

```typescript
// ✅ CÓDIGO CORRECTO (después del fix)

// PASO 1: Obtener profile_id desde auth_user_id
const { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('auth_user_id', user.id)
  .single();

if (!profile) {
  return null; // o false según contexto
}

// PASO 2: Buscar en household_members usando profile_id
const { data, error } = await supabase
  .from('household_members')
  .select('...')
  .eq('profile_id', profile.id)  // ✅ Campo correcto
  .single();
```

### Cambios Específicos

#### `isOwner()`
```typescript
export async function isOwner(): Promise<boolean> {
  const supabase = await supabaseServer();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // ✅ PASO 1: Obtener profile_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (!profile) return false;

  // ✅ PASO 2: Verificar rol usando profile_id
  const { data, error } = await supabase
    .from('household_members')
    .select('role')
    .eq('profile_id', profile.id)
    .single();

  if (error || !data) return false;
  return data.role === 'owner';
}
```

#### `getCurrentHouseholdId()`
```typescript
export async function getCurrentHouseholdId(): Promise<string | null> {
  const supabase = await supabaseServer();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // ✅ PASO 1: Obtener profile_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (!profile) return null;

  // ✅ PASO 2: Buscar household usando profile_id
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('profile_id', profile.id)
    .single();

  if (error || !data) return null;
  return data.household_id;
}
```

#### `getCurrentUserMembership()`
```typescript
export async function getCurrentUserMembership(): Promise<{
  userId: string;
  profileId: string;  // ✅ Añadido al return type
  householdId: string;
  role: 'owner' | 'member';
} | null> {
  const supabase = await supabaseServer();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // ✅ PASO 1: Obtener profile_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (!profile) return null;

  // ✅ PASO 2: Buscar membership usando profile_id
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('profile_id', profile.id)
    .single();

  if (error || !data) return null;

  return {
    userId: user.id,
    profileId: profile.id,  // ✅ Incluido en respuesta
    householdId: data.household_id,
    role: data.role as 'owner' | 'member',
  };
}
```

### Cambio en Return Type

**`getCurrentUserMembership()` ahora retorna `profileId`**:

```typescript
// ANTES
{
  userId: string;
  householdId: string;
  role: 'owner' | 'member';
}

// DESPUÉS
{
  userId: string;
  profileId: string;  // ✅ NUEVO
  householdId: string;
  role: 'owner' | 'member';
}
```

Esto es útil para llamadas posteriores que necesiten el `profile_id` sin hacer otra consulta.

## 🧪 Verificación

### Build Status
```bash
npm run build
# ✅ Compiled successfully in 11.0s
# ✅ Linting and checking validity of types    
# ✅ 24 routes generated
```

### Git Commit
```bash
git commit -m "fix: update adminCheck.ts to use profile_id instead of user_id"
# Commit: 7c5f9b7
```

### Testing Manual Requerido

**Usuario debe hacer las siguientes pruebas**:

1. **Cerrar sesión completamente**
2. **Reloguear con magic link** (importante: refresca la sesión)
3. **Click en "Hogar"** → Debería mostrar página de gestión (NO redirect)
4. **Verificar tabs funcionan**:
   - ✅ Resumen (Overview)
   - ✅ Miembros (Members list)
   - ✅ Categorías (Categories management)
   - ✅ Contribuciones (Contributions system)
   - ✅ Configuración (Settings + Danger Zone)
5. **Si es owner**: Probar acciones privilegiadas
   - ✅ Crear invitación
   - ✅ Eliminar miembro
   - ✅ Cambiar nombre del hogar
   - ✅ Ver Danger Zone

### Por Qué Reloguear

La caché de Supabase en el cliente puede tener datos antiguos. Un **relogin completo**:
1. Limpia la sesión del navegador
2. Reconstruye el token JWT
3. Refresca las políticas RLS
4. Elimina cualquier caché de queries previas

## 📊 Impacto del Fix

### Funcionalidad Restaurada

| Feature | Estado Antes | Estado Después |
|---------|-------------|----------------|
| Acceso a household page | ❌ Redirect loop | ✅ Acceso normal |
| `isOwner()` checks | ❌ Siempre `false` | ✅ Funciona correctamente |
| `getCurrentHouseholdId()` | ❌ Siempre `null` | ✅ Retorna ID correcto |
| Invitaciones (owner only) | ❌ Bloqueado | ✅ Funcional |
| Danger Zone (owner only) | ❌ No visible | ✅ Visible para owners |
| Cambiar settings | ❌ Bloqueado | ✅ Funcional |

### Áreas Afectadas

**Archivos que dependen de `adminCheck.ts`**:
1. `app/app/household/page.tsx` - **CRÍTICO**: Validación principal
2. `app/app/household/components/*` - Componentes que usan `isOwner()`
3. `app/app/household/invitations/actions.ts` - Creación de invitaciones
4. Cualquier acción Server que valide permisos de owner

## 🎓 Lecciones Aprendidas

### Para Futuros Refactorings

1. **Buscar exhaustivamente**: 
   ```bash
   # No solo grep por el campo
   grep -r "user_id" .
   
   # También buscar archivos que USEN las funciones afectadas
   grep -r "getCurrentHouseholdId\|isOwner\|getCurrentUserMembership" .
   ```

2. **Crear migration checklist**: Documentar todos los archivos que deben cambiarse

3. **Tests unitarios**: Escribir tests para utilities críticas como `adminCheck.ts`

4. **Testing E2E básico**: Smoke tests que cubran flujos principales

### Red Flags que Detectar

- ✅ Funciones que retornan `null` siempre (revisar queries)
- ✅ Redirect loops (indicador de validaciones rotas)
- ✅ Archivos de utilidades aislados (fáciles de olvidar en refactorings)
- ✅ Cambios en esquema DB sin actualizar tipos TypeScript

## 📝 Próximos Pasos Sugeridos

1. ✅ **Fix aplicado y commiteado** (7c5f9b7)
2. ⏳ **Usuario debe reloguear** para probar
3. ⏳ **Verificar todas las tabs** del household funcionan
4. ⏳ **Escribir tests unitarios** para `adminCheck.ts` (evitar regresiones)
5. ⏳ **Documentar patrón profile_id** en copilot-instructions.md

## 🔗 Referencias

- Commit del fix: `7c5f9b7`
- Sesión previa: Session 1 - Professional Charts (commits `f43e70a`, `1f08668`)
- Schema DB: `db/schema.sql` (línea donde se define `household_members`)
- Refactoring context: Previous sessions migrated 31 files from `user_id` to `profile_id`

---

**Status**: ✅ FIX APLICADO  
**Awaiting**: Usuario debe reloguear y verificar funcionamiento  
**Next Session**: Continuar con Session 2 (Insights) o Session 3 (Contributions) tras confirmar fix
