-- Update get_household_members function to use profile_id
-- Complementary migration to 20251003235000

BEGIN;

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
