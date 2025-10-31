-- Actualiza la función de seed de categorías para incluir la jerarquía completa
-- (9 parents + 37 categories + 50 subcategories)
-- Esta función se ejecuta automáticamente al crear un nuevo hogar

SET ROLE cuentassik_prod_owner;

-- ============================================================================
-- FUNCIÓN DE SEED DE CATEGORÍAS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_default_household_categories()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_parent_hogar UUID;
  v_parent_suministros UUID;
  v_parent_alimentacion UUID;
  v_parent_transporte UUID;
  v_parent_personal UUID;
  v_parent_estilo_vida UUID;
  v_parent_finanzas UUID;
  v_parent_ingresos_laborales UUID;
  v_parent_otros_ingresos UUID;

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
  v_cat_supermercado UUID;
  v_cat_restaurantes UUID;
  v_cat_transporte UUID;
  v_cat_ropa UUID;
  v_cat_belleza UUID;
  v_cat_salud UUID;
  v_cat_mascotas UUID;
  v_cat_ocio UUID;
  v_cat_deportes UUID;
  v_cat_educacion UUID;
  v_cat_suscripciones UUID;
  v_cat_regalos UUID;
  v_cat_seguros UUID;
  v_cat_impuestos UUID;
  v_cat_varios UUID;
  v_cat_nomina UUID;
  v_cat_freelance UUID;
  v_cat_bonus UUID;
  v_cat_inversiones UUID;
  v_cat_ventas UUID;
  v_cat_devoluciones UUID;
  v_cat_aportacion UUID;
  v_cat_varios_ing UUID;
  v_cat_prestamo_personal UUID;
  v_cat_pago_prestamo UUID;
  v_cat_reembolso UUID;
