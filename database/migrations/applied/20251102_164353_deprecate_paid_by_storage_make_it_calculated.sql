-- Migración: deprecate paid_by storage - make it calculated
-- Fecha: 02 November 2025
-- Autor: AI Agent
-- Sistema: v2.1.0+
-- Issue: #33
-- Objetivo: Deprecar almacenamiento de paid_by - convertirlo a campo calculado

-- ========================================
-- DESARROLLO (cuentassik_dev)
-- ========================================
\c cuentassik_dev

BEGIN;

-- Verificar consistencia de datos antes de deprecar
DO $$
DECLARE 
  inconsistent_count INTEGER;
BEGIN
  -- Verificar que los datos existentes siguen las reglas de cálculo
  -- REGLA: Gastos (expense*) → paid_by debería ser joint_account
  -- REGLA: Ingresos (income*) → paid_by debería ser performed_by_profile_id
  
  -- Contar inconsistencias
  WITH joint_account AS (
    SELECT id FROM joint_accounts LIMIT 1
  )
  SELECT COUNT(*) INTO inconsistent_count
  FROM transactions t
  CROSS JOIN joint_account ja
  WHERE 
    -- Gastos con paid_by != joint_account
    ((t.type IN ('expense', 'expense_direct') AND t.paid_by != ja.id AND t.paid_by IS NOT NULL)
    OR
    -- Ingresos con paid_by != performed_by_profile_id
    (t.type IN ('income', 'income_direct') AND t.paid_by != t.performed_by_profile_id AND t.paid_by IS NOT NULL));
  
  IF inconsistent_count > 0 THEN
    RAISE NOTICE 'Advertencia: % transacciones no siguen reglas de cálculo (se auto-corregirán)', inconsistent_count;
  ELSE
    RAISE NOTICE '✅ Verificado: 100%% de transacciones siguen reglas de cálculo';
  END IF;
END $$;

-- Marcar columna como DEPRECADA (no eliminar físicamente aún)
COMMENT ON COLUMN transactions.paid_by IS 
  '⚠️ DEPRECATED (Issue #33): Campo calculado dinámicamente.
   
   REGLAS DE CÁLCULO:
   - Gastos (expense, expense_direct): paid_by = joint_account_id (Cuenta Común)
   - Ingresos (income, income_direct): paid_by = performed_by_profile_id (Miembro)
   
   Usar performed_by_profile_id como fuente única de verdad.
   Este campo almacenado será eliminado físicamente en una migración futura.
   Deprecado: 02 November 2025';

COMMIT;

\echo ''
\echo '✅ DEV: paid_by marcado como DEPRECATED (campo calculado)'

-- ========================================
-- PRODUCCIÓN (cuentassik_prod)
-- ========================================
\c cuentassik_prod

BEGIN;

-- Verificar consistencia de datos antes de deprecar
DO $$
DECLARE 
  inconsistent_count INTEGER;
BEGIN
  -- Verificar que los datos existentes siguen las reglas de cálculo
  WITH joint_account AS (
    SELECT id FROM joint_accounts LIMIT 1
  )
  SELECT COUNT(*) INTO inconsistent_count
  FROM transactions t
  CROSS JOIN joint_account ja
  WHERE 
    -- Gastos con paid_by != joint_account
    ((t.type IN ('expense', 'expense_direct') AND t.paid_by != ja.id AND t.paid_by IS NOT NULL)
    OR
    -- Ingresos con paid_by != performed_by_profile_id
    (t.type IN ('income', 'income_direct') AND t.paid_by != t.performed_by_profile_id AND t.paid_by IS NOT NULL));
  
  IF inconsistent_count > 0 THEN
    RAISE NOTICE 'Advertencia: % transacciones no siguen reglas de cálculo (se auto-corregirán)', inconsistent_count;
  ELSE
    RAISE NOTICE '✅ Verificado: 100%% de transacciones siguen reglas de cálculo';
  END IF;
END $$;

-- Marcar columna como DEPRECADA
COMMENT ON COLUMN transactions.paid_by IS 
  '⚠️ DEPRECATED (Issue #33): Campo calculado dinámicamente.
   
   REGLAS DE CÁLCULO:
   - Gastos (expense, expense_direct): paid_by = joint_account_id (Cuenta Común)
   - Ingresos (income, income_direct): paid_by = performed_by_profile_id (Miembro)
   
   Usar performed_by_profile_id como fuente única de verdad.
   Este campo almacenado será eliminado físicamente en una migración futura.
   Deprecado: 02 November 2025';

COMMIT;

\echo ''
\echo '✅ PROD: paid_by marcado como DEPRECATED (campo calculado)'

-- ========================================
-- VERIFICACIÓN
-- ========================================
\c cuentassik_dev
\echo ''
\echo '=== VERIFICACIÓN DEV ==='

-- Mostrar distribución actual
WITH joint_account AS (
  SELECT id FROM joint_accounts LIMIT 1
)
SELECT 
  t.type,
  t.flow_type,
  COUNT(*) as total,
  COUNT(CASE WHEN t.paid_by = ja.id THEN 1 END) as paid_is_joint,
  COUNT(CASE WHEN t.paid_by = t.performed_by_profile_id THEN 1 END) as paid_eq_performed,
  COUNT(CASE WHEN t.paid_by IS NULL THEN 1 END) as paid_is_null
FROM transactions t
CROSS JOIN joint_account ja
GROUP BY t.type, t.flow_type
ORDER BY t.flow_type, t.type;

\c cuentassik_prod
\echo ''
\echo '=== VERIFICACIÓN PROD ==='

WITH joint_account AS (
  SELECT id FROM joint_accounts LIMIT 1
)
SELECT 
  t.type,
  t.flow_type,
  COUNT(*) as total,
  COUNT(CASE WHEN t.paid_by = ja.id THEN 1 END) as paid_is_joint,
  COUNT(CASE WHEN t.paid_by = t.performed_by_profile_id THEN 1 END) as paid_eq_performed,
  COUNT(CASE WHEN t.paid_by IS NULL THEN 1 END) as paid_is_null
FROM transactions t
CROSS JOIN joint_account ja
GROUP BY t.type, t.flow_type
ORDER BY t.flow_type, t.type;

\echo ''
\echo '✅ Migración completada - Campo deprecado correctamente'
\echo '📝 Próximo paso: El código ya no escribe paid_by, se calculará dinámicamente'
