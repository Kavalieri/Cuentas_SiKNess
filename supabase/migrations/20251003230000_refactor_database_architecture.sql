-- ============================================================================
-- DATABASE REFACTORING: Arquitectura Robusta y Escalable
-- ============================================================================
-- Descripción: Refactorización completa para seguir mejores prácticas de
--              aplicaciones financieras multi-tenant (Splitwise, YNAB, Mint)
-- 
-- Cambios principales:
-- 1. Crear tabla 'profiles' como fuente de verdad de usuarios
-- 2. Renombrar 'movements' → 'transactions'
-- 3. Actualizar todas las FKs para usar profiles.id en lugar de auth.users.id
-- 4. Mejorar naming conventions y separación de responsabilidades
-- ============================================================================

-- ============================================================================
-- FASE 1: CREAR TABLA PROFILES (Fuente de Verdad de Usuarios)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT profiles_display_name_not_empty CHECK (LENGTH(TRIM(display_name)) > 0)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer profiles (para mostrar nombres en listas)
CREATE POLICY "Anyone authenticated can read profiles" ON profiles 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Los usuarios solo pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile" ON profiles 
  FOR UPDATE 
  USING (auth_user_id = auth.uid());

-- Solo el sistema puede crear profiles (via trigger)
CREATE POLICY "System can insert profiles" ON profiles 
  FOR INSERT 
  WITH CHECK (auth_user_id = auth.uid());

-- Comentarios
COMMENT ON TABLE profiles IS 'Perfiles de usuarios - Fuente de verdad independiente de auth.users';
COMMENT ON COLUMN profiles.auth_user_id IS 'Vinculación con auth.users (solo para autenticación)';
COMMENT ON COLUMN profiles.display_name IS 'Nombre visible del usuario (mostrar en lugar de email)';
COMMENT ON COLUMN profiles.email IS 'Cache del email de auth.users para queries simples';

-- ============================================================================
-- FASE 2: FUNCIÓN PARA OBTENER PROFILE_ID ACTUAL
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Obtener profile_id desde auth.uid()
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE auth_user_id = auth.uid();
  
  RETURN v_profile_id;
END;
$$;

COMMENT ON FUNCTION get_current_profile_id IS 'Retorna el profile_id del usuario autenticado actual';

-- ============================================================================
-- FASE 3: TRIGGER PARA AUTO-CREAR PROFILE AL REGISTRARSE
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_auth_user_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_display_name TEXT;
BEGIN
  -- Extraer display_name de metadata o usar parte del email
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );
  
  -- Insertar o actualizar profile
  INSERT INTO profiles (auth_user_id, email, display_name)
  VALUES (NEW.id, NEW.email, v_display_name)
  ON CONFLICT (auth_user_id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    display_name = COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      profiles.display_name
    ),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_user_to_profile();

COMMENT ON FUNCTION sync_auth_user_to_profile IS 'Trigger que crea/actualiza profile cuando se crea/modifica un usuario en auth.users';

-- ============================================================================
-- FASE 4: POBLAR PROFILES CON USUARIOS EXISTENTES
-- ============================================================================

-- Insertar profiles para todos los usuarios en household_members que no existan
INSERT INTO profiles (auth_user_id, email, display_name)
SELECT DISTINCT
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'display_name',
    au.raw_user_meta_data->>'full_name',
    SPLIT_PART(au.email, '@', 1)
  )
FROM auth.users au
WHERE au.id IN (SELECT DISTINCT user_id FROM household_members)
  AND au.id NOT IN (SELECT auth_user_id FROM profiles)
ON CONFLICT (auth_user_id) DO NOTHING;

-- ============================================================================
-- FASE 5: RENOMBRAR MOVEMENTS → TRANSACTIONS
-- ============================================================================

-- Renombrar tabla
ALTER TABLE IF EXISTS movements RENAME TO transactions;

-- Renombrar columna note → description
ALTER TABLE transactions RENAME COLUMN note TO description;

-- Actualizar índices
DROP INDEX IF EXISTS idx_movements_household_occurred_at_desc;
CREATE INDEX IF NOT EXISTS idx_transactions_household_occurred_at_desc 
  ON transactions (household_id, occurred_at DESC);

