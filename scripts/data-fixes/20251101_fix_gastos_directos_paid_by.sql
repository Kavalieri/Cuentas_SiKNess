-- ============================================================================
-- Script de Corrección de Datos: Gastos Directos paid_by
-- ============================================================================
-- Fecha: 2025-11-01
-- Tipo: DATOS (no estructural, aplicar manualmente en DEV y PROD)
-- Issue: #19 (ampliación sistema dual-field), #18
--
-- PROBLEMA:
-- Gastos directos tienen paid_by = NULL o member_uuid, pero según nuevo
-- criterio dual-field deben tener paid_by = joint_account_uuid (Cuenta Común)
-- porque el dinero SALE de la cuenta común (el ingreso directo previo ya
-- identificó quién puso ese dinero originalmente).
--
-- CAMBIO DE CRITERIO:
-- ANTES: paid_by = NULL o member_uuid (ambiguo)
-- DESPUÉS: paid_by = joint_account_uuid (claro: sale de Cuenta Común)
--
-- IMPACTO:
-- - 85 gastos directos necesitan corrección
-- - performed_by_profile_id ya está correcto (migración UUID completada)
-- - real_payer_id mantiene quién pagó "de su bolsillo" (legacy)
-- ============================================================================

-- ============================================================================
-- PASO 1: ANÁLISIS - Verificar estado actual
-- ============================================================================

\echo ''
\echo '=========================================='
\echo '📊 ANÁLISIS: Estado Actual de Gastos Directos'
\echo '=========================================='
\echo ''

-- Ver distribución de paid_by en gastos directos
SELECT
  'Gastos directos TOTALES' as metrica,
  COUNT(*) as cantidad
FROM transactions
WHERE flow_type = 'direct' AND type = 'expense_direct'

UNION ALL

SELECT
  'Con paid_by = NULL' as metrica,
  COUNT(*) as cantidad
FROM transactions
WHERE flow_type = 'direct'
  AND type = 'expense_direct'
  AND paid_by IS NULL

UNION ALL

SELECT
  'Con paid_by = member_uuid' as metrica,
  COUNT(*) as cantidad
FROM transactions t
LEFT JOIN profiles p ON t.paid_by = p.id
WHERE t.flow_type = 'direct'
  AND t.type = 'expense_direct'
  AND p.id IS NOT NULL

UNION ALL

SELECT
  'Con paid_by = joint_account_uuid (CORRECTO)' as metrica,
  COUNT(*) as cantidad
FROM transactions t
LEFT JOIN joint_accounts ja ON t.paid_by = ja.id
WHERE t.flow_type = 'direct'
  AND t.type = 'expense_direct'
  AND ja.id IS NOT NULL;

\echo ''
\echo '📋 Detalle de gastos directos a corregir (primeros 10):'
\echo ''

SELECT
  t.id,
  t.description,
  t.amount,
  t.occurred_at,
  CASE
    WHEN t.paid_by IS NULL THEN 'NULL'
    WHEN p.id IS NOT NULL THEN 'member: ' || COALESCE(p.display_name, p.email)
    ELSE 'UUID desconocido'
  END as paid_by_actual,
  COALESCE(p_performer.display_name, p_performer.email) as performed_by,
  COALESCE(p_real.display_name, p_real.email) as real_payer
FROM transactions t
LEFT JOIN profiles p ON t.paid_by = p.id
LEFT JOIN profiles p_performer ON t.performed_by_profile_id = p_performer.id
LEFT JOIN profiles p_real ON t.real_payer_id = p_real.id
LEFT JOIN joint_accounts ja ON t.paid_by = ja.id
WHERE t.flow_type = 'direct'
  AND t.type = 'expense_direct'
  AND ja.id IS NULL  -- No tiene Cuenta Común
ORDER BY t.occurred_at DESC
LIMIT 10;

\echo ''
\echo '⏸️  PAUSA: Revisa los datos arriba antes de continuar.'
\echo '   Si todo se ve correcto, descomenta y ejecuta PASO 2.'
\echo ''

-- ============================================================================
-- PASO 2: CORRECCIÓN - Actualizar paid_by a joint_account_uuid
-- ============================================================================
--
-- ✅ PASO 2 ACTIVADO - SE EJECUTARÁ LA CORRECCIÓN
--
BEGIN;

-- Crear tabla de backup temporal
CREATE TEMP TABLE backup_gastos_directos AS
SELECT
  id,
  paid_by as paid_by_old,
  performed_by_profile_id,
  real_payer_id,
  household_id
FROM transactions
WHERE flow_type = 'direct' AND type = 'expense_direct';

\echo ''
\echo '🔄 Actualizando gastos directos...'
\echo ''

-- Actualizar paid_by a joint_account_uuid
UPDATE transactions t
SET paid_by = ja.id
FROM joint_accounts ja
WHERE t.household_id = ja.household_id
  AND t.flow_type = 'direct'
  AND t.type = 'expense_direct'
  AND (t.paid_by IS NULL OR t.paid_by != ja.id);

\echo ''
\echo '=========================================='
\echo '📊 VERIFICACIÓN POST-CORRECCIÓN'
\echo '=========================================='
\echo ''

SELECT
  'Gastos directos corregidos' as metrica,
  COUNT(*) as cantidad
FROM transactions t
JOIN joint_accounts ja ON t.paid_by = ja.id
WHERE t.flow_type = 'direct' AND t.type = 'expense_direct';

SELECT
  'Gastos directos SIN corregir (deben ser 0)' as metrica,
  COUNT(*) as cantidad
FROM transactions t
LEFT JOIN joint_accounts ja ON t.paid_by = ja.id
WHERE t.flow_type = 'direct'
  AND t.type = 'expense_direct'
  AND ja.id IS NULL;

\echo ''
\echo '📋 Muestra de registros corregidos (5 aleatorios):'
\echo ''

SELECT
  t.description,
  t.amount,
  b.paid_by_old,
  'Cuenta Común' as paid_by_nuevo,
  COALESCE(p.display_name, p.email) as performed_by
FROM transactions t
JOIN backup_gastos_directos b ON t.id = b.id
JOIN joint_accounts ja ON t.paid_by = ja.id
LEFT JOIN profiles p ON t.performed_by_profile_id = p.id
ORDER BY RANDOM()
LIMIT 5;

\echo ''
\echo '⏸️  REVISIÓN: Si todo se ve correcto, ejecuta COMMIT.'
\echo '   Si algo está mal, ejecuta ROLLBACK.'
\echo ''

COMMIT;  -- ✅ Auto-commit activado tras verificación
-- ============================================================================\echo ''
\echo '=========================================='
\echo '📚 INSTRUCCIONES DE USO'
\echo '=========================================='
\echo ''
\echo '1. Ejecutar PASO 1 (análisis) en DEV:'
\echo '   psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev -f scripts/data-fixes/20251101_fix_gastos_directos_paid_by.sql'
\echo ''
\echo '2. Revisar output del análisis'
\echo ''
\echo '3. Si todo OK, descomenta PASO 2 en el archivo'
\echo ''
\echo '4. Ejecutar nuevamente (aplicará corrección)'
\echo ''
\echo '5. Revisar verificación post-corrección'
\echo ''
\echo '6. Si todo OK, ejecutar COMMIT manualmente'
\echo ''
\echo '7. Repetir proceso en PROD'
\echo ''
\echo '=========================================='
\echo ''
