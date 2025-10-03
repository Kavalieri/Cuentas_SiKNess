-- Asegurar que create_default_categories está disponible como función permanente
-- Esta función se llama automáticamente al crear cualquier household

CREATE OR REPLACE FUNCTION create_default_categories(p_household_id uuid)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Categorías de gastos (expense)
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

  -- Categorías de ingresos (income)
  INSERT INTO categories (household_id, name, icon, type) VALUES
    (p_household_id, 'Nómina', '💰', 'income'),
    (p_household_id, 'Extra', '🎁', 'income')
  ON CONFLICT (household_id, name, type) DO NOTHING;

  RAISE NOTICE '[create_default_categories] Created default categories for household %', p_household_id;
END;
$$;

COMMENT ON FUNCTION create_default_categories(uuid) IS
  'Crea las categorías por defecto (stock) para un household. Llamada automáticamente al crear household.';

GRANT EXECUTE ON FUNCTION create_default_categories(uuid) TO authenticated;
