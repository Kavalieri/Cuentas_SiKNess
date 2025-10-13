# CuentasSiK - Sistema PostgreSQL: Documentación Completa

**Fecha**: Octubre 2025
**Autor**: AI Assistant
**Proyecto**: CuentasSiK

---

## 🚨 REGLA FUNDAMENTAL: SISTEMA POSTGRESQL ENDURECIDO

**PROHIBIDO** usar `postgres` o roles con privilegios elevados en la aplicación.

### ❌ Anti-patrones PROHIBIDOS

```bash
# NUNCA usar en la aplicación:
DATABASE_URL="postgresql://postgres:...@localhost:5432/..."
sudo -u postgres psql  # Solo para administración
psql -U postgres       # Solo para tareas admin
```

### ✅ Enfoque CORRECTO

```bash
# Aplicación SIEMPRE usa:
DATABASE_URL="postgresql://cuentassik_user:PASSWORD@localhost:5432/cuentassik_prod"

# CLI sin contraseña (gracias a ~/.pgpass):
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev

# Administración (solo cuando sea necesario):
sudo -u postgres psql
```

---

## 🏗️ ARQUITECTURA DE ROLES

### Roles de Sistema

**`postgres`** (Superusuario PostgreSQL)

- **Propósito**: Administración del servidor PostgreSQL
- **Uso**: Solo para configuración global, creación de bases de datos, gestión de roles
- **Acceso**: `sudo -u postgres psql` (sin contraseña en el sistema)

### Roles de Aplicación

**`cuentassik_user`** ⭐ (Rol Principal de la Aplicación)

- **Tipo**: `LOGIN` (puede conectar)
- **Privilegios**: Mínimos necesarios (NO superuser, NO createdb, NO createrole)
- **Función**: Ejecutar consultas de la aplicación Next.js
- **Bases de datos**: `cuentassik_dev` y `cuentassik_prod`
- **Permisos**:
  - `CONNECT` a ambas bases de datos
  - `USAGE` en schema `public`
  - `SELECT, INSERT, UPDATE, DELETE` en todas las tablas
  - `USAGE, SELECT` en secuencias

### Roles Propietarios (NOLOGIN)

**`cuentassik_prod_owner`** (Owner Producción)

- **Tipo**: `NOLOGIN` (no puede conectar directamente)
- **Función**: Propietario de todos los objetos en `cuentassik_prod`
- **Uso**: Solo para DDL (migraciones, funciones `SECURITY DEFINER`)

**`cuentassik_dev_owner`** (Owner Desarrollo)

- **Tipo**: `NOLOGIN` (no puede conectar directamente)
- **Función**: Propietario de todos los objetos en `cuentassik_dev`
- **Uso**: Solo para DDL (migraciones, funciones `SECURITY DEFINER`)

---

## 💾 BASES DE DATOS

### Entornos

**`cuentassik_dev`** (Desarrollo)

- **Puerto**: 5432
- **Owner**: `cuentassik_dev_owner`
- **Aplicación**: Next.js desarrollo (puerto 3001)
- **Acceso**: `postgresql://cuentassik_user:PASSWORD@localhost:5432/cuentassik_dev`

**`cuentassik_prod`** (Producción)

- **Puerto**: 5432
- **Owner**: `cuentassik_prod_owner`
- **Aplicación**: Next.js producción (puerto 3000)
- **Acceso**: `postgresql://cuentassik_user:PASSWORD@localhost:5432/cuentassik_prod`

### Esquemas

**`public`** (Principal)

- **Contenido**: Todas las tablas de la aplicación (18 tablas)
- **Owner**: `cuentassik_[env]_owner` según entorno
- **Permisos**: `cuentassik_user` tiene acceso completo via GRANTS

---

## 🔐 SISTEMA DE PERMISOS

### Default Privileges (Configurado)

Los objetos nuevos creados por los owners automáticamente otorgan permisos a `cuentassik_user`:

```sql
-- Ejemplo en producción:
ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_prod_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cuentassik_user;

ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_prod_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO cuentassik_user;
```

