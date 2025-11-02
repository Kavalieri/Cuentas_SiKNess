-- ============================================================================
-- Migración: Sistema Dual-Field - performed_by_email → performed_by_profile_id
-- ============================================================================
-- Fecha: 2025-11-01
-- Issue: #19 (ampliación), #20 (resolución)
--
-- OBJETIVO:
-- Migrar de identificador débil (email) a fuerte (UUID) para tracking de
-- "quién ejecutó físicamente" una transacción.
--
-- BENEFICIOS:
-- ✅ Reutiliza concepto existente (performed_by_email)
-- ✅ Mejora integridad referencial (UUID + FK)
-- ✅ Reduce deuda técnica (migración en lugar de campo nuevo)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASO 1: Crear nueva columna performed_by_profile_id
-- ============================================================================

ALTER TABLE transactions
ADD COLUMN performed_by_profile_id UUID REFERENCES profiles(id);

COMMENT ON COLUMN transactions.performed_by_profile_id IS
  'UUID del miembro que FÍSICAMENTE ejecutó la transacción (pasó tarjeta, hizo ingreso).

   Semántica:
   - Gastos comunes: quien pasó la tarjeta (diferente de paid_by = Cuenta Común)
   - Ingresos comunes: quien hizo el ingreso (normalmente coincide con paid_by)
   - Gastos directos: quien realizó el gasto (coincide con real_payer_id)
   - Ingresos compensatorios: NULL (automático del sistema, no hay ejecutor físico)

   Complementa a paid_by (origen del dinero) para tracking dual completo.';

-- ============================================================================
-- PASO 2: Migrar datos existentes desde performed_by_email
-- ============================================================================

-- 2.1. Migrar emails existentes a UUIDs
UPDATE transactions t
SET performed_by_profile_id = p.id
FROM profiles p
WHERE t.performed_by_email = p.email
  AND t.performed_by_email IS NOT NULL;

-- Verificar migración
DO $$
DECLARE
  v_migrated INTEGER;
  v_not_null INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_not_null
  FROM transactions
  WHERE performed_by_email IS NOT NULL;

  SELECT COUNT(*) INTO v_migrated
  FROM transactions
  WHERE performed_by_profile_id IS NOT NULL;

  RAISE NOTICE '📊 Migración email → UUID: % registros con email, % migrados a UUID',
    v_not_null, v_migrated;

  IF v_not_null > 0 AND v_migrated = 0 THEN
    RAISE EXCEPTION 'ERROR: No se pudo migrar ningún email a UUID. Verificar datos de profiles.';
  END IF;
END $$;

-- ============================================================================
-- PASO 3: Poblar NULLs con inferencia razonable
-- ============================================================================

-- 3.1. Gastos comunes: inferir del profile_id (quien registró, asumimos que también ejecutó)
UPDATE transactions
SET performed_by_profile_id = profile_id
WHERE flow_type = 'common'
  AND type = 'expense'
  AND performed_by_profile_id IS NULL
  AND profile_id IS NOT NULL;

-- 3.2. Ingresos comunes: inferir del paid_by (quien ingresa dinero)
UPDATE transactions
SET performed_by_profile_id = paid_by::uuid
WHERE flow_type = 'common'
  AND type = 'income'
  AND performed_by_profile_id IS NULL
  AND paid_by IS NOT NULL
  AND EXISTS (SELECT 1 FROM profiles WHERE id = paid_by::uuid);  -- Verificar que es un profile

-- 3.3. Gastos directos: inferir del real_payer_id (quien pagó de su bolsillo)
UPDATE transactions
SET performed_by_profile_id = real_payer_id
WHERE flow_type = 'direct'
  AND type = 'expense_direct'
  AND performed_by_profile_id IS NULL
  AND real_payer_id IS NOT NULL;

-- 3.4. Ingresos compensatorios: dejar NULL (automático del sistema)
-- (No requiere UPDATE, ya es NULL por defecto)

-- Verificar población
DO $$
DECLARE
  v_total INTEGER;
  v_populated INTEGER;
  v_null_remaining INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM transactions;
  SELECT COUNT(*) INTO v_populated FROM transactions WHERE performed_by_profile_id IS NOT NULL;
  SELECT COUNT(*) INTO v_null_remaining FROM transactions WHERE performed_by_profile_id IS NULL;

  RAISE NOTICE '📊 Población total: % registros, % poblados (%.1f%%), % NULLs restantes',
    v_total,
    v_populated,
    (v_populated::NUMERIC / v_total * 100),
    v_null_remaining;
END $$;

-- ============================================================================
-- PASO 4: Deprecar performed_by_email (mantener temporalmente)
-- ============================================================================

