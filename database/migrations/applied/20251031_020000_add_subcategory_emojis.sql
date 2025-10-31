-- Migración: Añadir emojis a todas las subcategorías
-- Fecha: 2025-10-31
-- Descripción: Asignar emojis apropiados a las 50 subcategorías que no tienen icon

-- ============================================
-- ALIMENTACIÓN - RESTAURANTES
-- ============================================
UPDATE subcategories SET icon = '🍟' WHERE name = 'Fast Food';
UPDATE subcategories SET icon = '☕' WHERE name = 'Cafetería';
UPDATE subcategories SET icon = '🍽️' WHERE name = 'Restaurante Medio';
UPDATE subcategories SET icon = '👨‍🍳' WHERE name = 'Restaurante Alto';
UPDATE subcategories SET icon = '📦' WHERE name = 'Delivery' AND category_id IN (SELECT id FROM categories WHERE name = 'Restaurantes');
UPDATE subcategories SET icon = '🍴' WHERE name = 'Otros' AND category_id IN (SELECT id FROM categories WHERE name = 'Restaurantes');

-- ============================================
-- ALIMENTACIÓN - SUPERMERCADO
-- ============================================
UPDATE subcategories SET icon = '🛒' WHERE name = 'Mercadona';
UPDATE subcategories SET icon = '🏪' WHERE name = 'Día';
UPDATE subcategories SET icon = '🏪' WHERE name = 'Lidl';
UPDATE subcategories SET icon = '🛒' WHERE name = 'Carrefour';
UPDATE subcategories SET icon = '🛒' WHERE name = 'Alcampo';
UPDATE subcategories SET icon = '🛒' WHERE name = 'Ahorramas';
UPDATE subcategories SET icon = '🛍️' WHERE name = 'Otros' AND category_id IN (SELECT id FROM categories WHERE name = 'Supermercado');
-- Jamón ya tiene 🍖, no lo tocamos

-- ============================================
-- HOGAR - LAVANDERÍA
-- ============================================
UPDATE subcategories SET icon = '🧺' WHERE name = 'Lavandería';
UPDATE subcategories SET icon = '👔' WHERE name = 'Tintorería';
UPDATE subcategories SET icon = '👕' WHERE name = 'Planchado';

-- ============================================
-- SUMINISTROS - AGUA
-- ============================================
UPDATE subcategories SET icon = '💧' WHERE name = 'Canal Isabel II';
UPDATE subcategories SET icon = '💧' WHERE name = 'Agbar';
UPDATE subcategories SET icon = '💧' WHERE name = 'Otros' AND category_id IN (SELECT id FROM categories WHERE name = 'Agua');

-- ============================================
-- SUMINISTROS - GAS/BUTANO
-- ============================================
UPDATE subcategories SET icon = '⛽' WHERE name = 'Butano';
UPDATE subcategories SET icon = '🔥' WHERE name = 'Gas Natural';
UPDATE subcategories SET icon = '⛽' WHERE name = 'Otros' AND category_id IN (SELECT id FROM categories WHERE name = 'Gas/Butano');

-- ============================================
-- SUMINISTROS - INTERNET
-- ============================================
UPDATE subcategories SET icon = '📡' WHERE name = 'Vodafone' AND category_id IN (SELECT id FROM categories WHERE name = 'Internet');
UPDATE subcategories SET icon = '📡' WHERE name = 'Movistar' AND category_id IN (SELECT id FROM categories WHERE name = 'Internet');
UPDATE subcategories SET icon = '📡' WHERE name = 'Orange' AND category_id IN (SELECT id FROM categories WHERE name = 'Internet');
UPDATE subcategories SET icon = '📡' WHERE name = 'Yoigo' AND category_id IN (SELECT id FROM categories WHERE name = 'Internet');
UPDATE subcategories SET icon = '📡' WHERE name = 'MásMóvil';
UPDATE subcategories SET icon = '📡' WHERE name = 'Otros' AND category_id IN (SELECT id FROM categories WHERE name = 'Internet');

-- ============================================
-- SUMINISTROS - LUZ
-- ============================================
UPDATE subcategories SET icon = '⚡' WHERE name = 'Iberdrola';
UPDATE subcategories SET icon = '⚡' WHERE name = 'Endesa';
UPDATE subcategories SET icon = '⚡' WHERE name = 'Naturgy';
UPDATE subcategories SET icon = '⚡' WHERE name = 'Repsol' AND category_id IN (SELECT id FROM categories WHERE name = 'Luz');
UPDATE subcategories SET icon = '⚡' WHERE name = 'Otros' AND category_id IN (SELECT id FROM categories WHERE name = 'Luz');

-- ============================================
-- SUMINISTROS - TELÉFONO
-- ============================================
UPDATE subcategories SET icon = '📱' WHERE name = 'Vodafone' AND category_id IN (SELECT id FROM categories WHERE name = 'Teléfono');
UPDATE subcategories SET icon = '📱' WHERE name = 'Movistar' AND category_id IN (SELECT id FROM categories WHERE name = 'Teléfono');
UPDATE subcategories SET icon = '📱' WHERE name = 'Orange' AND category_id IN (SELECT id FROM categories WHERE name = 'Teléfono');
UPDATE subcategories SET icon = '📱' WHERE name = 'Yoigo' AND category_id IN (SELECT id FROM categories WHERE name = 'Teléfono');
UPDATE subcategories SET icon = '📱' WHERE name = 'Otros' AND category_id IN (SELECT id FROM categories WHERE name = 'Teléfono');

-- ============================================
-- TRANSPORTE
-- ============================================
UPDATE subcategories SET icon = '⛽' WHERE name = 'Gasolina';
UPDATE subcategories SET icon = '⛽' WHERE name = 'Diesel';
UPDATE subcategories SET icon = '🔌' WHERE name = 'Eléctrico';
UPDATE subcategories SET icon = '🚇' WHERE name = 'Metro';
UPDATE subcategories SET icon = '🚌' WHERE name = 'Bus';
UPDATE subcategories SET icon = '🚕' WHERE name = 'Taxi/VTC';
UPDATE subcategories SET icon = '🅿️' WHERE name = 'Parking';
UPDATE subcategories SET icon = '🛣️' WHERE name = 'Peajes';
UPDATE subcategories SET icon = '🔧' WHERE name = 'Mantenimiento Vehículo';
UPDATE subcategories SET icon = '🔍' WHERE name = 'ITV';
UPDATE subcategories SET icon = '🛡️' WHERE name = 'Seguro Coche';
UPDATE subcategories SET icon = '🚗' WHERE name = 'Otros' AND category_id IN (SELECT id FROM categories WHERE name = 'Transporte');

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Mostrar resumen de subcategorías actualizadas
DO $$
DECLARE
    total_count INTEGER;
    with_icon_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM subcategories;
    SELECT COUNT(*) INTO with_icon_count FROM subcategories WHERE icon IS NOT NULL AND icon != '';
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'RESUMEN DE ACTUALIZACIÓN DE EMOJIS';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Total subcategorías: %', total_count;
    RAISE NOTICE 'Con emoji asignado: %', with_icon_count;
    RAISE NOTICE 'Sin emoji: %', total_count - with_icon_count;
    RAISE NOTICE '============================================';
END $$;
