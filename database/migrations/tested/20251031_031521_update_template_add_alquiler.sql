-- ============================================================================
-- Migración: Actualizar función template para incluir subcategoría Alquiler
-- Fecha: 2025-10-31 03:15:21
-- Descripción: Agrega "Alquiler" a la subcategoría de Vivienda en el template
--              para que todos los nuevos hogares la tengan automáticamente
-- ============================================================================

SET ROLE cuentassik_prod_owner;

-- Recrear la función con Alquiler incluido
CREATE OR REPLACE FUNCTION public.create_default_household_categories()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  -- Parent variables
  v_parent_hogar UUID;
  v_parent_suministros UUID;
  v_parent_alimentacion UUID;
  v_parent_transporte UUID;
  v_parent_personal UUID;
  v_parent_estilo_vida UUID;
  v_parent_finanzas UUID;
  v_parent_ingresos_laborales UUID;
  v_parent_otros_ingresos UUID;

  -- Category variables (37 total)
  v_cat_vivienda UUID;
  v_cat_menaje UUID;
  v_cat_limpieza UUID;
  v_cat_mantenimiento UUID;
  v_cat_comunidad UUID;
  v_cat_lavanderia UUID;
  v_cat_luz UUID;
  v_cat_agua UUID;
  v_cat_gas UUID;
  v_cat_internet UUID;
  v_cat_telefono UUID;
  v_cat_seguros UUID;
  v_cat_impuestos UUID;
  v_cat_supermercado UUID;
  v_cat_carniceria UUID;
  v_cat_pescaderia UUID;
  v_cat_fruteria UUID;
  v_cat_panaderia UUID;
  v_cat_otros_alimentos UUID;
  v_cat_restaurantes UUID;
  v_cat_transporte UUID;
  v_cat_combustible UUID;
  v_cat_parking UUID;
  v_cat_peajes UUID;
  v_cat_salud UUID;
  v_cat_farmacia UUID;
  v_cat_gimnasio UUID;
  v_cat_belleza UUID;
  v_cat_ropa UUID;
  v_cat_calzado UUID;
  v_cat_mascotas UUID;
  v_cat_educacion UUID;
  v_cat_ocio UUID;
  v_cat_varios_exp UUID;
  v_cat_nomina UUID;
  v_cat_freelance UUID;
  v_cat_devoluciones UUID;
  v_cat_aportacion UUID;
  v_cat_varios_ing UUID;
  v_cat_pago_prestamo UUID;
