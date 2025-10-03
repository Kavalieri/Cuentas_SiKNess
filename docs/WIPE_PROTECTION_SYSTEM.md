# Sistema de Wipe con Protección de Administradores Permanentes

## 📋 Resumen

Se ha implementado un sistema de limpieza (wipe) completo con **protección de administradores permanentes del sistema**. Esto permite limpiar datos de testing/desarrollo sin perder los permisos de administración.

## 🔐 Protecciones Implementadas

### Datos Protegidos (NUNCA se eliminan)

- **`auth.users`** - Cuentas de usuario (gestionadas por Supabase Auth)
- **`system_admins`** - Administradores permanentes del sistema

### Datos Eliminables

- `households` - Hogares
- `household_members` - Membresías
- `movements` - Movimientos (gastos/ingresos)
- `categories` - Categorías
- `contributions` - Contribuciones
- `contribution_adjustments` - Ajustes de contribuciones
- `member_incomes` - Ingresos de miembros
- `household_settings` - Configuración de hogares

## 🛠️ Funciones SQL Implementadas

### 1. `wipe_system_data()`

**Propósito**: Limpia TODOS los datos del sistema excepto `auth.users` y `system_admins`.

**Permisos**: Solo `system_admins`

**Uso**:
```sql
SELECT wipe_system_data();
```

**Retorna**:
```json
{
  "movements": 150,
  "contributions": 24,
  "categories": 18,
  "household_members": 4,
  "households": 2,
  "system_admins_protected": true
}
```

**Características**:
- Elimina en orden correcto (respeta cascadas de FK)
- Protege administradores permanentes
- Retorna contadores de registros eliminados
- Verificación de permisos con `is_system_admin(auth.uid())`

### 2. `restore_to_stock()`

**Propósito**: Limpia TODO el sistema + requiere seed manual posterior.

**Permisos**: Solo `system_admins`

**Uso**:
```sql
SELECT restore_to_stock();
```

**Retorna**:
```json
{
  "wipe_result": { "movements": 150, ... },
  "note": "Sistema restaurado. Ejecuta seed.sql manualmente para categorías por defecto"
}
```

**Características**:
- Llama a `wipe_system_data()` internamente
- NO reseed automático (requiere `db/seed.sql` manual)
- Ideal para desarrollo/testing
- Fuerza re-onboarding a todos los usuarios

## 📡 Server Actions

### `wipeSystemData(formData: FormData)`

**Ruta**: `app/app/admin/actions.ts`

**Permisos**: Solo `system_admins`

**Validación**:
- Usuario debe ser system admin
- Requiere confirmación exacta: `"ELIMINAR TODO"`
- Validación con Zod schema

**Uso desde componente**:
```tsx
const formData = new FormData();
formData.append('confirmation', 'ELIMINAR TODO');

const result = await wipeSystemData(formData);

if (!result.ok) {
  toast.error(result.message);
} else {
  toast.success('Sistema limpiado correctamente');
}
```

### `restoreToStock(formData: FormData)`

**Ruta**: `app/app/admin/actions.ts`

**Permisos**: Solo `system_admins`

**Validación**:
- Usuario debe ser system admin
- Requiere confirmación exacta: `"ELIMINAR TODO"`
- Validación con Zod schema

**Uso desde componente**:
```tsx
const formData = new FormData();
formData.append('confirmation', 'ELIMINAR TODO');

const result = await restoreToStock(formData);

if (!result.ok) {
  toast.error(result.message);
} else {
  toast.success('Sistema restaurado a stock');
}
```

### `wipeHouseholdData(formData: FormData)` (Existente)

**Ruta**: `app/app/admin/actions.ts`

**Permisos**: Solo `owners` del household

**Validación**:
- Usuario debe ser owner del household
- Requiere confirmación exacta: `"ELIMINAR TODO"`
- Validación con Zod schema

**Uso**: Limpia solo los datos del household específico (no global).

## 🎨 UI Implementada

### 1. Dashboard de Admin (`/app/admin`)

**Ubicación**: `app/app/admin/page.tsx`

**Acceso**: Solo `system_admins`

**Secciones**:

#### Estadísticas Globales
- Hogares totales
- Usuarios (membresías)
- Categorías totales
- Movimientos totales

#### Herramientas de Desarrollo
- **Restaurar a Stock** → `/app/admin/tools/restore-stock`
  - Border rojo (destructive)
  - Limpia TODO + requiere seed manual
- **Limpiar Datos** → `/app/admin/wipe`
  - Border amarillo (warning)
  - Limpia datos de hogares específicos (funcionalidad legacy para owners)

### 2. Restore to Stock Page (`/app/admin/tools/restore-stock`)

**Ubicación**: `app/app/admin/tools/restore-stock/page.tsx`

**Acceso**: Solo `system_admins`

**Características**:
- ⚠️ Advertencia crítica destacada
- Lista detallada de datos eliminados
- Card verde con datos protegidos (users + admins)
- Card amarilla con instrucciones post-restore
- Input de confirmación (`"ELIMINAR TODO"`)
- Botón deshabilitado hasta confirmación correcta
- Toast de éxito/error
- Redirección al dashboard tras éxito

### 3. Wipe Household Page (`/app/admin/wipe`)

**Ubicación**: `app/app/admin/wipe/page.tsx`

**Acceso**: `owners` del household

**Características**:
- Lista de datos eliminados del household
- Lista de datos que se mantienen
- Input de confirmación (`"ELIMINAR TODO"`)
- Botón deshabilitado hasta confirmación correcta
- Toast de éxito/error
- Nota informativa: "Para wipe global, usa Restore to Stock"

## 🔄 Flujo de Uso

### Scenario 1: Limpiar Datos de Testing (Desarrollo)

1. **Login** como system admin
2. Navegar a `/app/admin`
3. Click en **"Restaurar a Stock"**
4. Leer advertencias
5. Escribir `ELIMINAR TODO` en el input
6. Click en **"Confirmar Restore to Stock"**
7. Esperar toast de éxito
8. Sistema redirige a `/app/admin`
9. **MANUALMENTE**: Ejecutar `db/seed.sql` en Supabase SQL Editor si se necesitan categorías por defecto

### Scenario 2: Limpiar Solo un Hogar (Owner)

1. **Login** como owner del hogar
2. Navegar a `/app/admin/wipe` (si es owner)
3. Leer advertencias
4. Escribir `ELIMINAR TODO` en el input
5. Click en **"Limpiar Datos"**
6. Esperar toast de éxito
7. Sistema redirige a `/app/admin`
8. **AUTOMÁTICO**: Categorías por defecto se recrean automáticamente

## 🛡️ Admin Permanente Protegido

### Configuración Actual

**Email**: `caballeropomes@gmail.com`

**Ubicación**: `supabase/migrations/20251003000000_create_system_admins.sql`

**Código**:
```sql
DO $$
DECLARE admin_user_id UUID;
BEGIN
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'caballeropomes@gmail.com';
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO system_admins (user_id, notes)
    VALUES (admin_user_id, 'Administrador permanente del sistema - Auto-asignado')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;
```

**Comportamiento**:
- ✅ Se ejecuta automáticamente al aplicar la migración
- ✅ Si el usuario existe, se inserta en `system_admins`
- ✅ Si el usuario no existe, no falla (se inserta cuando se cree)
- ✅ Si ya existe el admin, no hace nada (`ON CONFLICT DO NOTHING`)
- ✅ **NO se elimina nunca** con `wipe_system_data()` ni `restore_to_stock()`

### Cómo Agregar Más Admins Permanentes

**Opción 1: Editar la migración (antes de aplicar)**

Editar `supabase/migrations/20251003000000_create_system_admins.sql`:

```sql
DO $$
DECLARE admin_user_id UUID;
BEGIN
  -- Admin 1
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin1@example.com';
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO system_admins (user_id, notes)
    VALUES (admin_user_id, 'Administrador permanente del sistema')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  -- Admin 2
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin2@example.com';
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO system_admins (user_id, notes)
    VALUES (admin_user_id, 'Administrador permanente del sistema')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;
```

**Opción 2: SQL directo (después de aplicar la migración)**

Ejecutar en Supabase SQL Editor:

```sql
INSERT INTO system_admins (user_id, notes)
SELECT id, 'Administrador permanente del sistema'
FROM auth.users 
WHERE email = 'nuevo.admin@example.com'
ON CONFLICT (user_id) DO NOTHING;
```

## 📁 Archivos Modificados/Creados

### Migración
- ✅ `supabase/migrations/20251002222103_wipe_functions.sql` (NUEVO)
  - `wipe_system_data()` function
  - `restore_to_stock()` function

### Server Actions
- ✅ `app/app/admin/actions.ts` (ACTUALIZADO)
  - `wipeSystemData()` action (NUEVO)
  - `restoreToStock()` action (NUEVO)
  - `wipeHouseholdData()` action (EXISTENTE)

### UI
- ✅ `app/app/admin/tools/restore-stock/page.tsx` (NUEVO)
- ✅ `app/app/admin/wipe/page.tsx` (ACTUALIZADO - agregada nota informativa)
- ✅ `app/app/admin/page.tsx` (EXISTENTE - ya tenía links a estas páginas)

### Tipos
- ✅ `types/database.ts` (REGENERADO)
  - Tipos para `wipe_system_data` function
  - Tipos para `restore_to_stock` function

## 🧪 Testing

### Test Manual - Wipe Global

1. Crear datos de prueba:
   - Crear 2 hogares
   - Crear 10 movimientos
   - Crear 5 categorías personalizadas
   - Configurar contribuciones

2. Verificar admin existe:
   ```sql
   SELECT * FROM system_admins WHERE user_id IN (
     SELECT id FROM auth.users WHERE email = 'caballeropomes@gmail.com'
   );
   ```

3. Ejecutar wipe:
   - Login como admin
   - Navegar a `/app/admin/tools/restore-stock`
   - Confirmar wipe

4. Verificar resultados:
   ```sql
   -- Debe ser 0
   SELECT COUNT(*) FROM households;
   SELECT COUNT(*) FROM movements;
   SELECT COUNT(*) FROM categories;
   
   -- Debe ser > 0 (protegido)
   SELECT COUNT(*) FROM system_admins;
   SELECT COUNT(*) FROM auth.users;
   ```

5. Verificar permisos:
   - Intentar acceder a `/app/admin` → Debe funcionar
   - Usuario sigue siendo admin

### Test Manual - Wipe de Household

1. Crear household con datos
2. Login como owner
3. Navegar a `/app/admin/wipe`
4. Confirmar wipe
5. Verificar que solo se limpió ese household

## 🚀 Deployment

### Aplicar Migraciones

```bash
# Aplicar todas las migraciones (incluye wipe_functions)
npx supabase db push --include-all

# Regenerar tipos TypeScript
npx supabase gen types typescript --project-id fizxvvtakvmmeflmbwud | Out-File -FilePath types/database.ts -Encoding utf8
```

### Verificar Migraciones Aplicadas

```sql
-- En Supabase SQL Editor
SELECT * FROM supabase_migrations.schema_migrations 
WHERE name LIKE '%wipe%';
```

### Verificar Admin Permanente

```sql
-- En Supabase SQL Editor
SELECT 
  sa.user_id,
  u.email,
  sa.notes,
  sa.created_at
FROM system_admins sa
JOIN auth.users u ON sa.user_id = u.id;
```

## 🔗 Enlaces Relacionados

- **Migración inicial**: `supabase/migrations/20251003000000_create_system_admins.sql`
- **Documentación admin**: `docs/SYSTEM_ADMIN_IMPLEMENTATION.md`
- **Schema contribuciones**: `db/contributions-schema.sql`
- **Documentación RLS**: `docs/FINAL_RLS_SOLUTION.md`

## ⚠️ Notas Importantes

1. **NO usar en producción** sin backup previo
2. **Restore to Stock** está diseñado para desarrollo/testing
3. **Wipe de household** es seguro para owners individuales
4. **Admin permanente** nunca se elimina (protección en SQL)
5. **Seed manual** requerido después de restore to stock
6. **Los usuarios pueden volver a login** después del wipe (auth.users protegido)
7. **RLS policies** siguen funcionando después del wipe
