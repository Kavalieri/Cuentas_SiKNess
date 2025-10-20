-- 20251020_220000_add_contributions_unique_idx.sql
-- Enforce uniqueness of per-member contributions per period and add supporting index

SET client_min_messages = warning;
SET search_path = public, pg_catalog;

-- Add unique constraint to prevent duplicate rows per (household, member, year, month)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'contributions'
      AND constraint_name = 'contributions_household_profile_period_key'
  ) THEN
    ALTER TABLE public.contributions
      ADD CONSTRAINT contributions_household_profile_period_key
      UNIQUE (household_id, profile_id, year, month);
  END IF;
END $$;

-- Helpful index for period-scoped queries
CREATE INDEX IF NOT EXISTS idx_contributions_period
  ON public.contributions (household_id, year, month);

-- Register migration (best-effort)
INSERT INTO _migrations (migration_name, description)
VALUES ('20251020_220000_add_contributions_unique_idx.sql', 'Enforce contributions uniqueness per (household_id, profile_id, year, month)')
ON CONFLICT (migration_name) DO NOTHING;
