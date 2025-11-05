-- ============================================================================
-- ISSUE #47: CONSOLIDAR FUNCIONES DUPLICADAS DE CATEGORÍAS  
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_create_default_categories ON public.households CASCADE;
DROP FUNCTION IF EXISTS public.create_default_household_categories(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_default_household_categories() CASCADE;


-- ============================================================================
-- NUEVA FUNCIÓN: create_default_household_categories()
-- ============================================================================
-- Creada desde estructura REAL de PROD (5 Nov 2025)
-- Reemplaza las 2 versiones duplicadas anteriores
-- 
-- Estructura: 9 padres | 50 categorías | 95 subcategorías
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_default_household_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  -- IDs de parents (9 grupos)
  v_parent_ingresos_laborales uuid;
  v_parent_hogar uuid;
  v_parent_suministros uuid;
  v_parent_otros_ingresos uuid;
  v_parent_alimentacion uuid;
  v_parent_transporte uuid;
  v_parent_personal uuid;
  v_parent_estilo_vida uuid;
  v_parent_finanzas uuid;

  -- IDs de categorías (50 categorías organizadas por padre)
  -- Hogar (6 categorías)
  v_cat_vivienda uuid;
  v_cat_menaje uuid;
  v_cat_limpieza uuid;
  v_cat_lavanderia uuid;
  v_cat_mantenimiento uuid;
  v_cat_comunidad uuid;

  -- Ingresos Laborales (3 categorías)
  v_cat_nomina uuid;
  v_cat_freelance uuid;
  v_cat_bonus uuid;

  -- Suministros (7 categorías)
  v_cat_luz uuid;
  v_cat_agua uuid;
  v_cat_gas_butano uuid;
  v_cat_internet uuid;
  v_cat_telefono uuid;
  v_cat_seguros_suministros uuid;
  v_cat_impuestos_suministros uuid;

  -- Otros Ingresos (6 categorías)
  v_cat_inversiones uuid;
  v_cat_ventas uuid;
  v_cat_devoluciones uuid;
  v_cat_aportacion_cuenta_conjunta uuid;
  v_cat_pago_prestamo uuid;
  v_cat_varios_otros_ingresos uuid;

  -- Alimentación (7 categorías)
  v_cat_supermercado uuid;
  v_cat_carniceria uuid;
  v_cat_restaurantes uuid;
  v_cat_pescaderia uuid;
  v_cat_fruteria uuid;
  v_cat_panaderia uuid;
  v_cat_otros_alimentos uuid;

  -- Transporte (4 categorías)
  v_cat_transporte uuid;
  v_cat_combustible uuid;
  v_cat_parking uuid;
  v_cat_peajes uuid;

  -- Personal (7 categorías)
  v_cat_ropa uuid;
  v_cat_farmacia uuid;
  v_cat_belleza uuid;
  v_cat_gimnasio uuid;
  v_cat_salud uuid;
  v_cat_mascotas uuid;
  v_cat_calzado uuid;

  -- Estilo de Vida (5 categorías)
  v_cat_ocio uuid;
  v_cat_deportes uuid;
  v_cat_educacion uuid;
  v_cat_suscripciones uuid;
  v_cat_regalos uuid;

  -- Finanzas (5 categorías)
  v_cat_seguros_finanzas uuid;
  v_cat_impuestos_finanzas uuid;
  v_cat_prestamo_personal uuid;
  v_cat_reembolso_saldo uuid;
  v_cat_varios_finanzas uuid;

BEGIN
  -- ========================================================================
  -- PASO 1: CREAR CATEGORY_PARENTS (9 padres)
  -- ========================================================================

  -- 1. Ingresos Laborales (income, order 1)
  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Ingresos Laborales', '💰', 'income', 1)
  RETURNING id INTO v_parent_ingresos_laborales;

  -- 2. Hogar (expense, order 1)
  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Hogar', '🏠', 'expense', 1)
  RETURNING id INTO v_parent_hogar;

  -- 3. Suministros (expense, order 2)
  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Suministros', '⚡', 'expense', 2)
  RETURNING id INTO v_parent_suministros;

  -- 4. Otros Ingresos (income, order 2)
  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Otros Ingresos', '💸', 'income', 2)
  RETURNING id INTO v_parent_otros_ingresos;

  -- 5. Alimentación (expense, order 3)
  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Alimentación', '🛒', 'expense', 3)
  RETURNING id INTO v_parent_alimentacion;

  -- 6. Transporte (expense, order 4)
  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Transporte', '🚗', 'expense', 4)
  RETURNING id INTO v_parent_transporte;

  -- 7. Personal (expense, order 5)
  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Personal', '👤', 'expense', 5)
  RETURNING id INTO v_parent_personal;

  -- 8. Estilo de Vida (expense, order 6)
  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Estilo de Vida', '🎯', 'expense', 6)
  RETURNING id INTO v_parent_estilo_vida;

  -- 9. Finanzas (expense, order 7)
  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Finanzas', '💼', 'expense', 7)
  RETURNING id INTO v_parent_finanzas;

  -- ========================================================================
  -- PASO 2: CREAR CATEGORIES (50 categorías)
  -- ========================================================================

  -- ========== HOGAR (6 categorías) ==========
  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_hogar, 'Vivienda', '🏠', 1)
  RETURNING id INTO v_cat_vivienda;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_hogar, 'Menaje', '🪑', 2)
  RETURNING id INTO v_cat_menaje;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_hogar, 'Limpieza', '🧹', 3)
  RETURNING id INTO v_cat_limpieza;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_hogar, 'Lavandería', '🧺', 4)
  RETURNING id INTO v_cat_lavanderia;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_hogar, 'Mantenimiento', '🔧', 5)
  RETURNING id INTO v_cat_mantenimiento;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_hogar, 'Comunidad', '🏢', 6)
  RETURNING id INTO v_cat_comunidad;

  -- ========== INGRESOS LABORALES (3 categorías) ==========
  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_ingresos_laborales, 'Nómina', '💰', 1)
  RETURNING id INTO v_cat_nomina;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_ingresos_laborales, 'Freelance', '💼', 2)
  RETURNING id INTO v_cat_freelance;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_ingresos_laborales, 'Bonus', '🎉', 3)
  RETURNING id INTO v_cat_bonus;

  -- ========== SUMINISTROS (7 categorías) ==========
  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_suministros, 'Luz', '💡', 1)
  RETURNING id INTO v_cat_luz;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_suministros, 'Agua', '💧', 2)
  RETURNING id INTO v_cat_agua;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_suministros, 'Gas/Butano', '🔥', 3)
  RETURNING id INTO v_cat_gas_butano;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_suministros, 'Internet', '📡', 4)
  RETURNING id INTO v_cat_internet;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_suministros, 'Teléfono', '📞', 5)
  RETURNING id INTO v_cat_telefono;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_suministros, 'Seguros', '🛡️', 6)
  RETURNING id INTO v_cat_seguros_suministros;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_suministros, 'Impuestos', '📋', 7)
  RETURNING id INTO v_cat_impuestos_suministros;

  -- ========== OTROS INGRESOS (6 categorías) ==========
  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_otros_ingresos, 'Inversiones', '📈', 1)
  RETURNING id INTO v_cat_inversiones;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_otros_ingresos, 'Ventas', '🏷️', 2)
  RETURNING id INTO v_cat_ventas;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_otros_ingresos, 'Devoluciones', '↩️', 3)
  RETURNING id INTO v_cat_devoluciones;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_otros_ingresos, 'Aportación Cuenta Conjunta', '🏦', 4)
  RETURNING id INTO v_cat_aportacion_cuenta_conjunta;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_otros_ingresos, 'Pago Préstamo', '💳', 5)
  RETURNING id INTO v_cat_pago_prestamo;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_otros_ingresos, 'Varios', '➕', 99)
  RETURNING id INTO v_cat_varios_otros_ingresos;

  -- ========== ALIMENTACIÓN (7 categorías) ==========
  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_alimentacion, 'Supermercado', '🛒', 1)
  RETURNING id INTO v_cat_supermercado;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_alimentacion, 'Carnicería', '🥩', 2)
  RETURNING id INTO v_cat_carniceria;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_alimentacion, 'Restaurantes', '🍽️', 2)
  RETURNING id INTO v_cat_restaurantes;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_alimentacion, 'Pescadería', '🐟', 3)
  RETURNING id INTO v_cat_pescaderia;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_alimentacion, 'Frutería', '🍎', 4)
  RETURNING id INTO v_cat_fruteria;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_alimentacion, 'Panadería', '🥖', 5)
  RETURNING id INTO v_cat_panaderia;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_alimentacion, 'Otros Alimentos', '🍱', 6)
  RETURNING id INTO v_cat_otros_alimentos;

  -- ========== TRANSPORTE (4 categorías) ==========
  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_transporte, 'Transporte', '🚗', 1)
  RETURNING id INTO v_cat_transporte;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_transporte, 'Combustible', '⛽', 2)
  RETURNING id INTO v_cat_combustible;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_transporte, 'Parking', '🅿️', 3)
  RETURNING id INTO v_cat_parking;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_transporte, 'Peajes', '🛣️', 4)
  RETURNING id INTO v_cat_peajes;

  -- ========== PERSONAL (7 categorías) ==========
  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_personal, 'Ropa', '👕', 1)
  RETURNING id INTO v_cat_ropa;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_personal, 'Farmacia', '💊', 2)
  RETURNING id INTO v_cat_farmacia;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_personal, 'Belleza', '💄', 2)
  RETURNING id INTO v_cat_belleza;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_personal, 'Gimnasio', '🏋️', 3)
  RETURNING id INTO v_cat_gimnasio;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_personal, 'Salud', '🏥', 3)
  RETURNING id INTO v_cat_salud;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_personal, 'Mascotas', '🐶', 4)
  RETURNING id INTO v_cat_mascotas;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_personal, 'Calzado', '👟', 5)
  RETURNING id INTO v_cat_calzado;

  -- ========== ESTILO DE VIDA (5 categorías) ==========
  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_estilo_vida, 'Ocio', '🎭', 1)
  RETURNING id INTO v_cat_ocio;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_estilo_vida, 'Deportes', '⚽', 2)
  RETURNING id INTO v_cat_deportes;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_estilo_vida, 'Educación', '📚', 3)
  RETURNING id INTO v_cat_educacion;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_estilo_vida, 'Suscripciones', '📱', 4)
  RETURNING id INTO v_cat_suscripciones;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_estilo_vida, 'Regalos', '🎁', 5)
  RETURNING id INTO v_cat_regalos;

  -- ========== FINANZAS (5 categorías) ==========
  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_finanzas, 'Seguros', '🛡️', 1)
  RETURNING id INTO v_cat_seguros_finanzas;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_finanzas, 'Impuestos', '📋', 2)
  RETURNING id INTO v_cat_impuestos_finanzas;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_finanzas, 'Préstamo Personal', '💰', 3)
  RETURNING id INTO v_cat_prestamo_personal;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_finanzas, 'Reembolso Saldo a Favor', '↩️', 4)
  RETURNING id INTO v_cat_reembolso_saldo;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_finanzas, 'Varios', '➕', 99)
  RETURNING id INTO v_cat_varios_finanzas;

  -- ========================================================================
  -- PASO 3: CREAR SUBCATEGORIES (95 subcategorías)
  -- ========================================================================
  -- Estructura completa extraída de PROD el 5 Nov 2025

  -- ========== HOGAR ==========
  -- Vivienda (3 subcats)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES 
    (v_cat_vivienda, 'Alquiler', 1),
    (v_cat_vivienda, 'Hipoteca', 2),
    (v_cat_vivienda, 'Varios', 99);

  -- Menaje (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_menaje, 'Varios', 99);

  -- Limpieza (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_limpieza, 'Varios', 99);

  -- Lavandería (3 subcats)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES 
    (v_cat_lavanderia, 'Tintorería', 1),
    (v_cat_lavanderia, 'Lavandería', 2),
    (v_cat_lavanderia, 'Varios', 99);

  -- Mantenimiento (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_mantenimiento, 'Varios', 99);

  -- Comunidad (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_comunidad, 'Varios', 99);

  -- ========== INGRESOS LABORALES ==========
  -- Nómina (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_nomina, 'Varios', 99);

  -- Freelance (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_freelance, 'Varios', 99);

  -- Bonus (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_bonus, 'Varios', 99);

  -- ========== SUMINISTROS ==========
  -- Luz (5 subcats)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES 
    (v_cat_luz, 'Luz Hogar', 1),
    (v_cat_luz, 'Luz Otro', 2),
    (v_cat_luz, 'Luz Vacaciones', 3),
    (v_cat_luz, 'Luz Varios', 4),
    (v_cat_luz, 'Varios', 99);

  -- Agua (3 subcats)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES 
    (v_cat_agua, 'Agua Hogar', 1),
    (v_cat_agua, 'Agua Vacaciones', 2),
    (v_cat_agua, 'Varios', 99);

  -- Gas/Butano (3 subcats)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES 
    (v_cat_gas_butano, 'Gas Hogar', 1),
    (v_cat_gas_butano, 'Gas Vacaciones', 2),
    (v_cat_gas_butano, 'Varios', 99);

  -- Internet (6 subcats)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES 
    (v_cat_internet, 'Internet Hogar', 1),
    (v_cat_internet, 'Internet Fibra', 2),
    (v_cat_internet, 'Internet Vacaciones', 3),
    (v_cat_internet, 'Internet Móvil', 4),
    (v_cat_internet, 'Internet Varios', 5),
    (v_cat_internet, 'Varios', 99);

  -- Teléfono (5 subcats)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES 
    (v_cat_telefono, 'Teléfono Hogar', 1),
    (v_cat_telefono, 'Teléfono Móvil', 2),
    (v_cat_telefono, 'Teléfono Vacaciones', 3),
    (v_cat_telefono, 'Teléfono Varios', 4),
    (v_cat_telefono, 'Varios', 99);

  -- Seguros Suministros (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_seguros_suministros, 'Varios', 99);

  -- Impuestos Suministros (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_impuestos_suministros, 'Varios', 99);

  -- ========== OTROS INGRESOS ==========
  -- Inversiones (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_inversiones, 'Varios', 99);

  -- Ventas (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_ventas, 'Varios', 99);

  -- Devoluciones (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_devoluciones, 'Varios', 99);

  -- Aportación Cuenta Conjunta (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_aportacion_cuenta_conjunta, 'Varios', 99);

  -- Pago Préstamo (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_pago_prestamo, 'Varios', 99);

  -- Varios Otros Ingresos (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_varios_otros_ingresos, 'Varios', 99);

  -- ========== ALIMENTACIÓN ==========
  -- Supermercado (9 subcats)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES 
    (v_cat_supermercado, 'Supermercado Hogar', 1),
    (v_cat_supermercado, 'Supermercado DIA', 2),
    (v_cat_supermercado, 'Supermercado Mercadona', 3),
    (v_cat_supermercado, 'Supermercado Lidl', 4),
    (v_cat_supermercado, 'Supermercado Consum', 5),
    (v_cat_supermercado, 'Supermercado Carrefour', 6),
    (v_cat_supermercado, 'Supermercado Varios', 7),
    (v_cat_supermercado, 'Supermercado Limpieza', 8),
    (v_cat_supermercado, 'Varios', 99);

  -- Carnicería (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_carniceria, 'Varios', 99);

  -- Restaurantes (6 subcats)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES 
    (v_cat_restaurantes, 'Restaurante', 1),
    (v_cat_restaurantes, 'Bar/Cafetería', 2),
    (v_cat_restaurantes, 'Comida a Domicilio', 3),
    (v_cat_restaurantes, 'Pizzería', 4),
    (v_cat_restaurantes, 'Comida Rápida', 5),
    (v_cat_restaurantes, 'Varios', 99);

  -- Pescadería (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_pescaderia, 'Varios', 99);

  -- Frutería (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_fruteria, 'Varios', 99);

  -- Panadería (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_panaderia, 'Varios', 99);

  -- Otros Alimentos (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_otros_alimentos, 'Varios', 99);

  -- ========== TRANSPORTE ==========
  -- Transporte (12 subcats)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES 
    (v_cat_transporte, 'Coche', 1),
    (v_cat_transporte, 'Moto', 2),
    (v_cat_transporte, 'Autobús', 3),
    (v_cat_transporte, 'Metro', 4),
    (v_cat_transporte, 'Tren', 5),
    (v_cat_transporte, 'Tranvía', 6),
    (v_cat_transporte, 'Avión', 7),
    (v_cat_transporte, 'Taxi', 8),
    (v_cat_transporte, 'VTC', 9),
    (v_cat_transporte, 'Bici', 10),
    (v_cat_transporte, 'Patinete', 11),
    (v_cat_transporte, 'Varios', 99);

  -- Combustible (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_combustible, 'Varios', 99);

  -- Parking (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_parking, 'Varios', 99);

  -- Peajes (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_peajes, 'Varios', 99);

  -- ========== PERSONAL ==========
  -- Ropa (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_ropa, 'Varios', 99);

  -- Farmacia (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_farmacia, 'Varios', 99);

  -- Belleza (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_belleza, 'Varios', 99);

  -- Gimnasio (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_gimnasio, 'Varios', 99);

  -- Salud (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_salud, 'Varios', 99);

  -- Mascotas (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_mascotas, 'Varios', 99);

  -- Calzado (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_calzado, 'Varios', 99);

  -- ========== ESTILO DE VIDA ==========
  -- Ocio (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_ocio, 'Varios', 99);

  -- Deportes (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_deportes, 'Varios', 99);

  -- Educación (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_educacion, 'Varios', 99);

  -- Suscripciones (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_suscripciones, 'Varios', 99);

  -- Regalos (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_regalos, 'Varios', 99);

  -- ========== FINANZAS ==========
  -- Seguros Finanzas (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_seguros_finanzas, 'Varios', 99);

  -- Impuestos Finanzas (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_impuestos_finanzas, 'Varios', 99);

  -- Préstamo Personal (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_prestamo_personal, 'Varios', 99);

  -- Reembolso Saldo a Favor (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_reembolso_saldo, 'Varios', 99);

  -- Varios Finanzas (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_varios_finanzas, 'Varios', 99);

  -- ========================================================================
  -- FIN: Función completada
  -- ========================================================================
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- Permisos: Permitir ejecución por cuentassik_user
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.create_default_household_categories() TO cuentassik_user;

-- ============================================================================
-- Comentario descriptivo
-- ============================================================================
COMMENT ON FUNCTION public.create_default_household_categories() IS 
'Función trigger que crea automáticamente la estructura completa de categorías 
para nuevos hogares. Genera 9 category_parents, 50 categories y 95 subcategories.
Versión única consolidada (5 Nov 2025) que reemplaza las 2 versiones duplicadas anteriores.
Estructura extraída de producción real (8 meses de uso).';


CREATE TRIGGER trigger_create_default_categories
  AFTER INSERT ON public.households
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_household_categories();

ALTER FUNCTION public.create_default_household_categories() OWNER TO cuentassik_owner;
GRANT EXECUTE ON FUNCTION public.create_default_household_categories() TO cuentassik_user;

