-- ============================================================================
-- MIGRATION: Populate Category Hierarchy with Real Data
-- Date: 2025-10-30
-- Description: Populates parent categories, assigns parents to categories,
--              creates common subcategories, migrates transaction descriptions
-- ============================================================================

-- ============================================================================
-- STEP 1: Insert Parent Categories (GASTOS)
-- ============================================================================

-- 🏠 HOGAR
INSERT INTO category_parents (household_id, name, icon, type, display_order)
SELECT DISTINCT household_id, 'Hogar', '🏠', 'expense', 1
FROM categories WHERE type = 'expense'
ON CONFLICT DO NOTHING;

-- ⚡ SUMINISTROS
INSERT INTO category_parents (household_id, name, icon, type, display_order)
SELECT DISTINCT household_id, 'Suministros', '⚡', 'expense', 2
FROM categories WHERE type = 'expense'
ON CONFLICT DO NOTHING;

-- 🛒 ALIMENTACIÓN
INSERT INTO category_parents (household_id, name, icon, type, display_order)
SELECT DISTINCT household_id, 'Alimentación', '🛒', 'expense', 3
FROM categories WHERE type = 'expense'
ON CONFLICT DO NOTHING;

-- 🚗 TRANSPORTE
INSERT INTO category_parents (household_id, name, icon, type, display_order)
SELECT DISTINCT household_id, 'Transporte', '🚗', 'expense', 4
FROM categories WHERE type = 'expense'
ON CONFLICT DO NOTHING;

-- 👤 PERSONAL
INSERT INTO category_parents (household_id, name, icon, type, display_order)
SELECT DISTINCT household_id, 'Personal', '👤', 'expense', 5
FROM categories WHERE type = 'expense'
ON CONFLICT DO NOTHING;

-- 🎯 ESTILO DE VIDA
INSERT INTO category_parents (household_id, name, icon, type, display_order)
SELECT DISTINCT household_id, 'Estilo de Vida', '🎯', 'expense', 6
FROM categories WHERE type = 'expense'
ON CONFLICT DO NOTHING;

-- 💼 FINANZAS
INSERT INTO category_parents (household_id, name, icon, type, display_order)
SELECT DISTINCT household_id, 'Finanzas', '💼', 'expense', 7
FROM categories WHERE type = 'expense'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 2: Insert Parent Categories (INGRESOS)
-- ============================================================================

-- 💰 INGRESOS LABORALES
INSERT INTO category_parents (household_id, name, icon, type, display_order)
SELECT DISTINCT household_id, 'Ingresos Laborales', '💰', 'income', 1
FROM categories WHERE type = 'income'
ON CONFLICT DO NOTHING;

-- 💸 OTROS INGRESOS
INSERT INTO category_parents (household_id, name, icon, type, display_order)
SELECT DISTINCT household_id, 'Otros Ingresos', '💸', 'income', 2
FROM categories WHERE type = 'income'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 3: Assign parent_id to existing categories
-- ============================================================================

-- 🏠 HOGAR
UPDATE categories SET parent_id = (
  SELECT id FROM category_parents
  WHERE name = 'Hogar' AND household_id = categories.household_id
), display_order = CASE name
  WHEN 'Vivienda' THEN 1
  WHEN 'Menaje' THEN 2
  WHEN 'Limpieza' THEN 3
  WHEN 'Lavandería' THEN 4
  WHEN 'Mantenimiento' THEN 5
  WHEN 'Comunidad' THEN 6
  ELSE 99
END
WHERE name IN ('Vivienda', 'Menaje', 'Limpieza', 'Lavandería', 'Mantenimiento', 'Comunidad');

-- ⚡ SUMINISTROS
UPDATE categories SET parent_id = (
  SELECT id FROM category_parents
  WHERE name = 'Suministros' AND household_id = categories.household_id
), display_order = CASE name
  WHEN 'Luz' THEN 1
  WHEN 'Agua' THEN 2
  WHEN 'Gas/Butano' THEN 3
  WHEN 'Internet' THEN 4
  WHEN 'Teléfono' THEN 5
  ELSE 99
END
WHERE name IN ('Luz', 'Agua', 'Gas/Butano', 'Internet', 'Teléfono');

-- 🛒 ALIMENTACIÓN
UPDATE categories SET parent_id = (
  SELECT id FROM category_parents
  WHERE name = 'Alimentación' AND household_id = categories.household_id
), display_order = CASE name
  WHEN 'Supermercado' THEN 1
  WHEN 'Restaurantes' THEN 2
  ELSE 99
