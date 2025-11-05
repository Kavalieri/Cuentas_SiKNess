-- ============================================
-- Baseline v3.0.0 - Sistema de Migraciones Reorganizado
-- Fecha: 2025-11-05
-- Issue: #53
-- Descripción: Registro inicial tras reorganización de scripts
-- ============================================

-- Este archivo NO modifica la estructura de la base de datos
-- Solo registra el punto de inicio del nuevo sistema de migraciones v3.0.0

-- Características del sistema v3.0.0:
-- - Directorio único: database/migrations/
-- - Scripts reorganizados: scripts/migrations/ y scripts/PM2_build_and_deploy_and_dev/
-- - 3 nuevos scripts: migration_status.sh, diff_migrations.sh, rollback_migration.sh
-- - Soporte para entorno TEST (test_baseline_v3)
-- - Auto-regeneración de types tras aplicar migraciones

-- NOTA: La estructura actual de la base de datos es estable y funcional
-- Este baseline marca el inicio del tracking v3.0.0

SELECT 'Baseline v3.0.0 establecido correctamente' as status;
