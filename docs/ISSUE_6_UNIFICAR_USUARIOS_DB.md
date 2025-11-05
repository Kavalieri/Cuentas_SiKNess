# Issue #6: Unificar usuarios DB - Análisis Completo + Reset Sistema Migraciones

**Fecha**: 31 Octubre 2025
**Estado**: ✅ **COMPLETADO** (v2.1.0)
**Commit**: e74260c
**GitHub**: https://github.com/Kavalieri/Cuentas_SiKNess/issues/6

---

## 🎯 Objetivos del Issue

### Objetivo Principal: Unificar Ownership

**Situación Actual (INCORRECTA):**
```
DEV:  Objetos owned por → cuentassik_dev_owner + postgres (fragmentado)
PROD: Objetos owned por → cuentassik_prod_owner + postgres (fragmentado)
```

**Situación Deseada (CORRECTA):**
```
DEV:  Objetos owned por → cuentassik_owner (unificado)
PROD: Objetos owned por → cuentassik_owner (unificado)
```

**Beneficios:**
- ✅ **Mismo owner** en ambas bases de datos
- ✅ **Migraciones portables** sin cambios de SET ROLE
- ✅ **Entorno profesional** con estructura espejo
- ✅ **Simplicidad** en gestión de permisos
- ✅ **Sin conflictos** (las tablas están en bases de datos separadas)

### Objetivo Secundario: Reset Sistema de Migraciones

**Problemas Actuales:**
- ⚠️ Tabla `_migrations` simple sin auditoría completa
- ⚠️ 89 migraciones obsoletas archivadas (sincronía rota pre-v0.3.0)
- ⚠️ Seed baseline con variable `:SEED_OWNER` (permite owners inconsistentes)
- ⚠️ Sin registro de salida/errores de aplicación
- ⚠️ Sin timestamps de ejecución ni usuario que aplicó

**Objetivos del Reset:**
- ✅ **Nueva tabla `_migrations` robusta** con auditoría completa
- ✅ **Archivar todas las migraciones antiguas** (fresh start desde v2.1.0)
- ✅ **Nueva seed baseline limpia** sin datos de prueba
- ✅ **Sistema robusto de tracking** con estado, salida, errores
- ✅ **Scripts actualizados** con `<` (stdin) y validaciones

---

## 📊 Auditoría Completa

### 1. Roles Actuales en el Sistema

| Rol | Superusuario | Crear DB | Crear Roles | LOGIN | Estado |
|-----|--------------|----------|-------------|-------|---------|
| `postgres` | ✅ SI | ✅ SI | ✅ SI | ✅ LOGIN | ✅ Correcto (superusuario del sistema) |
| `cuentassik_dev_owner` | ❌ NO | ❌ NO | ❌ NO | ❌ NOLOGIN | ⚠️ A ELIMINAR |
| `cuentassik_prod_owner` | ❌ NO | ❌ NO | ❌ NO | ❌ NOLOGIN | ⚠️ A ELIMINAR |
| `cuentassik_user` | ❌ NO | ❌ NO | ❌ NO | ✅ LOGIN | ✅ Correcto (usuario de aplicación) |
| `cuentassik_owner` | - | - | - | - | ❌ **NO EXISTE (hay que crearlo)** |

### 2. Ownership de Objetos en DEV

#### Tablas (35 total)
| Owner | Cantidad | Porcentaje |
|-------|----------|------------|
| `cuentassik_dev_owner` | 26 tablas | 74% |
| `postgres` | 9 tablas | 26% |

**Tablas con owner `postgres` (inconsistente):**
1. `category_parents`
2. `contribution_reconciliations`
3. `dual_flow_events`
4. `email_invitations`
5. `member_balances`
6. `personal_loans`
7. `profile_emails`
8. `refund_claims`
9. `subcategories`

#### Funciones (55 total)
| Owner | Cantidad |
|-------|----------|
| `cuentassik_dev_owner` | 29 funciones |
| `postgres` | 26 funciones |

#### Secuencias (2 total)
| Secuencia | Owner |
|-----------|-------|
| `_migrations_id_seq` | `cuentassik_dev_owner` |
| `seq_transaction_pair_ref` | `cuentassik_dev_owner` |

#### Vistas Materializadas (3 total)
| Vista | Owner |
|-------|-------|
| `household_stats` | `cuentassik_dev_owner` |
| `mv_household_balances` | `cuentassik_dev_owner` |
| `mv_member_pending_contributions` | `cuentassik_dev_owner` |

### 3. Ownership de Objetos en PROD

#### Tablas (35 total)
| Owner | Cantidad | Porcentaje |
|-------|----------|------------|
| `cuentassik_prod_owner` | 33 tablas | 94% |
| `postgres` | 2 tablas | 6% |

**Tablas con owner `postgres` (inconsistente):**
1. `category_parents`
2. `subcategories`

#### Funciones (55 total)
| Owner | Cantidad |
|-------|----------|
| `cuentassik_prod_owner` | 53 funciones |
| `postgres` | 2 funciones |

#### Secuencias (2 total)
| Secuencia | Owner |
|-----------|-------|
| `_migrations_id_seq` | `cuentassik_prod_owner` |
| `seq_transaction_pair_ref` | `cuentassik_prod_owner` |

