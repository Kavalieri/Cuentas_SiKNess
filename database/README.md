# 🗄️ Database - CuentasSiK v2.1.0

**PostgreSQL nativo** con sistema de ownership unificado

---

## 📚 Documentación Relacionada

- **Sistema completo PostgreSQL**: `docs/TO-DO/DONE/POSTGRESQL_SISTEMA_COMPLETO.md`
- **Sistema completo PM2**: `docs/TO-DO/DONE/PM2_SISTEMA_COMPLETO.md`
- **Issue #6 - Unificación**: Ver detalles de implementación

---

## 🎯 Arquitectura de Roles v2.1.0

### Roles del Sistema

**`cuentassik_owner`** ⭐ (Rol Unificado - Owner de Objetos)
- **Tipo**: `NOLOGIN` (no puede conectar directamente)
- **Propósito**: Propietario único de TODOS los objetos de BD
- **Privilegios**: Owner de todas las tablas, secuencias, vistas, funciones, tipos
- **Uso**: Solo para DDL (migraciones, funciones `SECURITY DEFINER`)

**`cuentassik_user`** (Rol de Aplicación)
- **Tipo**: `LOGIN` (puede conectar)
- **Privilegios**: Mínimos necesarios (NO superuser, NO createdb, NO createrole)
- **Función**: Ejecutar consultas de la aplicación Next.js
- **Permisos**: `SELECT, INSERT, UPDATE, DELETE` en tablas, `USAGE, SELECT` en secuencias

**`postgres`** (Superusuario PostgreSQL)
- **Propósito**: Administración del servidor PostgreSQL
- **Uso**: Solo para configuración global, creación de bases de datos
- **Acceso**: `sudo -u postgres psql` (sin contraseña en el sistema)

### ⚠️ Roles Obsoletos (Eliminados en v2.1.0)

- ❌ `cuentassik_dev_owner` (reemplazado por `cuentassik_owner`)
- ❌ `cuentassik_prod_owner` (reemplazado por `cuentassik_owner`)

---

## 🚀 Setup Inicial para Nuevos Desarrolladores

### 1. Requisitos Previos

```bash
# PostgreSQL 15+ instalado
sudo apt install postgresql postgresql-contrib

# Node.js 18+ para scripts
node --version
```

### 2. Crear roles base (una sola vez)

```bash
# Conectar como postgres
sudo -u postgres psql

-- Crear rol unificado owner (NOLOGIN)
CREATE ROLE cuentassik_owner NOLOGIN;

-- Crear rol de aplicación (LOGIN)
CREATE ROLE cuentassik_user LOGIN PASSWORD 'tu_password_seguro';

-- Salir
\q
```

### 3. Restaurar Baseline v2.1.0

**Baseline actual**: `database/migrations/applied/20251101_000000_baseline_v2.1.0.sql`

#### Para DEV:

```bash
# Terminar conexiones activas
sudo -u postgres psql -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='cuentassik_dev' AND pid <> pg_backend_pid();"

# Recrear base de datos
sudo -u postgres dropdb --if-exists cuentassik_dev
sudo -u postgres createdb --owner=cuentassik_owner cuentassik_dev

# Aplicar baseline
sudo cp database/migrations/applied/20251101_000000_baseline_v2.1.0.sql /tmp/baseline.sql
sudo chmod 644 /tmp/baseline.sql
sudo -u postgres psql -d cuentassik_dev -f /tmp/baseline.sql
sudo rm /tmp/baseline.sql

echo "✅ DEV restaurado con baseline v2.1.0"
```

#### Para PROD:

```bash
# ADVERTENCIA: Solo ejecutar en servidor de producción con backup previo

# Terminar conexiones
sudo -u postgres psql -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='cuentassik_prod' AND pid <> pg_backend_pid();"

# Recrear
sudo -u postgres dropdb --if-exists cuentassik_prod
sudo -u postgres createdb --owner=cuentassik_owner cuentassik_prod

# Aplicar baseline
sudo -u postgres psql -d cuentassik_prod -f database/migrations/applied/20251101_000000_baseline_v2.1.0.sql

echo "✅ PROD restaurado con baseline v2.1.0"
```

### 4. Configurar Variables de Entorno

```bash
# .env.development.local
DATABASE_URL="postgresql://cuentassik_user:tu_password@localhost:5432/cuentassik_dev"

# .env.production.local
DATABASE_URL="postgresql://cuentassik_user:tu_password@localhost:5432/cuentassik_prod"
```

### 5. Configurar ~/.pgpass (Opcional - Sin Contraseña)