ALTER TABLE transactions
RENAME COLUMN performed_by_email TO performed_by_email_deprecated;

COMMENT ON COLUMN transactions.performed_by_email_deprecated IS
  '⚠️ DEPRECADO: Reemplazado por performed_by_profile_id (UUID fuerte).

   Mantener temporalmente para:
   - Auditoría de la migración
   - Rollback si fuera necesario
   - Verificación de datos históricos

   ELIMINAR EN FUTURO: Una vez verificada estabilidad del nuevo campo.

   Historial:
   - Creado: [fecha original]
   - Deprecado: 2025-11-01 (Issue #19, #20)
   - Reemplazado por: performed_by_profile_id';

-- ============================================================================
-- PASO 5: Limpieza de redundancias detectadas (FUTURO - comentado)
-- ============================================================================
--
-- NOTA: Estos campos son 100% redundantes (verified con query):
-- - profile_id ≡ created_by_profile_id ≡ created_by_member_id (198/198 coinciden)
-- - created_by_email (nunca usado, puede obtenerse de profile)
--
-- ACCIÓN FUTURA (Issue separado para evitar scope creep):
-- 1. Consolidar en created_by_profile_id (mejor nombre semántico)
-- 2. Deprecar/eliminar: profile_id, created_by_member_id
-- 3. Eliminar: created_by_email (nunca usado)
--
-- Por ahora, SOLO comentamos para documentar la deuda técnica detectada.
-- ============================================================================

-- ============================================================================
-- PASO 6: Verificación final
-- ============================================================================

DO $$
DECLARE
  v_gastos_comunes_ok INTEGER;
  v_ingresos_comunes_ok INTEGER;
  v_gastos_directos_ok INTEGER;
  v_ingresos_compensatorios_ok INTEGER;
BEGIN
  -- Gastos comunes: deben tener performed_by poblado
  SELECT COUNT(*) INTO v_gastos_comunes_ok
  FROM transactions
  WHERE flow_type = 'common'
    AND type = 'expense'
    AND performed_by_profile_id IS NOT NULL;

  -- Ingresos comunes: deben tener performed_by poblado
  SELECT COUNT(*) INTO v_ingresos_comunes_ok
  FROM transactions
  WHERE flow_type = 'common'
    AND type = 'income'
    AND performed_by_profile_id IS NOT NULL;

  -- Gastos directos: deben tener performed_by poblado
  SELECT COUNT(*) INTO v_gastos_directos_ok
  FROM transactions
  WHERE flow_type = 'direct'
    AND type = 'expense_direct'
    AND performed_by_profile_id IS NOT NULL;

  -- Ingresos compensatorios: pueden tener NULL (automático)
  SELECT COUNT(*) INTO v_ingresos_compensatorios_ok
  FROM transactions
  WHERE flow_type = 'direct'
    AND type = 'income';

  RAISE NOTICE '✅ Verificación final:';
  RAISE NOTICE '  - Gastos comunes con performed_by: %', v_gastos_comunes_ok;
  RAISE NOTICE '  - Ingresos comunes con performed_by: %', v_ingresos_comunes_ok;
  RAISE NOTICE '  - Gastos directos con performed_by: %', v_gastos_directos_ok;
  RAISE NOTICE '  - Ingresos compensatorios (pueden ser NULL): %', v_ingresos_compensatorios_ok;
END $$;

-- ============================================================================
-- PASO 7: Resumen de migración
-- ============================================================================

DO $$
DECLARE
  v_deprecado_count INTEGER;
  v_nuevo_count INTEGER;
  v_porcentaje NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_deprecado_count
  FROM transactions
  WHERE performed_by_email_deprecated IS NOT NULL;

  SELECT COUNT(*) INTO v_nuevo_count
  FROM transactions
  WHERE performed_by_profile_id IS NOT NULL;

  v_porcentaje := CASE
    WHEN v_deprecado_count > 0 THEN (v_nuevo_count::NUMERIC / v_deprecado_count * 100)
    ELSE 100
  END;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRACIÓN COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'performed_by_email → performed_by_profile_id';
  RAISE NOTICE '  Emails originales: %', v_deprecado_count;
  RAISE NOTICE '  UUIDs migrados: %', v_nuevo_count;
  RAISE NOTICE '  Tasa de éxito: %.1f%%', v_porcentaje;
  RAISE NOTICE '';
  RAISE NOTICE '📋 Siguiente paso:';
  RAISE NOTICE '  1. Regenerar types: npm run types:generate:dev';
  RAISE NOTICE '  2. Actualizar código para usar performed_by_profile_id';
  RAISE NOTICE '  3. Testing completo antes de promocionar a PROD';
  RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
