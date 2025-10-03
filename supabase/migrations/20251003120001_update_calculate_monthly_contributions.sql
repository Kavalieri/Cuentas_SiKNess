-- Update calculate_monthly_contributions function to support different calculation types

-- Drop existing function first
DROP FUNCTION IF EXISTS calculate_monthly_contributions(UUID, INT, INT);

CREATE OR REPLACE FUNCTION calculate_monthly_contributions(
  p_household_id UUID,
  p_year INT,
  p_month INT
)
RETURNS TABLE (
  user_id UUID,
  expected_amount NUMERIC
) AS $$
DECLARE
  v_goal NUMERIC;
  v_calculation_type TEXT;
  v_total_income NUMERIC;
  v_member_count INT;
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

  -- Count members
  SELECT COUNT(*) INTO v_member_count
  FROM household_members
  WHERE household_id = p_household_id;

  IF v_member_count = 0 THEN
    RAISE EXCEPTION 'No members in household';
  END IF;

  -- Calculate based on type
  IF v_calculation_type = 'equal' THEN
    -- Equal split: goal / member_count
    RETURN QUERY
    SELECT 
      hm.user_id,
      ROUND(v_goal / v_member_count, 2) AS expected_amount
    FROM household_members hm
    WHERE hm.household_id = p_household_id;

  ELSIF v_calculation_type = 'proportional' THEN
    -- Proportional to income
    -- Get total income
    SELECT COALESCE(SUM(get_member_income(p_household_id, hm.user_id, CURRENT_DATE)), 0)
    INTO v_total_income
    FROM household_members hm
    WHERE hm.household_id = p_household_id;

    IF v_total_income = 0 THEN
      RAISE EXCEPTION 'No incomes configured for proportional calculation';
    END IF;

    -- Calculate proportional contributions
    RETURN QUERY
    SELECT 
      hm.user_id,
      ROUND(
        (get_member_income(p_household_id, hm.user_id, CURRENT_DATE) / v_total_income) * v_goal,
        2
      ) AS expected_amount
    FROM household_members hm
    WHERE hm.household_id = p_household_id;

  ELSIF v_calculation_type = 'custom' THEN
    -- Custom percentages (future implementation)
    -- For now, fall back to equal split
    RETURN QUERY
    SELECT 
      hm.user_id,
      ROUND(v_goal / v_member_count, 2) AS expected_amount
    FROM household_members hm
    WHERE hm.household_id = p_household_id;

  ELSE
    RAISE EXCEPTION 'Invalid calculation_type: %', v_calculation_type;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_monthly_contributions IS 
'Calculates monthly contributions for each household member based on calculation_type:
- proportional: Based on income ratio
- equal: Split equally
- custom: Manual percentages (future)';
