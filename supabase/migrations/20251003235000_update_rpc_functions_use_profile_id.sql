-- Update calculate_monthly_contributions to return profile_id instead of user_id
-- Part of database refactoring: movements → transactions, user_id → profile_id

BEGIN;

-- ========================================
-- 1. Update get_member_income function
-- ========================================

DROP FUNCTION IF EXISTS get_member_income(UUID, UUID, DATE);

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
BEGIN
  SELECT monthly_income
  INTO v_income
  FROM member_incomes
  WHERE household_id = p_household_id
    AND profile_id = p_profile_id
    AND effective_from <= p_date
  ORDER BY effective_from DESC
  LIMIT 1;
  
  RETURN COALESCE(v_income, 0);
END;
$$;

COMMENT ON FUNCTION get_member_income IS 
'Gets the member monthly income effective at the specified date.
Uses profile_id instead of user_id after database refactoring.';

-- ========================================
-- 2. Update calculate_monthly_contributions function
-- ========================================

DROP FUNCTION IF EXISTS calculate_monthly_contributions(UUID, INT, INT);

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
      hm.profile_id,
      ROUND(v_goal / v_member_count, 2) AS expected_amount
    FROM household_members hm
    WHERE hm.household_id = p_household_id;

  ELSIF v_calculation_type = 'proportional' THEN
    -- Proportional to income
    -- Get total income
    SELECT COALESCE(SUM(get_member_income(p_household_id, hm.profile_id, CURRENT_DATE)), 0)
    INTO v_total_income
    FROM household_members hm
    WHERE hm.household_id = p_household_id;

    IF v_total_income = 0 THEN
      RAISE EXCEPTION 'No incomes configured for proportional calculation';
    END IF;

    -- Calculate proportional contributions
    RETURN QUERY
    SELECT 
      hm.profile_id,
      ROUND(
        (get_member_income(p_household_id, hm.profile_id, CURRENT_DATE) / v_total_income) * v_goal,
        2
      ) AS expected_amount
    FROM household_members hm
    WHERE hm.household_id = p_household_id;

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
'Calculates monthly contributions for each household member based on calculation_type.
Uses profile_id instead of user_id after database refactoring.
- proportional: Based on income ratio
- equal: Split equally
- custom: Manual percentages (future)';

-- ========================================
-- 3. Update get_household_members function
-- ========================================

DROP FUNCTION IF EXISTS get_household_members(UUID);

CREATE OR REPLACE FUNCTION get_household_members(p_household_id UUID)
RETURNS TABLE (
  id UUID,
  profile_id UUID,
  email TEXT,
  role TEXT,
  household_id UUID
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    hm.household_id AS id,
    hm.profile_id,
    p.email,
    hm.role,
    hm.household_id
  FROM household_members hm
  INNER JOIN profiles p ON p.id = hm.profile_id
  WHERE hm.household_id = p_household_id
  ORDER BY 
    CASE WHEN hm.role = 'owner' THEN 0 ELSE 1 END,
    p.email;
$$;

GRANT EXECUTE ON FUNCTION get_household_members(UUID) TO authenticated;

COMMENT ON FUNCTION get_household_members(UUID) IS 
'Returns household members with their profile information.
Uses profile_id instead of user_id after database refactoring.';

COMMIT;
