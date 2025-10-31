-- Añade subcategoría "Jamón" a la categoría "Supermercado"
-- Fecha: $(date +%Y-%m-%d)

DO $$
DECLARE
  v_supermercado_id UUID;
BEGIN
  -- Obtener el ID de la categoría "Supermercado" 
  SELECT id INTO v_supermercado_id
  FROM categories
  WHERE name = 'Supermercado'
  LIMIT 1;

  -- Insertar la subcategoría "Jamón" si no existe
  IF v_supermercado_id IS NOT NULL THEN
    INSERT INTO subcategories (category_id, name, icon, display_order)
    VALUES (v_supermercado_id, 'Jamón', '🍖', 999)
    ON CONFLICT (category_id, name) DO NOTHING;
    
    RAISE NOTICE '✅ Subcategoría "Jamón" añadida a "Supermercado"';
  ELSE
    RAISE NOTICE '⚠️ No se encontró la categoría "Supermercado"';
  END IF;
END $$;