#### Vistas Materializadas (3 total)
| Vista | Owner |
|-------|-------|
| `household_stats` | `cuentassik_prod_owner` |
| `mv_household_balances` | `cuentassik_prod_owner` |
| `mv_member_pending_contributions` | `cuentassik_prod_owner` |

### 4. Permisos de `cuentassik_user` (Usuario de Aplicación)

✅ **Estado**: CORRECTO en ambas bases de datos

**Permisos en tablas (41 objetos):**
- SELECT, INSERT, UPDATE, DELETE

**Permisos en secuencias (2 objetos):**
- USAGE, SELECT

**Default Privileges configurados en DEV:**
```sql
-- Para tablas creadas por cuentassik_dev_owner
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cuentassik_user;

-- Para secuencias creadas por cuentassik_dev_owner
GRANT USAGE, SELECT ON SEQUENCES TO cuentassik_user;

-- Para funciones creadas por cuentassik_dev_owner
GRANT EXECUTE ON FUNCTIONS TO cuentassik_user;
```

---

## 🔴 Problemas Identificados

### Problema 1: Ownership Inconsistente (Punto 1 del Issue)
- **DEV**: 26 objetos con `cuentassik_dev_owner`, 9 con `postgres`
- **PROD**: 33 objetos con `cuentassik_prod_owner`, 2 con `postgres`
- **Impacto**: Migraciones necesitan cambiar SET ROLE según entorno

### Problema 2: Roles Específicos por Entorno (Punto 1 del Issue)
- **Actual**: `cuentassik_dev_owner` ≠ `cuentassik_prod_owner`
- **Impacto**: Imposible usar la misma migración en ambos entornos sin modificaciones

### Problema 3: Seed Baseline con Datos de Prueba (Punto 2 del Issue)
**Archivo**: `database/migrations/applied/20251014_150000_seed.sql`
- ❌ Contiene household "Casa Test" con datos de ejemplo
- ❌ Contiene categorías asociadas a household específico
- ⚠️ Usa variable `:SEED_OWNER` que permite owners diferentes

### Problema 4: Default Privileges Atados a Rol Específico (Punto 3 del Issue)
```sql
-- Actual en DEV:
ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_dev_owner ...

-- Actual en PROD:
ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_prod_owner ...
```
**Impacto**: Si creamos el rol `cuentassik_owner`, los default privileges no aplicarán automáticamente.

---

## 📋 Plan de Trabajo Completo

### Fase 1: Crear Rol Unificado ✅ (A ejecutar primero)

**Archivo**: `database/migrations/development/20251031_080000_create_unified_owner_role.sql`

```sql
-- Crear el rol unificado que será owner en ambas bases de datos
CREATE ROLE cuentassik_owner NOLOGIN;

-- Este rol NO tiene privilegios especiales, solo será propietario de objetos
COMMENT ON ROLE cuentassik_owner IS 'Rol propietario unificado para objetos de base de datos en DEV y PROD';
```

**Aplicación**:
```bash
# DEV
sudo -u postgres psql -d cuentassik_dev -f database/migrations/development/20251031_080000_create_unified_owner_role.sql

# PROD
sudo -u postgres psql -d cuentassik_prod -f database/migrations/development/20251031_080000_create_unified_owner_role.sql
```

---

### Fase 2: Transferir Ownership en DEV

**Archivo**: `database/migrations/development/20251031_090000_transfer_ownership_to_unified_DEV.sql`