DROP INDEX IF EXISTS idx_movements_household_type_occurred_at_desc;
CREATE INDEX IF NOT EXISTS idx_transactions_household_type_occurred_at_desc 
  ON transactions (household_id, type, occurred_at DESC);

DROP INDEX IF EXISTS idx_movements_period;
CREATE INDEX IF NOT EXISTS idx_transactions_period 
  ON transactions (period_id);

-- Comentario
COMMENT ON TABLE transactions IS 'Transacciones financieras (ingresos y gastos)';
COMMENT ON COLUMN transactions.description IS 'Descripción o nota de la transacción';

-- ============================================================================
-- FASE 6: MIGRAR HOUSEHOLD_MEMBERS A USAR PROFILES
-- ============================================================================

-- PASO 1: Eliminar todas las políticas RLS que dependen de household_members.user_id
DROP POLICY IF EXISTS "categories_select" ON categories;
DROP POLICY IF EXISTS "categories_insert" ON categories;
DROP POLICY IF EXISTS "categories_update" ON categories;
DROP POLICY IF EXISTS "categories_delete" ON categories;
DROP POLICY IF EXISTS "movements_select" ON transactions;
DROP POLICY IF EXISTS "movements_insert" ON transactions;
DROP POLICY IF EXISTS "movements_update" ON transactions;
DROP POLICY IF EXISTS "movements_delete" ON transactions;
DROP POLICY IF EXISTS "Members can view incomes in their household" ON member_incomes;
DROP POLICY IF EXISTS "Members can insert their own income" ON member_incomes;
DROP POLICY IF EXISTS "Members can update their own income" ON member_incomes;
DROP POLICY IF EXISTS "Members can view household settings" ON household_settings;
DROP POLICY IF EXISTS "Members can update household settings" ON household_settings;
DROP POLICY IF EXISTS "Members can view contributions in their household" ON contributions;
DROP POLICY IF EXISTS "System can manage contributions" ON contributions;
DROP POLICY IF EXISTS "Members can view adjustments in their household" ON contribution_adjustments;
DROP POLICY IF EXISTS "Members can create adjustments" ON contribution_adjustments;
DROP POLICY IF EXISTS "household_members_select" ON household_members;
DROP POLICY IF EXISTS "household_members_insert" ON household_members;
DROP POLICY IF EXISTS "household_members_update" ON household_members;
DROP POLICY IF EXISTS "household_members_delete" ON household_members;
DROP POLICY IF EXISTS "households_select_member" ON households;
DROP POLICY IF EXISTS "households_update_member" ON households;
DROP POLICY IF EXISTS "households_delete_owner" ON households;
DROP POLICY IF EXISTS "pre_payments_select_policy" ON pre_payments;
DROP POLICY IF EXISTS "pre_payments_insert_policy" ON pre_payments;
DROP POLICY IF EXISTS "pre_payments_update_policy" ON pre_payments;
DROP POLICY IF EXISTS "pre_payments_delete_policy" ON pre_payments;
DROP POLICY IF EXISTS "insert_invitations" ON invitations;
DROP POLICY IF EXISTS "update_invitations" ON invitations;
DROP POLICY IF EXISTS "read_invitations_owners" ON invitations;
DROP POLICY IF EXISTS "Users can view periods of their households" ON monthly_periods;
DROP POLICY IF EXISTS "Owners can update periods" ON monthly_periods;

-- PASO 2: Añadir columna profile_id
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS profile_id UUID;

-- PASO 3: Migrar datos: mapear user_id → profile_id
UPDATE household_members hm
SET profile_id = p.id
FROM profiles p
WHERE hm.user_id = p.auth_user_id
  AND hm.profile_id IS NULL;

-- PASO 4: Verificar que no haya nulls (todos migrados)
DO $$
DECLARE
  v_null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_null_count
  FROM household_members
  WHERE profile_id IS NULL;
  
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % household_members have null profile_id', v_null_count;
  END IF;
END;
$$;

-- PASO 5: Hacer NOT NULL y añadir FK
ALTER TABLE household_members ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE household_members ADD CONSTRAINT household_members_profile_id_fkey 
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- PASO 6: Eliminar columna user_id vieja
ALTER TABLE household_members DROP COLUMN user_id;

