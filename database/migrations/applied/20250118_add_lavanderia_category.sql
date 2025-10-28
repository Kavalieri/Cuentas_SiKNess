-- =====================================================
-- MIGRACIÓN: Añadir categoría "Lavandería"
-- =====================================================
-- Fecha: 2025-01-18
-- Autor: Sistema CuentasSiK
-- Descripción: Añade categoría "Lavandería" (expense) a todos los
--              hogares existentes y actualiza el trigger para que
--              los hogares nuevos también la tengan.
--
-- Aplicación:
--   1. Añade categoría a hogares existentes si no existe
--   2. Modifica función create_default_household_categories()
--      para incluir Lavandería en trigger de nuevos hogares
-- =====================================================

BEGIN;

-- =====================================================
-- PASO 1: Añadir "Lavandería" a hogares existentes
-- =====================================================

INSERT INTO categories (household_id, name, icon, type, created_at)
SELECT
  h.id AS household_id,
  'Lavandería' AS name,
  '🧺' AS icon,
  'expense' AS type,
  NOW() AS created_at
FROM households h
WHERE NOT EXISTS (
  SELECT 1 FROM categories c
  WHERE c.household_id = h.id
    AND c.name = 'Lavandería'
    AND c.type = 'expense'
)
AND h.deleted_at IS NULL;  -- Solo hogares activos

-- Log de hogares actualizados
DO $$
DECLARE
  v_added_count INT;
BEGIN
  SELECT COUNT(DISTINCT household_id) INTO v_added_count
  FROM categories
  WHERE name = 'Lavandería' AND type = 'expense';

  RAISE NOTICE 'Categoría "Lavandería" añadida/verificada en % hogares', v_added_count;
END $$;

-- =====================================================
-- PASO 2: Actualizar función de trigger para nuevos hogares
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_default_household_categories()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Préstamo Personal (expense)
  IF NOT EXISTS (
    SELECT 1 FROM categories c
    WHERE c.household_id = NEW.id
      AND c.name = 'Préstamo Personal'
      AND (c.type = 'expense' OR c.type IS NULL)
  ) THEN
    INSERT INTO categories (household_id, name, icon, type, created_at)
    VALUES (NEW.id, 'Préstamo Personal', '💰', 'expense', NOW());
  END IF;

  -- Pago Préstamo (income)
  IF NOT EXISTS (
    SELECT 1 FROM categories c
    WHERE c.household_id = NEW.id
      AND c.name = 'Pago Préstamo'
      AND (c.type = 'income' OR c.type IS NULL)
  ) THEN
    INSERT INTO categories (household_id, name, icon, type, created_at)
    VALUES (NEW.id, 'Pago Préstamo', '💳', 'income', NOW());
  END IF;

  -- Reembolso Saldo a Favor (expense)
  IF NOT EXISTS (
    SELECT 1 FROM categories c
    WHERE c.household_id = NEW.id
      AND c.name = 'Reembolso Saldo a Favor'
      AND (c.type = 'expense' OR c.type IS NULL)
  ) THEN
    INSERT INTO categories (household_id, name, icon, type, created_at)
    VALUES (NEW.id, 'Reembolso Saldo a Favor', '↩️', 'expense', NOW());
  END IF;

  -- Lavandería (expense) ← NUEVO
  IF NOT EXISTS (
    SELECT 1 FROM categories c
    WHERE c.household_id = NEW.id
      AND c.name = 'Lavandería'
      AND (c.type = 'expense' OR c.type IS NULL)
  ) THEN
    INSERT INTO categories (household_id, name, icon, type, created_at)
    VALUES (NEW.id, 'Lavandería', '🧺', 'expense', NOW());
  END IF;

  RETURN NEW;
END;
$$;

-- Verificar que el trigger existe (debe haberse creado en migración anterior)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_create_default_categories'
  ) THEN
    -- Crear trigger si no existe
    CREATE TRIGGER trigger_create_default_categories
      AFTER INSERT ON public.households
      FOR EACH ROW
      EXECUTE FUNCTION public.create_default_household_categories();

    RAISE NOTICE 'Trigger creado: trigger_create_default_categories';
  ELSE
    RAISE NOTICE 'Trigger ya existe: trigger_create_default_categories';
  END IF;
END $$;

-- =====================================================
-- PASO 3: Registrar migración
-- =====================================================

INSERT INTO _migrations (migration_name, description, applied_at)
VALUES (
  '20250118_add_lavanderia_category.sql',
  'Añade categoría Lavandería (expense) a hogares existentes y actualiza trigger para nuevos hogares',
  NOW()
)
ON CONFLICT (migration_name) DO NOTHING;

COMMIT;

-- =====================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =====================================================

-- Verificar que todos los hogares activos tienen la categoría
DO $$
DECLARE
  v_households_count INT;
  v_with_lavanderia INT;
BEGIN
  SELECT COUNT(*) INTO v_households_count
  FROM households
  WHERE deleted_at IS NULL;

  SELECT COUNT(DISTINCT household_id) INTO v_with_lavanderia
  FROM categories
  WHERE name = 'Lavandería' AND type = 'expense';

  IF v_households_count = v_with_lavanderia THEN
    RAISE NOTICE '✅ Verificación OK: Todos los % hogares tienen categoría Lavandería', v_households_count;
  ELSE
    RAISE WARNING '⚠️ Discrepancia: % hogares activos, % tienen Lavandería', v_households_count, v_with_lavanderia;
  END IF;
END $$;

-- Query para verificar manualmente (opcional)
-- SELECT h.id, h.name,
--        EXISTS(SELECT 1 FROM categories c WHERE c.household_id = h.id AND c.name = 'Lavandería') as tiene_lavanderia
-- FROM households h
-- WHERE h.deleted_at IS NULL
-- ORDER BY h.created_at DESC;