END
WHERE name IN ('Supermercado', 'Restaurantes');

-- 🚗 TRANSPORTE
UPDATE categories SET parent_id = (
  SELECT id FROM category_parents
  WHERE name = 'Transporte' AND household_id = categories.household_id
), display_order = 1
WHERE name IN ('Transporte');

-- 👤 PERSONAL
UPDATE categories SET parent_id = (
  SELECT id FROM category_parents
  WHERE name = 'Personal' AND household_id = categories.household_id
), display_order = CASE name
  WHEN 'Ropa' THEN 1
  WHEN 'Belleza' THEN 2
  WHEN 'Salud' THEN 3
  WHEN 'Mascotas' THEN 4
  ELSE 99
END
WHERE name IN ('Ropa', 'Belleza', 'Salud', 'Mascotas');

-- 🎯 ESTILO DE VIDA
UPDATE categories SET parent_id = (
  SELECT id FROM category_parents
  WHERE name = 'Estilo de Vida' AND household_id = categories.household_id
), display_order = CASE name
  WHEN 'Ocio' THEN 1
  WHEN 'Deportes' THEN 2
  WHEN 'Educación' THEN 3
  WHEN 'Suscripciones' THEN 4
  WHEN 'Regalos' THEN 5
  ELSE 99
END
WHERE name IN ('Ocio', 'Deportes', 'Educación', 'Suscripciones', 'Regalos');

-- 💼 FINANZAS
UPDATE categories SET parent_id = (
  SELECT id FROM category_parents
  WHERE name = 'Finanzas' AND household_id = categories.household_id
), display_order = CASE name
  WHEN 'Seguros' THEN 1
  WHEN 'Impuestos' THEN 2
  WHEN 'Préstamo Personal' THEN 3
  WHEN 'Reembolso Saldo a Favor' THEN 4
  WHEN 'Varios' THEN 99
  ELSE 99
END
WHERE name IN ('Seguros', 'Impuestos', 'Préstamo Personal', 'Reembolso Saldo a Favor', 'Varios')
AND type = 'expense';

-- 💰 INGRESOS LABORALES
UPDATE categories SET parent_id = (
  SELECT id FROM category_parents
  WHERE name = 'Ingresos Laborales' AND household_id = categories.household_id
), display_order = CASE name
  WHEN 'Nómina' THEN 1
  WHEN 'Freelance' THEN 2
  WHEN 'Bonus' THEN 3
  ELSE 99
END
WHERE name IN ('Nómina', 'Freelance', 'Bonus')
AND type = 'income';

-- 💸 OTROS INGRESOS
UPDATE categories SET parent_id = (
  SELECT id FROM category_parents
  WHERE name = 'Otros Ingresos' AND household_id = categories.household_id
), display_order = CASE name
  WHEN 'Inversiones' THEN 1
  WHEN 'Ventas' THEN 2
  WHEN 'Devoluciones' THEN 3
  WHEN 'Aportación Cuenta Conjunta' THEN 4
  WHEN 'Pago Préstamo' THEN 5
  WHEN 'Varios' THEN 99
  ELSE 99
END
WHERE name IN ('Inversiones', 'Ventas', 'Devoluciones', 'Aportación Cuenta Conjunta', 'Pago Préstamo', 'Varios')
AND type = 'income';

-- ============================================================================
-- STEP 4: Create common subcategories based on real transaction data
-- ============================================================================

-- SUPERMERCADO
INSERT INTO subcategories (category_id, name, display_order)
SELECT c.id, 'Mercadona', 1
FROM categories c WHERE c.name = 'Supermercado'
ON CONFLICT (category_id, name) DO NOTHING;

INSERT INTO subcategories (category_id, name, display_order)
SELECT c.id, 'Día', 2
FROM categories c WHERE c.name = 'Supermercado'
ON CONFLICT (category_id, name) DO NOTHING;

INSERT INTO subcategories (category_id, name, display_order)
SELECT c.id, 'Lidl', 3
FROM categories c WHERE c.name = 'Supermercado'
ON CONFLICT (category_id, name) DO NOTHING;

INSERT INTO subcategories (category_id, name, display_order)
SELECT c.id, 'Carrefour', 4
FROM categories c WHERE c.name = 'Supermercado'
ON CONFLICT (category_id, name) DO NOTHING;