BEGIN
  -- ============================================================================
  -- CATEGORY PARENTS (9 total)
  -- ============================================================================

  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Hogar', '🏠', 'expense', 1)
  RETURNING id INTO v_parent_hogar;

  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Suministros', '⚡', 'expense', 2)
  RETURNING id INTO v_parent_suministros;

  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Alimentación', '🍽️', 'expense', 3)
  RETURNING id INTO v_parent_alimentacion;

  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Transporte', '🚗', 'expense', 4)
  RETURNING id INTO v_parent_transporte;

  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Personal', '👤', 'expense', 5)
  RETURNING id INTO v_parent_personal;

  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Estilo de vida', '🎨', 'expense', 6)
  RETURNING id INTO v_parent_estilo_vida;

  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Finanzas', '💰', 'expense', 7)
  RETURNING id INTO v_parent_finanzas;

  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Ingresos Laborales', '💼', 'income', 8)
  RETURNING id INTO v_parent_ingresos_laborales;

  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Otros Ingresos', '💸', 'income', 9)
  RETURNING id INTO v_parent_otros_ingresos;

  -- ============================================================================
  -- CATEGORIES (37 total)
  -- ============================================================================

  -- HOGAR (6 categorías)
  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Vivienda', '🏠', 'expense', v_parent_hogar, 1)
  RETURNING id INTO v_cat_vivienda;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Menaje', '🪑', 'expense', v_parent_hogar, 2)
  RETURNING id INTO v_cat_menaje;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Limpieza', '🧹', 'expense', v_parent_hogar, 3)
  RETURNING id INTO v_cat_limpieza;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Mantenimiento', '🔧', 'expense', v_parent_hogar, 4)
  RETURNING id INTO v_cat_mantenimiento;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Comunidad', '🏢', 'expense', v_parent_hogar, 5)
  RETURNING id INTO v_cat_comunidad;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Lavandería', '🧺', 'expense', v_parent_hogar, 6)
  RETURNING id INTO v_cat_lavanderia;

  -- SUMINISTROS (5 categorías)
  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Luz', '💡', 'expense', v_parent_suministros, 1)
  RETURNING id INTO v_cat_luz;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Agua', '💧', 'expense', v_parent_suministros, 2)
  RETURNING id INTO v_cat_agua;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Gas/Butano', '🔥', 'expense', v_parent_suministros, 3)
  RETURNING id INTO v_cat_gas;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Internet', '🌐', 'expense', v_parent_suministros, 4)
  RETURNING id INTO v_cat_internet;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Teléfono', '📱', 'expense', v_parent_suministros, 5)
  RETURNING id INTO v_cat_telefono;

  -- SUMINISTROS - Otros (2 categorías)
  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Seguros', '🛡️', 'expense', v_parent_suministros, 6)
  RETURNING id INTO v_cat_seguros;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Impuestos', '📋', 'expense', v_parent_suministros, 7)
  RETURNING id INTO v_cat_impuestos;

  -- ALIMENTACIÓN (7 categorías)
  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Supermercado', '🛒', 'expense', v_parent_alimentacion, 1)
  RETURNING id INTO v_cat_supermercado;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Carnicería', '🥩', 'expense', v_parent_alimentacion, 2)
  RETURNING id INTO v_cat_carniceria;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Pescadería', '🐟', 'expense', v_parent_alimentacion, 3)
  RETURNING id INTO v_cat_pescaderia;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Frutería', '🍎', 'expense', v_parent_alimentacion, 4)
  RETURNING id INTO v_cat_fruteria;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Panadería', '🥖', 'expense', v_parent_alimentacion, 5)
  RETURNING id INTO v_cat_panaderia;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Otros Alimentos', '🍱', 'expense', v_parent_alimentacion, 6)
  RETURNING id INTO v_cat_otros_alimentos;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Restaurantes', '🍽️', 'expense', v_parent_alimentacion, 7)
  RETURNING id INTO v_cat_restaurantes;

  -- TRANSPORTE (4 categorías)
  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Transporte', '🚗', 'expense', v_parent_transporte, 1)
  RETURNING id INTO v_cat_transporte;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Combustible', '⛽', 'expense', v_parent_transporte, 2)
  RETURNING id INTO v_cat_combustible;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Parking', '🅿️', 'expense', v_parent_transporte, 3)
  RETURNING id INTO v_cat_parking;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Peajes', '🛣️', 'expense', v_parent_transporte, 4)
  RETURNING id INTO v_cat_peajes;

  -- PERSONAL (4 categorías)
  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Salud', '🏥', 'expense', v_parent_personal, 1)
  RETURNING id INTO v_cat_salud;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Farmacia', '💊', 'expense', v_parent_personal, 2)
  RETURNING id INTO v_cat_farmacia;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Gimnasio', '🏋️', 'expense', v_parent_personal, 3)
  RETURNING id INTO v_cat_gimnasio;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Belleza', '💄', 'expense', v_parent_personal, 4)
  RETURNING id INTO v_cat_belleza;

  -- ESTILO DE VIDA (4 categorías)
  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Ropa', '👕', 'expense', v_parent_estilo_vida, 1)
  RETURNING id INTO v_cat_ropa;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Calzado', '👞', 'expense', v_parent_estilo_vida, 2)
  RETURNING id INTO v_cat_calzado;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Mascotas', '🐶', 'expense', v_parent_estilo_vida, 3)
  RETURNING id INTO v_cat_mascotas;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Educación', '📚', 'expense', v_parent_estilo_vida, 4)
  RETURNING id INTO v_cat_educacion;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Ocio', '🎭', 'expense', v_parent_estilo_vida, 5)
  RETURNING id INTO v_cat_ocio;

  -- FINANZAS (1 categoría)
  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Varios', '📋', 'expense', v_parent_finanzas, 1)
  RETURNING id INTO v_cat_varios_exp;

  -- INGRESOS LABORALES (2 categorías)
  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Nómina', '💰', 'income', v_parent_ingresos_laborales, 1)
  RETURNING id INTO v_cat_nomina;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Freelance', '💼', 'income', v_parent_ingresos_laborales, 2)
  RETURNING id INTO v_cat_freelance;

  -- OTROS INGRESOS (5 categorías)
  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Devoluciones', '🔄', 'income', v_parent_otros_ingresos, 3)
  RETURNING id INTO v_cat_devoluciones;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Aportación Cuenta Conjunta', '🏦', 'income', v_parent_otros_ingresos, 4)
  RETURNING id INTO v_cat_aportacion;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Varios', '📋', 'income', v_parent_otros_ingresos, 5)
  RETURNING id INTO v_cat_varios_ing;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Pago Préstamo', '💳', 'income', v_parent_otros_ingresos, 6)
  RETURNING id INTO v_cat_pago_prestamo;

  -- ============================================================================
  -- SUBCATEGORÍAS (51 total - ACTUALIZADO CON ALQUILER)
  -- ============================================================================

  -- ✨ NUEVA: Vivienda (1 subcategoría)
  INSERT INTO subcategories (category_id, name, icon, display_order) VALUES
    (v_cat_vivienda, 'Alquiler', '🏠', 1);

  -- Supermercado (7 subcategorías)
  INSERT INTO subcategories (category_id, name, icon, display_order) VALUES
    (v_cat_supermercado, 'Mercadona', '🛒', 1),
    (v_cat_supermercado, 'Lidl', '🛒', 2),
    (v_cat_supermercado, 'Carrefour', '🛒', 3),
    (v_cat_supermercado, 'Día', '🛒', 4),
    (v_cat_supermercado, 'Alcampo', '🛒', 5),
    (v_cat_supermercado, 'Eroski', '🛒', 6),
    (v_cat_supermercado, 'Otro supermercado', '🛒', 7);

  -- Restaurantes (6 subcategorías)
  INSERT INTO subcategories (category_id, name, icon, display_order) VALUES
    (v_cat_restaurantes, 'Fast Food', '🍔', 1),
    (v_cat_restaurantes, 'Cafeterías', '☕', 2),
    (v_cat_restaurantes, 'Restaurante Casual', '🍽️', 3),
    (v_cat_restaurantes, 'Restaurante Medio', '🍽️', 4),
    (v_cat_restaurantes, 'Delivery', '🛵', 5),
    (v_cat_restaurantes, 'Otro restaurante', '🍽️', 6);

  -- Luz (5 subcategorías)
  INSERT INTO subcategories (category_id, name, icon, display_order) VALUES
    (v_cat_luz, 'Iberdrola', '💡', 1),
    (v_cat_luz, 'Endesa', '💡', 2),
    (v_cat_luz, 'Naturgy', '💡', 3),
    (v_cat_luz, 'Repsol', '💡', 4),
    (v_cat_luz, 'Otra compañía', '💡', 5);

  -- Agua (3 subcategorías)
  INSERT INTO subcategories (category_id, name, icon, display_order) VALUES
    (v_cat_agua, 'Canal de Isabel II', '💧', 1),
    (v_cat_agua, 'Aguas Municipales', '💧', 2),
    (v_cat_agua, 'Otra compañía', '💧', 3);

  -- Gas/Butano (3 subcategorías)
  INSERT INTO subcategories (category_id, name, icon, display_order) VALUES
    (v_cat_gas, 'Naturgy', '🔥', 1),
    (v_cat_gas, 'Repsol Butano', '🔥', 2),
    (v_cat_gas, 'Otra compañía', '🔥', 3);

  -- Internet (6 subcategorías)
  INSERT INTO subcategories (category_id, name, icon, display_order) VALUES
    (v_cat_internet, 'Vodafone', '🌐', 1),
    (v_cat_internet, 'Movistar', '🌐', 2),
    (v_cat_internet, 'Orange', '🌐', 3),
    (v_cat_internet, 'Yoigo', '🌐', 4),
    (v_cat_internet, 'MásMóvil', '🌐', 5),
    (v_cat_internet, 'Otra operadora', '🌐', 6);

  -- Teléfono (5 subcategorías)
  INSERT INTO subcategories (category_id, name, icon, display_order) VALUES
    (v_cat_telefono, 'Vodafone', '📱', 1),
    (v_cat_telefono, 'Movistar', '📱', 2),
    (v_cat_telefono, 'Orange', '📱', 3),
    (v_cat_telefono, 'Yoigo', '📱', 4),
    (v_cat_telefono, 'Otra operadora', '📱', 5);

  -- Transporte (12 subcategorías)
  INSERT INTO subcategories (category_id, name, icon, display_order) VALUES
    (v_cat_transporte, 'Gasolina', '⛽', 1),
    (v_cat_transporte, 'Diésel', '⛽', 2),
    (v_cat_transporte, 'Parking', '🅿️', 3),
    (v_cat_transporte, 'Peajes', '🛣️', 4),
    (v_cat_transporte, 'Metro', '🚇', 5),
    (v_cat_transporte, 'Autobús', '🚌', 6),
    (v_cat_transporte, 'Tren', '🚄', 7),
    (v_cat_transporte, 'Taxi', '🚕', 8),
    (v_cat_transporte, 'VTC (Uber/Cabify)', '🚖', 9),
    (v_cat_transporte, 'Bicicleta compartida', '🚲', 10),
    (v_cat_transporte, 'Patinete', '🛴', 11),
    (v_cat_transporte, 'Otro transporte', '🚗', 12);

  -- Lavandería (3 subcategorías)
  INSERT INTO subcategories (category_id, name, icon, display_order) VALUES
    (v_cat_lavanderia, 'Lavandería', '🧺', 1),
    (v_cat_lavanderia, 'Tintorería', '👔', 2),
    (v_cat_lavanderia, 'Planchado', '👚', 3);

  RETURN NEW;
END;
$$;

RESET ROLE;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Para validar que la función actualizada funciona correctamente:
-- 1. Crear un hogar de prueba
-- 2. Verificar que tiene 51 subcategorías (50 originales + 1 Alquiler)
-- 3. Verificar específicamente que Hogar > Vivienda > Alquiler existe