-- PASO 7: Actualizar PRIMARY KEY
ALTER TABLE household_members DROP CONSTRAINT IF EXISTS household_members_pkey;
ALTER TABLE household_members ADD PRIMARY KEY (household_id, profile_id);

-- PASO 8: Actualizar índice
DROP INDEX IF EXISTS idx_household_members_user_id;
CREATE INDEX IF NOT EXISTS idx_household_members_profile_id ON household_members(profile_id);

-- ============================================================================
-- FASE 7: MIGRAR TRANSACTIONS A USAR PROFILES
-- ============================================================================

-- Añadir columna profile_id
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS profile_id UUID;

-- Migrar datos
UPDATE transactions t
SET profile_id = p.id
FROM profiles p
WHERE t.user_id = p.auth_user_id
  AND t.profile_id IS NULL;

-- Añadir FK (nullable porque puede haber transacciones sin usuario asignado)
ALTER TABLE transactions ADD CONSTRAINT transactions_profile_id_fkey 
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Eliminar columna user_id vieja
ALTER TABLE transactions DROP COLUMN user_id;

-- Añadir índice
CREATE INDEX IF NOT EXISTS idx_transactions_profile_id ON transactions(profile_id);

-- ============================================================================
-- FASE 8: MIGRAR CONTRIBUTIONS A USAR PROFILES
-- ============================================================================

-- Añadir columna profile_id
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS profile_id UUID;

-- Migrar datos
UPDATE contributions c
SET profile_id = p.id
FROM profiles p
WHERE c.user_id = p.auth_user_id
  AND c.profile_id IS NULL;

-- Verificar y hacer NOT NULL
DO $$
DECLARE
  v_null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_null_count
  FROM contributions
  WHERE profile_id IS NULL;
  
  IF v_null_count > 0 THEN
    RAISE WARNING 'Migration warning: % contributions have null profile_id', v_null_count;
  END IF;
END;
$$;

ALTER TABLE contributions ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE contributions ADD CONSTRAINT contributions_profile_id_fkey 
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Eliminar columna user_id vieja
ALTER TABLE contributions DROP COLUMN user_id;

-- Añadir índice
CREATE INDEX IF NOT EXISTS idx_contributions_profile_id ON contributions(profile_id);

-- ============================================================================
-- FASE 9: MIGRAR MEMBER_INCOMES A USAR PROFILES
-- ============================================================================

DO $$
BEGIN
  -- Solo si la columna user_id existe
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'member_incomes' AND column_name = 'user_id'
  ) THEN
    -- Añadir columna profile_id
    ALTER TABLE member_incomes ADD COLUMN IF NOT EXISTS profile_id UUID;

    -- Migrar datos
    UPDATE member_incomes mi
    SET profile_id = p.id
    FROM profiles p
    WHERE mi.user_id = p.auth_user_id
      AND mi.profile_id IS NULL;

    -- Verificar
    IF (SELECT COUNT(*) FROM member_incomes WHERE profile_id IS NULL) > 0 THEN
      RAISE WARNING 'Migration warning: Some member_incomes have null profile_id';
    END IF;

    -- Hacer NOT NULL y añadir FK
    ALTER TABLE member_incomes ALTER COLUMN profile_id SET NOT NULL;
    ALTER TABLE member_incomes ADD CONSTRAINT member_incomes_profile_id_fkey 
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

    -- Eliminar columna user_id vieja
    ALTER TABLE member_incomes DROP COLUMN user_id;

    -- Añadir índice
    CREATE INDEX IF NOT EXISTS idx_member_incomes_profile_id ON member_incomes(profile_id);
  ELSE
    -- La columna user_id ya fue eliminada, solo asegurar que profile_id existe
    ALTER TABLE member_incomes ADD COLUMN IF NOT EXISTS profile_id UUID;
    
    -- Añadir constraint solo si no existe (verificar primero)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'member_incomes_profile_id_fkey'
        AND table_name = 'member_incomes'
    ) THEN
      ALTER TABLE member_incomes ADD CONSTRAINT member_incomes_profile_id_fkey 
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    CREATE INDEX IF NOT EXISTS idx_member_incomes_profile_id ON member_incomes(profile_id);
  END IF;