BEGIN
  -- ============================================================================
  -- CATEGORÍAS PADRE (9 total)
  -- ============================================================================

  -- GASTOS
  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Hogar', '🏠', 'expense', 1)
  RETURNING id INTO v_parent_hogar;

  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Suministros', '⚡', 'expense', 2)
  RETURNING id INTO v_parent_suministros;

  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Alimentación', '🛒', 'expense', 3)
  RETURNING id INTO v_parent_alimentacion;

  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Transporte', '🚗', 'expense', 4)
  RETURNING id INTO v_parent_transporte;

  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Personal', '👤', 'expense', 5)
  RETURNING id INTO v_parent_personal;

  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Estilo de Vida', '🎯', 'expense', 6)
  RETURNING id INTO v_parent_estilo_vida;

  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Finanzas', '💼', 'expense', 7)
  RETURNING id INTO v_parent_finanzas;

  -- INGRESOS
  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Ingresos Laborales', '💰', 'income', 1)
  RETURNING id INTO v_parent_ingresos_laborales;

  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Otros Ingresos', '💸', 'income', 2)
  RETURNING id INTO v_parent_otros_ingresos;

  -- ============================================================================
  -- CATEGORÍAS (37 total)
  -- ============================================================================

  -- HOGAR (6 categorías)
  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Vivienda', '🏠', 'expense', v_parent_hogar, 1)
  RETURNING id INTO v_cat_vivienda;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Menaje', '🍽️', 'expense', v_parent_hogar, 2)
  RETURNING id INTO v_cat_menaje;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Limpieza', '🧹', 'expense', v_parent_hogar, 3)
  RETURNING id INTO v_cat_limpieza;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Mantenimiento', '🔧', 'expense', v_parent_hogar, 4)
  RETURNING id INTO v_cat_mantenimiento;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Comunidad', '🏘️', 'expense', v_parent_hogar, 5)
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

  -- ALIMENTACIÓN (2 categorías)
  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Supermercado', '🛒', 'expense', v_parent_alimentacion, 1)
  RETURNING id INTO v_cat_supermercado;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Restaurantes', '🍽️', 'expense', v_parent_alimentacion, 2)
  RETURNING id INTO v_cat_restaurantes;

  -- TRANSPORTE (1 categoría)
  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Transporte', '🚗', 'expense', v_parent_transporte, 1)
  RETURNING id INTO v_cat_transporte;

  -- PERSONAL (4 categorías)
  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Ropa', '👕', 'expense', v_parent_personal, 1)
  RETURNING id INTO v_cat_ropa;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Belleza', '💄', 'expense', v_parent_personal, 2)
  RETURNING id INTO v_cat_belleza;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Salud', '💊', 'expense', v_parent_personal, 3)
  RETURNING id INTO v_cat_salud;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Mascotas', '🐾', 'expense', v_parent_personal, 4)
  RETURNING id INTO v_cat_mascotas;

  -- ESTILO DE VIDA (5 categorías)
  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Ocio', '🎬', 'expense', v_parent_estilo_vida, 1)
  RETURNING id INTO v_cat_ocio;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Deportes', '⚽', 'expense', v_parent_estilo_vida, 2)
  RETURNING id INTO v_cat_deportes;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Educación', '📚', 'expense', v_parent_estilo_vida, 3)
  RETURNING id INTO v_cat_educacion;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Suscripciones', '📺', 'expense', v_parent_estilo_vida, 4)
  RETURNING id INTO v_cat_suscripciones;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Regalos', '🎁', 'expense', v_parent_estilo_vida, 5)
  RETURNING id INTO v_cat_regalos;

  -- FINANZAS (5 categorías, incluyendo las de crédito/deuda)
  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Seguros', '🛡️', 'expense', v_parent_finanzas, 1)
  RETURNING id INTO v_cat_seguros;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Impuestos', '💵', 'expense', v_parent_finanzas, 2)
  RETURNING id INTO v_cat_impuestos;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Varios', '📋', 'expense', v_parent_finanzas, 3)
  RETURNING id INTO v_cat_varios;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Préstamo Personal', '💰', 'expense', v_parent_finanzas, 4)
  RETURNING id INTO v_cat_prestamo_personal;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Reembolso Saldo a Favor', '↩️', 'expense', v_parent_finanzas, 5)
  RETURNING id INTO v_cat_reembolso;

  -- INGRESOS LABORALES (3 categorías)
  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Nómina', '💰', 'income', v_parent_ingresos_laborales, 1)
  RETURNING id INTO v_cat_nomina;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Freelance', '💼', 'income', v_parent_ingresos_laborales, 2)
  RETURNING id INTO v_cat_freelance;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Bonus', '🎁', 'income', v_parent_ingresos_laborales, 3)
  RETURNING id INTO v_cat_bonus;

  -- OTROS INGRESOS (6 categorías, incluyendo Pago Préstamo)
  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Inversiones', '📈', 'income', v_parent_otros_ingresos, 1)
  RETURNING id INTO v_cat_inversiones;

  INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)
  VALUES (NEW.id, 'Ventas', '🏷️', 'income', v_parent_otros_ingresos, 2)
  RETURNING id INTO v_cat_ventas;

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
  -- SUBCATEGORÍAS (50 total - las más comunes)
  -- ============================================================================

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

  -- Transporte (12 subcategorías - la más granular)
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

-- ============================================================================
-- TRIGGER
-- ============================================================================

-- Asegurar que el trigger existe y apunta a la función actualizada
DROP TRIGGER IF EXISTS trigger_create_default_categories ON public.households;
CREATE TRIGGER trigger_create_default_categories
AFTER INSERT ON public.households
FOR EACH ROW
EXECUTE FUNCTION public.create_default_household_categories();

RESET ROLE;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- La función será ejecutada automáticamente cuando se cree un nuevo hogar.
-- Para verificar, crear un hogar de prueba y comprobar:
-- SELECT COUNT(*) FROM category_parents WHERE household_id = '<nuevo_household_id>'; -- debe ser 9
-- SELECT COUNT(*) FROM categories WHERE household_id = '<nuevo_household_id>'; -- debe ser 37
-- SELECT COUNT(*) FROM subcategories WHERE category_id IN (SELECT id FROM categories WHERE household_id = '<nuevo_household_id>'); -- debe ser 50
