-- Migration: Fix contributions to distinguish NULL (not configured) from 0 (configured as zero)
-- Description: Miembros sin ingresos configurados deben aparecer como "Pendiente configuración"
--              en lugar de "Aportado 0€ de 0€"
-- Date: 2025-10-06

-- ========================================================================
-- 1. FIX get_member_income: Retornar NULL si no hay configuración
-- ========================================================================

CREATE OR REPLACE FUNCTION get_member_income(
  p_household_id UUID,
  p_profile_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_income NUMERIC;
  v_exists BOOLEAN;
BEGIN
  -- Verificar si existe al menos un registro de income para este miembro
  SELECT EXISTS (
    SELECT 1 
    FROM member_incomes
    WHERE household_id = p_household_id
      AND profile_id = p_profile_id
  ) INTO v_exists;

  -- Si NO existe ningún registro, retornar NULL (sin configurar)
  IF NOT v_exists THEN
    RETURN NULL;
  END IF;

  -- Si existe, buscar el income vigente en la fecha
  SELECT monthly_income
  INTO v_income
  FROM member_incomes
  WHERE household_id = p_household_id
    AND profile_id = p_profile_id
    AND effective_from <= p_date
  ORDER BY effective_from DESC
  LIMIT 1;
  
  -- Retornar el income encontrado (puede ser 0, que es válido)
  -- Si no hay income vigente en la fecha pero SÍ hay registros, retornar 0
  RETURN COALESCE(v_income, 0);
END;
$$;

COMMENT ON FUNCTION get_member_income IS 
'Gets the member monthly income effective at the specified date.
Returns NULL if no income is configured for the member (never set).
Returns 0 or positive number if income is configured (including 0 for unemployed).';

-- ========================================================================
-- 2. UPDATE calculate_monthly_contributions: Manejar NULL correctamente
-- ========================================================================

CREATE OR REPLACE FUNCTION calculate_monthly_contributions(
  p_household_id UUID,
  p_year INT,
  p_month INT
)
RETURNS TABLE (
  profile_id UUID,
  expected_amount NUMERIC
) AS $$
DECLARE
  v_goal NUMERIC;
  v_calculation_type TEXT;
  v_total_income NUMERIC;
  v_member_count INT;
  v_configured_count INT;
BEGIN
  -- Get household settings
  SELECT 
    monthly_contribution_goal,
    calculation_type
  INTO v_goal, v_calculation_type
  FROM household_settings
  WHERE household_id = p_household_id;

  IF v_goal IS NULL THEN
    RAISE EXCEPTION 'Household settings not configured';
  END IF;

  -- Count total members
  SELECT COUNT(*) INTO v_member_count
  FROM household_members
  WHERE household_id = p_household_id;

  IF v_member_count = 0 THEN
    RAISE EXCEPTION 'No members in household';
  END IF;

  -- Calculate based on type
  IF v_calculation_type = 'equal' THEN
    -- Equal split: goal / member_count (sin importar si tienen income configurado)
    RETURN QUERY
    SELECT 
      hm.profile_id,
      ROUND(v_goal / v_member_count, 2) AS expected_amount
    FROM household_members hm
    WHERE hm.household_id = p_household_id;

  ELSIF v_calculation_type = 'proportional' THEN
    -- Proportional to income
    
    -- Count members WITH income configured (income IS NOT NULL)
    SELECT COUNT(*) INTO v_configured_count
    FROM household_members hm
    WHERE hm.household_id = p_household_id
      AND get_member_income(p_household_id, hm.profile_id, CURRENT_DATE) IS NOT NULL;

    -- Get total income (solo de miembros configurados)
    SELECT COALESCE(SUM(get_member_income(p_household_id, hm.profile_id, CURRENT_DATE)), 0)
    INTO v_total_income
    FROM household_members hm
    WHERE hm.household_id = p_household_id
      AND get_member_income(p_household_id, hm.profile_id, CURRENT_DATE) IS NOT NULL;

    -- Si NO hay miembros configurados, lanzar excepción
    IF v_configured_count = 0 THEN
      RAISE EXCEPTION 'No incomes configured. All members must configure their income before calculating proportional contributions.';
    END IF;

    -- Si total_income = 0 pero HAY miembros configurados, todos aportan igual
    -- (caso: todos desempleados/estudiantes)
    IF v_total_income = 0 THEN
      RETURN QUERY
      SELECT 
        hm.profile_id,
        CASE 
          -- Miembros configurados aportan igual
          WHEN get_member_income(p_household_id, hm.profile_id, CURRENT_DATE) IS NOT NULL 
          THEN ROUND(v_goal / v_configured_count, 2)
          -- Miembros sin configurar: NULL (pendiente)
          ELSE NULL
        END AS expected_amount
      FROM household_members hm
      WHERE hm.household_id = p_household_id;
    ELSE
      -- Calculate proportional contributions
      RETURN QUERY
      SELECT 
        hm.profile_id,
        CASE 
          -- Miembros configurados: proporción según ingresos
          WHEN get_member_income(p_household_id, hm.profile_id, CURRENT_DATE) IS NOT NULL 
          THEN ROUND(
            (get_member_income(p_household_id, hm.profile_id, CURRENT_DATE) / v_total_income) * v_goal,
            2
          )
          -- Miembros sin configurar: NULL (pendiente configuración)
          ELSE NULL
        END AS expected_amount
      FROM household_members hm
      WHERE hm.household_id = p_household_id;
    END IF;

  ELSIF v_calculation_type = 'custom' THEN
    -- Custom percentages (future implementation)
    -- For now, fall back to equal split
    RETURN QUERY
    SELECT 
      hm.profile_id,
      ROUND(v_goal / v_member_count, 2) AS expected_amount
    FROM household_members hm
    WHERE hm.household_id = p_household_id;

  ELSE
    RAISE EXCEPTION 'Invalid calculation_type: %', v_calculation_type;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_monthly_contributions IS 
'Calculates monthly contributions for household members.
Returns NULL for expected_amount if member has not configured income yet.
Handles proportional calculation correctly when some members have 0 income (unemployed).';

-- ========================================================================
-- 3. UPDATE auto_calculate_contributions: Insertar NULL cuando corresponda
-- ========================================================================

-- La función de auto-cálculo ya maneja NULL correctamente porque
-- simplemente inserta los valores que retorna calculate_monthly_contributions

COMMENT ON TABLE contributions IS 
'Monthly contributions tracking.
expected_amount can be NULL if member income is not configured yet.
Status should be "pending_configuration" for NULL expected_amount.';
