                                                   pg_get_functiondef                                                   
------------------------------------------------------------------------------------------------------------------------
 CREATE OR REPLACE FUNCTION public.create_default_household_categories()                                               +
  RETURNS trigger                                                                                                      +
  LANGUAGE plpgsql                                                                                                     +
 AS $function$                                                                                                         +
 DECLARE                                                                                                               +
   -- Parent variables (9 grupos)                                                                                      +
   v_parent_hogar UUID;                                                                                                +
   v_parent_suministros UUID;                                                                                          +
   v_parent_alimentacion UUID;                                                                                         +
   v_parent_transporte UUID;                                                                                           +
   v_parent_personal UUID;                                                                                             +
   v_parent_estilo_vida UUID;                                                                                          +
   v_parent_finanzas UUID;                                                                                             +
   v_parent_ingresos_laborales UUID;                                                                                   +
   v_parent_otros_ingresos UUID;                                                                                       +
                                                                                                                       +
   -- Category variables (48 categorías - versión más completa)                                                        +
   v_cat_vivienda UUID;                                                                                                +
   v_cat_menaje UUID;                                                                                                  +
   v_cat_limpieza UUID;                                                                                                +
   v_cat_mantenimiento UUID;                                                                                           +
   v_cat_comunidad UUID;                                                                                               +
   v_cat_lavanderia UUID;                                                                                              +
   v_cat_luz UUID;                                                                                                     +
   v_cat_agua UUID;                                                                                                    +
   v_cat_gas UUID;                                                                                                     +
   v_cat_internet UUID;                                                                                                +
   v_cat_telefono UUID;                                                                                                +
   v_cat_seguros_sum UUID;                                                                                             +
   v_cat_impuestos_sum UUID;                                                                                           +
   v_cat_supermercado UUID;                                                                                            +
   v_cat_carniceria UUID;                                                                                              +
   v_cat_pescaderia UUID;                                                                                              +
   v_cat_fruteria UUID;                                                                                                +
   v_cat_panaderia UUID;                                                                                               +
   v_cat_otros_alimentos UUID;                                                                                         +
   v_cat_restaurantes UUID;                                                                                            +
   v_cat_transporte UUID;                                                                                              +
   v_cat_combustible UUID;                                                                                             +
   v_cat_parking UUID;                                                                                                 +
   v_cat_peajes UUID;                                                                                                  +
   v_cat_salud UUID;                                                                                                   +
   v_cat_farmacia UUID;                                                                                                +
   v_cat_gimnasio UUID;                                                                                                +
   v_cat_belleza UUID;                                                                                                 +
   v_cat_ropa UUID;                                                                                                    +
   v_cat_calzado UUID;                                                                                                 +
   v_cat_mascotas UUID;                                                                                                +
   v_cat_educacion UUID;                                                                                               +
   v_cat_ocio UUID;                                                                                                    +
   v_cat_deportes UUID;                                                                                                +
   v_cat_suscripciones UUID;                                                                                           +
   v_cat_regalos UUID;                                                                                                 +
   v_cat_seguros_fin UUID;                                                                                             +
   v_cat_impuestos_fin UUID;                                                                                           +
   v_cat_prestamo_personal UUID;                                                                                       +
   v_cat_reembolso_saldo UUID;                                                                                         +
   v_cat_varios_fin UUID;                                                                                              +
   v_cat_nomina UUID;                                                                                                  +
   v_cat_freelance UUID;                                                                                               +
   v_cat_bonus UUID;                                                                                                   +
   v_cat_inversiones UUID;                                                                                             +
   v_cat_ventas UUID;                                                                                                  +
   v_cat_devoluciones UUID;                                                                                            +
   v_cat_aportacion UUID;                                                                                              +
   v_cat_varios_ing UUID;                                                                                              +
   v_cat_pago_prestamo UUID;                                                                                           +
 BEGIN                                                                                                                 +
   -- ============================================================================                                     +
   -- CATEGORY PARENTS (9 grupos)                                                                                      +
   -- ============================================================================                                     +
                                                                                                                       +
   INSERT INTO category_parents (household_id, name, icon, type, display_order)                                        +
   VALUES (NEW.id, 'Hogar', '🏠', 'expense', 1)                                                                        +
   RETURNING id INTO v_parent_hogar;                                                                                   +
                                                                                                                       +
   INSERT INTO category_parents (household_id, name, icon, type, display_order)                                        +
   VALUES (NEW.id, 'Suministros', '⚡', 'expense', 2)                                                                  +
   RETURNING id INTO v_parent_suministros;                                                                             +
                                                                                                                       +
   INSERT INTO category_parents (household_id, name, icon, type, display_order)                                        +
   VALUES (NEW.id, 'Alimentación', '🍽️', 'expense', 3)                                                                  +
   RETURNING id INTO v_parent_alimentacion;                                                                            +
                                                                                                                       +
   INSERT INTO category_parents (household_id, name, icon, type, display_order)                                        +
   VALUES (NEW.id, 'Transporte', '🚗', 'expense', 4)                                                                   +
   RETURNING id INTO v_parent_transporte;                                                                              +
                                                                                                                       +
   INSERT INTO category_parents (household_id, name, icon, type, display_order)                                        +
   VALUES (NEW.id, 'Personal', '👤', 'expense', 5)                                                                     +
   RETURNING id INTO v_parent_personal;                                                                                +
                                                                                                                       +
   INSERT INTO category_parents (household_id, name, icon, type, display_order)                                        +
   VALUES (NEW.id, 'Estilo de Vida', '🎨', 'expense', 6)                                                               +
   RETURNING id INTO v_parent_estilo_vida;                                                                             +
                                                                                                                       +
   INSERT INTO category_parents (household_id, name, icon, type, display_order)                                        +
   VALUES (NEW.id, 'Finanzas', '💰', 'expense', 7)                                                                     +
   RETURNING id INTO v_parent_finanzas;                                                                                +
                                                                                                                       +
   INSERT INTO category_parents (household_id, name, icon, type, display_order)                                        +
   VALUES (NEW.id, 'Ingresos Laborales', '💼', 'income', 8)                                                            +
   RETURNING id INTO v_parent_ingresos_laborales;                                                                      +
                                                                                                                       +
   INSERT INTO category_parents (household_id, name, icon, type, display_order)                                        +
   VALUES (NEW.id, 'Otros Ingresos', '💵', 'income', 9)                                                                +
   RETURNING id INTO v_parent_otros_ingresos;                                                                          +
                                                                                                                       +
   -- ============================================================================                                     +
   -- HOGAR (6 categorías)                                                                                             +
   -- ============================================================================                                     +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Vivienda', '🏠', 'expense', v_parent_hogar, 1)                                                     +
   RETURNING id INTO v_cat_vivienda;                                                                                   +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Menaje', '🪑', 'expense', v_parent_hogar, 2);                                                      +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Limpieza', '🧹', 'expense', v_parent_hogar, 3);                                                    +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Mantenimiento', '🔧', 'expense', v_parent_hogar, 4);                                               +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Comunidad', '🏢', 'expense', v_parent_hogar, 5);                                                   +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Lavandería', '👕', 'expense', v_parent_hogar, 6)                                                   +
   RETURNING id INTO v_cat_lavanderia;                                                                                 +
                                                                                                                       +
   -- Subcategorías Vivienda (1)                                                                                       +
   INSERT INTO subcategories (category_id, name, icon, display_order)                                                  +
   VALUES (v_cat_vivienda, 'Alquiler', '🏠', 1);                                                                       +
                                                                                                                       +
   -- Subcategorías Lavandería (3)                                                                                     +
   INSERT INTO subcategories (category_id, name, icon, display_order)                                                  +
   VALUES                                                                                                              +
     (v_cat_lavanderia, 'Lavandería Autoservicio', '🧺', 1),                                                           +
     (v_cat_lavanderia, 'Tintorería', '👔', 2),                                                                        +
     (v_cat_lavanderia, 'Lavandería a Domicilio', '🏠', 3);                                                            +
                                                                                                                       +
   -- ============================================================================                                     +
   -- SUMINISTROS (7 categorías + 2 nuevas = 9 categorías)                                                             +
   -- ============================================================================                                     +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Luz', '💡', 'expense', v_parent_suministros, 1)                                                    +
   RETURNING id INTO v_cat_luz;                                                                                        +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Agua', '💧', 'expense', v_parent_suministros, 2)                                                   +
   RETURNING id INTO v_cat_agua;                                                                                       +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Gas/Butano', '🔥', 'expense', v_parent_suministros, 3)                                             +
   RETURNING id INTO v_cat_gas;                                                                                        +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Internet', '📡', 'expense', v_parent_suministros, 4)                                               +
   RETURNING id INTO v_cat_internet;                                                                                   +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Teléfono', '📞', 'expense', v_parent_suministros, 5)                                               +
   RETURNING id INTO v_cat_telefono;                                                                                   +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Seguros', '🛡️', 'expense', v_parent_suministros, 6)                                                 +
   RETURNING id INTO v_cat_seguros_sum;                                                                                +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Impuestos', '📋', 'expense', v_parent_suministros, 7)                                              +
   RETURNING id INTO v_cat_impuestos_sum;                                                                              +
                                                                                                                       +
   -- Subcategorías Luz (5)                                                                                            +
   INSERT INTO subcategories (category_id, name, icon, display_order)                                                  +
   VALUES                                                                                                              +
     (v_cat_luz, 'Iberdrola', '⚡', 1),                                                                                +
     (v_cat_luz, 'Endesa', '💡', 2),                                                                                   +
     (v_cat_luz, 'Naturgy', '🔆', 3),                                                                                  +
     (v_cat_luz, 'Repsol', '⚡', 4),                                                                                   +
     (v_cat_luz, 'Otro proveedor luz', '💡', 5);                                                                       +
                                                                                                                       +
   -- Subcategorías Agua (3)                                                                                           +
   INSERT INTO subcategories (category_id, name, icon, display_order)                                                  +
   VALUES                                                                                                              +
     (v_cat_agua, 'Canal de Isabel II', '💧', 1),                                                                      +
     (v_cat_agua, 'Aguas de Barcelona', '💦', 2),                                                                      +
     (v_cat_agua, 'Otro proveedor agua', '💧', 3);                                                                     +
                                                                                                                       +
   -- Subcategorías Gas/Butano (3)                                                                                     +
   INSERT INTO subcategories (category_id, name, icon, display_order)                                                  +
   VALUES                                                                                                              +
     (v_cat_gas, 'Naturgy Gas', '🔥', 1),                                                                              +
     (v_cat_gas, 'Repsol Gas', '🔥', 2),                                                                               +
     (v_cat_gas, 'Otro proveedor gas', '🔥', 3);                                                                       +
                                                                                                                       +
   -- Subcategorías Internet (6)                                                                                       +
   INSERT INTO subcategories (category_id, name, icon, display_order)                                                  +
   VALUES                                                                                                              +
     (v_cat_internet, 'Movistar Fibra', '📡', 1),                                                                      +
     (v_cat_internet, 'Orange Fibra', '📶', 2),                                                                        +
     (v_cat_internet, 'Vodafone Fibra', '🌐', 3),                                                                      +
     (v_cat_internet, 'MásMóvil Fibra', '📡', 4),                                                                      +
     (v_cat_internet, 'Yoigo Fibra', '📶', 5),                                                                         +
     (v_cat_internet, 'Otro proveedor internet', '📡', 6);                                                             +
                                                                                                                       +
   -- Subcategorías Teléfono (5)                                                                                       +
   INSERT INTO subcategories (category_id, name, icon, display_order)                                                  +
   VALUES                                                                                                              +
     (v_cat_telefono, 'Movistar Móvil', '📱', 1),                                                                      +
     (v_cat_telefono, 'Orange Móvil', '📞', 2),                                                                        +
     (v_cat_telefono, 'Vodafone Móvil', '📲', 3),                                                                      +
     (v_cat_telefono, 'MásMóvil Móvil', '📱', 4),                                                                      +
     (v_cat_telefono, 'Otro operador móvil', '📞', 5);                                                                 +
                                                                                                                       +
   -- ============================================================================                                     +
   -- ALIMENTACIÓN (7 categorías)                                                                                      +
   -- ============================================================================                                     +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Supermercado', '🛒', 'expense', v_parent_alimentacion, 1)                                          +
   RETURNING id INTO v_cat_supermercado;                                                                               +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Carnicería', '🥩', 'expense', v_parent_alimentacion, 2);                                           +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Pescadería', '🐟', 'expense', v_parent_alimentacion, 3);                                           +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Frutería', '🍎', 'expense', v_parent_alimentacion, 4);                                             +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Panadería', '🥖', 'expense', v_parent_alimentacion, 5);                                            +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Otros Alimentos', '🍱', 'expense', v_parent_alimentacion, 6);                                      +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Restaurantes', '🍽️', 'expense', v_parent_alimentacion, 7)                                           +
   RETURNING id INTO v_cat_restaurantes;                                                                               +
                                                                                                                       +
   -- Subcategorías Supermercado (9 - todas unificadas)                                                                +
   INSERT INTO subcategories (category_id, name, icon, display_order)                                                  +
   VALUES                                                                                                              +
     (v_cat_supermercado, 'Mercadona', '🛒', 1),                                                                       +
     (v_cat_supermercado, 'Lidl', '🏪', 2),                                                                            +
     (v_cat_supermercado, 'Carrefour', '🛒', 3),                                                                       +
     (v_cat_supermercado, 'Día', '🏪', 4),                                                                             +
     (v_cat_supermercado, 'Alcampo', '🛒', 5),                                                                         +
     (v_cat_supermercado, 'Ahorramas', '🛒', 6),                                                                       +
     (v_cat_supermercado, 'Eroski', '🛒', 7),                                                                          +
     (v_cat_supermercado, 'Jamón', '🍖', 8),                                                                           +
     (v_cat_supermercado, 'Otros', '🛍️', 9);                                                                            +
                                                                                                                       +
   -- Subcategorías Restaurantes (6)                                                                                   +
   INSERT INTO subcategories (category_id, name, icon, display_order)                                                  +
   VALUES                                                                                                              +
     (v_cat_restaurantes, 'Comida Rápida', '🍔', 1),                                                                   +
     (v_cat_restaurantes, 'Cafetería', '☕', 2),                                                                       +
     (v_cat_restaurantes, 'Restaurante', '🍽️', 3),                                                                      +
     (v_cat_restaurantes, 'Delivery', '🛵', 4),                                                                        +
     (v_cat_restaurantes, 'Tapas/Bar', '🍻', 5),                                                                       +
     (v_cat_restaurantes, 'Otro restaurante', '🍴', 6);                                                                +
                                                                                                                       +
   -- ============================================================================                                     +
   -- TRANSPORTE (4 categorías)                                                                                        +
   -- ============================================================================                                     +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Transporte', '🚗', 'expense', v_parent_transporte, 1)                                              +
   RETURNING id INTO v_cat_transporte;                                                                                 +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Combustible', '⛽', 'expense', v_parent_transporte, 2);                                            +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Parking', '🅿️', 'expense', v_parent_transporte, 3);                                                 +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Peajes', '🛣️', 'expense', v_parent_transporte, 4);                                                  +
                                                                                                                       +
   -- Subcategorías Transporte (12)                                                                                    +
   INSERT INTO subcategories (category_id, name, icon, display_order)                                                  +
   VALUES                                                                                                              +
     (v_cat_transporte, 'Metro', '🚇', 1),                                                                             +
     (v_cat_transporte, 'Autobús', '🚌', 2),                                                                           +
     (v_cat_transporte, 'Tren/Cercanías', '🚆', 3),                                                                    +
     (v_cat_transporte, 'Taxi', '🚕', 4),                                                                              +
     (v_cat_transporte, 'Uber/Cabify', '🚗', 5),                                                                       +
     (v_cat_transporte, 'BiciMAD/Bicing', '🚲', 6),                                                                    +
     (v_cat_transporte, 'Patinete', '🛴', 7),                                                                          +
     (v_cat_transporte, 'Carsharing', '🚙', 8),                                                                        +
     (v_cat_transporte, 'Avión', '✈️', 9),                                                                              +
     (v_cat_transporte, 'Barco/Ferry', '⛴️', 10),                                                                       +
     (v_cat_transporte, 'Alquiler vehículo', '🚗', 11),                                                                +
     (v_cat_transporte, 'Otro transporte', '🚎', 12);                                                                  +
                                                                                                                       +
   -- ============================================================================                                     +
   -- PERSONAL (7 categorías + 2 de SiK = 9 categorías)                                                                +
   -- ============================================================================                                     +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Salud', '🏥', 'expense', v_parent_personal, 1);                                                    +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Farmacia', '💊', 'expense', v_parent_personal, 2);                                                 +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Gimnasio', '🏋️', 'expense', v_parent_personal, 3);                                                  +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Belleza', '💄', 'expense', v_parent_personal, 4);                                                  +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Ropa', '👕', 'expense', v_parent_personal, 5);                                                     +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Calzado', '👟', 'expense', v_parent_personal, 6);                                                  +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Mascotas', '🐶', 'expense', v_parent_personal, 7);                                                 +
                                                                                                                       +
   -- ============================================================================                                     +
   -- ESTILO DE VIDA (8 categorías - incluye las 3 de SiK)                                                             +
   -- ============================================================================                                     +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Educación', '📚', 'expense', v_parent_estilo_vida, 1);                                             +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Ocio', '🎭', 'expense', v_parent_estilo_vida, 2);                                                  +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Deportes', '⚽', 'expense', v_parent_estilo_vida, 3);                                              +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Suscripciones', '📱', 'expense', v_parent_estilo_vida, 4);                                         +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Regalos', '🎁', 'expense', v_parent_estilo_vida, 5);                                               +
                                                                                                                       +
   -- ============================================================================                                     +
   -- FINANZAS (5 categorías - incluye las 4 de SiK + Varios)                                                          +
   -- ============================================================================                                     +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Seguros', '🛡️', 'expense', v_parent_finanzas, 1);                                                   +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Impuestos', '📋', 'expense', v_parent_finanzas, 2);                                                +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Préstamo Personal', '💰', 'expense', v_parent_finanzas, 3);                                        +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Reembolso Saldo a Favor', '↩️', 'expense', v_parent_finanzas, 4);                                   +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Varios', '➕', 'expense', v_parent_finanzas, 5);                                                   +
                                                                                                                       +
   -- ============================================================================                                     +
   -- INGRESOS LABORALES (3 categorías - incluye Bonus de SiK)                                                         +
   -- ============================================================================                                     +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Nómina', '💰', 'income', v_parent_ingresos_laborales, 1);                                          +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Freelance', '💼', 'income', v_parent_ingresos_laborales, 2);                                       +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Bonus', '🎉', 'income', v_parent_ingresos_laborales, 3);                                           +
                                                                                                                       +
   -- ============================================================================                                     +
   -- OTROS INGRESOS (7 categorías - incluye Inversiones y Ventas de SiK)                                              +
   -- ============================================================================                                     +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Inversiones', '📈', 'income', v_parent_otros_ingresos, 1);                                         +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Ventas', '🏷️', 'income', v_parent_otros_ingresos, 2);                                               +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Devoluciones', '↩️', 'income', v_parent_otros_ingresos, 3);                                         +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Aportación Cuenta Conjunta', '🏦', 'income', v_parent_otros_ingresos, 4);                          +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Pago Préstamo', '💸', 'income', v_parent_otros_ingresos, 5);                                       +
                                                                                                                       +
   INSERT INTO categories (household_id, name, icon, type, parent_id, display_order)                                   +
   VALUES (NEW.id, 'Varios', '➕', 'income', v_parent_otros_ingresos, 6);                                              +
                                                                                                                       +
   RETURN NEW;                                                                                                         +
 END;                                                                                                                  +
 $function$                                                                                                            +
 
 CREATE OR REPLACE FUNCTION public.create_default_household_categories(p_household_id uuid)                            +
  RETURNS void                                                                                                         +
  LANGUAGE plpgsql                                                                                                     +
 AS $function$                                                                                                         +
 DECLARE                                                                                                               +
   v_grupo_hogar UUID;                                                                                                 +
   v_grupo_suministros UUID;                                                                                           +
   v_grupo_alimentacion UUID;                                                                                          +
   v_grupo_transporte UUID;                                                                                            +
   v_grupo_ocio UUID;                                                                                                  +
   v_grupo_salud UUID;                                                                                                 +
   v_grupo_educacion UUID;                                                                                             +
   v_grupo_ropa UUID;                                                                                                  +
   v_grupo_otros UUID;                                                                                                 +
                                                                                                                       +
   v_categoria_vivienda UUID;                                                                                          +
   v_categoria_lavanderia UUID;                                                                                        +
   v_categoria_luz UUID;                                                                                               +
   v_categoria_agua UUID;                                                                                              +
   v_categoria_gas UUID;                                                                                               +
   v_categoria_internet UUID;                                                                                          +
   v_categoria_telefono UUID;                                                                                          +
   v_categoria_supermercado UUID;                                                                                      +
   v_categoria_restaurantes UUID;                                                                                      +
   v_categoria_transporte UUID;                                                                                        +
                                                                                                                       +
   -- NEW: Variables for categories without subcategories                                                              +
   v_categoria_comunidad UUID;                                                                                         +
   v_categoria_seguros UUID;                                                                                           +
   v_categoria_impuestos UUID;                                                                                         +
   v_categoria_menaje UUID;                                                                                            +
   v_categoria_limpieza UUID;                                                                                          +
   v_categoria_mantenimiento UUID;                                                                                     +
   v_categoria_ocio UUID;                                                                                              +
   v_categoria_deportes UUID;                                                                                          +
   v_categoria_suscripciones UUID;                                                                                     +
   v_categoria_belleza UUID;                                                                                           +
   v_categoria_mascotas UUID;                                                                                          +
   v_categoria_regalos UUID;                                                                                           +
   v_categoria_varios_ocio UUID;                                                                                       +
   v_categoria_salud UUID;                                                                                             +
   v_categoria_educacion UUID;                                                                                         +
   v_categoria_ropa UUID;                                                                                              +
   v_categoria_calzado UUID;                                                                                           +
   v_categoria_varios_otros UUID;                                                                                      +
                                                                                                                       +
   -- Variables for income categories                                                                                  +
   v_categoria_nomina UUID;                                                                                            +
   v_categoria_freelance UUID;                                                                                         +
   v_categoria_inversiones UUID;                                                                                       +
   v_categoria_ventas UUID;                                                                                            +
   v_categoria_devoluciones UUID;                                                                                      +
   v_categoria_aportacion UUID;                                                                                        +
   v_categoria_bonus UUID;                                                                                             +
   v_categoria_varios_income UUID;                                                                                     +
                                                                                                                       +
 BEGIN                                                                                                                 +
   -- 1. Insert category_parents (grupos)                                                                              +
   INSERT INTO category_parents (household_id, name, icon, type, display_order)                                        +
   VALUES                                                                                                              +
     (p_household_id, 'Hogar', '🏠', 'expense', 1),                                                                    +
     (p_household_id, 'Suministros', '💡', 'expense', 2),                                                              +
     (p_household_id, 'Alimentación', '🍽️', 'expense', 3),                                                              +
     (p_household_id, 'Transporte', '🚗', 'expense', 4),                                                               +
     (p_household_id, 'Ocio', '🎭', 'expense', 5),                                                                     +
     (p_household_id, 'Salud', '🏥', 'expense', 6),                                                                    +
     (p_household_id, 'Educación', '📚', 'expense', 7),                                                                +
     (p_household_id, 'Ropa', '👕', 'expense', 8),                                                                     +
     (p_household_id, 'Otros', '➕', 'expense', 9);                                                                    +
                                                                                                                       +
   -- Get parent IDs                                                                                                   +
   SELECT id INTO v_grupo_hogar FROM category_parents WHERE household_id = p_household_id AND display_order = 1;       +
   SELECT id INTO v_grupo_suministros FROM category_parents WHERE household_id = p_household_id AND display_order = 2; +
   SELECT id INTO v_grupo_alimentacion FROM category_parents WHERE household_id = p_household_id AND display_order = 3;+
   SELECT id INTO v_grupo_transporte FROM category_parents WHERE household_id = p_household_id AND display_order = 4;  +
   SELECT id INTO v_grupo_ocio FROM category_parents WHERE household_id = p_household_id AND display_order = 5;        +
   SELECT id INTO v_grupo_salud FROM category_parents WHERE household_id = p_household_id AND display_order = 6;       +
   SELECT id INTO v_grupo_educacion FROM category_parents WHERE household_id = p_household_id AND display_order = 7;   +
   SELECT id INTO v_grupo_ropa FROM category_parents WHERE household_id = p_household_id AND display_order = 8;        +
   SELECT id INTO v_grupo_otros FROM category_parents WHERE household_id = p_household_id AND display_order = 9;       +
                                                                                                                       +
   -- 2. Insert categories with RETURNING to capture IDs                                                               +
                                                                                                                       +
   -- HOGAR categories                                                                                                 +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_hogar, 'Vivienda', '🏠', 'expense', 1),                                                  +
     (p_household_id, v_grupo_hogar, 'Lavandería', '🧺', 'expense', 4)                                                 +
   RETURNING id INTO v_categoria_vivienda, v_categoria_lavanderia;                                                     +
                                                                                                                       +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_hogar, 'Comunidad', '🏢', 'expense', 2)                                                  +
   RETURNING id INTO v_categoria_comunidad;                                                                            +
                                                                                                                       +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_hogar, 'Seguros', '🛡️', 'expense', 3)                                                     +
   RETURNING id INTO v_categoria_seguros;                                                                              +
                                                                                                                       +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_hogar, 'Impuestos', '📋', 'expense', 5)                                                  +
   RETURNING id INTO v_categoria_impuestos;                                                                            +
                                                                                                                       +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_hogar, 'Menaje', '🪑', 'expense', 6)                                                     +
   RETURNING id INTO v_categoria_menaje;                                                                               +
                                                                                                                       +
   -- SUMINISTROS categories                                                                                           +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_suministros, 'Luz', '💡', 'expense', 1),                                                 +
     (p_household_id, v_grupo_suministros, 'Agua', '��', 'expense', 2),                                                +
     (p_household_id, v_grupo_suministros, 'Gas/Butano', '🔥', 'expense', 3),                                          +
     (p_household_id, v_grupo_suministros, 'Internet', '📡', 'expense', 4),                                            +
     (p_household_id, v_grupo_suministros, 'Teléfono', '📞', 'expense', 5)                                             +
   RETURNING id INTO v_categoria_luz, v_categoria_agua, v_categoria_gas, v_categoria_internet, v_categoria_telefono;   +
                                                                                                                       +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_suministros, 'Limpieza', '🧹', 'expense', 6)                                             +
   RETURNING id INTO v_categoria_limpieza;                                                                             +
                                                                                                                       +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_suministros, 'Mantenimiento', '🔧', 'expense', 7)                                        +
   RETURNING id INTO v_categoria_mantenimiento;                                                                        +
                                                                                                                       +
   -- ALIMENTACIÓN categories                                                                                          +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_alimentacion, 'Supermercado', '🛒', 'expense', 1),                                       +
     (p_household_id, v_grupo_alimentacion, 'Restaurantes', '🍽️', 'expense', 2)                                         +
   RETURNING id INTO v_categoria_supermercado, v_categoria_restaurantes;                                               +
                                                                                                                       +
   -- TRANSPORTE categories                                                                                            +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_transporte, 'Transporte', '🚗', 'expense', 1)                                            +
   RETURNING id INTO v_categoria_transporte;                                                                           +
                                                                                                                       +
   -- OCIO categories                                                                                                  +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_ocio, 'Ocio', '🎭', 'expense', 1)                                                        +
   RETURNING id INTO v_categoria_ocio;                                                                                 +
                                                                                                                       +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_ocio, 'Deportes', '⚽', 'expense', 2)                                                    +
   RETURNING id INTO v_categoria_deportes;                                                                             +
                                                                                                                       +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_ocio, 'Suscripciones', '📱', 'expense', 3)                                               +
   RETURNING id INTO v_categoria_suscripciones;                                                                        +
                                                                                                                       +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_ocio, 'Belleza', '💄', 'expense', 4)                                                     +
   RETURNING id INTO v_categoria_belleza;                                                                              +
                                                                                                                       +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_ocio, 'Mascotas', '🐶', 'expense', 5)                                                    +
   RETURNING id INTO v_categoria_mascotas;                                                                             +
                                                                                                                       +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_ocio, 'Regalos', '🎁', 'expense', 6)                                                     +
   RETURNING id INTO v_categoria_regalos;                                                                              +
                                                                                                                       +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_ocio, 'Varios', '➕', 'expense', 99)                                                     +
   RETURNING id INTO v_categoria_varios_ocio;                                                                          +
                                                                                                                       +
   -- SALUD categories                                                                                                 +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_salud, 'Salud', '🏥', 'expense', 1)                                                      +
   RETURNING id INTO v_categoria_salud;                                                                                +
                                                                                                                       +
   -- EDUCACIÓN categories                                                                                             +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_educacion, 'Educación', '📚', 'expense', 1)                                              +
   RETURNING id INTO v_categoria_educacion;                                                                            +
                                                                                                                       +
   -- ROPA categories                                                                                                  +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_ropa, 'Ropa', '👕', 'expense', 1)                                                        +
   RETURNING id INTO v_categoria_ropa;                                                                                 +
                                                                                                                       +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_ropa, 'Calzado', '👟', 'expense', 2)                                                     +
   RETURNING id INTO v_categoria_calzado;                                                                              +
                                                                                                                       +
   -- OTROS categories                                                                                                 +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, v_grupo_otros, 'Varios', '➕', 'expense', 99)                                                    +
   RETURNING id INTO v_categoria_varios_otros;                                                                         +
                                                                                                                       +
   -- INCOME categories (no parent_id)                                                                                 +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, NULL, 'Nómina', '💰', 'income', 1)                                                               +
   RETURNING id INTO v_categoria_nomina;                                                                               +
                                                                                                                       +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, NULL, 'Freelance', '💼', 'income', 2)                                                            +
   RETURNING id INTO v_categoria_freelance;                                                                            +
                                                                                                                       +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, NULL, 'Inversiones', '📈', 'income', 3)                                                          +
   RETURNING id INTO v_categoria_inversiones;                                                                          +
                                                                                                                       +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, NULL, 'Ventas', '🏷️', 'income', 4)                                                                +
   RETURNING id INTO v_categoria_ventas;                                                                               +
                                                                                                                       +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, NULL, 'Devoluciones', '↩️', 'income', 5)                                                          +
   RETURNING id INTO v_categoria_devoluciones;                                                                         +
                                                                                                                       +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, NULL, 'Aportación Cuenta Conjunta', '🏦', 'income', 6)                                           +
   RETURNING id INTO v_categoria_aportacion;                                                                           +
                                                                                                                       +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, NULL, 'Bonus', '🎉', 'income', 7)                                                                +
   RETURNING id INTO v_categoria_bonus;                                                                                +
                                                                                                                       +
   INSERT INTO categories (household_id, parent_id, name, icon, type, display_order)                                   +
   VALUES                                                                                                              +
     (p_household_id, NULL, 'Varios', '➕', 'income', 99)                                                              +
   RETURNING id INTO v_categoria_varios_income;                                                                        +
                                                                                                                       +
   -- 3. Insert subcategories (EXISTING + NEW "Otros" for all)                                                         +
                                                                                                                       +
   -- Vivienda subcategories (existing + Otros)                                                                        +
   INSERT INTO subcategories (category_id, name, icon, display_order)                                                  +
   VALUES                                                                                                              +
     (v_categoria_vivienda, 'Alquiler', '🏠', 0),                                                                      +
     (v_categoria_vivienda, 'Comunidad', '🏢', 1),                                                                     +
     (v_categoria_vivienda, 'Alquiler + Comunidad', '🏠', 2),                                                          +
     (v_categoria_vivienda, 'Otros', '📦', 99);                                                                        +
                                                                                                                       +
   -- Lavandería subcategories (existing + Otros)                                                                      +
   INSERT INTO subcategories (category_id, name, icon, display_order)                                                  +
   VALUES                                                                                                              +
     (v_categoria_lavanderia, 'Lavandería', '🧺', 1),                                                                  +
     (v_categoria_lavanderia, 'Tintorería', '👔', 2),                                                                  +
     (v_categoria_lavanderia, 'Planchado', '👕', 3),                                                                   +
     (v_categoria_lavanderia, 'Otros', '📦', 99);                                                                      +
                                                                                                                       +
   -- Luz subcategories (existing)                                                                                     +
   INSERT INTO subcategories (category_id, name, icon, display_order)                                                  +
   VALUES                                                                                                              +
     (v_categoria_luz, 'Iberdrola', '⚡', 1),                                                                          +
     (v_categoria_luz, 'Endesa', '⚡', 2),                                                                             +
     (v_categoria_luz, 'Naturgy', '⚡', 3),                                                                            +
     (v_categoria_luz, 'Repsol', '⚡', 4),                                                                             +
     (v_categoria_luz, 'Otros', '⚡', 99);                                                                             +
                                                                                                                       +
   -- Agua subcategories (existing)                                                                                    +
   INSERT INTO subcategories (category_id, name, icon, display_order)                                                  +
   VALUES                                                                                                              +
     (v_categoria_agua, 'Canal Isabel II', '💧', 1),                                                                   +
     (v_categoria_agua, 'Agbar', '💧', 2),                                                                             +
     (v_categoria_agua, 'Otros', '💧', 99);                                                                            +
                                                                                                                       +
   -- Gas subcategories (existing)                                                                                     +
   INSERT INTO subcategories (category_id, name, icon, display_order)                                                  +
   VALUES                                                                                                              +
     (v_categoria_gas, 'Butano', '⛽', 1),                                                                             +
     (v_categoria_gas, 'Gas Natural', '🔥', 2),                                                                        +
     (v_categoria_gas, 'Otros', '⛽', 99);                                                                             +
                                                                                                                       +
   -- Internet subcategories (existing)                                                                                +
   INSERT INTO subcategories (category_id, name, icon, display_order)                                                  +
   VALUES                                                                                                              +
     (v_categoria_internet, 'Vodafone', '📡', 1),                                                                      +
     (v_categoria_internet, 'Movistar', '📡', 2),                                                                      +
     (v_categoria_internet, 'Orange', '📡', 3),                                                                        +
     (v_categoria_internet, 'Yoigo', '📡', 4),                                                                         +
     (v_categoria_internet, 'MásMóvil', '📡', 5),                                                                      +
     (v_categoria_internet, 'Otros', '📡', 99);                                                                        +
                                                                                                                       +
   -- Teléfono subcategories (existing)                                                                                +
   INSERT INTO subcategories (category_id, name, icon, display_order)                                                  +
   VALUES                                                                                                              +
     (v_categoria_telefono, 'Vodafone', '📱', 1),                                                                      +
     (v_categoria_telefono, 'Movistar', '📱', 2),                                                                      +
     (v_categoria_telefono, 'Orange', '📱', 3),                                                                        +
     (v_categoria_telefono, 'Yoigo', '📱', 4),                                                                         +
     (v_categoria_telefono, 'Otros', '📱', 99);                                                                        +
                                                                                                                       +
   -- Supermercado subcategories (existing + Otros)                                                                    +
   INSERT INTO subcategories (category_id, name, icon, display_order)                                                  +
   VALUES                                                                                                              +
     (v_categoria_supermercado, 'Mercadona', '🛒', 1),                                                                 +
     (v_categoria_supermercado, 'Día', '🏪', 2),                                                                       +
     (v_categoria_supermercado, 'Jamón', '🍖', 3),                                                                     +
     (v_categoria_supermercado, 'Lidl', '🏪', 4),                                                                      +
     (v_categoria_supermercado, 'Carrefour', '🛒', 5),                                                                 +
     (v_categoria_supermercado, 'Alcampo', '🛒', 6),                                                                   +
     (v_categoria_supermercado, 'Ahorramas', '🛒', 7),                                                                 +
     (v_categoria_supermercado, 'Eroski', '🛒', 8),                                                                    +
     (v_categoria_supermercado, 'Otros', '��️', 9);                                                                     +
                                                                                                                       +
   -- Restaurantes subcategories (existing)                                                                            +
   INSERT INTO subcategories (category_id, name, icon, display_order)                                                  +
   VALUES                                                                                                              +
     (v_categoria_restaurantes, 'Fast Food', '🍟', 1),                                                                 +
     (v_categoria_restaurantes, 'Cafetería', '☕', 2),                                                                 +
     (v_categoria_restaurantes, 'Restaurante Medio', '🍽️', 3),                                                          +
     (v_categoria_restaurantes, 'Restaurante Alto', '👨‍🍳', 4),                                                        +
     (v_categoria_restaurantes, 'Delivery', '📦', 5),                                                                  +
     (v_categoria_restaurantes, 'Otros', '🍴', 99);                                                                    +
                                                                                                                       +
   -- Transporte subcategories (existing)                                                                              +
   INSERT INTO subcategories (category_id, name, icon, display_order)                                                  +
   VALUES                                                                                                              +
     (v_categoria_transporte, 'Gasolina', '⛽', 1),                                                                    +
     (v_categoria_transporte, 'Diesel', '⛽', 2),                                                                      +
     (v_categoria_transporte, 'Eléctrico', '🔌', 3),                                                                   +
     (v_categoria_transporte, 'Metro', '🚇', 4),                                                                       +
     (v_categoria_transporte, 'Bus', '🚌', 5),                                                                         +
     (v_categoria_transporte, 'Taxi/VTC', '🚕', 6),                                                                    +
     (v_categoria_transporte, 'Parking', '🅿️', 7),                                                                      +
     (v_categoria_transporte, 'Peajes', '🛣️', 8),                                                                       +
     (v_categoria_transporte, 'Mantenimiento Vehículo', '🔧', 9),                                                      +
     (v_categoria_transporte, 'ITV', '🔍', 10),                                                                        +
     (v_categoria_transporte, 'Seguro Coche', '🛡️', 11),                                                                +
     (v_categoria_transporte, 'Otros', '🚗', 99);                                                                      +
                                                                                                                       +
   -- ============================================================                                                     +
   -- NEW: Add "Otros" subcategory to ALL categories without any                                                       +
   -- ============================================================                                                     +
                                                                                                                       +
   INSERT INTO subcategories (category_id, name, icon, display_order)                                                  +
   VALUES                                                                                                              +
     (v_categoria_comunidad, 'Otros', '📦', 99),                                                                       +
     (v_categoria_seguros, 'Otros', '📦', 99),                                                                         +
     (v_categoria_impuestos, 'Otros', '📦', 99),                                                                       +
     (v_categoria_menaje, 'Otros', '📦', 99),                                                                          +
     (v_categoria_limpieza, 'Otros', '📦', 99),                                                                        +
     (v_categoria_mantenimiento, 'Otros', '📦', 99),                                                                   +
     (v_categoria_ocio, 'Otros', '📦', 99),                                                                            +
     (v_categoria_deportes, 'Otros', '📦', 99),                                                                        +
     (v_categoria_suscripciones, 'Otros', '📦', 99),                                                                   +
     (v_categoria_belleza, 'Otros', '📦', 99),                                                                         +
     (v_categoria_mascotas, 'Otros', '📦', 99),                                                                        +
     (v_categoria_regalos, 'Otros', '📦', 99),                                                                         +
     (v_categoria_varios_ocio, 'Otros', '📦', 99),                                                                     +
     (v_categoria_salud, 'Otros', '📦', 99),                                                                           +
     (v_categoria_educacion, 'Otros', '📦', 99),                                                                       +
     (v_categoria_ropa, 'Otros', '📦', 99),                                                                            +
     (v_categoria_calzado, 'Otros', '📦', 99),                                                                         +
     (v_categoria_varios_otros, 'Otros', '📦', 99),                                                                    +
     (v_categoria_nomina, 'Otros', '📦', 99),                                                                          +
     (v_categoria_freelance, 'Otros', '📦', 99),                                                                       +
     (v_categoria_inversiones, 'Otros', '📦', 99),                                                                     +
     (v_categoria_ventas, 'Otros', '📦', 99),                                                                          +
     (v_categoria_devoluciones, 'Otros', '📦', 99),                                                                    +
     (v_categoria_aportacion, 'Otros', '📦', 99),                                                                      +
     (v_categoria_bonus, 'Otros', '📦', 99),                                                                           +
     (v_categoria_varios_income, 'Otros', '📦', 99);                                                                   +
                                                                                                                       +
   RAISE NOTICE '✅ 9 grupos | 50 categorías | 79 subcategorías (55 existing + 24 new Otros)';                         +
 END;                                                                                                                  +
 $function$                                                                                                            +
 
(2 rows)

