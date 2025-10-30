-- ============================================================================
-- MIGRATION: Category Hierarchy System (3-tier structure)
-- Date: 2025-10-30
-- Description: Creates parent categories, subcategories, and updates schema
-- ============================================================================

-- ============================================================================
-- STEP 1: Create category_parents table
-- ============================================================================
CREATE TABLE IF NOT EXISTS category_parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_category_parents_household
  ON category_parents(household_id, type, display_order);

-- Comment
COMMENT ON TABLE category_parents IS
  'Top-level category groups (e.g., Hogar, Suministros, Alimentación)';

-- ============================================================================
-- STEP 2: Add parent_id to categories
-- ============================================================================
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES category_parents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Index for hierarchy navigation
CREATE INDEX IF NOT EXISTS idx_categories_parent_id
  ON categories(parent_id, display_order) WHERE parent_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN categories.parent_id IS
  'Reference to parent category group (NULL = legacy/ungrouped)';

-- ============================================================================
-- STEP 3: Create subcategories table
-- ============================================================================
CREATE TABLE IF NOT EXISTS subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, name)
);

-- Index for fast category lookups
CREATE INDEX IF NOT EXISTS idx_subcategories_category
  ON subcategories(category_id, display_order);

-- Comment
COMMENT ON TABLE subcategories IS
  'Detailed subcategories (e.g., Mercadona, Vodafone, Iberdrola)';

-- ============================================================================
-- STEP 4: Add subcategory_id to transactions
-- ============================================================================
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES subcategories(id) ON DELETE SET NULL;

-- Index for filtering and joins
CREATE INDEX IF NOT EXISTS idx_transactions_subcategory
  ON transactions(subcategory_id) WHERE subcategory_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN transactions.subcategory_id IS
  'Optional detailed subcategory (migrated from description field)';

-- ============================================================================
-- STEP 5: Update updated_at triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION update_category_parent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_category_parents_updated_at
  BEFORE UPDATE ON category_parents
  FOR EACH ROW
  EXECUTE FUNCTION update_category_parent_timestamp();

CREATE OR REPLACE FUNCTION update_subcategory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_subcategories_updated_at
  BEFORE UPDATE ON subcategories
  FOR EACH ROW
  EXECUTE FUNCTION update_subcategory_timestamp();

-- ============================================================================
-- STEP 8: Grant permissions to cuentassik_user
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON category_parents TO cuentassik_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON subcategories TO cuentassik_user;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Schema migration completed: 3-tier category hierarchy created';
  RAISE NOTICE '   - category_parents table created';
  RAISE NOTICE '   - categories.parent_id added';
  RAISE NOTICE '   - subcategories table created';
  RAISE NOTICE '   - transactions.subcategory_id added';
  RAISE NOTICE '   - Indexes and triggers configured';
  RAISE NOTICE '   - Permissions granted to cuentassik_user';
END $$;