```bash
# Formato: hostname:port:database:username:password
echo "127.0.0.1:5432:cuentassik_dev:cuentassik_user:tu_password" >> ~/.pgpass
echo "127.0.0.1:5432:cuentassik_prod:cuentassik_user:tu_password" >> ~/.pgpass
chmod 600 ~/.pgpass
```

### 6. Verificar Instalación

```bash
# Conectar a DEV
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev

# Ver tablas
\dt

# Verificar ownership
SELECT tablename, tableowner FROM pg_tables WHERE schemaname='public' LIMIT 5;
-- Todas deben ser: cuentassik_owner

# Salir
\q
```

---

## 🔄 Sistema de Migraciones v2.1.0

### Estructura de Directorios

```
database/
├── migrations/
│   ├── development/        # 📝 Trabajo activo (WIP)
│   ├── tested/            # ✅ Probadas en DEV, listas para PROD
│   ├── applied/           # 📦 Baseline actual (v2.1.0)
│   └── archive/           # 🗄️ Migraciones históricas pre-v2.1.0
└── README.md
```

### Tabla de Control `_migrations`

```sql
CREATE TABLE _migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  applied_by VARCHAR(100) DEFAULT CURRENT_USER NOT NULL,
  execution_time_ms INTEGER,
  status VARCHAR(20) CHECK (status IN ('success', 'failed', 'rolled_back')),
  output_log TEXT,
  error_log TEXT,
  checksum VARCHAR(64),
  description TEXT
);
```

---

## 🛠️ Scripts Disponibles

### Gestión de Migraciones

| Script | Función | Uso |
|--------|---------|-----|
| `create_migration.sh` | Crear nueva migración | `./scripts/create_migration.sh "descripcion"` |
| `apply_migration.sh` | Aplicar migración | `./scripts/apply_migration.sh dev archivo.sql` |
| `migration_status.sh` | Ver estado | `./scripts/migration_status.sh` |

### Auditoría y Mantenimiento

| Script | Función | Uso |
|--------|---------|-----|
| `audit_unified_ownership.sh` | Auditoría completa | `./scripts/audit_unified_ownership.sh` |
| `archive_old_migrations.sh` | Archivar obsoletas | `./scripts/archive_old_migrations.sh` |

---

## � Auto-generación de Types TypeScript

**Sistema implementado**: Issue #8 (kysely-codegen)

Los TypeScript types se regeneran **automáticamente** tras aplicar migraciones.

### Workflow Automático

```bash
# 1. Aplicar migración
./scripts/apply_migration.sh dev 20251101_120000_add_refunds.sql

# 2. Types se regeneran automáticamente ✨
# Output:
# ✅ Migración aplicada exitosamente en DEV (125ms)
# 
# 🔄 Regenerando types TypeScript desde esquema PostgreSQL...
# ✅ Types regenerados exitosamente

# 3. Commit ambos cambios
git add database/migrations/ types/database.generated.ts
git commit -m "feat(db): añadir sistema de refunds"
```

### Regeneración Manual

Si necesitas regenerar types sin aplicar migración:

```bash
# DEV
npm run types:generate:dev

# PROD
npm run types:generate:prod
```

**VS Code Task**: `Ctrl+Shift+P` → `Tasks: Run Task` → "🔄 Regenerar Types (DEV/PROD)"

### Archivo Generado

- **Ubicación**: `types/database.generated.ts`
- **Formato**: Kysely (interfaces TypeScript)
- **Líneas**: ~1,013 (43 tablas + enums)
- **Tiempo generación**: ~50ms
- **Source of truth**: PostgreSQL schema

### Beneficios

- ✅ **Sincronización automática**: Types siempre actualizados con schema
- ✅ **Cero mantenimiento manual**: Eliminación de 1,951 líneas manuales
- ✅ **Compilación limpia**: Sin errores tras migraciones
- ✅ **JSDoc completo**: Comentarios SQL como documentación

**Documentación completa**: `docs/ISSUE_8_AUTO_GENERACION_TYPES.md`

---

## �📝 Workflow de Desarrollo

### Crear Nueva Migración

```bash
# 1. Crear archivo
./scripts/create_migration.sh "add refund system tables"

# Output:
# ✅ Archivo creado: database/migrations/development/20251101_120000_add_refund_system_tables.sql

# 2. Editar el archivo SQL con tus cambios
nano database/migrations/development/20251101_120000_add_refund_system_tables.sql
```

### Aplicar a DEV

```bash
# 3. Aplicar a desarrollo
./scripts/apply_migration.sh dev 20251101_120000_add_refund_system_tables.sql

# 4. Probar en la aplicación
```

### Promocionar a PROD

