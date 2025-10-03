# Mejoras de Sistema - Gestión Automática y Panel Admin

## Fecha: 2025-10-03

## Cambios Implementados

### 1. ✅ Categorías por Defecto Automáticas

**Problema**: Las categorías stock solo existían en `seed.sql`, no se garantizaba su creación.

**Solución**:
- ✅ Migración `20251003000000_create_default_categories_function.sql`
- ✅ Función `create_default_categories(household_id)` ahora está en DB permanentemente
- ✅ Se llama automáticamente desde `create_household_with_member()`
- ✅ Cada nuevo household siempre tendrá las 10 categorías base:
  - **Gastos**: Vivienda, Luz, Internet, Supermercado, Butano, Transporte, Ocio, Salud
  - **Ingresos**: Nómina, Extra

**Resultado**: No importa si haces wipe o no, TODOS los households futuros tendrán categorías stock.

---

### 2. ✅ Logging Mejorado en Creación de Households

**Problema**: Si `create_household_with_member` fallaba, no sabíamos dónde ni por qué.

**Solución**:
- ✅ Migración `20251003000001_improve_household_creation_with_logging.sql`
- ✅ Función mejorada con `RAISE NOTICE` en cada paso:
  - Inicio con user_id y nombre
  - Household creado con ID
  - Usuario agregado como owner
  - Verificación de inserción exitosa
  - Categorías creadas
  - Resultado final JSON
- ✅ Mejor manejo de errores con contexto completo

**Resultado**: Si algo falla, veremos exactamente en qué paso y por qué en los logs de Supabase.

---

### 3. ✅ Gestión de Miembros desde Panel Admin

**Problema**: No se podía agregar/quitar usuarios de households manualmente desde admin.

**Solución**:
- ✅ Migración `20251003000002_admin_member_management.sql`
- ✅ Función `admin_add_member_to_household(household_id, user_id, role)`
  - Solo para system admins (SECURITY DEFINER + check)
  - Valida que household y usuario existan
  - Previene duplicados
  - Retorna JSON con resultado
- ✅ Función `admin_remove_member_from_household(household_id, user_id)`
  - Solo para system admins
  - Protege contra eliminar último owner
  - Retorna JSON con resultado
- ✅ Server Actions en `app/app/admin/actions.ts`:
  - `adminAddMemberToHousehold(formData)`
  - `adminRemoveMemberFromHousehold(formData)`
  - Validación con Zod
  - Revalidación de paths afectados

**Resultado**: Los admins pueden arreglar problemas de membresía directamente desde el panel.

---

## Pasos para Aplicar

### 1. Ejecutar Migraciones en Supabase

```bash
# Opción A: Usar Supabase CLI (recomendado)
npx supabase db push

# Opción B: Manual en Supabase SQL Editor
# Ejecutar en orden:
# 1. supabase/migrations/20251003000000_create_default_categories_function.sql
# 2. supabase/migrations/20251003000001_improve_household_creation_with_logging.sql
# 3. supabase/migrations/20251003000002_admin_member_management.sql
```

### 2. Regenerar Tipos TypeScript

```bash
# Generar tipos actualizados con las nuevas funciones RPC
npx supabase gen types typescript --project-id fizxvvtakvmmeflmbwud > types/database.ts

# O usar la tarea configurada
npm run gen:types
```

### 3. Verificar Compilación

```bash
npm run build
```

---

## Casos de Uso

### A. Crear Nuevo Household (Usuario Normal)

```typescript
// En Server Action
const result = await supabase.rpc('create_household_with_member', {
  p_household_name: 'Mi Casa',
  p_user_id: user.id
});

// Resultado automático:
// ✅ Household creado
// ✅ Usuario agregado como owner
// ✅ 10 categorías stock creadas
// ✅ Logs completos en Supabase
```

### B. Agregar Usuario a Household (Admin Panel)

```typescript
// Desde admin panel
const formData = new FormData();
formData.append('household_id', 'uuid-del-household');
formData.append('user_id', 'uuid-del-usuario');
formData.append('role', 'member'); // o 'owner'

const result = await adminAddMemberToHousehold(formData);

if (result.ok) {
  toast.success('Usuario agregado al household');
  // result.data contiene: household_name, user_email, role
}
```

### C. Remover Usuario de Household (Admin Panel)

```typescript
// Desde admin panel
const formData = new FormData();
formData.append('household_id', 'uuid-del-household');
formData.append('user_id', 'uuid-del-usuario');

const result = await adminRemoveMemberFromHousehold(formData);

if (result.ok) {
  toast.success('Usuario removido del household');
}
// Si era el último owner, lanzará error automáticamente
```

### D. Hacer Wipe + Crear Household Nuevo

