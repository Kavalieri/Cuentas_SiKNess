-- Limpieza de categorías y subcategorías huérfanas
-- Issue #16: Las categorías de hogares eliminados están causando duplicados
-- Date: 2025-11-02
-- Author: AI Assistant
--
-- Problema:
--   Existen categorías/subcategorías de households que ya no existen en la tabla households.
--   Esto causa duplicados cuando se hacen JOINs y cruces de datos.
--
-- Solución:
--   Eliminar todas las categorías (y sus subcategorías en cascada) de hogares inexistentes.

BEGIN;

-- Paso 1: Verificar estado actual
DO $$
DECLARE
  v_total_households INTEGER;
  v_total_categories INTEGER;
  v_total_subcategories INTEGER;
  v_orphan_categories INTEGER;
  v_orphan_subcategories INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_households FROM households;
  SELECT COUNT(*) INTO v_total_categories FROM categories;
  SELECT COUNT(*) INTO v_total_subcategories FROM subcategories;

  SELECT COUNT(*) INTO v_orphan_categories
  FROM categories c
  LEFT JOIN households h ON c.household_id = h.id
  WHERE h.id IS NULL;

  SELECT COUNT(DISTINCT s.id) INTO v_orphan_subcategories
  FROM categories c
  LEFT JOIN households h ON c.household_id = h.id
  LEFT JOIN subcategories s ON s.category_id = c.id
  WHERE h.id IS NULL;

  RAISE NOTICE '📊 Estado inicial:';
  RAISE NOTICE '   Hogares activos: %', v_total_households;
  RAISE NOTICE '   Total categorías: %', v_total_categories;
  RAISE NOTICE '   Total subcategorías: %', v_total_subcategories;
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  Elementos huérfanos a eliminar:';
  RAISE NOTICE '   Categorías huérfanas: %', v_orphan_categories;
  RAISE NOTICE '   Subcategorías huérfanas: %', v_orphan_subcategories;
END $$;

-- Paso 2: Eliminar subcategorías huérfanas primero (por seguridad, aunque debería ser cascada)
WITH orphan_categories AS (
  SELECT c.id
  FROM categories c
  LEFT JOIN households h ON c.household_id = h.id
  WHERE h.id IS NULL
)
DELETE FROM subcategories
WHERE category_id IN (SELECT id FROM orphan_categories);

-- Paso 3: Eliminar categorías huérfanas
DELETE FROM categories
WHERE household_id NOT IN (SELECT id FROM households);

-- Paso 4: Reportar resultados
DO $$
DECLARE
  v_remaining_categories INTEGER;
  v_remaining_subcategories INTEGER;
  v_orphan_categories_after INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_remaining_categories FROM categories;
  SELECT COUNT(*) INTO v_remaining_subcategories FROM subcategories;

  SELECT COUNT(*) INTO v_orphan_categories_after
  FROM categories c
  LEFT JOIN households h ON c.household_id = h.id
  WHERE h.id IS NULL;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Limpieza completada:';
  RAISE NOTICE '   Categorías restantes: %', v_remaining_categories;
  RAISE NOTICE '   Subcategorías restantes: %', v_remaining_subcategories;
  RAISE NOTICE '   Categorías huérfanas restantes: %', v_orphan_categories_after;
  RAISE NOTICE '';

  IF v_orphan_categories_after > 0 THEN
    RAISE WARNING '⚠️  Aún quedan % categorías huérfanas. Revisar.', v_orphan_categories_after;
  ELSE
    RAISE NOTICE '🎉 Todas las categorías huérfanas eliminadas correctamente.';
  END IF;
END $$;

COMMIT;

-- Verificación recomendada después de ejecutar:
-- SELECT c.household_id, h.name, COUNT(*)
-- FROM categories c
-- LEFT JOIN households h ON c.household_id = h.id
-- GROUP BY c.household_id, h.name;