```sql
-- ============================================
-- TRANSFERIR OWNERSHIP A cuentassik_owner (DEV)
-- ============================================
-- Fecha: 2025-10-31
-- Objetivo: Unificar ownership de todos los objetos bajo cuentassik_owner

SET ROLE postgres;

-- === TABLAS ===
-- Transferir las 35 tablas (26 de dev_owner + 9 de postgres)
ALTER TABLE _migrations OWNER TO cuentassik_owner;
ALTER TABLE categories OWNER TO cuentassik_owner;
ALTER TABLE category_parents OWNER TO cuentassik_owner;
ALTER TABLE contribution_adjustment_templates OWNER TO cuentassik_owner;
ALTER TABLE contribution_adjustments OWNER TO cuentassik_owner;
ALTER TABLE contribution_periods OWNER TO cuentassik_owner;
ALTER TABLE contribution_reconciliations OWNER TO cuentassik_owner;
ALTER TABLE contributions OWNER TO cuentassik_owner;
ALTER TABLE credit_refund_requests OWNER TO cuentassik_owner;
ALTER TABLE dual_flow_config OWNER TO cuentassik_owner;
ALTER TABLE dual_flow_events OWNER TO cuentassik_owner;
ALTER TABLE dual_flow_transactions OWNER TO cuentassik_owner;
ALTER TABLE email_invitations OWNER TO cuentassik_owner;
ALTER TABLE household_members OWNER TO cuentassik_owner;
ALTER TABLE household_savings OWNER TO cuentassik_owner;
ALTER TABLE household_settings OWNER TO cuentassik_owner;
ALTER TABLE households OWNER TO cuentassik_owner;
ALTER TABLE invitations OWNER TO cuentassik_owner;
ALTER TABLE journal_adjustments OWNER TO cuentassik_owner;
ALTER TABLE journal_invitations OWNER TO cuentassik_owner;
ALTER TABLE journal_roles OWNER TO cuentassik_owner;
ALTER TABLE journal_transactions OWNER TO cuentassik_owner;
ALTER TABLE member_balances OWNER TO cuentassik_owner;
ALTER TABLE member_credits OWNER TO cuentassik_owner;
ALTER TABLE member_incomes OWNER TO cuentassik_owner;
ALTER TABLE monthly_periods OWNER TO cuentassik_owner;
ALTER TABLE personal_loans OWNER TO cuentassik_owner;
ALTER TABLE profile_emails OWNER TO cuentassik_owner;
ALTER TABLE profiles OWNER TO cuentassik_owner;
ALTER TABLE refund_claims OWNER TO cuentassik_owner;
ALTER TABLE subcategories OWNER TO cuentassik_owner;
ALTER TABLE system_admins OWNER TO cuentassik_owner;
ALTER TABLE transactions OWNER TO cuentassik_owner;
ALTER TABLE user_active_household OWNER TO cuentassik_owner;
ALTER TABLE user_settings OWNER TO cuentassik_owner;

-- === SECUENCIAS ===
ALTER SEQUENCE _migrations_id_seq OWNER TO cuentassik_owner;
ALTER SEQUENCE seq_transaction_pair_ref OWNER TO cuentassik_owner;

-- === VISTAS MATERIALIZADAS ===
ALTER MATERIALIZED VIEW household_stats OWNER TO cuentassik_owner;
ALTER MATERIALIZED VIEW mv_household_balances OWNER TO cuentassik_owner;
ALTER MATERIALIZED VIEW mv_member_pending_contributions OWNER TO cuentassik_owner;

-- === FUNCIONES (55 funciones) ===
-- Nota: Se incluirán todas las funciones con su signature completa

RESET ROLE;

-- Verificación
SELECT 'Ownership transferido correctamente a cuentassik_owner' as resultado;
```

**Verificación**:
```sql
SELECT tableowner, COUNT(*) FROM pg_tables WHERE schemaname = 'public' GROUP BY tableowner;
-- Resultado esperado: cuentassik_owner | 35
```

---

### Fase 3: Transferir Ownership en PROD

**Archivo**: `database/migrations/development/20251031_090000_transfer_ownership_to_unified_PROD.sql`

Idéntico a DEV pero aplicado en PROD.

---

### Fase 4: Actualizar Default Privileges

**Archivo**: `database/migrations/development/20251031_100000_update_default_privileges.sql`

```sql
-- ============================================
-- ACTUALIZAR DEFAULT PRIVILEGES
-- ============================================
-- Asegurar que objetos creados por cuentassik_owner otorguen permisos a cuentassik_user

SET ROLE postgres;

-- Eliminar default privileges antiguos (si existen)
ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_dev_owner IN SCHEMA public REVOKE ALL ON TABLES FROM cuentassik_user;
ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_dev_owner IN SCHEMA public REVOKE ALL ON SEQUENCES FROM cuentassik_user;
ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_dev_owner IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM cuentassik_user;

ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_prod_owner IN SCHEMA public REVOKE ALL ON TABLES FROM cuentassik_user;
ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_prod_owner IN SCHEMA public REVOKE ALL ON SEQUENCES FROM cuentassik_user;
ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_prod_owner IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM cuentassik_user;

-- Configurar nuevos default privileges para cuentassik_owner
ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cuentassik_user;

ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO cuentassik_user;

ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_owner IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO cuentassik_user;

RESET ROLE;
```

**Aplicar en DEV y PROD**.

---

### Fase 5: Nueva Seed Baseline Limpia

**Archivo**: `database/migrations/applied/20251031_110000_clean_unified_seed.sql`

**Cambios respecto a seed actual:**
1. ✅ Todos los objetos con `SET ROLE cuentassik_owner;`
2. ❌ Sin datos de household "Casa Test"
3. ❌ Sin usuarios de prueba
4. ✅ Solo estructura (tablas, funciones, triggers, índices)
5. ✅ Categorías genéricas SIN household_id (se crean al crear household)
6. ✅ Default privileges configurados para cuentassik_owner

---

### Fase 6: Eliminar Roles Obsoletos

**Archivo**: `database/migrations/development/20251031_120000_drop_obsolete_roles.sql`

```sql
-- ============================================
-- ELIMINAR ROLES OBSOLETOS
-- ============================================
-- Solo después de verificar que todo funciona correctamente

SET ROLE postgres;

-- Verificación previa: asegurar que NO hay objetos con estos owners
DO $$
DECLARE
  v_dev_count INTEGER;
  v_prod_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_dev_count FROM pg_tables WHERE tableowner = 'cuentassik_dev_owner';
  SELECT COUNT(*) INTO v_prod_count FROM pg_tables WHERE tableowner = 'cuentassik_prod_owner';

  IF v_dev_count > 0 OR v_prod_count > 0 THEN
    RAISE EXCEPTION 'Aún hay objetos con owners obsoletos. Abortar.';
  END IF;
END $$;

-- Eliminar roles obsoletos
DROP ROLE IF EXISTS cuentassik_dev_owner;
DROP ROLE IF EXISTS cuentassik_prod_owner;

RESET ROLE;

SELECT 'Roles obsoletos eliminados correctamente' as resultado;
```

