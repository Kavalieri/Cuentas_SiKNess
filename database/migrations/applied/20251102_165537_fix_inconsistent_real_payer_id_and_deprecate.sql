-- ============================================
-- Migration: Issue #30 - Corregir real_payer_id inconsistente y deprecar
-- Created: 2025-11-02 16:55:37
-- Author: AI Assistant
--
-- OBJETIVO:
--   1. Corregir 11 registros donde performed_by_profile_id != real_payer_id
--   2. Establecer performed_by_profile_id como único campo de verdad
--   3. Marcar real_payer_id como DEPRECATED
--
-- REGLA DE NEGOCIO:
--   Para transacciones directas (flow_type='direct'):
--   - performed_by_profile_id = quien pagó de su bolsillo (CAMPO ÚNICO)
--   - real_payer_id = MISMO VALOR (redundante, deprecado)
--   - profile_id = quien registró en el sistema (auditoría)
-- ============================================

-- ============================================
-- SECCIÓN DEV
-- ============================================

DO $$
DECLARE
  v_inconsistent_count INTEGER;
  v_fixed_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '🔧 Issue #30: Corregir real_payer_id';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '';

  -- 1. Contar registros inconsistentes
  SELECT COUNT(*) INTO v_inconsistent_count
  FROM transactions
  WHERE flow_type = 'direct'
    AND real_payer_id IS NOT NULL
    AND performed_by_profile_id != real_payer_id;

  RAISE NOTICE '📊 Registros inconsistentes encontrados: %', v_inconsistent_count;

  IF v_inconsistent_count = 0 THEN
    RAISE NOTICE '✅ No hay inconsistencias - todos los datos ya son correctos';
  ELSE
    RAISE NOTICE '🔄 Corrigiendo performed_by_profile_id = real_payer_id...';

    -- 2. Corregir: performed_by_profile_id debe ser igual a real_payer_id
    UPDATE transactions
    SET performed_by_profile_id = real_payer_id
    WHERE flow_type = 'direct'
      AND real_payer_id IS NOT NULL
      AND performed_by_profile_id != real_payer_id;

    GET DIAGNOSTICS v_fixed_count = ROW_COUNT;
    RAISE NOTICE '✅ Corregidos % registros', v_fixed_count;
  END IF;

  -- 3. Verificación final
  SELECT COUNT(*) INTO v_inconsistent_count
  FROM transactions
  WHERE flow_type = 'direct'
    AND real_payer_id IS NOT NULL
    AND performed_by_profile_id != real_payer_id;

  IF v_inconsistent_count > 0 THEN
    RAISE EXCEPTION '❌ ERROR: Aún quedan % registros inconsistentes', v_inconsistent_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Verificación final OK: Todos los registros directos son consistentes';
  RAISE NOTICE '';
END $$;

-- Marcar columna real_payer_id como DEPRECATED
COMMENT ON COLUMN transactions.real_payer_id IS
  '⚠️ DEPRECATED (Issue #30): Campo redundante con performed_by_profile_id.

   USAR EN SU LUGAR: performed_by_profile_id

   REGLA DE NEGOCIO (transacciones directas):
   - performed_by_profile_id = quien pagó de su bolsillo (CAMPO ÚNICO DE VERDAD)
   - real_payer_id = MISMO VALOR (redundante, mantenido por compatibilidad)
   - profile_id = quien registró en el sistema (auditoría)

   NOTA: Para transacciones no directas (common), real_payer_id = NULL siempre.

   Deprecado: 02 November 2025
   Eliminar en: v3.0.0 (tras periodo de gracia de 6 meses)';

-- ============================================
-- SECCIÓN PROD
-- ============================================