END $$;

-- ============================================================================
-- FASE 10: MIGRAR PRE_PAYMENTS A USAR PROFILES
-- ============================================================================

-- Añadir columna profile_id
ALTER TABLE pre_payments ADD COLUMN IF NOT EXISTS profile_id UUID;

-- Migrar datos
UPDATE pre_payments pp
SET profile_id = p.id
FROM profiles p
WHERE pp.user_id = p.auth_user_id
  AND pp.profile_id IS NULL;

-- Verificar y hacer NOT NULL
DO $$
DECLARE
  v_null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_null_count
  FROM pre_payments
  WHERE profile_id IS NULL;
  
  IF v_null_count > 0 THEN
    RAISE WARNING 'Migration warning: % pre_payments have null profile_id', v_null_count;
  END IF;
END;
$$;

ALTER TABLE pre_payments ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE pre_payments ADD CONSTRAINT pre_payments_profile_id_fkey 
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Eliminar columna user_id vieja
ALTER TABLE pre_payments DROP COLUMN user_id;

-- Añadir índice
CREATE INDEX IF NOT EXISTS idx_pre_payments_profile_id ON pre_payments(profile_id);

-- ============================================================================
-- FASE 11: MIGRAR USER_SETTINGS A USAR PROFILES
-- ============================================================================

-- Renombrar columna user_id → profile_id
ALTER TABLE user_settings RENAME COLUMN user_id TO profile_id;

-- Actualizar FK
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;
ALTER TABLE user_settings ADD CONSTRAINT user_settings_profile_id_fkey 
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Actualizar PRIMARY KEY si existe
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_pkey;
ALTER TABLE user_settings ADD PRIMARY KEY (profile_id);

-- ============================================================================
-- FASE 12: RECREAR TODAS LAS RLS POLICIES CON PROFILE_ID
-- ============================================================================

-- ===== HOUSEHOLDS =====
CREATE POLICY "Members can view their households" ON households
  FOR SELECT
  USING (
    id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

CREATE POLICY "Members can update their households" ON households
  FOR UPDATE
  USING (
    id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

CREATE POLICY "Owners can delete their households" ON households
  FOR DELETE
  USING (
    id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id() AND role = 'owner'
    )
  );

-- ===== HOUSEHOLD_MEMBERS =====
CREATE POLICY "Members can view members in their households" ON household_members
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

CREATE POLICY "System can insert household members" ON household_members
  FOR INSERT
  WITH CHECK (true); -- Controlled by functions

CREATE POLICY "Members can update household members" ON household_members
  FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

CREATE POLICY "Owners can delete household members" ON household_members
  FOR DELETE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id() AND role = 'owner'
    )
  );

-- ===== CATEGORIES =====
CREATE POLICY "Members can view categories in their households" ON categories
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

CREATE POLICY "Members can insert categories in their households" ON categories
  FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

CREATE POLICY "Members can update categories in their households" ON categories
  FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

CREATE POLICY "Members can delete categories in their households" ON categories
  FOR DELETE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

-- ===== TRANSACTIONS =====
CREATE POLICY "Members can view transactions in their households" ON transactions
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

CREATE POLICY "Members can insert transactions in their households" ON transactions
  FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

CREATE POLICY "Members can update transactions in their households" ON transactions
  FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

CREATE POLICY "Members can delete transactions in their households" ON transactions
  FOR DELETE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

-- ===== MEMBER_INCOMES =====
CREATE POLICY "Members can view incomes in their household" ON member_incomes
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

CREATE POLICY "Members can insert their own income" ON member_incomes
  FOR INSERT
  WITH CHECK (
    profile_id = get_current_profile_id()
    AND household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

CREATE POLICY "Members can update their own income" ON member_incomes
  FOR UPDATE
  USING (
    profile_id = get_current_profile_id()
    OR household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id() AND role = 'owner'
    )
  );

-- ===== HOUSEHOLD_SETTINGS =====
CREATE POLICY "Members can view household settings" ON household_settings
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

CREATE POLICY "Owners can update household settings" ON household_settings
  FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id() AND role = 'owner'
    )
  );