```bash
# 1. Admin ejecuta wipe desde panel
# Se eliminan TODOS los households, movimientos, categorías, etc.

# 2. Usuario hace login y crea nuevo household
# El sistema automáticamente:
# - Crea household
# - Agrega usuario como owner
# - ✅ Genera las 10 categorías stock SIN intervención manual
```

---

## Validación Post-Deploy

### Checklist de Testing

**Creación Automática de Household**:
- [ ] Usuario nuevo se registra
- [ ] Crea su primer household
- [ ] Verifica en /app/household → Categorías tab
- [ ] Debe ver las 10 categorías stock automáticamente

**Admin Panel - Agregar Miembro**:
- [ ] Ir a /app/admin/users
- [ ] Seleccionar usuario sin household
- [ ] Clic en "Agregar a Household"
- [ ] Seleccionar household y rol
- [ ] Confirmar → Usuario aparece en household

**Admin Panel - Remover Miembro**:
- [ ] Ir a /app/admin/households
- [ ] Ver miembros de un household
- [ ] Remover member (no owner)
- [ ] Confirmar → Usuario ya no aparece
- [ ] Intentar remover último owner → Error protegido

**Logging**:
- [ ] Ir a Supabase Dashboard → Logs
- [ ] Crear nuevo household
- [ ] Ver logs `[create_household_with_member]` con todos los pasos
- [ ] Verificar que se logueó creación de categorías

---

## Protecciones Implementadas

### Sistema de Seguridad

1. **SECURITY DEFINER**: Las funciones admin bypasean RLS
2. **Verificación is_system_admin()**: Primero valida permisos
3. **Validación Zod**: Server Actions validan input antes de RPC
4. **Protección Último Owner**: No se puede eliminar si es el único owner
5. **Detección Duplicados**: No permite agregar usuario que ya es miembro
6. **Logs Detallados**: RAISE NOTICE en cada paso crítico

### Flujo de Permisos

```
Usuario → Server Action → Validación Zod
                              ↓
                         isSystemAdmin() check
                              ↓
                    Función SQL (SECURITY DEFINER)
                              ↓
                    is_system_admin(auth.uid()) check
                              ↓
                         Operación DB
                              ↓
                      RAISE NOTICE logs
                              ↓
                        Retorna JSON
```

---

## Próximos Pasos

### Inmediato (Testing)
1. [ ] Ejecutar migraciones: `npx supabase db push`
2. [ ] Regenerar tipos: `npm run gen:types`
3. [ ] Ejecutar script fix_missing_member.sql (una sola vez, para ti)
4. [ ] Configurar SUPABASE_SERVICE_ROLE_KEY en .env.local
5. [ ] Verificar que todo compila: `npm run build`
6. [ ] Probar creación de household con categorías automáticas
7. [ ] Probar agregar/remover miembros desde admin panel

### UI Pendiente (Opcional)
- [ ] Crear componente `AddMemberDialog` en `/app/admin/users`
- [ ] Crear componente `ManageMembersDialog` en `/app/admin/households`
- [ ] Agregar botones en las páginas correspondientes
- [ ] Implementar formularios con Zod + React Hook Form

### Deploy
1. [ ] Commit de migraciones y Server Actions
2. [ ] Push a GitHub
3. [ ] Deploy a Vercel
4. [ ] Ejecutar migraciones en producción
5. [ ] Configurar SERVICE_ROLE_KEY en Vercel env vars
6. [ ] Testing en producción

---

## Notas Importantes

### ¿Por Qué NO Regenerar Categorías en Wipe?

**Antes (mal)**: "Wipe elimina todo → Regenerar categorías para... ¿qué households?"
**Ahora (bien)**: "Wipe elimina todo → Los FUTUROS households tendrán categorías automáticamente"

**La clave**: Las categorías se crean **al crear el household**, no después del wipe.

### ¿Por Qué Necesitamos Funciones Admin?

Antes, si un usuario no aparecía en household_members:
- ❌ Había que ir a Supabase SQL Editor
- ❌ Escribir INSERT manual
- ❌ Buscar UUIDs a mano
- ❌ Sin validaciones

Ahora:
- ✅ Admin panel → Seleccionar usuario → Agregar a household
- ✅ Validaciones automáticas
- ✅ Protecciones de seguridad
- ✅ Logs detallados
- ✅ UI amigable (cuando la implementemos)

---

## Archivos Modificados

### Nuevas Migraciones SQL
- ✅ `supabase/migrations/20251003000000_create_default_categories_function.sql`
- ✅ `supabase/migrations/20251003000001_improve_household_creation_with_logging.sql`
- ✅ `supabase/migrations/20251003000002_admin_member_management.sql`

### Server Actions
- ✅ `app/app/admin/actions.ts` - Agregadas funciones:
  - `adminAddMemberToHousehold()`
  - `adminRemoveMemberFromHousehold()`

### Documentación
- ✅ Este archivo: `docs/AUTO_CATEGORIES_AND_ADMIN_MANAGEMENT.md`
