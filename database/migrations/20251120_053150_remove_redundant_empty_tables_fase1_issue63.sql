-- ============================================
-- Migración: Remove Redundant Empty Tables - Fase 1 (Issue #63)
-- Fecha: 20 November 2025
-- Autor: kava
-- Versión: v3.0.0+
-- Issue: #63 - Revisión de tablas vacías
-- ============================================

-- ========================================
-- CONTEXTO Y JUSTIFICACIÓN
-- ========================================
-- Esta migración elimina 6 tablas vacías identificadas como redundantes:
--
-- 1. contribution_periods → Reemplazada por monthly_periods
--    - monthly_periods tiene todas las funcionalidades necesarias
--    - contribution_periods nunca fue implementada (0 filas)
--    - TODOs en código son obsoletos
--
-- 2. dual_flow_config → Configuración no usada
--    - Dual-flow funciona sin esta tabla
--    - Config manejada en household_settings o hardcoded
--    - Nunca poblada (0 filas)
--
-- 3. dual_flow_transactions → Reemplazada por columnas en transactions
--    - transactions.flow_type y transactions.type cubren toda la funcionalidad
--    - Enfoque de "single table" más eficiente
--    - Nunca poblada (0 filas)
--
-- 4. journal_roles → Sistema journal nunca implementado
--    - No relacionado con journal_transactions (audit log)
--    - Sin UI, server actions, ni referencias en código
--    - Nunca poblada (0 filas)
--
-- 5. journal_invitations → Sistema journal nunca implementado
--    - Parte del mismo sistema no implementado
--    - Sin funcionalidad asociada
--    - Nunca poblada (0 filas)
--
-- 6. journal_adjustments → Sistema journal nunca implementado
--    - Parte del mismo sistema no implementado
--    - Sin funcionalidad asociada
--    - Nunca poblada (0 filas)
--
-- NOTA: journal_transactions (2,362 filas) NO se elimina - es audit log activo
--
-- Impacto: Reduce schema de 37 → 31 tablas (-16%)
-- Riesgo: Bajo - Todas las tablas tienen 0 filas y no están en uso
-- Backup: Creado antes de aplicar (~/backups/cuentassik_dev_backup_*_pre_fase1_issue63.sql)
--
-- Documentación completa: docs/ISSUE_63_ANALISIS_TABLAS_VACIAS.md
-- ========================================

-- ========================================
-- PASO 1: VERIFICACIÓN PREVIA
-- ========================================
-- Verificar que las tablas están realmente vacías antes de eliminar

\echo ''
\echo '🔍 Verificando que las tablas están vacías...'

DO $$
DECLARE
  row_count INTEGER;
  tabla_con_datos TEXT[];
BEGIN
  -- Verificar contribution_periods
  SELECT COUNT(*) INTO row_count FROM contribution_periods;
  IF row_count > 0 THEN
    tabla_con_datos := array_append(tabla_con_datos, 'contribution_periods: ' || row_count || ' filas');
  END IF;

  -- Verificar dual_flow_config
  SELECT COUNT(*) INTO row_count FROM dual_flow_config;
  IF row_count > 0 THEN
    tabla_con_datos := array_append(tabla_con_datos, 'dual_flow_config: ' || row_count || ' filas');
  END IF;

  -- Verificar dual_flow_transactions
  SELECT COUNT(*) INTO row_count FROM dual_flow_transactions;
  IF row_count > 0 THEN
    tabla_con_datos := array_append(tabla_con_datos, 'dual_flow_transactions: ' || row_count || ' filas');
  END IF;

  -- Verificar journal_roles
  SELECT COUNT(*) INTO row_count FROM journal_roles;
  IF row_count > 0 THEN
    tabla_con_datos := array_append(tabla_con_datos, 'journal_roles: ' || row_count || ' filas');
  END IF;

  -- Verificar journal_invitations
  SELECT COUNT(*) INTO row_count FROM journal_invitations;
  IF row_count > 0 THEN
    tabla_con_datos := array_append(tabla_con_datos, 'journal_invitations: ' || row_count || ' filas');
  END IF;

  -- Verificar journal_adjustments
  SELECT COUNT(*) INTO row_count FROM journal_adjustments;
  IF row_count > 0 THEN
    tabla_con_datos := array_append(tabla_con_datos, 'journal_adjustments: ' || row_count || ' filas');
  END IF;

  -- Si alguna tabla tiene datos, abortar
  IF array_length(tabla_con_datos, 1) > 0 THEN
    RAISE EXCEPTION 'ABORTADO: Las siguientes tablas tienen datos: %',
      array_to_string(tabla_con_datos, ', ');
  END IF;

  RAISE NOTICE '✅ Verificación completada: Todas las tablas están vacías';
END $$;

-- ========================================
-- PASO 2: ELIMINAR TABLAS REDUNDANTES
-- ========================================

\echo ''
\echo '🗑️  Eliminando tablas redundantes...'

-- Eliminar contribution_periods
DROP TABLE IF EXISTS contribution_periods CASCADE;
\echo '  ✓ contribution_periods eliminada'

-- Eliminar dual_flow_config
DROP TABLE IF EXISTS dual_flow_config CASCADE;
\echo '  ✓ dual_flow_config eliminada'

-- Eliminar dual_flow_transactions
DROP TABLE IF EXISTS dual_flow_transactions CASCADE;
\echo '  ✓ dual_flow_transactions eliminada'

-- Eliminar journal_roles
DROP TABLE IF EXISTS journal_roles CASCADE;
\echo '  ✓ journal_roles eliminada'

-- Eliminar journal_invitations
DROP TABLE IF EXISTS journal_invitations CASCADE;
\echo '  ✓ journal_invitations eliminada'

-- Eliminar journal_adjustments
DROP TABLE IF EXISTS journal_adjustments CASCADE;
\echo '  ✓ journal_adjustments eliminada'

-- ========================================
-- PASO 3: VERIFICACIÓN POST-ELIMINACIÓN
-- ========================================

\echo ''
\echo '🔍 Verificando que las tablas fueron eliminadas...'

DO $$
DECLARE
  tabla_existente TEXT[];
BEGIN
  -- Verificar que las tablas no existen
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contribution_periods') THEN
    tabla_existente := array_append(tabla_existente, 'contribution_periods');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dual_flow_config') THEN
    tabla_existente := array_append(tabla_existente, 'dual_flow_config');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dual_flow_transactions') THEN
    tabla_existente := array_append(tabla_existente, 'dual_flow_transactions');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_roles') THEN
    tabla_existente := array_append(tabla_existente, 'journal_roles');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_invitations') THEN
    tabla_existente := array_append(tabla_existente, 'journal_invitations');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_adjustments') THEN
    tabla_existente := array_append(tabla_existente, 'journal_adjustments');
  END IF;

  IF array_length(tabla_existente, 1) > 0 THEN
    RAISE EXCEPTION 'ERROR: Las siguientes tablas NO fueron eliminadas: %',
      array_to_string(tabla_existente, ', ');
  END IF;

  RAISE NOTICE '✅ Verificación completada: Todas las tablas fueron eliminadas correctamente';
END $$;

-- ========================================
-- PASO 4: VERIFICAR TABLAS ACTIVAS
-- ========================================

\echo ''
\echo '🔍 Verificando que tablas críticas NO fueron afectadas...'

DO $$
DECLARE
  count_transactions INTEGER;
  count_monthly_periods INTEGER;
  count_journal_transactions INTEGER;
BEGIN
  -- Verificar transactions (debe tener datos)
  SELECT COUNT(*) INTO count_transactions FROM transactions;
  IF count_transactions = 0 THEN
    RAISE WARNING 'ADVERTENCIA: transactions está vacía';
  END IF;

  -- Verificar monthly_periods (debe tener datos)
  SELECT COUNT(*) INTO count_monthly_periods FROM monthly_periods;
  IF count_monthly_periods = 0 THEN
    RAISE WARNING 'ADVERTENCIA: monthly_periods está vacía';
  END IF;

  -- Verificar journal_transactions (audit log - debe tener datos)
  SELECT COUNT(*) INTO count_journal_transactions FROM journal_transactions;
  IF count_journal_transactions = 0 THEN
    RAISE WARNING 'ADVERTENCIA: journal_transactions está vacía';
  END IF;

  RAISE NOTICE '✅ Tablas críticas verificadas:';
  RAISE NOTICE '  - transactions: % filas', count_transactions;
  RAISE NOTICE '  - monthly_periods: % filas', count_monthly_periods;
  RAISE NOTICE '  - journal_transactions: % filas (audit log)', count_journal_transactions;
END $$;

-- ========================================
-- RESUMEN FINAL
-- ========================================

\echo ''
\echo '=========================================='
\echo '✅ Migración Fase 1 Issue #63 Completada'
\echo '=========================================='
\echo ''
\echo 'Tablas eliminadas: 6'
\echo '  • contribution_periods'
\echo '  • dual_flow_config'
\echo '  • dual_flow_transactions'
\echo '  • journal_roles'
\echo '  • journal_invitations'
\echo '  • journal_adjustments'
\echo ''
\echo 'Impacto: Schema reducido de 37 → 31 tablas (-16%)'
\echo ''
\echo '📝 Próximos pasos:'
\echo '  1. Regenerar types: npm run types:generate:dev'
\echo '  2. Verificar compilación: npm run typecheck'
\echo '  3. Commit cambios'
\echo ''
