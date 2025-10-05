-- ============================================================================
-- DIAGNÓSTICO Y FIX: CREATED_AT INCORRECTO
-- Fecha: 2025-10-05
-- Problema: Los movimientos muestran created_at = 5 oct 2025 05:XX (todos)
-- ============================================================================

-- 1. DIAGNÓSTICO: Ver movimientos con created_at sospechoso
SELECT 
  id,
  description,
  occurred_at,
  created_at,
  updated_at,
  CASE 
    WHEN created_at::date = CURRENT_DATE THEN '⚠️ HOY'
    ELSE '✓ OK'
  END as status
FROM transactions
ORDER BY created_at DESC
LIMIT 20;

-- 2. VERIFICAR SI HAY TRIGGERS PROBLEMÁTICOS
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'transactions';

-- 3. VER FUNCIONES DE TRIGGER
SELECT 
  proname as function_name,
  prosrc as source_code
FROM pg_proc
WHERE proname LIKE '%transaction%' OR proname LIKE '%update%';

-- ============================================================================
-- POSIBLES CAUSAS:
-- ============================================================================
-- A. Los movimientos se crearon/editaron HOY y por eso todos tienen fecha de hoy
-- B. Hay un trigger que actualiza created_at (incorrecto)
-- C. El INSERT incluye created_at explícito con NOW() (incorrecto)
-- D. La migración update_updated_at_column() tiene un bug oculto

-- ============================================================================
-- FIX TEMPORAL: Si los datos están mal
-- ============================================================================
-- Si los movimientos se crearon antes pero tienen created_at = hoy,
-- podemos inferir el created_at correcto desde occurred_at:

-- OPCIÓN 1: Restaurar created_at desde occurred_at (aproximación)
-- UPDATE transactions
-- SET created_at = occurred_at::date + TIME '00:00:00'
-- WHERE created_at::date = CURRENT_DATE 
--   AND occurred_at < CURRENT_DATE;

-- OPCIÓN 2: Usar el transaction_history si existe
-- UPDATE transactions t
-- SET created_at = (
--   SELECT MIN(changed_at) 
--   FROM transaction_history 
--   WHERE transaction_id = t.id
-- )
-- WHERE EXISTS (
--   SELECT 1 FROM transaction_history WHERE transaction_id = t.id
-- );

-- ============================================================================
-- VERIFICAR CÓDIGO DE APLICACIÓN
-- ============================================================================
-- Buscar en el código si hay INSERT/UPDATE que incluyan created_at:
-- - app/app/contributions/adjustment-actions.ts
-- - app/app/expenses/actions.ts  
-- - app/app/contributions/actions.ts

-- REGLA: Los INSERT NUNCA deben incluir created_at (tiene DEFAULT NOW())
-- REGLA: Los UPDATE NUNCA deben incluir created_at (es inmutable)
