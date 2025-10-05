-- ============================================================================
-- WIPE DATA: Limpiar datos pero preservar usuarios y estructura
-- ============================================================================
-- Descripción: Limpia todos los datos de prueba pero preserva:
-- - Estructura de tablas, funciones, triggers, policies
-- - Usuarios (auth.users y profiles)
-- - System admins
-- - Crea automáticamente hogar "Casa Test" vacío con los 2 usuarios
-- ============================================================================

DO $$
DECLARE
  v_admin_count INTEGER;
  v_user_count INTEGER;
  v_user1_id UUID;
  v_user2_id UUID;
  v_profile1_id UUID;
  v_profile2_id UUID;
  v_household_id UUID;
BEGIN
  -- Contar administradores y usuarios actuales
  SELECT COUNT(*) INTO v_admin_count FROM system_admins;
  SELECT COUNT(*) INTO v_user_count FROM profiles;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'WIPE DATA - Preserve Users and Structure';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'System admins found: %', v_admin_count;
  RAISE NOTICE 'Users (profiles) found: %', v_user_count;
  RAISE NOTICE '';
  
  -- Verificar que hay usuarios
  IF v_user_count = 0 THEN
    RAISE EXCEPTION 'No users found. Cannot proceed with wipe.';
  END IF;
  
  -- Deshabilitar temporalmente RLS para poder eliminar
  ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
  ALTER TABLE contribution_adjustments DISABLE ROW LEVEL SECURITY;
  ALTER TABLE contributions DISABLE ROW LEVEL SECURITY;
  ALTER TABLE member_incomes DISABLE ROW LEVEL SECURITY;
  ALTER TABLE household_settings DISABLE ROW LEVEL SECURITY;
  ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
  ALTER TABLE invitations DISABLE ROW LEVEL SECURITY;
  ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
  ALTER TABLE household_members DISABLE ROW LEVEL SECURITY;
  ALTER TABLE households DISABLE ROW LEVEL SECURITY;
  ALTER TABLE member_credits DISABLE ROW LEVEL SECURITY;
  ALTER TABLE household_savings DISABLE ROW LEVEL SECURITY;
  ALTER TABLE savings_transactions DISABLE ROW LEVEL SECURITY;
  ALTER TABLE monthly_periods DISABLE ROW LEVEL SECURITY;
  ALTER TABLE period_access_log DISABLE ROW LEVEL SECURITY;
  
  RAISE NOTICE 'RLS disabled for data deletion...';
  RAISE NOTICE '';
  
  -- Eliminar datos en orden correcto (respetando FKs)
  RAISE NOTICE 'Deleting data...';
  
  -- 1. Savings
  DELETE FROM savings_transactions;
  RAISE NOTICE '  ✓ Savings transactions deleted';
  
  -- 2. Transacciones (DESPUÉS de adjustments)
  DELETE FROM contribution_adjustments;
  RAISE NOTICE '  ✓ Contribution adjustments deleted';
  
  DELETE FROM transactions;
  RAISE NOTICE '  ✓ Transactions deleted';
  
  -- 3. Sistema de contribuciones
  DELETE FROM contributions;
  RAISE NOTICE '  ✓ Contributions deleted';
  
  DELETE FROM member_incomes;
  RAISE NOTICE '  ✓ Member incomes deleted';
  
  DELETE FROM household_settings;
  RAISE NOTICE '  ✓ Household settings deleted';
  
  -- 4. Créditos y períodos
  DELETE FROM member_credits;
  RAISE NOTICE '  ✓ Member credits deleted';
  
  DELETE FROM period_access_log;
  RAISE NOTICE '  ✓ Period access log deleted';
  
  DELETE FROM monthly_periods;
  RAISE NOTICE '  ✓ Monthly periods deleted';
  
  -- 5. Savings y categorías
  DELETE FROM household_savings;
  RAISE NOTICE '  ✓ Household savings deleted';
  
  DELETE FROM categories;
  RAISE NOTICE '  ✓ Categories deleted';
  
  -- 6. Invitaciones
  DELETE FROM invitations;
  RAISE NOTICE '  ✓ Invitations deleted';
  
  -- 7. Configuración de usuario (reset pero no borrar)
  UPDATE user_settings SET active_household_id = NULL, preferences = NULL;
  RAISE NOTICE '  ✓ User settings reset';
  
  -- 8. Membresías y hogares
  DELETE FROM household_members;
  RAISE NOTICE '  ✓ Household members deleted';
  
  DELETE FROM households;
  RAISE NOTICE '  ✓ Households deleted';
  
  RAISE NOTICE '';
  RAISE NOTICE 'Data deletion complete!';
  RAISE NOTICE '';
  
  -- Habilitar RLS nuevamente
  ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE contribution_adjustments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE member_incomes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE household_settings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
  ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
  ALTER TABLE households ENABLE ROW LEVEL SECURITY;
  ALTER TABLE member_credits ENABLE ROW LEVEL SECURITY;
  ALTER TABLE household_savings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE savings_transactions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE monthly_periods ENABLE ROW LEVEL SECURITY;
  ALTER TABLE period_access_log ENABLE ROW LEVEL SECURITY;
  
  RAISE NOTICE 'RLS re-enabled!';
  RAISE NOTICE '';
  
  -- ========================================================================
  -- Crear hogar "Casa Test" vacío con los 2 usuarios existentes
  -- ========================================================================
  RAISE NOTICE 'Creating test household...';
  
  -- Obtener los 2 primeros usuarios (asumir que son fumetas y caballero)
  SELECT id INTO v_profile1_id FROM profiles ORDER BY created_at LIMIT 1;
  SELECT id INTO v_profile2_id FROM profiles ORDER BY created_at OFFSET 1 LIMIT 1;
  
  IF v_profile1_id IS NULL OR v_profile2_id IS NULL THEN
    RAISE EXCEPTION 'Need at least 2 users to create test household';
  END IF;
  
  -- Crear hogar "Casa Test"
  INSERT INTO households (name, status, settings)
  VALUES ('Casa Test', 'active', '{"currency": "EUR"}'::jsonb)
  RETURNING id INTO v_household_id;
  
  RAISE NOTICE '  ✓ Household created: Casa Test (ID: %)', v_household_id;
  
  -- Agregar miembros (primer usuario = owner, segundo = member)
  INSERT INTO household_members (household_id, profile_id, role)
  VALUES 
    (v_household_id, v_profile1_id, 'owner'),
    (v_household_id, v_profile2_id, 'member');
  
  RAISE NOTICE '  ✓ Members added: 2 users';
  
  -- Establecer como hogar activo para ambos usuarios
  UPDATE user_settings
  SET active_household_id = v_household_id
  WHERE profile_id IN (v_profile1_id, v_profile2_id);
  
  RAISE NOTICE '  ✓ Active household set for both users';
  
  -- Crear categorías por defecto (23 categorías: 15 gasto + 8 ingreso)
  -- CATEGORÍAS DE GASTO
  INSERT INTO categories (household_id, name, icon, type) VALUES
    (v_household_id, 'Vivienda', '🏠', 'expense'),
    (v_household_id, 'Supermercado', '🛒', 'expense'),
    (v_household_id, 'Transporte', '🚗', 'expense'),
    (v_household_id, 'Restaurantes', '🍽️', 'expense'),
    (v_household_id, 'Ocio', '🎬', 'expense'),
    (v_household_id, 'Salud', '💊', 'expense'),
    (v_household_id, 'Educación', '📚', 'expense'),
    (v_household_id, 'Menaje', '�', 'expense'),
    (v_household_id, 'Ropa', '👕', 'expense'),
    (v_household_id, 'Mascotas', '�', 'expense'),
    (v_household_id, 'Regalos', '🎁', 'expense'),
    (v_household_id, 'Suscripciones', '�', 'expense'),
    (v_household_id, 'Deportes', '⚽', 'expense'),
    (v_household_id, 'Belleza', '💅', 'expense'),
    (v_household_id, 'Varios', '�', 'expense');
  
  -- CATEGORÍAS DE INGRESO
  INSERT INTO categories (household_id, name, icon, type) VALUES
    (v_household_id, 'Nómina', '💰', 'income'),
    (v_household_id, 'Freelance', '💼', 'income'),
    (v_household_id, 'Inversiones', '📈', 'income'),
    (v_household_id, 'Ventas', '🏷️', 'income'),
    (v_household_id, 'Devoluciones', '↩️', 'income'),
    (v_household_id, 'Aportación Cuenta Conjunta', '🏦', 'income'),
    (v_household_id, 'Bonus', '🎉', 'income'),
    (v_household_id, 'Varios', '💵', 'income');
  
  RAISE NOTICE '  ✓ Default categories created: 23 categories (15 expense + 8 income)';
  RAISE NOTICE '';
  
  -- ========================================================================
  -- Resumen final
  -- ========================================================================
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'WIPE COMPLETED SUCCESSFULLY';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Data cleaned:';
  RAISE NOTICE '  ✓ All transactions and savings';
  RAISE NOTICE '  ✓ All contributions, adjustments, and incomes';
  RAISE NOTICE '  ✓ All credits and periods';
  RAISE NOTICE '  ✓ All old categories and households';
  RAISE NOTICE '  ✓ All invitations';
  RAISE NOTICE '';
  RAISE NOTICE 'Preserved:';
  RAISE NOTICE '  ✓ Database structure (tables, triggers, policies)';
  RAISE NOTICE '  ✓ Users (% profiles)', v_user_count;
  RAISE NOTICE '  ✓ System admins (% admins)', v_admin_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Fresh setup created:';
  RAISE NOTICE '  ✓ Household: Casa Test';
  RAISE NOTICE '  ✓ Members: 2 (1 owner, 1 member)';
  RAISE NOTICE '  ✓ Categories: 23 (auto-created by trigger)';
  RAISE NOTICE '  ✓ Household savings: Created by trigger (balance 0)';
  RAISE NOTICE '  ✓ Active household set for both users';
  
  -- ⚠️ NO crear categorías manualmente - el trigger "on_household_created_create_categories" 
  -- las crea automáticamente (23 categorías + household_savings)
  RAISE NOTICE '';
  RAISE NOTICE 'Waiting for trigger to auto-create 23 categories + household_savings...';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready for testing! Login and create your own data.';
  RAISE NOTICE '============================================================================';
  
END $$;
