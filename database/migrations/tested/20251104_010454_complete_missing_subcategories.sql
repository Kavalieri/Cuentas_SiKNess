-- ================================================================
-- Migration: Complete Missing Subcategories (Issue #44)
-- Description: Update create_default_household_categories function
--              to add "Otros" subcategory to ALL categories
-- Author: AI Assistant
-- Date: 2025-11-04
-- ================================================================

-- CONTEXT:
-- Current function creates subcategories only for ~10 categories
-- Remaining ~40 categories have NO subcategories, causing:
--   1. Visual gaps in Sunburst/TreeMap charts
--   2. Queries failing when expecting 3 levels
--   3. Transactions with category_id but no subcategory_id
--
-- SOLUTION:
-- Replace function to add "Otros" (📦) subcategory to ALL categories

-- ================================================================
-- DROP and RECREATE function
-- ================================================================

DROP FUNCTION IF EXISTS create_default_household_categories(uuid);

CREATE OR REPLACE FUNCTION create_default_household_categories(p_household_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE 
  v_grupo_hogar UUID; 
  v_grupo_suministros UUID; 
  v_grupo_alimentacion UUID; 
  v_grupo_transporte UUID; 
  v_grupo_ocio UUID; 
  v_grupo_salud UUID; 
  v_grupo_educacion UUID; 
  v_grupo_ropa UUID; 
  v_grupo_otros UUID; 
  
  v_categoria_vivienda UUID; 
  v_categoria_lavanderia UUID; 
  v_categoria_luz UUID; 
  v_categoria_agua UUID; 
  v_categoria_gas UUID; 
  v_categoria_internet UUID; 
  v_categoria_telefono UUID; 
  v_categoria_supermercado UUID; 
  v_categoria_restaurantes UUID; 
  v_categoria_transporte UUID;
  
  -- NEW: Variables for categories without subcategories
  v_categoria_comunidad UUID;
  v_categoria_seguros UUID;
  v_categoria_impuestos UUID;
  v_categoria_menaje UUID;
  v_categoria_limpieza UUID;
  v_categoria_mantenimiento UUID;
  v_categoria_ocio UUID;
  v_categoria_deportes UUID;
  v_categoria_suscripciones UUID;
  v_categoria_belleza UUID;
  v_categoria_mascotas UUID;
  v_categoria_regalos UUID;
  v_categoria_varios_ocio UUID;
  v_categoria_salud UUID;
  v_categoria_educacion UUID;
  v_categoria_ropa UUID;
  v_categoria_calzado UUID;
  v_categoria_varios_otros UUID;
  
  -- Variables for income categories
  v_categoria_nomina UUID;
  v_categoria_freelance UUID;
  v_categoria_inversiones UUID;
  v_categoria_ventas UUID;
  v_categoria_devoluciones UUID;
  v_categoria_aportacion UUID;
  v_categoria_bonus UUID;
  v_categoria_varios_income UUID;

BEGIN
  -- 1. Insert category_parents (grupos)
  INSERT INTO category_parents (household_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, 'Hogar', '🏠', 'expense', 1), 
    (p_household_id, 'Suministros', '💡', 'expense', 2), 
    (p_household_id, 'Alimentación', '🍽️', 'expense', 3), 
    (p_household_id, 'Transporte', '🚗', 'expense', 4), 
    (p_household_id, 'Ocio', '🎭', 'expense', 5), 
    (p_household_id, 'Salud', '🏥', 'expense', 6), 
    (p_household_id, 'Educación', '📚', 'expense', 7), 
    (p_household_id, 'Ropa', '👕', 'expense', 8), 
    (p_household_id, 'Otros', '➕', 'expense', 9);
  
  -- Get parent IDs
  SELECT id INTO v_grupo_hogar FROM category_parents WHERE household_id = p_household_id AND display_order = 1;
  SELECT id INTO v_grupo_suministros FROM category_parents WHERE household_id = p_household_id AND display_order = 2;
  SELECT id INTO v_grupo_alimentacion FROM category_parents WHERE household_id = p_household_id AND display_order = 3;
  SELECT id INTO v_grupo_transporte FROM category_parents WHERE household_id = p_household_id AND display_order = 4;
  SELECT id INTO v_grupo_ocio FROM category_parents WHERE household_id = p_household_id AND display_order = 5;
  SELECT id INTO v_grupo_salud FROM category_parents WHERE household_id = p_household_id AND display_order = 6;
  SELECT id INTO v_grupo_educacion FROM category_parents WHERE household_id = p_household_id AND display_order = 7;
  SELECT id INTO v_grupo_ropa FROM category_parents WHERE household_id = p_household_id AND display_order = 8;
  SELECT id INTO v_grupo_otros FROM category_parents WHERE household_id = p_household_id AND display_order = 9;
  
  -- 2. Insert categories with RETURNING to capture IDs
  
  -- HOGAR categories
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_hogar, 'Vivienda', '🏠', 'expense', 1), 
    (p_household_id, v_grupo_hogar, 'Lavandería', '🧺', 'expense', 4) 
  RETURNING id INTO v_categoria_vivienda, v_categoria_lavanderia;
  
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_hogar, 'Comunidad', '🏢', 'expense', 2)
  RETURNING id INTO v_categoria_comunidad;
  
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_hogar, 'Seguros', '🛡️', 'expense', 3)
  RETURNING id INTO v_categoria_seguros;
  
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_hogar, 'Impuestos', '📋', 'expense', 5)
  RETURNING id INTO v_categoria_impuestos;
  
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_hogar, 'Menaje', '🪑', 'expense', 6)
  RETURNING id INTO v_categoria_menaje;
  
  -- SUMINISTROS categories
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_suministros, 'Luz', '💡', 'expense', 1), 
    (p_household_id, v_grupo_suministros, 'Agua', '��', 'expense', 2), 
    (p_household_id, v_grupo_suministros, 'Gas/Butano', '🔥', 'expense', 3), 
    (p_household_id, v_grupo_suministros, 'Internet', '📡', 'expense', 4), 
    (p_household_id, v_grupo_suministros, 'Teléfono', '📞', 'expense', 5) 
  RETURNING id INTO v_categoria_luz, v_categoria_agua, v_categoria_gas, v_categoria_internet, v_categoria_telefono;
  
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_suministros, 'Limpieza', '🧹', 'expense', 6)
  RETURNING id INTO v_categoria_limpieza;
  
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_suministros, 'Mantenimiento', '🔧', 'expense', 7)
  RETURNING id INTO v_categoria_mantenimiento;
  
  -- ALIMENTACIÓN categories
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_alimentacion, 'Supermercado', '🛒', 'expense', 1), 
    (p_household_id, v_grupo_alimentacion, 'Restaurantes', '🍽️', 'expense', 2) 
  RETURNING id INTO v_categoria_supermercado, v_categoria_restaurantes;
  
  -- TRANSPORTE categories
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_transporte, 'Transporte', '🚗', 'expense', 1) 
  RETURNING id INTO v_categoria_transporte;
  
  -- OCIO categories
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_ocio, 'Ocio', '🎭', 'expense', 1)
  RETURNING id INTO v_categoria_ocio;
  
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_ocio, 'Deportes', '⚽', 'expense', 2)
  RETURNING id INTO v_categoria_deportes;
  
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_ocio, 'Suscripciones', '📱', 'expense', 3)
  RETURNING id INTO v_categoria_suscripciones;
  
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_ocio, 'Belleza', '💄', 'expense', 4)
  RETURNING id INTO v_categoria_belleza;
  
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_ocio, 'Mascotas', '🐶', 'expense', 5)
  RETURNING id INTO v_categoria_mascotas;
  
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_ocio, 'Regalos', '🎁', 'expense', 6)
  RETURNING id INTO v_categoria_regalos;
  
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_ocio, 'Varios', '➕', 'expense', 99)
  RETURNING id INTO v_categoria_varios_ocio;
  
  -- SALUD categories
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_salud, 'Salud', '🏥', 'expense', 1)
  RETURNING id INTO v_categoria_salud;
  
  -- EDUCACIÓN categories
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_educacion, 'Educación', '📚', 'expense', 1)
  RETURNING id INTO v_categoria_educacion;
  
  -- ROPA categories
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_ropa, 'Ropa', '👕', 'expense', 1)
  RETURNING id INTO v_categoria_ropa;
  
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_ropa, 'Calzado', '👟', 'expense', 2)
  RETURNING id INTO v_categoria_calzado;
  
  -- OTROS categories
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, v_grupo_otros, 'Varios', '➕', 'expense', 99)
  RETURNING id INTO v_categoria_varios_otros;
  
  -- INCOME categories (no parent_id)
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, NULL, 'Nómina', '💰', 'income', 1)
  RETURNING id INTO v_categoria_nomina;
  
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, NULL, 'Freelance', '💼', 'income', 2)
  RETURNING id INTO v_categoria_freelance;
  
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, NULL, 'Inversiones', '📈', 'income', 3)
  RETURNING id INTO v_categoria_inversiones;
  
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, NULL, 'Ventas', '🏷️', 'income', 4)
  RETURNING id INTO v_categoria_ventas;
  
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, NULL, 'Devoluciones', '↩️', 'income', 5)
  RETURNING id INTO v_categoria_devoluciones;
  
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, NULL, 'Aportación Cuenta Conjunta', '🏦', 'income', 6)
  RETURNING id INTO v_categoria_aportacion;
  
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, NULL, 'Bonus', '🎉', 'income', 7)
  RETURNING id INTO v_categoria_bonus;
  
  INSERT INTO categories (household_id, parent_id, name, icon, type, display_order) 
  VALUES 
    (p_household_id, NULL, 'Varios', '➕', 'income', 99)
  RETURNING id INTO v_categoria_varios_income;
  
  -- 3. Insert subcategories (EXISTING + NEW "Otros" for all)
  
  -- Vivienda subcategories (existing + Otros)
  INSERT INTO subcategories (category_id, name, icon, display_order) 
  VALUES 
    (v_categoria_vivienda, 'Alquiler', '🏠', 0), 
    (v_categoria_vivienda, 'Comunidad', '🏢', 1), 
    (v_categoria_vivienda, 'Alquiler + Comunidad', '🏠', 2),
    (v_categoria_vivienda, 'Otros', '📦', 99);
  
  -- Lavandería subcategories (existing + Otros)
  INSERT INTO subcategories (category_id, name, icon, display_order) 
  VALUES 
    (v_categoria_lavanderia, 'Lavandería', '🧺', 1), 
    (v_categoria_lavanderia, 'Tintorería', '👔', 2), 
    (v_categoria_lavanderia, 'Planchado', '👕', 3),
    (v_categoria_lavanderia, 'Otros', '📦', 99);
  
  -- Luz subcategories (existing)
  INSERT INTO subcategories (category_id, name, icon, display_order) 
  VALUES 
    (v_categoria_luz, 'Iberdrola', '⚡', 1), 
    (v_categoria_luz, 'Endesa', '⚡', 2), 
    (v_categoria_luz, 'Naturgy', '⚡', 3), 
    (v_categoria_luz, 'Repsol', '⚡', 4), 
    (v_categoria_luz, 'Otros', '⚡', 99);
  
  -- Agua subcategories (existing)
  INSERT INTO subcategories (category_id, name, icon, display_order) 
  VALUES 
    (v_categoria_agua, 'Canal Isabel II', '💧', 1), 
    (v_categoria_agua, 'Agbar', '💧', 2), 
    (v_categoria_agua, 'Otros', '💧', 99);
  
  -- Gas subcategories (existing)
  INSERT INTO subcategories (category_id, name, icon, display_order) 
  VALUES 
    (v_categoria_gas, 'Butano', '⛽', 1), 
    (v_categoria_gas, 'Gas Natural', '🔥', 2), 
    (v_categoria_gas, 'Otros', '⛽', 99);
  
  -- Internet subcategories (existing)
  INSERT INTO subcategories (category_id, name, icon, display_order) 
  VALUES 
    (v_categoria_internet, 'Vodafone', '📡', 1), 
    (v_categoria_internet, 'Movistar', '📡', 2), 
    (v_categoria_internet, 'Orange', '📡', 3), 
    (v_categoria_internet, 'Yoigo', '📡', 4), 
    (v_categoria_internet, 'MásMóvil', '📡', 5), 
    (v_categoria_internet, 'Otros', '📡', 99);
  
  -- Teléfono subcategories (existing)
  INSERT INTO subcategories (category_id, name, icon, display_order) 
  VALUES 
    (v_categoria_telefono, 'Vodafone', '📱', 1), 
    (v_categoria_telefono, 'Movistar', '📱', 2), 
    (v_categoria_telefono, 'Orange', '📱', 3), 
    (v_categoria_telefono, 'Yoigo', '📱', 4), 
    (v_categoria_telefono, 'Otros', '📱', 99);
  
  -- Supermercado subcategories (existing + Otros)
  INSERT INTO subcategories (category_id, name, icon, display_order) 
  VALUES 
    (v_categoria_supermercado, 'Mercadona', '🛒', 1), 
    (v_categoria_supermercado, 'Día', '🏪', 2), 
    (v_categoria_supermercado, 'Jamón', '🍖', 3), 
    (v_categoria_supermercado, 'Lidl', '🏪', 4), 
    (v_categoria_supermercado, 'Carrefour', '🛒', 5), 
    (v_categoria_supermercado, 'Alcampo', '🛒', 6), 
    (v_categoria_supermercado, 'Ahorramas', '🛒', 7), 
    (v_categoria_supermercado, 'Eroski', '🛒', 8), 
    (v_categoria_supermercado, 'Otros', '��️', 9);
  
  -- Restaurantes subcategories (existing)
  INSERT INTO subcategories (category_id, name, icon, display_order) 
  VALUES 
    (v_categoria_restaurantes, 'Fast Food', '🍟', 1), 
    (v_categoria_restaurantes, 'Cafetería', '☕', 2), 
    (v_categoria_restaurantes, 'Restaurante Medio', '🍽️', 3), 
    (v_categoria_restaurantes, 'Restaurante Alto', '👨‍🍳', 4), 
    (v_categoria_restaurantes, 'Delivery', '📦', 5), 
    (v_categoria_restaurantes, 'Otros', '🍴', 99);
  
  -- Transporte subcategories (existing)
  INSERT INTO subcategories (category_id, name, icon, display_order) 
  VALUES 
    (v_categoria_transporte, 'Gasolina', '⛽', 1), 
    (v_categoria_transporte, 'Diesel', '⛽', 2), 
    (v_categoria_transporte, 'Eléctrico', '🔌', 3), 
    (v_categoria_transporte, 'Metro', '🚇', 4), 
    (v_categoria_transporte, 'Bus', '🚌', 5), 
    (v_categoria_transporte, 'Taxi/VTC', '🚕', 6), 
    (v_categoria_transporte, 'Parking', '🅿️', 7), 
    (v_categoria_transporte, 'Peajes', '🛣️', 8), 
    (v_categoria_transporte, 'Mantenimiento Vehículo', '🔧', 9), 
    (v_categoria_transporte, 'ITV', '🔍', 10), 
    (v_categoria_transporte, 'Seguro Coche', '🛡️', 11), 
    (v_categoria_transporte, 'Otros', '🚗', 99);
  
  -- ============================================================
  -- NEW: Add "Otros" subcategory to ALL categories without any
  -- ============================================================
  
  INSERT INTO subcategories (category_id, name, icon, display_order) 
  VALUES 
    (v_categoria_comunidad, 'Otros', '📦', 99),
    (v_categoria_seguros, 'Otros', '📦', 99),
    (v_categoria_impuestos, 'Otros', '📦', 99),
    (v_categoria_menaje, 'Otros', '📦', 99),
    (v_categoria_limpieza, 'Otros', '📦', 99),
    (v_categoria_mantenimiento, 'Otros', '📦', 99),
    (v_categoria_ocio, 'Otros', '📦', 99),
    (v_categoria_deportes, 'Otros', '📦', 99),
    (v_categoria_suscripciones, 'Otros', '📦', 99),
    (v_categoria_belleza, 'Otros', '📦', 99),
    (v_categoria_mascotas, 'Otros', '📦', 99),
    (v_categoria_regalos, 'Otros', '📦', 99),
    (v_categoria_varios_ocio, 'Otros', '📦', 99),
    (v_categoria_salud, 'Otros', '📦', 99),
    (v_categoria_educacion, 'Otros', '📦', 99),
    (v_categoria_ropa, 'Otros', '📦', 99),
    (v_categoria_calzado, 'Otros', '📦', 99),
    (v_categoria_varios_otros, 'Otros', '📦', 99),
    (v_categoria_nomina, 'Otros', '📦', 99),
    (v_categoria_freelance, 'Otros', '📦', 99),
    (v_categoria_inversiones, 'Otros', '📦', 99),
    (v_categoria_ventas, 'Otros', '📦', 99),
    (v_categoria_devoluciones, 'Otros', '📦', 99),
    (v_categoria_aportacion, 'Otros', '📦', 99),
    (v_categoria_bonus, 'Otros', '📦', 99),
    (v_categoria_varios_income, 'Otros', '📦', 99);
  
  RAISE NOTICE '✅ 9 grupos | 50 categorías | 79 subcategorías (55 existing + 24 new Otros)';
END;
$$;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Function updated successfully!';
  RAISE NOTICE '📝 New households will have "Otros" subcategory in ALL categories';
  RAISE NOTICE '📊 For existing households, run manual script to:';
  RAISE NOTICE '   1. Add "Otros" subcategories to existing categories';
  RAISE NOTICE '   2. Migrate orphan transactions';
END $$;