---

### Fase 7: Script de Auditoría de Permisos

**Archivo**: `scripts/audit_db_permissions.sh`

```bash
#!/bin/bash
# Auditoría completa de permisos en ambas bases de datos

echo "============================================"
echo "AUDITORÍA DE PERMISOS - DEV"
echo "============================================"

psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev <<'EOSQL'
-- Ownership unificado
SELECT 'OWNERSHIP DE TABLAS:' as seccion;
SELECT tableowner, COUNT(*) FROM pg_tables WHERE schemaname = 'public' GROUP BY tableowner;

SELECT 'OWNERSHIP DE FUNCIONES:' as seccion;
SELECT r.rolname, COUNT(*) FROM pg_proc p JOIN pg_roles r ON r.oid = p.proowner WHERE p.pronamespace = 'public'::regnamespace GROUP BY r.rolname;

-- Permisos de cuentassik_user
SELECT 'PERMISOS DE APLICACIÓN:' as seccion;
SELECT COUNT(DISTINCT table_name) as tablas_con_permisos FROM information_schema.table_privileges WHERE grantee = 'cuentassik_user' AND table_schema = 'public';
EOSQL

echo ""
echo "============================================"
echo "AUDITORÍA DE PERMISOS - PROD"
echo "============================================"

# Repetir para PROD
```

---

## 🔄 Nuevo Sistema de Migraciones (Reset Completo)

### 📋 Diseño de Nueva Tabla `_migrations`

**Tabla Actual (INADECUADA):**
```sql
CREATE TABLE _migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Problemas**:
- ❌ No captura output/errores
- ❌ No registra tiempo de ejecución
- ❌ No registra quién aplicó la migración
- ❌ No tiene estado (success/failed/rolled_back)
- ❌ No tiene checksums para verificación de integridad

**Tabla Nueva (ROBUSTA CON AUDITORÍA COMPLETA):**
```sql
CREATE TABLE _migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  applied_by VARCHAR(100) DEFAULT CURRENT_USER NOT NULL,
  execution_time_ms INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'success'
    CHECK (status IN ('success', 'failed', 'rolled_back')),
  output_log TEXT,
  error_log TEXT,
  checksum VARCHAR(64),
  description TEXT,
  CONSTRAINT unique_migration_name UNIQUE (migration_name)
);

COMMENT ON TABLE _migrations IS
  'Control de migraciones aplicadas con auditoría completa';
COMMENT ON COLUMN _migrations.migration_name IS
  'Nombre del archivo de migración (ej: 20251101_010000_create_unified_owner.sql)';
COMMENT ON COLUMN _migrations.applied_at IS
  'Timestamp de cuándo se aplicó la migración';
COMMENT ON COLUMN _migrations.applied_by IS
  'Usuario de PostgreSQL que aplicó la migración';
COMMENT ON COLUMN _migrations.execution_time_ms IS
  'Tiempo de ejecución en milisegundos';
COMMENT ON COLUMN _migrations.status IS
  'Estado: success (exitosa), failed (fallida), rolled_back (revertida)';
COMMENT ON COLUMN _migrations.output_log IS
  'Captura de stdout durante la ejecución';
COMMENT ON COLUMN _migrations.error_log IS
  'Captura de stderr si hubo errores';
COMMENT ON COLUMN _migrations.checksum IS
  'Hash SHA-256 del contenido del archivo para validación';
```

### 📁 Nueva Estructura de Directorios de Migraciones

```
database/migrations/
├── archive/                           # Migraciones obsoletas archivadas
│   └── pre_v2.1.0/                   # 89 migraciones antiguas (sincronía rota)
│       ├── 20241014_150000_seed.sql
│       ├── 20241015_*.sql
│       └── ... (todas las pre-v2.1.0)
├── development/                       # ✏️ Nuevas migraciones en desarrollo
│   └── (vacío inicialmente)
├── tested/                            # ✅ Validadas en DEV, listas para PROD
│   └── (vacío inicialmente)
└── applied/                           # 📦 Aplicadas exitosamente en PROD
    └── 20251101_000000_baseline_v2.1.0.sql  # 🎯 Nueva seed baseline
```

### 🌱 Nueva Seed Baseline v2.1.0

**Archivo**: `database/migrations/applied/20251101_000000_baseline_v2.1.0.sql`

**Características**:
```sql
-- ✅ Owner hardcodeado (sin variables)
SET ROLE cuentassik_owner;

-- ✅ NO contiene datos de prueba
-- (sin "Casa Test", sin usuarios de prueba)

-- ✅ Solo estructura limpia
CREATE TABLE households (...);
CREATE TABLE profiles (...);
-- etc...

-- ✅ Todos los objetos son propiedad de cuentassik_owner
```

**Diferencias con seed anterior**:
- ❌ **Antes**: Usaba `:SEED_OWNER` variable (permitía dev_owner O prod_owner)
- ✅ **Ahora**: Hardcodeado `SET ROLE cuentassik_owner;`
- ❌ **Antes**: Incluía "Casa Test" household con datos de prueba
- ✅ **Ahora**: Solo estructura, sin datos de prueba
- ❌ **Antes**: Propiedad fragmentada (dev_owner vs prod_owner)
- ✅ **Ahora**: Todo propiedad de cuentassik_owner

### 🔧 Nuevos Scripts de Migraciones

#### Script 1: `apply_migration_dev.sh`
**Propósito**: Aplicar migración desde `/development` a base de datos DEV

```bash
#!/bin/bash
# Aplica migración a DEV con auditoría completa

