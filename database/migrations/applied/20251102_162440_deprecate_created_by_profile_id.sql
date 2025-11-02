-- Migración: deprecate created_by_profile_id
-- Fecha: 02 November 2025
-- Autor: AI Agent
-- Sistema: v2.1.0+
-- Issue: #31
-- Objetivo: Deprecar campo created_by_profile_id (duplica 100% profile_id)

-- ========================================
-- DESARROLLO (cuentassik_dev)
-- ========================================
\c cuentassik_dev

BEGIN;

-- Verificar identidad total antes de deprecar
DO $$
DECLARE different_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO different_count
  FROM transactions
  WHERE profile_id != created_by_profile_id
     OR profile_id IS NULL
     OR created_by_profile_id IS NULL;

  IF different_count > 0 THEN
    RAISE EXCEPTION 'Inconsistencia: % registros tienen profile_id != created_by_profile_id', different_count;
  END IF;

  RAISE NOTICE '✅ Verificado: 100%% de registros tienen profile_id = created_by_profile_id';
END $$;

-- Marcar columna como DEPRECADA (no eliminar físicamente aún)
COMMENT ON COLUMN transactions.created_by_profile_id IS
  '⚠️ DEPRECATED (Issue #31): Duplica 100% profile_id.
   Usar profile_id en su lugar para auditoría.
   Este campo será eliminado físicamente en una migración futura.
   Deprecado: 02 November 2025';

COMMIT;

\echo ''
\echo '✅ DEV: created_by_profile_id marcado como DEPRECATED'

-- ========================================
-- PRODUCCIÓN (cuentassik_prod)
-- ========================================
\c cuentassik_prod

BEGIN;

-- Verificar identidad total antes de deprecar
DO $$
DECLARE different_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO different_count
  FROM transactions
  WHERE profile_id != created_by_profile_id
     OR profile_id IS NULL
     OR created_by_profile_id IS NULL;

  IF different_count > 0 THEN
    RAISE EXCEPTION 'Inconsistencia: % registros tienen profile_id != created_by_profile_id', different_count;
  END IF;

  RAISE NOTICE '✅ Verificado: 100%% de registros tienen profile_id = created_by_profile_id';
END $$;

-- Marcar columna como DEPRECADA
COMMENT ON COLUMN transactions.created_by_profile_id IS
  '⚠️ DEPRECATED (Issue #31): Duplica 100% profile_id.
   Usar profile_id en su lugar para auditoría.
   Este campo será eliminado físicamente en una migración futura.
   Deprecado: 02 November 2025';

COMMIT;

\echo ''
\echo '✅ PROD: created_by_profile_id marcado como DEPRECATED'

-- ========================================
-- VERIFICACIÓN
-- ========================================
\c cuentassik_dev
\echo ''
\echo '=== VERIFICACIÓN DEV ==='
SELECT
  COUNT(*) as total_transacciones,
  COUNT(CASE WHEN profile_id = created_by_profile_id THEN 1 END) as identicos,
  COUNT(CASE WHEN profile_id != created_by_profile_id THEN 1 END) as diferentes
FROM transactions;

\c cuentassik_prod
\echo ''
\echo '=== VERIFICACIÓN PROD ==='
SELECT
  COUNT(*) as total_transacciones,
  COUNT(CASE WHEN profile_id = created_by_profile_id THEN 1 END) as identicos,
  COUNT(CASE WHEN profile_id != created_by_profile_id THEN 1 END) as diferentes
FROM transactions;

\echo ''
\echo '✅ Migración completada - Campo deprecado correctamente'
\echo '📝 Próximo paso: Actualizar código para usar solo profile_id'
