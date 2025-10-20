-- Añade categorías por defecto para gestión de crédito/deuda en hogares nuevos
-- ESTRUCTURA SOLAMENTE: funciones y trigger (sin tocar datos existentes)

SET ROLE cuentassik_dev_owner;

-- Función de trigger: crea las categorías si no existen ya
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

  RETURN NEW;
END;
$$;

-- Trigger que ejecuta la función al crear un hogar
DROP TRIGGER IF EXISTS trigger_create_default_categories ON public.households;
CREATE TRIGGER trigger_create_default_categories
AFTER INSERT ON public.households
FOR EACH ROW
EXECUTE FUNCTION public.create_default_household_categories();

RESET ROLE;