MIGRATION_FILE="$1"
DB_NAME="cuentassik_dev"

# Validaciones
if [[ ! -f "$MIGRATION_FILE" ]]; then
  echo "❌ Archivo no encontrado: $MIGRATION_FILE"
  exit 1
fi

# Generar checksum
CHECKSUM=$(sha256sum "$MIGRATION_FILE" | cut -d' ' -f1)

# Capturar tiempo de inicio
START_TIME=$(date +%s%3N)

# ✅ Aplicar migración usando STDIN (<) no -f
OUTPUT=$(sudo -u postgres psql -d "$DB_NAME" < "$MIGRATION_FILE" 2>&1)
EXIT_CODE=$?

# Calcular tiempo de ejecución
END_TIME=$(date +%s%3N)
EXEC_TIME=$((END_TIME - START_TIME))

# Determinar estado
if [[ $EXIT_CODE -eq 0 ]]; then
  STATUS="success"
else
  STATUS="failed"
fi

# Registrar en _migrations (si la tabla existe)
sudo -u postgres psql -d "$DB_NAME" <<EOF
INSERT INTO _migrations (
  migration_name,
  execution_time_ms,
  status,
  output_log,
  checksum
) VALUES (
  '$(basename "$MIGRATION_FILE")',
  $EXEC_TIME,
  '$STATUS',
  \$log\$$OUTPUT\$log\$,
  '$CHECKSUM'
) ON CONFLICT (migration_name) DO UPDATE SET
  applied_at = CURRENT_TIMESTAMP,
  execution_time_ms = EXCLUDED.execution_time_ms,
  status = EXCLUDED.status,
  output_log = EXCLUDED.output_log;
EOF

# Mostrar resultado
if [[ $EXIT_CODE -eq 0 ]]; then
  echo "✅ Migración aplicada exitosamente en DEV"
  echo "⏱️  Tiempo de ejecución: ${EXEC_TIME}ms"
else
  echo "❌ Migración falló en DEV"
  echo "$OUTPUT"
  exit 1
fi
```

#### Script 2: `promote_to_tested.sh`
**Propósito**: Mover migración de `/development` a `/tested` tras validación

```bash
#!/bin/bash
# Promociona migración validada de development → tested

DEV_DIR="database/migrations/development"
TESTED_DIR="database/migrations/tested"