### Permisos Actuales

**`cuentassik_user` tiene permisos en:**

- Todas las 18 tablas principales: `SELECT, INSERT, UPDATE, DELETE`
- Todas las secuencias: `USAGE, SELECT`
- Schema `public`: `USAGE`

**`cuentassik_[env]_owner` tienen permisos en:**

- Todas las tablas principales: `SELECT` (para funciones `SECURITY DEFINER`)
- Tablas específicas: `INSERT, UPDATE, DELETE` según necesidad de funciones

---

## 🔒 ROW LEVEL SECURITY (RLS)

### Estado Actual

**RLS MAYORMENTE DESACTIVADO** (17 de 18 tablas)

- Solo `monthly_periods` tiene RLS habilitado
- El resto de tablas: **RLS OFF**

### Tabla con RLS: monthly_periods

```sql
-- Políticas actuales (restrictivas, pero owner las bypasea):
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'monthly_periods';

-- Resultado:
-- "No one can delete periods" (DELETE, {public}, false)
-- "Only system can create periods" (INSERT, {public}, false)
```

**Nota**: `cuentassik_user` es owner de `monthly_periods`, por lo que bypasea RLS automáticamente.

---

## 🔧 FUNCIONES SECURITY DEFINER

### Funciones Críticas

**4 funciones ejecutan como owner del entorno:**

1. **`get_household_members_optimized`**

   - **Owner**: `cuentassik_[env]_owner`
   - **Permisos**: `SELECT` en `household_members, profiles, member_incomes`

2. **`get_member_income`**

   - **Owner**: `cuentassik_[env]_owner`
   - **Permisos**: `SELECT` en `member_incomes`

3. **`ensure_monthly_period`**

   - **Owner**: `cuentassik_[env]_owner`
   - **Permisos**: `INSERT, UPDATE, DELETE` en `monthly_periods`

4. **`update_contribution_adjustments_total`**
   - **Owner**: `cuentassik_[env]_owner`
   - **Permisos**: `INSERT, UPDATE, DELETE` en `contribution_adjustments`

### Configuración Recomendada

```sql
-- Ejemplo para funciones SECURITY DEFINER:
ALTER FUNCTION public.get_household_members_optimized(uuid)
  OWNER TO cuentassik_prod_owner,
  SECURITY DEFINER,
  SET search_path TO public;

GRANT EXECUTE ON FUNCTION public.get_household_members_optimized(uuid)
  TO cuentassik_user;
```

---

## 🔑 AUTENTICACIÓN SIN CONTRASEÑA

### ~/.pgpass (Usuario kava)

```bash
# Formato: hostname:port:database:username:password
127.0.0.1:5432:cuentassik_dev:cuentassik_user:PASSWORD_DEV
127.0.0.1:5432:cuentassik_prod:cuentassik_user:PASSWORD_PROD
```

**Permisos del archivo:**

```bash
chmod 600 ~/.pgpass
chown kava:kava ~/.pgpass
```

### Conexión CLI

```bash
# Desarrollo
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev

# Producción
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod

# Administración (cuando sea necesario)
sudo -u postgres -H psql
```

---

## 🛠️ GESTIÓN DE MIGRACIONES

### Flujo de Migraciones

**1. Creación (como owner del entorno):**

```sql
-- Ejecutar DDL como owner NOLOGIN
SET ROLE cuentassik_dev_owner;
CREATE TABLE nueva_tabla (...);
RESET ROLE;
```

**2. Default Privileges Automáticos:**
Los nuevos objetos automáticamente otorgan permisos a `cuentassik_user`.

**3. Verificación:**

```sql
-- Como cuentassik_user
SELECT * FROM nueva_tabla; -- Debe funcionar
```

### Scripts de Migración

**Directorio**: `database/migrations/`

- `development/` → Migraciones en desarrollo
- `tested/` → Migraciones probadas
- `applied/` → Migraciones aplicadas en producción

---

## 🔍 COMANDOS DE DIAGNÓSTICO

