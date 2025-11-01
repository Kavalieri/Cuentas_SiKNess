-- ============================================
-- SCRIPT DE REPARACIÓN DE DATOS
-- Issue #19 - Corregir paid_by en transacciones comunes
-- Fecha: 1 Nov 2025
-- Tipo: REPARACIÓN DATOS (ejecutar MANUAL después de migración)
-- ============================================

-- CONTEXTO:
-- 26 transacciones de flujo común tienen paid_by con UUID de usuario
-- cuando deberían tener UUID de Cuenta Común.
--
-- CAUSA: Bug en formularios (Issue #17) - ya corregido en código
-- SOLUCIÓN: Actualizar datos históricos manualmente
--
-- PRERREQUISITO: Migración 20251101_130000_create_joint_accounts.sql aplicada

-- ============================================
-- INSTRUCCIONES DE USO
-- ============================================
-- 1. Verificar que joint_accounts existe: \dt joint_accounts
-- 2. Revisar PASO 1 (análisis)
-- 3. Si todo OK, descomentar y ejecutar PASO 2 (actualización)
-- 4. Verificar PASO 3 (post-actualización)

-- ============================================
-- PASO 1: ANÁLISIS PRE-ACTUALIZACIÓN
-- ============================================

\echo '=== ANÁLISIS DE TRANSACCIONES A CORREGIR ==='
\echo ''

-- Ver transacciones afectadas
\echo '📊 Transacciones de gastos comunes con paid_by INCORRECTO:'
SELECT
  t.id,
  t.description,
  t.flow_type,
  t.type,
  t.amount,
  t.occurred_at,
  p.display_name as paid_by_actual,
  ja.display_name as paid_by_correcto
FROM transactions t
LEFT JOIN profiles p ON t.paid_by = p.id
LEFT JOIN joint_accounts ja ON ja.household_id = t.household_id
WHERE t.flow_type = 'common'
  AND t.type = 'expense'
  AND t.paid_by IS NOT NULL
  AND t.paid_by NOT IN (SELECT id FROM joint_accounts)
ORDER BY t.occurred_at DESC;

\echo ''
\echo '📈 Resumen por hogar:'
SELECT
  h.id as household_id,
  COUNT(*) as transacciones_afectadas,
  SUM(t.amount)::numeric::text as total_amount
FROM transactions t
JOIN households h ON t.household_id = h.id
WHERE t.flow_type = 'common'
  AND t.type = 'expense'
  AND t.paid_by IS NOT NULL
  AND t.paid_by NOT IN (SELECT id FROM joint_accounts)
GROUP BY h.id;

\echo ''
\echo '📋 Total afectado:'
SELECT
  COUNT(*) as total_transacciones,
  MIN(occurred_at) as fecha_mas_antigua,
  MAX(occurred_at) as fecha_mas_reciente
FROM transactions
WHERE flow_type = 'common'
  AND type = 'expense'
  AND paid_by IS NOT NULL
  AND paid_by NOT IN (SELECT id FROM joint_accounts);

\echo ''
\echo '⚠️  REVISAR SALIDA ANTES DE CONTINUAR'
\echo '    Si es correcta, descomentar PASO 2'
\echo ''

-- ============================================
-- PASO 2: ACTUALIZACIÓN (ACTIVADO)
-- ============================================

-- ✅ PASO 2 ACTIVADO - SE EJECUTARÁ LA CORRECCIÓN

\echo '=== INICIANDO ACTUALIZACIÓN ==='

BEGIN;

-- Backup de seguridad en tabla temporal
CREATE TEMP TABLE backup_paid_by_fix AS
SELECT
  id,
  paid_by as paid_by_old,
  household_id,
  description,
  amount,
  occurred_at
FROM transactions
WHERE flow_type = 'common'
  AND type = 'expense'
  AND paid_by IS NOT NULL
  AND paid_by NOT IN (SELECT id FROM joint_accounts);

\echo ''
\echo '💾 Backup creado en tabla temporal backup_paid_by_fix'
\echo ''

-- Actualizar: gastos comunes → paid_by = UUID Cuenta Común
UPDATE transactions t
SET
  paid_by = (SELECT id FROM joint_accounts WHERE household_id = t.household_id),
  updated_at = now()
  -- NO modificamos updated_by_profile_id (mantener auditoría original)
WHERE t.flow_type = 'common'
  AND t.type = 'expense'
  AND t.paid_by IS NOT NULL
  AND t.paid_by NOT IN (SELECT id FROM joint_accounts);

\echo '✅ Transacciones actualizadas'
\echo ''

-- Verificar resultado
\echo '=== RESULTADO DE ACTUALIZACIÓN ==='
SELECT
  COUNT(*) as transacciones_corregidas,
  MIN(occurred_at) as fecha_mas_antigua,
  MAX(occurred_at) as fecha_mas_reciente,
  SUM(amount)::numeric::text as total_amount
FROM backup_paid_by_fix;

\echo ''
\echo '⚠️  REVISAR RESULTADO'
\echo '    Si TODO OK: ejecutar COMMIT;'
\echo '    Si hay problemas: ejecutar ROLLBACK;'
\echo ''

COMMIT;  -- ✅ Auto-commit activado tras verificación

-- ============================================
-- PASO 3: VERIFICACIÓN POST-ACTUALIZACIÓN
-- ============================================

\echo ''
\echo '=== VERIFICACIÓN POST-ACTUALIZACIÓN ==='
\echo ''

-- Debe ser 0 (o el número pre-actualización si aún no ejecutaste)
\echo '❌ Gastos comunes con paid_by INCORRECTO (debe ser 0):'
SELECT COUNT(*) as gastos_comunes_con_paid_by_incorrecto
FROM transactions t
WHERE t.flow_type = 'common'
  AND t.type = 'expense'
  AND t.paid_by IS NOT NULL
  AND t.paid_by NOT IN (SELECT id FROM joint_accounts);

\echo ''

-- Debe ser > 0
\echo '✅ Gastos comunes con Cuenta Común CORRECTA (debe ser > 0):'
SELECT COUNT(*) as gastos_comunes_con_cuenta_comun
FROM transactions t
JOIN joint_accounts ja ON t.paid_by = ja.id
WHERE t.flow_type = 'common'
  AND t.type = 'expense';

\echo ''

-- Detalle de transacciones corregidas
\echo '📋 Muestra de transacciones con Cuenta Común:'
SELECT
  t.id,
  t.description,
  t.amount,
  t.occurred_at,
  ja.display_name as paid_by_name
FROM transactions t
JOIN joint_accounts ja ON t.paid_by = ja.id
WHERE t.flow_type = 'common'
  AND t.type = 'expense'
ORDER BY t.occurred_at DESC
LIMIT 10;

\echo ''
\echo '=== FIN VERIFICACIÓN ==='
