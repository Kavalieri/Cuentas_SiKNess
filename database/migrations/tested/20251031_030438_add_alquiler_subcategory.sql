-- Migración: Agregar subcategoría "Alquiler" a Hogar > Vivienda
-- Fecha: 2025-10-31
-- Descripción: Añade la subcategoría "Alquiler" con emoji 🏠 a todas las categorías Vivienda existentes.

BEGIN;

DO $$
DECLARE
  v_category_record RECORD;
  v_max_display_order INT;
  v_inserted_count INT := 0;
BEGIN
  -- Iterar sobre todas las categorías "Vivienda" de todos los hogares
  FOR v_category_record IN
    SELECT c.id as category_id, c.household_id, c.name
    FROM categories c
    JOIN category_parents p ON c.parent_id = p.id
    WHERE p.name = 'Hogar'
      AND c.name = 'Vivienda'
    ORDER BY c.household_id
  LOOP
    -- Obtener el siguiente display_order para subcategorías de esta categoría
    SELECT COALESCE(MAX(display_order), -1) + 1 INTO v_max_display_order
    FROM subcategories
    WHERE category_id = v_category_record.category_id;

    -- Insertar subcategoría "Alquiler" (ON CONFLICT DO NOTHING evita duplicados)
    INSERT INTO subcategories (
      id,
      category_id,
      name,
      icon,
      display_order,
      created_at
    ) VALUES (
      gen_random_uuid(),
      v_category_record.category_id,
      'Alquiler',
      '🏠',
      v_max_display_order,
      NOW()
    )
    ON CONFLICT (category_id, name) DO NOTHING;

    IF FOUND THEN
      v_inserted_count := v_inserted_count + 1;
      RAISE NOTICE 'Subcategoría "Alquiler" agregada a categoría % del hogar %',
        v_category_record.category_id,
        COALESCE(v_category_record.household_id::TEXT, 'TEMPLATE');
    ELSE
      RAISE NOTICE 'Subcategoría "Alquiler" ya existe en categoría % del hogar %',
        v_category_record.category_id,
        COALESCE(v_category_record.household_id::TEXT, 'TEMPLATE');
    END IF;
  END LOOP;

  RAISE NOTICE 'Migración completada: % subcategorías "Alquiler" agregadas', v_inserted_count;
END $$;

COMMIT;

-- Verificación: Mostrar todas las subcategorías "Alquiler" agregadas
SELECT
  c.household_id,
  p.name as grupo,
  c.name as categoria,
  s.name as subcategoria,
  s.icon as emoji,
  s.display_order
FROM subcategories s
JOIN categories c ON s.category_id = c.id
JOIN category_parents p ON c.parent_id = p.id
WHERE s.name = 'Alquiler'
  AND p.name = 'Hogar'
  AND c.name = 'Vivienda'
ORDER BY c.household_id, s.display_order;
