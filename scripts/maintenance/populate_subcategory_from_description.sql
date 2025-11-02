-- Migration: Populate subcategory_id from description patterns
-- Issue #16: Inferir subcategorías desde descripciones de transacciones
-- Date: 2025-11-01
-- Author: AI Assistant
--
-- Objetivo:
--   Para transacciones con category_id pero SIN subcategory_id,
--   intentar inferir la subcategoría comparando:
--     - transaction.description (case-insensitive)
--     - subcategories.name donde subcategories.category_id = transaction.category_id
--
-- Reglas:
--   1. ✅ category_id se MANTIENE sin cambios (legacy)
--   2. ✅ description se MANTIENE sin cambios
--   3. ➕ subcategory_id se AÑADE solo si hay match exacto
--   4. ⚠️ Si no hay match, subcategory_id permanece NULL (válido)
--
-- Ejemplo:
--   Transacción: { description: "Alquiler", category_id: <vivienda>, subcategory_id: NULL }
--   Match: subcategories { name: "Alquiler", category_id: <vivienda> }
--   Resultado: subcategory_id = <uuid-alquiler>

BEGIN;

-- Paso 1: Verificar estado actual
DO $$
DECLARE
  v_total_transactions INTEGER;
  v_with_category INTEGER;
  v_with_subcategory INTEGER;
  v_candidates INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_transactions FROM transactions;
  SELECT COUNT(*) INTO v_with_category FROM transactions WHERE category_id IS NOT NULL;
  SELECT COUNT(*) INTO v_with_subcategory FROM transactions WHERE subcategory_id IS NOT NULL;

  v_candidates := v_with_category - v_with_subcategory;

  RAISE NOTICE '📊 Estado inicial:';
  RAISE NOTICE '   Total transacciones: %', v_total_transactions;
  RAISE NOTICE '   Con category_id: %', v_with_category;
  RAISE NOTICE '   Con subcategory_id: %', v_with_subcategory;
  RAISE NOTICE '   🎯 Candidatas para migración: %', v_candidates;
END $$;

-- Paso 2: Actualizar subcategory_id donde hay match exacto (case-insensitive)
-- Ignora el prefijo "Equilibrio:" al hacer matching
WITH matched_subcategories AS (
  SELECT
    t.id AS transaction_id,
    s.id AS subcategory_id,
    t.description AS original_description,
    s.name AS matched_subcategory_name,
    c.name AS category_name
  FROM transactions t
  JOIN categories c ON t.category_id = c.id
  JOIN subcategories s ON s.category_id = t.category_id
  WHERE
    t.subcategory_id IS NULL
    AND t.category_id IS NOT NULL
    -- Limpiar prefijo "Equilibrio:" solo para matching (no modifica description)
    AND LOWER(TRIM(REGEXP_REPLACE(t.description, '^Equilibrio:\s*', '', 'i'))) = LOWER(TRIM(s.name))
)
UPDATE transactions
SET
  subcategory_id = matched_subcategories.subcategory_id,
  updated_at = CURRENT_TIMESTAMP
FROM matched_subcategories
WHERE transactions.id = matched_subcategories.transaction_id;

-- Paso 3: Asignar "Otros" como fallback para transacciones sin match
-- Solo si existe una subcategoría llamada "Otros" para esa categoría
WITH otros_fallback AS (
  SELECT
    t.id AS transaction_id,
    s.id AS subcategory_id
  FROM transactions t
  JOIN categories c ON t.category_id = c.id
  JOIN subcategories s ON s.category_id = c.id
  WHERE
    t.subcategory_id IS NULL
    AND t.category_id IS NOT NULL
    AND LOWER(TRIM(s.name)) = 'otros'
)
UPDATE transactions
SET
  subcategory_id = otros_fallback.subcategory_id,
  updated_at = CURRENT_TIMESTAMP
FROM otros_fallback
WHERE transactions.id = otros_fallback.transaction_id;

-- Paso 4: Reportar resultados
DO $$
DECLARE
  v_updated_count INTEGER;
  v_exact_matches INTEGER;
  v_otros_assigned INTEGER;
  v_remaining_without_subcategory INTEGER;
BEGIN
  -- Contar cuántas se actualizaron (comparando con estado inicial)
  SELECT COUNT(*) INTO v_updated_count
  FROM transactions
  WHERE subcategory_id IS NOT NULL
    AND updated_at >= CURRENT_TIMESTAMP - INTERVAL '10 seconds';

  -- Contar matches exactos (excluyendo "Otros")
  SELECT COUNT(*) INTO v_exact_matches
  FROM transactions t
  JOIN subcategories s ON t.subcategory_id = s.id
  WHERE t.updated_at >= CURRENT_TIMESTAMP - INTERVAL '10 seconds'
    AND LOWER(TRIM(s.name)) != 'otros';

  -- Contar asignaciones a "Otros"
  SELECT COUNT(*) INTO v_otros_assigned
  FROM transactions t
  JOIN subcategories s ON t.subcategory_id = s.id
  WHERE t.updated_at >= CURRENT_TIMESTAMP - INTERVAL '10 seconds'
    AND LOWER(TRIM(s.name)) = 'otros';

  SELECT COUNT(*) INTO v_remaining_without_subcategory
  FROM transactions
  WHERE category_id IS NOT NULL AND subcategory_id IS NULL;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Migración completada:';
  RAISE NOTICE '   Total actualizadas: %', v_updated_count;
  RAISE NOTICE '   - Matches exactos: %', v_exact_matches;
  RAISE NOTICE '   - Asignadas a "Otros": %', v_otros_assigned;
  RAISE NOTICE '   Sin subcategoría (válido): %', v_remaining_without_subcategory;
  RAISE NOTICE '';
  RAISE NOTICE '📋 Verificación recomendada:';
  RAISE NOTICE '   SELECT t.description, c.name as categoria, s.name as subcategoria';
  RAISE NOTICE '   FROM transactions t';
  RAISE NOTICE '   LEFT JOIN categories c ON t.category_id = c.id';
  RAISE NOTICE '   LEFT JOIN subcategories s ON t.subcategory_id = s.id';
  RAISE NOTICE '   WHERE t.updated_at >= CURRENT_TIMESTAMP - INTERVAL ''1 minute''';
  RAISE NOTICE '   ORDER BY t.updated_at DESC LIMIT 20;';
END $$;

COMMIT;

-- Nota: El índice para subcategory_id debe crearse como owner:
-- CREATE INDEX IF NOT EXISTS idx_transactions_subcategory_id
-- ON transactions(subcategory_id)
-- WHERE subcategory_id IS NOT NULL;

-- Notas finales:
-- ✅ category_id permanece intacto (campo legacy)
-- ✅ description permanece intacta
-- ✅ subcategory_id se añade solo con match exacto
-- ⚠️ Transacciones sin match conservan subcategory_id = NULL (es válido)
-- 🔍 Grupo se deriva automáticamente de categories.parent_id en las queries