-- ===== CONTRIBUTIONS =====
CREATE POLICY "Members can view contributions in their household" ON contributions
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

CREATE POLICY "System can manage contributions" ON contributions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ===== CONTRIBUTION_ADJUSTMENTS =====
CREATE POLICY "Members can view adjustments in their household" ON contribution_adjustments
  FOR SELECT
  USING (
    contribution_id IN (
      SELECT c.id 
      FROM contributions c
      JOIN household_members hm ON c.household_id = hm.household_id
      WHERE hm.profile_id = get_current_profile_id()
    )
  );

CREATE POLICY "Members can create adjustments" ON contribution_adjustments
  FOR INSERT
  WITH CHECK (
    contribution_id IN (
      SELECT c.id 
      FROM contributions c
      JOIN household_members hm ON c.household_id = hm.household_id
      WHERE hm.profile_id = get_current_profile_id()
    )
  );

-- ===== PRE_PAYMENTS =====
CREATE POLICY "Members can view pre_payments in their household" ON pre_payments
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

CREATE POLICY "Members can insert pre_payments in their household" ON pre_payments
  FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

CREATE POLICY "Members can update pre_payments in their household" ON pre_payments
  FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

CREATE POLICY "Members can delete pre_payments in their household" ON pre_payments
  FOR DELETE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

-- ===== INVITATIONS =====
CREATE POLICY "Owners can insert invitations" ON invitations
  FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can update invitations" ON invitations
  FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can view invitations" ON invitations
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id() AND role = 'owner'
    )
  );

-- ===== MONTHLY_PERIODS =====
CREATE POLICY "Members can view periods in their households" ON monthly_periods
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id()
    )
  );

CREATE POLICY "Owners can update periods" ON monthly_periods
  FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE profile_id = get_current_profile_id() AND role = 'owner'
    )
  );

-- ============================================================================
-- FASE 13: CREAR VISTA PARA SIMPLIFICAR QUERIES
-- ============================================================================

CREATE OR REPLACE VIEW v_transactions_with_profile AS
SELECT 
  t.*,
  p.display_name AS profile_name,
  p.avatar_url AS profile_avatar,
  p.email AS profile_email
FROM transactions t
LEFT JOIN profiles p ON t.profile_id = p.id;

COMMENT ON VIEW v_transactions_with_profile IS 'Vista de transacciones con información del perfil del usuario';

-- ============================================================================
-- FASE 14: FUNCIÓN HELPER PARA OBTENER PERFIL COMPLETO
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_profile()
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.email,
    p.avatar_url,
    p.bio
  FROM profiles p
  WHERE p.auth_user_id = auth.uid();
END;
$$;

COMMENT ON FUNCTION get_current_profile IS 'Retorna el perfil completo del usuario autenticado';

-- ============================================================================
-- RESUMEN DE CAMBIOS
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'DATABASE REFACTORING COMPLETED SUCCESSFULLY';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes applied:';
  RAISE NOTICE '1. ✅ Created profiles table as source of truth for users';
  RAISE NOTICE '2. ✅ Renamed movements → transactions';
  RAISE NOTICE '3. ✅ Renamed movements.note → transactions.description';
  RAISE NOTICE '4. ✅ Migrated household_members.user_id → profile_id';
  RAISE NOTICE '5. ✅ Migrated transactions.user_id → profile_id';
  RAISE NOTICE '6. ✅ Migrated contributions.user_id → profile_id';
  RAISE NOTICE '7. ✅ Migrated member_incomes.user_id → profile_id';
  RAISE NOTICE '8. ✅ Migrated pre_payments.user_id → profile_id';
  RAISE NOTICE '9. ✅ Migrated user_settings.user_id → profile_id';
  RAISE NOTICE '10. ✅ Updated RLS policies';
  RAISE NOTICE '11. ✅ Created helper functions and views';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Regenerate TypeScript types: npx supabase gen types';
  RAISE NOTICE '2. Update application code to use new structure';
  RAISE NOTICE '3. Test all functionality';
  RAISE NOTICE '4. Deploy to production';
  RAISE NOTICE '============================================================================';
END;
$$;
