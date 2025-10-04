-- Actualizar funciones de pre_payments para usar profile_id
-- Arregla error: column "user_id" does not exist

-- 1. Actualizar calculate_pre_payment_amount
CREATE OR REPLACE FUNCTION calculate_pre_payment_amount(
  p_contribution_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_household_id UUID;
  v_profile_id UUID;
  v_month INT;
  v_year INT;
  v_total NUMERIC;
BEGIN
  -- Obtener datos de la contribución
  SELECT household_id, profile_id, month, year
  INTO v_household_id, v_profile_id, v_month, v_year
  FROM contributions
  WHERE id = p_contribution_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Sumar todos los pre-pagos del usuario para ese mes/año
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total
  FROM pre_payments
  WHERE household_id = v_household_id
    AND profile_id = v_profile_id
    AND month = v_month
    AND year = v_year;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Actualizar trigger function update_contribution_pre_payment_amount
CREATE OR REPLACE FUNCTION update_contribution_pre_payment_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_contribution_id UUID;
  v_new_total NUMERIC;
BEGIN
  -- Buscar la contribución correspondiente
  SELECT id INTO v_contribution_id
  FROM contributions
  WHERE household_id = NEW.household_id
    AND profile_id = NEW.profile_id
    AND month = NEW.month
    AND year = NEW.year;

  IF FOUND THEN
    -- Calcular nuevo total de pre-pagos
    v_new_total := calculate_pre_payment_amount(v_contribution_id);
    
    -- Actualizar la contribución
    UPDATE contributions
    SET pre_payment_amount = v_new_total,
        updated_at = now()
    WHERE id = v_contribution_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_pre_payment_amount IS 'Calcula el total de pre-pagos para una contribución usando profile_id';
COMMENT ON FUNCTION update_contribution_pre_payment_amount IS 'Trigger function que actualiza pre_payment_amount usando profile_id';
