# Issue #6: Unificar usuarios DB - Análisis Completo

**Fecha**: 31 Octubre 2025
**Estado**: 🔄 En Progreso

---

## 🎯 Objetivo del Issue

**Situación Actual (INCORRECTA):**
```
DEV:  Objetos owned por → cuentassik_dev_owner
PROD: Objetos owned por → cuentassik_prod_owner
```

**Situación Deseada (CORRECTA):**
```
DEV:  Objetos owned por → cuentassik_owner
PROD: Objetos owned por → cuentassik_owner
```

**Beneficios:**
- ✅ **Mismo owner** en ambas bases de datos
- ✅ **Migraciones portables** sin cambios de SET ROLE
- ✅ **Entorno profesional** con estructura espejo
- ✅ **Simplicidad** en gestión de permisos
- ✅ **Sin conflictos** (las tablas están en bases de datos separadas)

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

---

## 🎯 Resultado Esperado

### Estructura Final de Roles
```
postgres          → Superusuario del sistema (LOGIN)
cuentassik_owner  → Owner único de objetos (NOLOGIN)
cuentassik_user   → Usuario de aplicación (LOGIN)
```

### Ownership Final (DEV y PROD idénticos)
```
Tablas:               35 → cuentassik_owner
Funciones:            55 → cuentassik_owner
Secuencias:            2 → cuentassik_owner
Vistas Materializadas: 3 → cuentassik_owner
```

### Ventajas Conseguidas
- ✅ Migraciones portables entre DEV y PROD sin modificaciones
- ✅ Estructura espejo entre entornos
- ✅ Gestión simplificada de permisos
- ✅ Seed baseline limpia y profesional
- ✅ Default privileges consistentes
- ✅ Documentación completa y actualizada

---

**Estado**: Pendiente de aprobación para proceder con implementación
**Próximo paso**: Crear migración Fase 1 (crear rol cuentassik_owner)
