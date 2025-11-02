-- Migración: remove unique constraint from migrations table to allow retry audit trail
-- Fecha: 01 November 2025
-- Autor: kava
-- Sistema: v2.1.0+
-- Owner: cuentassik_owner (unificado v2.1.0)

-- ========================================
-- PROPÓSITO
-- ========================================
-- Eliminar el UNIQUE CONSTRAINT en _migrations.migration_name para permitir
-- múltiples registros de intentos de la misma migración (failed, failed, success).
-- 
-- CONTEXTO:
-- - El script apply_migration.sh detecta intentos fallidos y permite reintentos
-- - La filosofía es preservar audit trail completo de todos los intentos
-- - Las queries ya filtran por status='success' para obtener migraciones aplicadas
-- - El UNIQUE constraint impedía registrar reintentos exitosos después de failures
--
-- AUDIT TRAIL ESPERADO:
-- id | migration_name     | status  | applied_at
-- ---+--------------------+---------+-------------------------
--  1 | 20251101_xxx.sql   | failed  | 2025-11-01 17:05:05
--  2 | 20251101_xxx.sql   | success | 2025-11-01 17:10:23
--
-- IMPACTO:
-- - Queries deben filtrar por status='success' cuando busquen "aplicadas"
-- - Elimina errores silenciosos de INSERT durante reintentos
-- - Preserva historial completo de troubleshooting

-- ========================================
-- DESARROLLO (cuentassik_dev)
-- ========================================
\c cuentassik_dev

\echo ''
\echo '🔓 Eliminando UNIQUE constraint en _migrations.migration_name...'

-- Eliminar constraint UNIQUE
ALTER TABLE _migrations 
DROP CONSTRAINT IF EXISTS _migrations_migration_name_key;

\echo '✅ Constraint eliminado - ahora se permiten múltiples intentos por migración'
\echo ''

-- Verificar estructura resultante
\d _migrations

\echo ''
\echo '✅ DEV: Cambios aplicados'

-- ========================================
-- PRODUCCIÓN (cuentassik_prod)
-- ========================================
\c cuentassik_prod

\echo ''
\echo '🔓 Eliminando UNIQUE constraint en _migrations.migration_name...'

-- Eliminar constraint UNIQUE
ALTER TABLE _migrations 
DROP CONSTRAINT IF EXISTS _migrations_migration_name_key;

\echo '✅ Constraint eliminado - ahora se permiten múltiples intentos por migración'
\echo ''

-- Verificar estructura resultante
\d _migrations

\echo ''
\echo '✅ PROD: Cambios aplicados'
-- (copiar el bloque de arriba)

\echo ''
\echo '✅ PROD: Cambios aplicados'

-- ========================================
-- VERIFICACIÓN
-- ========================================
\c cuentassik_dev
\echo ''
\echo '=== VERIFICACIÓN DEV ==='
-- SELECT COUNT(*) FROM nueva_tabla;

\c cuentassik_prod
\echo ''
\echo '=== VERIFICACIÓN PROD ==='
-- SELECT COUNT(*) FROM nueva_tabla;

\echo ''
\echo '✅ Migración completada'
