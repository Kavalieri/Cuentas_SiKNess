-- ============================================
-- Descripción: Marcar categorías existentes de préstamos como sistema
-- Fecha: 2025-11-19
-- Autor: AI Assistant
-- Issue: #58 (Phase 2 - Implementación Base)
-- ============================================

-- CONTEXTO:
-- Las categorías "Préstamo Personal" (Finanzas) y "Pago Préstamo" (Otros Ingresos)
-- YA EXISTEN en la estructura de 3 niveles del sistema.
-- Esta migración las marca como is_system=true para protegerlas de edición/eliminación.

-- IMPORTANTE:
-- NO crear categorías nuevas - usar las existentes que ya tienen:
-- - parent_id (pertenecen a grupos category_parents)
-- - subcategorías asociadas
-- - datos de transacciones históricas

BEGIN;

-- 1. Marcar "Préstamo Personal" como categoría del sistema
-- Ubicación: Finanzas > Préstamo Personal > [subcategorías]
UPDATE categories
SET is_system = true,
    updated_at = now()
WHERE name = 'Préstamo Personal'
  AND parent_id IN (
    SELECT id FROM category_parents WHERE name = 'Finanzas'
  );

-- 2. Marcar "Pago Préstamo" como categoría del sistema
-- Ubicación: Otros Ingresos > Pago Préstamo > [subcategorías]
UPDATE categories
SET is_system = true,
    updated_at = now()
WHERE name = 'Pago Préstamo'
  AND parent_id IN (
    SELECT id FROM category_parents WHERE name = 'Otros Ingresos'
  );

-- 3. Limpiar duplicados si existen (categorías huérfanas sin parent_id)
DELETE FROM categories
WHERE is_system = true
  AND parent_id IS NULL
  AND household_id IS NULL
  AND name IN ('Préstamo Personal', 'Pago Préstamo');

-- 4. VERIFICACIÓN
-- Debe mostrar las 2 categorías con su estructura completa
SELECT
  cp.name as grupo,
  c.name as categoria,
  c.is_system,
  c.household_id,
  COUNT(sc.id) as num_subcategorias
FROM categories c
JOIN category_parents cp ON cp.id = c.parent_id
LEFT JOIN subcategories sc ON sc.category_id = c.id
WHERE c.name IN ('Préstamo Personal', 'Pago Préstamo')
  AND c.is_system = true
GROUP BY cp.name, c.name, c.is_system, c.household_id
ORDER BY cp.name, c.name;

COMMIT;

-- Resultado esperado:
-- | id (UUID) | name              | icon        | type    | is_system | household_id |
-- |-----------|-------------------|-------------|---------|-----------|--------------|
-- | <uuid>    | Pago Préstamo     | piggy-bank  | income  | true      | NULL         |
-- | <uuid>    | Préstamo Personal | hand-coins  | expense | true      | NULL         |
