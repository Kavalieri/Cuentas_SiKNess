-- ================================================================
-- Manual Script: Add "Otros" Subcategories to Existing Households
-- ================================================================
-- Purpose: Fix Issue #44 for EXISTING households
-- Author: AI Assistant
-- Date: 2025-11-04
--
-- This script:
-- 1. Adds "Otros" (📦) subcategory to ALL categories without subcategories
-- 2. Migrates orphan transactions to their category's "Otros" subcategory
--
-- SAFE TO RUN MULTIPLE TIMES (idempotent with ON CONFLICT DO NOTHING)
-- ================================================================

BEGIN;

-- ================================================================
-- STEP 1: Add "Otros" subcategory to categories without any
-- ================================================================

DO $$
DECLARE
  v_category RECORD;
  v_subcategory_count INT;
  v_added_count INT := 0;
BEGIN
  RAISE NOTICE '🔍 Buscando categorías sin subcategorías...';
  
  FOR v_category IN 
    SELECT DISTINCT c.id, c.name, c.icon
    FROM categories c
    WHERE NOT EXISTS (
      SELECT 1 FROM subcategories s WHERE s.category_id = c.id
    )
    ORDER BY c.name
  LOOP
    -- Add "Otros" subcategory
    INSERT INTO subcategories (category_id, name, icon, display_order)
    VALUES (v_category.id, 'Otros', '📦', 99)
    ON CONFLICT DO NOTHING;
    
    v_added_count := v_added_count + 1;
    RAISE NOTICE '  ✅ Añadida "Otros" a: % (%)', v_category.name, v_category.icon;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 Resumen:';
  RAISE NOTICE '  - Subcategorías "Otros" añadidas: %', v_added_count;
END $$;

-- ================================================================
-- STEP 2: Migrate orphan transactions to "Otros" subcategory
-- ================================================================

DO $$
DECLARE
  v_updated_count INT := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Migrando transacciones huérfanas...';
  
  -- Update transactions that have category_id but no subcategory_id
  WITH migration AS (
    UPDATE transactions t
    SET 
      subcategory_id = (
        SELECT s.id 
        FROM subcategories s
        WHERE s.category_id = t.category_id 
          AND s.name = 'Otros'
        LIMIT 1
      ),
      updated_at = NOW()
    WHERE t.category_id IS NOT NULL 
      AND t.subcategory_id IS NULL
      AND EXISTS (
        SELECT 1 FROM subcategories s 
        WHERE s.category_id = t.category_id AND s.name = 'Otros'
      )
    RETURNING t.id
  )
  SELECT COUNT(*) INTO v_updated_count FROM migration;
  
  RAISE NOTICE '  ✅ Transacciones migradas: %', v_updated_count;
END $$;

-- ================================================================
-- STEP 3: Verification
-- ================================================================

DO $$
DECLARE
  v_categories_without_subs INT;
  v_orphan_transactions INT;
  v_total_subcategories INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 Verificación Final:';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  -- Count categories without subcategories
  SELECT COUNT(*) INTO v_categories_without_subs
  FROM categories c
  WHERE NOT EXISTS (SELECT 1 FROM subcategories s WHERE s.category_id = c.id);
  
  -- Count orphan transactions
  SELECT COUNT(*) INTO v_orphan_transactions
  FROM transactions
  WHERE category_id IS NOT NULL AND subcategory_id IS NULL;
  
  -- Count total subcategories
  SELECT COUNT(*) INTO v_total_subcategories FROM subcategories;
  
  RAISE NOTICE 'Categorías sin subcategorías: % (esperado: 0)', v_categories_without_subs;
  RAISE NOTICE 'Transacciones huérfanas: % (esperado: 0)', v_orphan_transactions;
  RAISE NOTICE 'Total subcategorías: %', v_total_subcategories;
  RAISE NOTICE '';
  
  IF v_categories_without_subs = 0 AND v_orphan_transactions = 0 THEN
    RAISE NOTICE '✅ ¡Migración completada exitosamente!';
  ELSE
    RAISE WARNING '⚠️  Aún quedan problemas por resolver';
  END IF;
END $$;

COMMIT;

-- ================================================================
-- SUCCESS
-- ================================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '✅ Script ejecutado exitosamente'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