```bash
# 5. Si todo funciona, mover a tested/
mv database/migrations/development/20251101_120000_add_refund_system_tables.sql \
   database/migrations/tested/

# 6. Aplicar a producción
./scripts/apply_migration.sh prod 20251101_120000_add_refund_system_tables.sql
```

### Ver Estado

```bash
# Verificar sincronización DEV-PROD
./scripts/migration_status.sh
```

---

## 🔐 Seguridad y Permisos

### Default Privileges Configurados

```sql
-- Nuevos objetos automáticamente otorgan permisos a cuentassik_user
ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cuentassik_user;

ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO cuentassik_user;

ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_owner IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO cuentassik_user;
```

### Verificar Permisos

```sql
-- Permisos de tabla
SELECT table_name, grantee, privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'cuentassik_user' AND table_schema = 'public'
ORDER BY table_name;

-- Ownership de objetos
SELECT tablename, tableowner 
FROM pg_tables 
WHERE schemaname = 'public'
LIMIT 10;
-- Todos deben ser: cuentassik_owner
```

---

## 🔧 Comandos Útiles

### Conectarse a las Bases de Datos

```bash
# DEV
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev

# PROD
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod

# Admin (como postgres)
sudo -u postgres psql
```

### Ver Estado de Migraciones

```sql
-- Dentro de psql
SELECT 
  migration_name,
  applied_at,
  status,
  execution_time_ms
FROM _migrations
ORDER BY applied_at DESC
LIMIT 10;
```

### Backup Manual

```bash
# DEV
sudo -u postgres pg_dump -d cuentassik_dev > ~/backups/dev_$(date +%Y%m%d_%H%M%S).sql

# PROD (SIEMPRE antes de cambios)
sudo -u postgres pg_dump -d cuentassik_prod > ~/backups/prod_$(date +%Y%m%d_%H%M%S).sql
```

---

## ⚠️ Reglas Críticas

### ✅ HACER:

- Siempre crear backup antes de aplicar migraciones en PROD
- Probar migraciones en DEV primero
- Usar nombres descriptivos: `20251101_120000_add_refund_system.sql`
- Documentar cambios en el archivo SQL (comentarios)
- Solo DDL en migraciones (CREATE, ALTER, DROP)

### ❌ NO HACER:

- NUNCA aplicar migraciones no probadas en PROD
- NUNCA modificar datos de usuarios en migraciones (usar scripts aparte)
- NUNCA aplicar migraciones sin backup
- NUNCA mezclar cambios de estructura con cambios de datos
- NUNCA usar roles con privilegios de superusuario en la aplicación

---

## 🆘 Troubleshooting

### Error: "permission denied for table X"

```sql
-- Verificar ownership
SELECT tablename, tableowner FROM pg_tables WHERE tablename = 'X';
-- Debe ser: cuentassik_owner

-- Verificar permisos
SELECT privilege_type FROM information_schema.table_privileges
WHERE table_name = 'X' AND grantee = 'cuentassik_user';
-- Debe incluir: SELECT, INSERT, UPDATE, DELETE

-- Si falta, aplicar manualmente:
ALTER TABLE X OWNER TO cuentassik_owner;
GRANT SELECT, INSERT, UPDATE, DELETE ON X TO cuentassik_user;
```

### Restaurar desde Backup

```bash
# 1. Terminar conexiones
sudo -u postgres psql -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='cuentassik_prod' AND pid <> pg_backend_pid();"

# 2. Recrear BD
sudo -u postgres dropdb cuentassik_prod
sudo -u postgres createdb --owner=cuentassik_owner cuentassik_prod

# 3. Restaurar
sudo -u postgres psql -d cuentassik_prod < ~/backups/prod_20251031_200000.sql
```

---

## 📊 Estado Actual del Sistema

**Versión Baseline**: v2.1.0 (31 Octubre 2025)
**Ownership**: Unificado bajo `cuentassik_owner`
**Migraciones Archivadas**: 138 (pre-v2.1.0)
**PostgreSQL**: 15.14

### Estructura de Tablas (35 tablas)

- ✅ `profiles`, `households`, `household_members`
- ✅ `transactions`, `transaction_pairs`, `dual_flow_transactions`
- ✅ `categories`, `household_categories`
- ✅ `monthly_periods`, `member_monthly_income`, `contributions`, `contribution_adjustments`
- ✅ `refund_claims`, `personal_loans`, `member_credits`
- ✅ Y más... (ver baseline)

**Todas con ownership**: `cuentassik_owner` ✅

---

**Última actualización:** 31 Octubre 2025 - Issue #6
**Versión:** 2.1.0