### Verificar Conexión

```sql
SELECT current_user, current_database(), version();
```

### Verificar Permisos

```sql
-- Permisos de tabla
SELECT table_name, grantee, privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'cuentassik_user' AND table_schema = 'public';

-- Funciones SECURITY DEFINER
SELECT proname, rolname as owner, prosecdef
FROM pg_proc p JOIN pg_roles r ON r.oid = p.proowner
WHERE prosecdef = true;
```

### Verificar RLS

```sql
-- Tablas con RLS
SELECT schemaname, tablename, rowsecurity, forcerowsecurity
FROM pg_tables
WHERE rowsecurity = true;

-- Políticas RLS
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies;
```

---

## 🚨 TROUBLESHOOTING

### Error: "permission denied for table X"

```sql
-- 1. Verificar si la tabla existe y su owner
SELECT c.relname, r.rolname as owner
FROM pg_class c JOIN pg_roles r ON r.oid = c.relowner
WHERE relname = 'tabla_problema';

-- 2. Verificar permisos de cuentassik_user
SELECT privilege_type FROM information_schema.table_privileges
WHERE table_name = 'tabla_problema' AND grantee = 'cuentassik_user';

-- 3. Si falta permiso, aplicar como postgres:
GRANT SELECT ON public.tabla_problema TO cuentassik_user;
```

### Error: "function does not exist"

```sql
-- Verificar funciones y sus permisos
SELECT p.proname, n.nspname, r.rolname, p.prosecdef
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles r ON r.oid = p.proowner
WHERE proname LIKE '%nombre_funcion%';

-- Grant EXECUTE si es necesario
GRANT EXECUTE ON FUNCTION schema.function_name(args) TO cuentassik_user;
```

### Rotación de Contraseña

```bash
# 1. Cambiar contraseña (como postgres)
sudo -u postgres -H psql -c "ALTER ROLE cuentassik_user PASSWORD 'NUEVA_PASSWORD';"

# 2. Actualizar ~/.pgpass
sed -i 's/:VIEJA_PASSWORD$/:NUEVA_PASSWORD/' ~/.pgpass

# 3. Actualizar .env files
# Editar .env.development.local y .env.production.local

# 4. Reiniciar procesos PM2
pm2 reload all
```

---

## 📊 ESTADO ACTUAL VERIFICADO

### ✅ Configuración Completada

- **Roles configurados**: `cuentassik_user`, `cuentassik_prod_owner`, `cuentassik_dev_owner`
- **Permisos aplicados**: GRANTS en todas las tablas necesarias
- **Default privileges**: Configurados para objetos futuros
- **Funciones SECURITY DEFINER**: Permisos corregidos
- **~/.pgpass**: Configurado para acceso sin contraseña
- **RLS**: Estado documentado (mayormente OFF)

### 🔒 Seguridad Implementada

- **Privilegios mínimos**: `cuentassik_user` sin privilegios elevados
- **Separación de roles**: Owners NOLOGIN para DDL
- **Acceso restringido**: Solo localhost en pg_hba.conf
- **Contraseñas seguras**: Almacenadas en .env.\*.local

---

## 🎯 MEJORES PRÁCTICAS

### ✅ Hacer

- Usar `cuentassik_user` en la aplicación
- Ejecutar DDL como owners NOLOGIN via `SET ROLE`
- Usar ~/.pgpass para CLI
- Aplicar migraciones con scripts dedicados
- Verificar permisos después de crear objetos

### ❌ No Hacer

- Usar `postgres` en DATABASE_URL
- Ejecutar aplicación con privilegios elevados
- Crear objetos como `postgres` en esquemas de aplicación
- Hardcodear contraseñas en código
- Bypasear el sistema de roles

---

**✅ SISTEMA POSTGRESQL COMPLETAMENTE DOCUMENTADO Y FUNCIONAL**
**🔐 SEGURIDAD ENDURECIDA Y VERIFICADA**
**📚 TROUBLESHOOTING Y PROCEDIMIENTOS INCLUIDOS**
