# Migraciones Pendientes para PROD

**Fecha**: 28 Noviembre 2025
**Estado Actual PROD**: 2 migraciones aplicadas (baseline v3.0.0 + objetivo_a_presupuesto)

---

## 📋 Análisis de Estado

### PROD (Estado Actual)

```
20251105_210000_baseline_v3.0.0.sql          ✅ Aplicado
20251106_084558_objetivo_a_presupuesto.sql   ✅ Aplicado
```

### DEV (Estado Actual)

```
20251105_210000_baseline_v3.0.0.sql                      ✅
20251106_084558_objetivo_a_presupuesto.sql               ✅
20251119_150000_add_is_system_to_categories.sql          ✅
20251119_160000_create_loan_categories.sql               ✅
20251119_170000_deprecate_legacy_balance_tables.sql      ✅
20251119_180000_rename_legacy_tables.sql                 ✅
20251120_005739_add_household_loan_requests_table.sql    ✅
20251120_053150_remove_redundant_empty_tables.sql        ✅
```

---

## ✅ Migraciones a Aplicar en PROD (6 migraciones)

### 1. `20251119_150000_add_is_system_to_categories.sql`

**Tipo**: DDL puro (estructura)
**Impacto**: Añade columna `is_system BOOLEAN` a `categories`
**Datos**: NO modifica datos existentes

**Cambios**:

- `ALTER TABLE categories ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT false`
- `CREATE INDEX idx_categories_is_system`
- Ownership: `cuentassik_owner`
- Permisos: `cuentassik_user`

**Seguro**: ✅ Solo estructura, no toca datos

---

### 2. `20251119_160000_create_loan_categories.sql`

**Tipo**: DML (actualización de datos)
**Impacto**: Marca categorías existentes como sistema
**Datos**: **SÍ modifica datos** (UPDATE is_system=true)

**Cambios**:

```sql
UPDATE categories SET is_system = true
WHERE name IN ('Préstamo Personal', 'Pago Préstamo')
```

**⚠️ ACCIÓN REQUERIDA**: Verificar que estas categorías existen en PROD antes de aplicar

**Verificación Pre-Aplicación**:

```sql
-- Ejecutar en PROD primero:
SELECT c.name, cp.name as grupo, c.household_id
FROM categories c
LEFT JOIN category_parents cp ON cp.id = c.parent_id
WHERE c.name IN ('Préstamo Personal', 'Pago Préstamo');
```

**Si NO existen**: La migración no hará daño (UPDATE sin WHERE match)
**Si SÍ existen**: Se marcarán correctamente como sistema

---

### 3. `20251119_170000_deprecate_legacy_balance_tables.sql`

**Tipo**: DDL (comentarios)
**Impacto**: Solo añade comentarios SQL a 3 tablas
**Datos**: NO modifica datos

**Cambios**:

- `COMMENT ON TABLE personal_loans` → marca como deprecada
- `COMMENT ON TABLE refund_claims` → marca como deprecada
- `COMMENT ON TABLE member_credits` → marca como deprecada

**Verificación incluida**:

```sql
-- Falla si alguna tabla tiene datos (protección)
IF count > 0 THEN RAISE EXCEPTION
```

**Seguro**: ✅ Solo metadatos, verificación de seguridad integrada

---

### 4. `20251119_180000_rename_legacy_tables.sql`

**Tipo**: DDL (renombrado)
**Impacto**: Renombra 3 tablas con prefijo `_legacy_`
**Datos**: NO modifica datos (solo nombres de tabla)

**Cambios**:

- `personal_loans` → `_legacy_personal_loans`
- `refund_claims` → `_legacy_refund_claims`
- `member_credits` → `_legacy_member_credits`

**Protección**:

```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'personal_loans')
  THEN ALTER TABLE personal_loans RENAME TO _legacy_personal_loans;
  ELSE RAISE NOTICE 'Ya renombrada o no existe';
  END IF;
END $$;
```

