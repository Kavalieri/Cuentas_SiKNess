-- Add calculation_type column to household_settings
-- This allows different contribution calculation methods

ALTER TABLE household_settings 
ADD COLUMN calculation_type TEXT NOT NULL DEFAULT 'proportional'
CHECK (calculation_type IN ('proportional', 'equal', 'custom'));

COMMENT ON COLUMN household_settings.calculation_type IS 
'Method for calculating member contributions:
- proportional: Based on income ratio (memberIncome/totalIncome * goal)
- equal: Split equally among all members (goal/memberCount)
- custom: Manual percentages set by owner (future)';