INSERT INTO subcategories (category_id, name, display_order)
SELECT c.id, 'Alcampo', 5
FROM categories c WHERE c.name = 'Supermercado'
ON CONFLICT (category_id, name) DO NOTHING;

INSERT INTO subcategories (category_id, name, display_order)
SELECT c.id, 'Ahorramas', 6
FROM categories c WHERE c.name = 'Supermercado'
ON CONFLICT (category_id, name) DO NOTHING;

INSERT INTO subcategories (category_id, name, display_order)
SELECT c.id, 'Otros', 99
FROM categories c WHERE c.name = 'Supermercado'
ON CONFLICT (category_id, name) DO NOTHING;

-- LUZ
INSERT INTO subcategories (category_id, name, display_order)
SELECT c.id, sub.name, sub.ord
FROM categories c
CROSS JOIN (VALUES
  ('Iberdrola', 1),
  ('Endesa', 2),
  ('Naturgy', 3),
  ('Repsol', 4),
  ('Otros', 99)
) AS sub(name, ord)
WHERE c.name = 'Luz'
ON CONFLICT (category_id, name) DO NOTHING;

-- AGUA
INSERT INTO subcategories (category_id, name, display_order)
SELECT c.id, sub.name, sub.ord
FROM categories c
CROSS JOIN (VALUES
  ('Canal Isabel II', 1),
  ('Agbar', 2),
  ('Otros', 99)
) AS sub(name, ord)
WHERE c.name = 'Agua'
ON CONFLICT (category_id, name) DO NOTHING;

-- GAS/BUTANO
INSERT INTO subcategories (category_id, name, display_order)
SELECT c.id, sub.name, sub.ord
FROM categories c
CROSS JOIN (VALUES
  ('Butano', 1),
  ('Gas Natural', 2),
  ('Otros', 99)
) AS sub(name, ord)
WHERE c.name = 'Gas/Butano'
ON CONFLICT (category_id, name) DO NOTHING;

-- INTERNET
INSERT INTO subcategories (category_id, name, display_order)
SELECT c.id, sub.name, sub.ord
FROM categories c
CROSS JOIN (VALUES
  ('Vodafone', 1),
  ('Movistar', 2),
  ('Orange', 3),
  ('Yoigo', 4),
  ('MásMóvil', 5),
  ('Otros', 99)
) AS sub(name, ord)
WHERE c.name = 'Internet'
ON CONFLICT (category_id, name) DO NOTHING;

-- TELÉFONO
INSERT INTO subcategories (category_id, name, display_order)
SELECT c.id, sub.name, sub.ord
FROM categories c
CROSS JOIN (VALUES
  ('Vodafone', 1),
  ('Movistar', 2),
  ('Orange', 3),
  ('Yoigo', 4),
  ('Otros', 99)
) AS sub(name, ord)
WHERE c.name = 'Teléfono'
ON CONFLICT (category_id, name) DO NOTHING;

-- LAVANDERÍA
INSERT INTO subcategories (category_id, name, display_order)
SELECT c.id, sub.name, sub.ord
FROM categories c
CROSS JOIN (VALUES
  ('Lavandería', 1),
  ('Tintorería', 2),
  ('Planchado', 3)
) AS sub(name, ord)
WHERE c.name = 'Lavandería'
ON CONFLICT (category_id, name) DO NOTHING;

-- RESTAURANTES
INSERT INTO subcategories (category_id, name, display_order)
SELECT c.id, sub.name, sub.ord
FROM categories c
CROSS JOIN (VALUES
  ('Fast Food', 1),
  ('Cafetería', 2),
  ('Restaurante Medio', 3),
  ('Restaurante Alto', 4),
  ('Delivery', 5),
  ('Otros', 99)
) AS sub(name, ord)
WHERE c.name = 'Restaurantes'
ON CONFLICT (category_id, name) DO NOTHING;

-- TRANSPORTE (subcategorías detalladas)
INSERT INTO subcategories (category_id, name, display_order)
SELECT c.id, sub.name, sub.ord
FROM categories c
CROSS JOIN (VALUES
  ('Gasolina', 1),
  ('Diesel', 2),
  ('Eléctrico', 3),
  ('Metro', 4),
  ('Bus', 5),
  ('Taxi/VTC', 6),
  ('Parking', 7),
  ('Peajes', 8),
  ('Mantenimiento Vehículo', 9),
  ('ITV', 10),
  ('Seguro Coche', 11),
  ('Otros', 99)
) AS sub(name, ord)
WHERE c.name = 'Transporte'
ON CONFLICT (category_id, name) DO NOTHING;