**Seguro**: ✅ Idempotente, preserva todos los datos

---

### 5. `20251120_005739_add_household_loan_requests_table.sql`

**Tipo**: DDL puro (nueva tabla)
**Impacto**: Crea tabla `loan_requests` nueva
**Datos**: NO modifica datos existentes

**Cambios**:

- `CREATE TYPE loan_request_status AS ENUM`
- `CREATE TABLE loan_requests` (nueva)
- Índices, triggers, ownership, permisos

**Seguro**: ✅ Creación de tabla vacía, sin dependencias

---

### 6. `20251120_053150_remove_redundant_empty_tables_fase1_issue63.sql`

**Tipo**: DDL (eliminación de tablas)
**Impacto**: Elimina 6 tablas vacías
**Datos**: NO toca datos de otras tablas

**Tablas a eliminar** (verificado 0 filas en DEV):

1. `contribution_periods` → reemplazada por `monthly_periods`
2. `dual_flow_config` → nunca usada
3. `dual_flow_transactions` → integrada en `transactions`
4. `journal_roles` → nunca implementada
5. `journal_invitations` → nunca implementada
6. `journal_adjustments` → nunca implementada

**Verificación Pre-Eliminación Integrada**:

```sql
-- Falla si alguna tabla tiene datos
DO $$
  SELECT COUNT(*) INTO row_count FROM tabla;
  IF row_count > 0 THEN
    RAISE EXCEPTION 'Tabla no vacía';
  END IF;
$$;
```

**⚠️ IMPORTANTE**: Verificar que en PROD también están vacías

**Verificación Pre-Aplicación en PROD**:

```bash
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "
SELECT
  'contribution_periods' as tabla,
  COUNT(*) as filas
FROM contribution_periods
UNION ALL
SELECT 'dual_flow_config', COUNT(*) FROM dual_flow_config
UNION ALL
SELECT 'dual_flow_transactions', COUNT(*) FROM dual_flow_transactions
UNION ALL
SELECT 'journal_roles', COUNT(*) FROM journal_roles
UNION ALL
SELECT 'journal_invitations', COUNT(*) FROM journal_invitations
UNION ALL
SELECT 'journal_adjustments', COUNT(*) FROM journal_adjustments;
"
```

**Resultado esperado**: Todas 0 filas
**Seguro si**: ✅ Todas vacías (con verificación integrada)

---

## 🎯 Plan de Aplicación

### Pre-Requisitos

1. **Backup OBLIGATORIO de PROD**:

```bash
sudo -u postgres pg_dump -d cuentassik_prod > ~/backups/prod_pre_migraciones_$(date +%Y%m%d_%H%M%S).sql
```

2. **Verificación de tablas vacías en PROD**:

```bash
# Ejecutar verificación arriba
```

3. **Verificación de categorías de préstamos en PROD**:

```bash
# Ejecutar query de categorías arriba
```

---

### Aplicación Secuencial

**Orden ESTRICTO** (dependencias):

```bash
# 1. Añadir columna is_system
./scripts/migrations/apply_migration.sh prod 20251119_150000_add_is_system_to_categories.sql

# 2. Marcar categorías de préstamos (si existen)
./scripts/migrations/apply_migration.sh prod 20251119_160000_create_loan_categories.sql

# 3. Deprecar tablas legacy (solo comentarios)
./scripts/migrations/apply_migration.sh prod 20251119_170000_deprecate_legacy_balance_tables.sql

# 4. Renombrar tablas legacy
./scripts/migrations/apply_migration.sh prod 20251119_180000_rename_legacy_tables.sql

# 5. Crear tabla loan_requests
./scripts/migrations/apply_migration.sh prod 20251120_005739_add_household_loan_requests_table.sql

# 6. Eliminar tablas vacías redundantes
./scripts/migrations/apply_migration.sh prod 20251120_053150_remove_redundant_empty_tables_fase1_issue63.sql
```