DO $$
DECLARE
  v_inconsistent_count INTEGER;
  v_fixed_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '🚀 PRODUCCIÓN: Issue #30 - Corregir real_payer_id';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '';

  -- 1. Contar registros inconsistentes
  SELECT COUNT(*) INTO v_inconsistent_count
  FROM transactions
  WHERE flow_type = 'direct'
    AND real_payer_id IS NOT NULL
    AND performed_by_profile_id != real_payer_id;

  RAISE NOTICE '📊 Registros inconsistentes encontrados: %', v_inconsistent_count;

  IF v_inconsistent_count = 0 THEN
    RAISE NOTICE '✅ No hay inconsistencias - todos los datos ya son correctos';
  ELSE
    RAISE NOTICE '🔄 Corrigiendo performed_by_profile_id = real_payer_id...';

    -- 2. Corregir: performed_by_profile_id debe ser igual a real_payer_id
    UPDATE transactions
    SET performed_by_profile_id = real_payer_id
    WHERE flow_type = 'direct'
      AND real_payer_id IS NOT NULL
      AND performed_by_profile_id != real_payer_id;

    GET DIAGNOSTICS v_fixed_count = ROW_COUNT;
    RAISE NOTICE '✅ Corregidos % registros', v_fixed_count;
  END IF;

  -- 3. Verificación final
  SELECT COUNT(*) INTO v_inconsistent_count
  FROM transactions
  WHERE flow_type = 'direct'
    AND real_payer_id IS NOT NULL
    AND performed_by_profile_id != real_payer_id;

  IF v_inconsistent_count > 0 THEN
    RAISE EXCEPTION '❌ ERROR: Aún quedan % registros inconsistentes', v_inconsistent_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Verificación final OK: Todos los registros directos son consistentes';
  RAISE NOTICE '';
END $$;

-- Marcar columna real_payer_id como DEPRECATED (PROD)
COMMENT ON COLUMN transactions.real_payer_id IS
  '⚠️ DEPRECATED (Issue #30): Campo redundante con performed_by_profile_id.

   USAR EN SU LUGAR: performed_by_profile_id

   REGLA DE NEGOCIO (transacciones directas):
   - performed_by_profile_id = quien pagó de su bolsillo (CAMPO ÚNICO DE VERDAD)
   - real_payer_id = MISMO VALOR (redundante, mantenido por compatibilidad)
   - profile_id = quien registró en el sistema (auditoría)

   NOTA: Para transacciones no directas (common), real_payer_id = NULL siempre.

   Deprecado: 02 November 2025
   Eliminar en: v3.0.0 (tras periodo de gracia de 6 meses)';

-- ============================================
-- QUERIES DE VERIFICACIÓN
-- ============================================

-- Verificar distribución tras corrección (DEV/PROD)
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 DISTRIBUCIÓN FINAL DE TRANSACCIONES:';
  RAISE NOTICE '';
END $$;

SELECT
  type,
  flow_type,
  COUNT(*) as total,
  COUNT(CASE WHEN real_payer_id = performed_by_profile_id THEN 1 END) as coinciden,
  COUNT(CASE WHEN real_payer_id != performed_by_profile_id THEN 1 END) as difieren,
  COUNT(CASE WHEN real_payer_id IS NULL THEN 1 END) as real_payer_null
FROM transactions
GROUP BY type, flow_type
ORDER BY flow_type, type;

-- ========================================
-- DESARROLLO (cuentassik_dev)
-- ========================================
\c cuentassik_dev

-- TODO: Agregar cambios de estructura aquí
-- Ejemplo:
-- CREATE TABLE IF NOT EXISTS nueva_tabla (
--   id SERIAL PRIMARY KEY,
--   nombre VARCHAR(255) NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
-- );

-- ALTER TABLE nueva_tabla OWNER TO cuentassik_owner;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON nueva_tabla TO cuentassik_user;

\echo ''
\echo '✅ DEV: Cambios aplicados'

-- ========================================
-- PRODUCCIÓN (cuentassik_prod)
-- ========================================
\c cuentassik_prod

-- TODO: Replicar los mismos cambios aquí
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