-- ============================================================================
-- STEP 5: Migrate existing transaction descriptions to subcategories
-- ============================================================================

-- SUPERMERCADO: Día
UPDATE transactions t
SET subcategory_id = (
  SELECT s.id FROM subcategories s
  JOIN categories c ON c.id = s.category_id
  WHERE c.name = 'Supermercado' AND s.name = 'Día'
  AND c.household_id = (SELECT household_id FROM categories WHERE id = t.category_id)
  LIMIT 1
)
WHERE t.category_id IN (SELECT id FROM categories WHERE name = 'Supermercado')
AND t.description ILIKE '%día%'
AND t.subcategory_id IS NULL;

-- SUPERMERCADO: Mercadona
UPDATE transactions t
SET subcategory_id = (
  SELECT s.id FROM subcategories s
  JOIN categories c ON c.id = s.category_id
  WHERE c.name = 'Supermercado' AND s.name = 'Mercadona'
  AND c.household_id = (SELECT household_id FROM categories WHERE id = t.category_id)
  LIMIT 1
)
WHERE t.category_id IN (SELECT id FROM categories WHERE name = 'Supermercado')
AND t.description ILIKE '%mercadona%'
AND t.subcategory_id IS NULL;

-- INTERNET: Vodafone
UPDATE transactions t
SET subcategory_id = (
  SELECT s.id FROM subcategories s
  JOIN categories c ON c.id = s.category_id
  WHERE c.name = 'Internet' AND s.name = 'Vodafone'
  AND c.household_id = (SELECT household_id FROM categories WHERE id = t.category_id)
  LIMIT 1
)
WHERE t.category_id IN (SELECT id FROM categories WHERE name = 'Internet')
AND t.description ILIKE '%vodafone%'
AND t.subcategory_id IS NULL;

-- LAVANDERÍA
UPDATE transactions t
SET subcategory_id = (
  SELECT s.id FROM subcategories s
  JOIN categories c ON c.id = s.category_id
  WHERE c.name = 'Lavandería' AND s.name = 'Lavandería'
  AND c.household_id = (SELECT household_id FROM categories WHERE id = t.category_id)
  LIMIT 1
)
WHERE t.category_id IN (SELECT id FROM categories WHERE name = 'Lavandería')
AND t.description ILIKE '%lavandería%'
AND t.subcategory_id IS NULL;

-- GAS/BUTANO: Butano
UPDATE transactions t
SET subcategory_id = (
  SELECT s.id FROM subcategories s
  JOIN categories c ON c.id = s.category_id
  WHERE c.name = 'Gas/Butano' AND s.name = 'Butano'
  AND c.household_id = (SELECT household_id FROM categories WHERE id = t.category_id)
  LIMIT 1
)
WHERE t.category_id IN (SELECT id FROM categories WHERE name = 'Gas/Butano')
AND t.description ILIKE '%butano%'
AND t.subcategory_id IS NULL;

-- ============================================================================
-- STEP 6: Statistics and verification
-- ============================================================================
DO $$
DECLARE
  parent_count INTEGER;
  assigned_count INTEGER;
  subcat_count INTEGER;
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO parent_count FROM category_parents;
  SELECT COUNT(*) INTO assigned_count FROM categories WHERE parent_id IS NOT NULL;
  SELECT COUNT(*) INTO subcat_count FROM subcategories;
  SELECT COUNT(*) INTO migrated_count FROM transactions WHERE subcategory_id IS NOT NULL;

  RAISE NOTICE '✅ Data migration completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 STATISTICS:';
  RAISE NOTICE '   - Parent categories created: %', parent_count;
  RAISE NOTICE '   - Categories assigned to parents: %', assigned_count;
  RAISE NOTICE '   - Subcategories created: %', subcat_count;
  RAISE NOTICE '   - Transactions migrated to subcategories: %', migrated_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next steps:';
  RAISE NOTICE '   1. Verify hierarchy in /configuracion/categorias';
  RAISE NOTICE '   2. Test transaction creation with new selects';
  RAISE NOTICE '   3. Check Treemap visualization in /estadisticas';
END $$;