**Tiempo estimado**: 2-3 minutos total

---

## ✅ Verificación Post-Aplicación

```bash
# 1. Verificar migraciones aplicadas
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "
SELECT migration_name, applied_at, status
FROM _migrations
ORDER BY applied_at DESC
LIMIT 8;
"

# 2. Verificar estructura final
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "
SELECT COUNT(*) as total_tablas
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name NOT LIKE 'pg_%'
  AND table_name NOT LIKE '_legacy_%';
"
# Esperado: ~29 tablas (31 - 6 eliminadas + loan_requests)

# 3. Verificar categorías sistema
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "
SELECT name, is_system, household_id
FROM categories
WHERE is_system = true;
"

# 4. Verificar tablas legacy renombradas
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE '_legacy_%';
"
# Esperado: 3 tablas (_legacy_personal_loans, _legacy_refund_claims, _legacy_member_credits)
```

---

## 🔄 Regenerar Types Después

**IMPORTANTE**: Tras aplicar todas las migraciones, regenerar types de PROD:

```bash
npm run types:generate:prod
```

---

## 📊 Resumen de Impacto

| Migración                 | Tipo | Modifica Datos         | Riesgo | Duración |
| ------------------------- | ---- | ---------------------- | ------ | -------- |
| 1. add_is_system          | DDL  | ❌ No                  | Bajo   | 5s       |
| 2. create_loan_categories | DML  | ⚠️ Sí (UPDATE)         | Bajo   | 5s       |
| 3. deprecate_legacy       | DDL  | ❌ No (comentarios)    | Bajo   | 5s       |
| 4. rename_legacy          | DDL  | ❌ No (renombrado)     | Bajo   | 10s      |
| 5. add_loan_requests      | DDL  | ❌ No (nueva tabla)    | Bajo   | 15s      |
| 6. remove_empty_tables    | DDL  | ❌ No (elimina vacías) | Bajo   | 20s      |

**Total**: ~1 minuto de ejecución
**Riesgo General**: ✅ BAJO (con backup previo)

---

## ⚠️ Rollback (Si es Necesario)

### Rollback Individual por Migración

**Migración 1** (add_is_system):

```sql
ALTER TABLE categories DROP COLUMN is_system CASCADE;
DROP INDEX IF EXISTS idx_categories_is_system;
```

**Migración 2** (create_loan_categories):

```sql
UPDATE categories SET is_system = false
WHERE name IN ('Préstamo Personal', 'Pago Préstamo');
```

**Migración 3** (deprecate_legacy):

```sql
COMMENT ON TABLE personal_loans IS NULL;
COMMENT ON TABLE refund_claims IS NULL;
COMMENT ON TABLE member_credits IS NULL;
```

**Migración 4** (rename_legacy):

```sql
ALTER TABLE _legacy_personal_loans RENAME TO personal_loans;
ALTER TABLE _legacy_refund_claims RENAME TO refund_claims;
ALTER TABLE _legacy_member_credits RENAME TO member_credits;
```

**Migración 5** (add_loan_requests):

```sql
DROP TABLE IF EXISTS loan_requests CASCADE;
DROP TYPE IF EXISTS loan_request_status CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

**Migración 6** (remove_empty_tables):

```sql
-- Restaurar desde backup (no se pueden recrear sin datos históricos)
```

### Rollback Total (Backup)

```bash
# Terminar conexiones
sudo -u postgres psql -d postgres -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname='cuentassik_prod' AND pid <> pg_backend_pid();
"

# Restaurar backup
sudo -u postgres psql -d cuentassik_prod < ~/backups/prod_pre_migraciones_XXXXXXXX_XXXXXX.sql
```

---

**Estado**: ✅ LISTO PARA APLICAR
**Backup**: ⚠️ OBLIGATORIO ANTES DE EMPEZAR
**Verificaciones**: ✅ Integradas en las migraciones
