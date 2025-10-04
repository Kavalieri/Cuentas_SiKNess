-- Fix RLS for household_settings: Add INSERT policy
-- The table only had SELECT and UPDATE policies, missing INSERT
-- This caused "new row violates row-level security policy" error

-- Drop existing policies (for clean recreation)
DROP POLICY IF EXISTS "Members can view household settings" ON household_settings;
DROP POLICY IF EXISTS "Owners can update household settings" ON household_settings;
DROP POLICY IF EXISTS "Owners can insert household settings" ON household_settings;

-- CREATE: Members can view settings
CREATE POLICY "Members can view household settings" ON household_settings
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

-- INSERT: Only owners can create household settings
CREATE POLICY "Owners can insert household settings" ON household_settings
  FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id() AND role = 'owner'
    )
  );

-- UPDATE: Only owners can update household settings
CREATE POLICY "Owners can update household settings" ON household_settings
  FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id() AND role = 'owner'
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id() AND role = 'owner'
    )
  );

-- Comentarios
COMMENT ON POLICY "Members can view household settings" ON household_settings IS 
  'All household members can view settings';
COMMENT ON POLICY "Owners can insert household settings" ON household_settings IS 
  'Only household owners can create initial settings';
COMMENT ON POLICY "Owners can update household settings" ON household_settings IS 
  'Only household owners can modify settings';
