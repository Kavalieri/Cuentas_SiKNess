-- Migración: Agregar "Aportación Cuenta Conjunta" a categorías por defecto
-- Fecha: 2025-10-06 17:00:00
-- Problema: Las contribuciones usaban "Nómina" pero el req es usar "Aportación Cuenta Conjunta"
-- Solución: Actualizar función create_default_categories para incluir esta categoría

-- DROP y recrear función (por si la firma cambió)
DROP FUNCTION IF EXISTS create_default_categories(uuid);

-- Reemplazar función con categoría "Aportación Cuenta Conjunta" 🏦
CREATE OR REPLACE FUNCTION create_default_categories(p_household_id uuid)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Categorías de gastos (expense) - 8 básicas
  INSERT INTO categories (household_id, name, icon, type) VALUES
    (p_household_id, 'Vivienda', '🏠', 'expense'),
    (p_household_id, 'Luz', '💡', 'expense'),
    (p_household_id, 'Internet', '🌐', 'expense'),
    (p_household_id, 'Supermercado', '🛒', 'expense'),
    (p_household_id, 'Butano', '🔥', 'expense'),
    (p_household_id, 'Transporte', '🚗', 'expense'),
    (p_household_id, 'Ocio', '🎉', 'expense'),
    (p_household_id, 'Salud', '💊', 'expense')
  ON CONFLICT (household_id, name, type) DO NOTHING;

  -- Categorías de ingresos (income) - 3 esenciales
  INSERT INTO categories (household_id, name, icon, type) VALUES
    (p_household_id, 'Nómina', '💰', 'income'),
    (p_household_id, 'Aportación Cuenta Conjunta', '🏦', 'income'),  -- ⭐ NUEVA - Para contribuciones
    (p_household_id, 'Extra', '🎁', 'income')
  ON CONFLICT (household_id, name, type) DO NOTHING;

  RAISE NOTICE '[create_default_categories] Created default categories for household %', p_household_id;
END;
$$;

COMMENT ON FUNCTION create_default_categories(uuid) IS
  'Crea categorías por defecto para nuevo household. Incluye "Aportación Cuenta Conjunta" para contribuciones.';

-- Para households existentes, crear la categoría si no existe
DO $$
DECLARE
  v_household RECORD;
BEGIN
  FOR v_household IN SELECT DISTINCT id FROM households LOOP
    INSERT INTO categories (household_id, name, icon, type)
    VALUES (v_household.id, 'Aportación Cuenta Conjunta', '🏦', 'income')
    ON CONFLICT (household_id, name, type) DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Added "Aportación Cuenta Conjunta" to existing households';
END $$;