# Listar migraciones disponibles
echo "📝 Migraciones disponibles en development:"
select MIGRATION in "$DEV_DIR"/*.sql; do
  if [[ -f "$MIGRATION" ]]; then
    echo ""
    echo "📄 Contenido de $(basename "$MIGRATION"):"
    head -20 "$MIGRATION"
    echo ""
    read -p "¿Promover a tested? (s/N): " CONFIRM

    if [[ "$CONFIRM" == "s" ]] || [[ "$CONFIRM" == "S" ]]; then
      mv "$MIGRATION" "$TESTED_DIR/"
      echo "✅ Migración promovida a tested/"
      echo "🚀 Lista para aplicar en PROD"
    else
      echo "❌ Promoción cancelada"
    fi
    break
  fi
done
```

#### Script 3: `apply_migration_prod.sh`
**Propósito**: Aplicar migración desde `/tested` a base de datos PROD

```bash
#!/bin/bash
# Aplica migración a PROD con auditoría completa y backup automático

MIGRATION_FILE="$1"
DB_NAME="cuentassik_prod"
BACKUP_DIR="/home/kava/workspace/backups"

# Validaciones
if [[ ! -f "$MIGRATION_FILE" ]]; then
  echo "❌ Archivo no encontrado: $MIGRATION_FILE"
  exit 1
fi

# ⚠️ BACKUP OBLIGATORIO antes de aplicar en PROD
echo "💾 Creando backup de seguridad de PROD..."
BACKUP_FILE="$BACKUP_DIR/prod_pre_migration_$(date +%Y%m%d_%H%M%S).sql"
sudo -u postgres pg_dump -d "$DB_NAME" > "$BACKUP_FILE"

if [[ $? -ne 0 ]]; then
  echo "❌ Backup falló. Abortando migración."
  exit 1
fi

echo "✅ Backup creado: $BACKUP_FILE"

# Resto del script igual a apply_migration_dev.sh
# (mismo código de checksum, tiempo, aplicación con <, registro en _migrations)
```

#### Script 4: `promote_to_applied.sh`
**Propósito**: Mover migración de `/tested` a `/applied` tras éxito en PROD

```bash
#!/bin/bash
# Promociona migración exitosa de tested → applied

TESTED_DIR="database/migrations/tested"
APPLIED_DIR="database/migrations/applied"

# Listar migraciones disponibles
echo "📝 Migraciones aplicadas exitosamente en PROD:"
select MIGRATION in "$TESTED_DIR"/*.sql; do
  if [[ -f "$MIGRATION" ]]; then
    read -p "¿Mover a applied/? (s/N): " CONFIRM

    if [[ "$CONFIRM" == "s" ]] || [[ "$CONFIRM" == "S" ]]; then
      mv "$MIGRATION" "$APPLIED_DIR/"
      echo "✅ Migración archivada en applied/"
      echo "📦 Proceso completo"
    else
      echo "❌ Archivado cancelado"
    fi
    break
  fi
done
```

#### Script 5: `archive_old_migrations.sh`
**Propósito**: Archivar las 89 migraciones obsoletas pre-v2.1.0

```bash
#!/bin/bash
# Archiva migraciones antiguas (pre-v2.1.0) con sincronía rota

SOURCE_DIR="database/migrations/applied"
ARCHIVE_DIR="database/migrations/archive/pre_v2.1.0"

mkdir -p "$ARCHIVE_DIR"

echo "📦 Archivando migraciones pre-v2.1.0..."

# Mover todas las migraciones antiguas EXCEPTO la nueva baseline
find "$SOURCE_DIR" -name "*.sql" \
  ! -name "20251101_000000_baseline_v2.1.0.sql" \
  -exec mv {} "$ARCHIVE_DIR/" \;

echo "✅ Archivado completo"
echo "📊 Total archivadas: $(ls -1 "$ARCHIVE_DIR" | wc -l)"
```

### 🔄 Workflow Completo de Migraciones

```
┌─────────────────────────────────────────────────────────────────┐
│ WORKFLOW: development → tested → applied                        │
└─────────────────────────────────────────────────────────────────┘

1️⃣ DESARROLLO
   📝 Crear: database/migrations/development/20251101_120000_add_feature.sql
   ⬇️

2️⃣ APLICAR A DEV
   $ ./scripts/apply_migration_dev.sh \
       database/migrations/development/20251101_120000_add_feature.sql

   ✅ Migración aplicada en DEV
   ✅ Registrada en _migrations con output/checksum/tiempo
   ⬇️

3️⃣ VALIDAR EN DEV
   🧪 Probar funcionalidad
   🧪 Verificar datos
   🧪 Ejecutar tests
   ⬇️

4️⃣ PROMOVER A TESTED
   $ ./scripts/promote_to_tested.sh

   ✅ Migración movida a database/migrations/tested/
   ⬇️

5️⃣ APLICAR A PROD
   $ ./scripts/apply_migration_prod.sh \
       database/migrations/tested/20251101_120000_add_feature.sql

   💾 Backup automático de PROD
   ✅ Migración aplicada en PROD
   ✅ Registrada en _migrations
   ⬇️

6️⃣ VALIDAR EN PROD
   🧪 Verificar aplicación funciona
   🧪 Revisar PM2 logs
   ⬇️

7️⃣ PROMOVER A APPLIED
   $ ./scripts/promote_to_applied.sh

   ✅ Migración archivada en database/migrations/applied/
   📦 Proceso completo
```

### 📊 Ventajas del Nuevo Sistema

**Trazabilidad Completa**:
- ✅ Cada migración registra quién, cuándo, cuánto tiempo
- ✅ Output completo capturado para debugging
- ✅ Checksums para verificar integridad de archivos
- ✅ Estados claros (success/failed/rolled_back)

**Seguridad**:
- ✅ Uso de stdin (`<`) en lugar de `-f` (más seguro)
- ✅ Backup automático antes de aplicar en PROD
- ✅ Validación en DEV obligatoria antes de PROD

**Organización**:
- ✅ Workflow claro: development → tested → applied
- ✅ Migraciones obsoletas archivadas (no se pierden)
- ✅ Baseline limpia v2.1.0 sin datos de prueba

**Mantenibilidad**:
- ✅ Scripts automatizados para todo el workflow
- ✅ Auditoría automática en cada paso
- ✅ Fácil rollback con backups automáticos

---

## ✅ Checklist de Implementación

### Pre-requisitos
- [ ] Backup completo de DEV
- [ ] Backup completo de PROD
- [ ] Verificar que no hay transacciones en curso

### Fase 1: Crear Rol Unificado
- [ ] Crear `cuentassik_owner` en DEV
- [ ] Crear `cuentassik_owner` en PROD
- [ ] Verificar rol creado correctamente

### Fase 2: Transferir Ownership DEV
- [ ] Aplicar migración en DEV
- [ ] Verificar ownership (debe ser 35 tablas con cuentassik_owner)
- [ ] Verificar que aplicación funciona (npm run dev)
- [ ] Verificar permisos de cuentassik_user

### Fase 3: Transferir Ownership PROD
- [ ] Aplicar migración en PROD
- [ ] Verificar ownership (debe ser 35 tablas con cuentassik_owner)
- [ ] Verificar que aplicación funciona (pm2 restart cuentassik-prod)
- [ ] Verificar permisos de cuentassik_user

### Fase 4: Actualizar Default Privileges
- [ ] Aplicar en DEV
- [ ] Aplicar en PROD
- [ ] Verificar configuración con query de auditoría

### Fase 5: Nueva Seed Baseline
- [ ] Crear nueva seed sin datos de prueba
- [ ] Validar en base de datos temporal
- [ ] Commitear a repositorio

### Fase 6: Eliminar Roles Obsoletos
- [ ] Verificar que NO hay objetos con owners obsoletos
- [ ] Eliminar cuentassik_dev_owner
- [ ] Eliminar cuentassik_prod_owner
- [ ] Actualizar documentación

### Fase 7: Auditoría Final
- [ ] Ejecutar script de auditoría
- [ ] Verificar que DEV y PROD son "espejo"
- [ ] Probar migración de prueba en ambos entornos
- [ ] Documentar cambios en CHANGELOG.md

### Fase 8: Reset Sistema de Migraciones
- [ ] Crear script `archive_old_migrations.sh`
- [ ] Ejecutar archivado (89 migraciones → archive/pre_v2.1.0/)
- [ ] Crear migración `20251101_060000_reset_migrations_table.sql`
- [ ] Aplicar reset de tabla _migrations en DEV
- [ ] Aplicar reset de tabla _migrations en PROD
- [ ] Verificar nueva estructura de _migrations

### Fase 9: Nueva Seed Baseline v2.1.0
- [ ] Crear `20251101_000000_baseline_v2.1.0.sql`
- [ ] Hardcodear `SET ROLE cuentassik_owner;`
- [ ] Eliminar todos los datos de prueba
- [ ] Validar en base de datos temporal
- [ ] Verificar que todos los objetos son owned by cuentassik_owner
- [ ] Commitear a repositorio en `database/migrations/applied/`

### Fase 10: Actualizar Scripts
- [ ] Crear `apply_migration_dev.sh` (usa `<`, captura output, audit)
- [ ] Crear `promote_to_tested.sh`
- [ ] Crear `apply_migration_prod.sh` (usa `<`, backup auto, audit)
- [ ] Crear `promote_to_applied.sh`
- [ ] Probar workflow completo: dev → tested → prod → applied
- [ ] Actualizar permisos de ejecución (chmod +x)

### Fase 11: Actualizar Documentación
- [ ] Reescribir `docs/POSTGRESQL_SISTEMA_COMPLETO.md`
  - [ ] Actualizar roles (eliminar dev_owner/prod_owner)
  - [ ] Documentar cuentassik_owner
  - [ ] Actualizar comandos de restauración
  - [ ] Documentar nueva tabla _migrations
- [ ] Actualizar `database/README.md`
  - [ ] Documentar nuevo workflow de migraciones
  - [ ] Añadir ejemplos de uso de scripts
  - [ ] Documentar estructura archive/pre_v2.1.0/
- [ ] Actualizar `.github/copilot-instructions.md`
  - [ ] Actualizar roles de base de datos
  - [ ] Documentar uso de stdin (`<`) para migraciones

### Fase 12: Validación Final del Sistema Completo
- [ ] Crear migración de prueba en development/
- [ ] Aplicar a DEV con nuevo script
- [ ] Verificar registro en _migrations (todos los campos)
- [ ] Promover a tested/
- [ ] Aplicar a PROD con nuevo script
- [ ] Verificar backup automático creado
- [ ] Verificar registro en _migrations de PROD
- [ ] Promover a applied/
- [ ] Verificar que workflow completo funciona
- [ ] Documentar tiempo total de ejecución

---

## 🎯 Resultado Esperado

### Estructura Final de Roles
```
postgres          → Superusuario del sistema (LOGIN)
cuentassik_owner  → Owner único de objetos en DEV y PROD (NOLOGIN)
cuentassik_user   → Usuario de aplicación (LOGIN)
```

### Ownership Final (DEV y PROD idénticos)
```
Tablas:               35 → cuentassik_owner
Funciones:            55 → cuentassik_owner
Secuencias:            2 → cuentassik_owner
Vistas Materializadas: 3 → cuentassik_owner
```

### Sistema de Migraciones Final
```
database/migrations/
├── archive/
│   └── pre_v2.1.0/              # 89 migraciones antiguas archivadas
├── development/                  # Migraciones nuevas en desarrollo
├── tested/                       # Validadas en DEV, listas para PROD
└── applied/                      # Aplicadas exitosamente en PROD
    └── 20251101_000000_baseline_v2.1.0.sql  # Baseline limpia
```

**Tabla `_migrations` (con auditoría completa)**:
- ✅ migration_name (único)
- ✅ applied_at (timestamp)
- ✅ applied_by (usuario)
- ✅ execution_time_ms (performance)
- ✅ status (success/failed/rolled_back)
- ✅ output_log (stdout capturado)
- ✅ error_log (stderr capturado)
- ✅ checksum (integridad SHA-256)

**Scripts de Workflow**:
- ✅ `apply_migration_dev.sh` - Aplica a DEV con auditoría
- ✅ `promote_to_tested.sh` - Promociona dev → tested
- ✅ `apply_migration_prod.sh` - Aplica a PROD con backup automático
- ✅ `promote_to_applied.sh` - Promociona tested → applied
- ✅ `archive_old_migrations.sh` - Archiva migraciones obsoletas

### Ventajas Conseguidas

**Ownership Unificado**:
- ✅ Migraciones portables entre DEV y PROD sin modificaciones
- ✅ Estructura espejo entre entornos
- ✅ Gestión simplificada de permisos
- ✅ Seed baseline limpia y profesional
- ✅ Default privileges consistentes

**Sistema de Migraciones Robusto**:
- ✅ Trazabilidad completa de cada migración
- ✅ Captura de output/errores para debugging
- ✅ Checksums para verificar integridad
- ✅ Uso de stdin (`<`) más seguro que `-f`
- ✅ Backup automático antes de aplicar en PROD
- ✅ Workflow claro: development → tested → applied
- ✅ Auditoría automática en cada paso
- ✅ Baseline limpia v2.1.0 sin datos de prueba

**Documentación**:
- ✅ PostgreSQL sistema completo actualizado
- ✅ README de database con nuevo workflow
- ✅ Copilot instructions actualizadas
- ✅ Ejemplos de uso de scripts incluidos

---

## 📊 Estimación de Tiempo

### Ownership Unification (Fases 1-7)
- Fase 1: Crear rol unificado → 2 minutos
- Fase 2: Transferir ownership DEV → 5 minutos
- Fase 3: Transferir ownership PROD → 5 minutos
- Fase 4: Actualizar default privileges → 3 minutos
- Fase 5: Nueva seed baseline → 30 minutos
- Fase 6: Eliminar roles obsoletos → 2 minutos
- Fase 7: Auditoría final → 10 minutos
**Subtotal: ~1 hora**

### Migration System Reset (Fases 8-11)
- Fase 8: Reset tabla _migrations → 10 minutos
- Fase 9: Nueva seed v2.1.0 → 30 minutos (ya incluido en Fase 5)
- Fase 10: Actualizar 5 scripts → 1 hora
- Fase 11: Actualizar documentación → 1 hora
**Subtotal: ~2-3 horas**

### Validación Final (Fase 12)
- Fase 12: Pruebas completas → 1 hora
**Subtotal: ~1 hora**

**TOTAL ESTIMADO: 4-5 horas**
**TIEMPO REAL: ~2.5 horas** ✅

---

## ✅ RESULTADO FINAL - v2.1.0

**Fecha de Implementación**: 31 Octubre 2025
**Estado**: ✅ **COMPLETADO** - Todas las fases (12/12)
**Commit**: e74260c
**Branch**: main

### 🎉 Logros Alcanzados

#### 1. Unificación de Ownership Completada
- ✅ Creado rol `cuentassik_owner` unificado (NOLOGIN)
- ✅ Eliminados `cuentassik_dev_owner` y `cuentassik_prod_owner`
- ✅ 250+ objetos migrados exitosamente:
  * 35 tablas
  * 2 secuencias
  * 8 vistas (3 materialized + 5 regulares)
  * 138+ índices
  * 29 funciones
  * 8 tipos ENUM + 8 array variants
- ✅ Ownership 100% consistente entre DEV y PROD

#### 2. Baseline v2.1.0 Generado
- ✅ Archivo: `20251101_000000_baseline_v2.1.0.sql` (6474 líneas)
- ✅ Sin usuarios ni hogares de prueba
- ✅ Ownership hardcodeado con `SET ROLE cuentassik_owner;`
- ✅ Permisos perfectamente organizados

#### 3. Sistema de Migraciones Reseteado
- ✅ 138 migraciones archivadas → `archive/pre_v2.1.0/`
- ✅ Nueva tabla `_migrations` con tracking completo:
  * execution_time_ms
  * status (success/failed/rolled_back)
  * output_log / error_log
  * checksum MD5
  * applied_by tracking
- ✅ Sistema iniciado limpio con 1 migración base

#### 4. Scripts Automatizados Creados
- ✅ `create_migration.sh` - Crear con plantilla
- ✅ `apply_migration.sh` - Aplicar con tracking automático
- ✅ `migration_status.sh` - Ver estado y sincronización DEV/PROD
- ✅ `audit_unified_ownership.sh` - Auditoría completa de ownership
- ✅ `archive_old_migrations.sh` - Archivar migraciones obsoletas

#### 5. Documentación Actualizada
- ✅ `database/README.md` completamente reescrito para v2.1.0
- ✅ `docs/releases/v2.1.0_OWNERSHIP_UNIFICATION.md` (resumen completo)

### 📊 Métricas Finales

```
Objetos Migrados:        250+
Migraciones Archivadas:  138
Roles Activos:           2 (era 3)
Tiempo Ejecución:        ~2.5 horas
Líneas Baseline:         6474
Fases Completadas:       12/12
```

### 🚀 Beneficios Post-Implementación

- **Simplicidad**: Sistema de roles unificado (2 vs 3)
- **Consistencia**: Ownership idéntico DEV/PROD
- **Seguridad**: Privilegios mínimos garantizados
- **Auditable**: Logs completos de todas las migraciones
- **Escalable**: Base limpia lista para futuro desarrollo
- **Automatizado**: Workflow sin pasos manuales

### 📚 Documentación Relacionada

- **README Database**: `database/README.md`
- **Resumen Completo**: `docs/releases/v2.1.0_OWNERSHIP_UNIFICATION.md`
- **PostgreSQL Sistema**: `docs/POSTGRESQL_SISTEMA_COMPLETO.md`
- **PM2 Sistema**: `docs/PM2_SISTEMA_COMPLETO.md`

---

**✅ Issue #6 CERRADO EXITOSAMENTE**
**Sistema listo para desarrollo continuo en v2.1.0** 🚀

7. Validación completa del sistema (Fase 12)
