-- ============================================================================
-- WIPE DATABASE: Eliminar todos los datos pero mantener estructura
-- ============================================================================
-- Descripción: Limpia todos los datos de prueba pero preserva:
-- - Estructura de tablas
-- - Funciones
-- - Triggers
-- - Administradores del sistema (system_admins)
-- ============================================================================

DO $$
DECLARE
  v_admin_count INTEGER;
BEGIN
  -- Contar administradores actuales
  SELECT COUNT(*) INTO v_admin_count FROM system_admins;
  RAISE NOTICE 'Found % system admins (will be preserved)', v_admin_count;
  
  -- Verificar que hay al menos un admin
  IF v_admin_count = 0 THEN
    RAISE EXCEPTION 'No system admins found. Please ensure at least one admin exists before wiping.';
  END IF;
END $$;

-- Deshabilitar temporalmente RLS para poder eliminar
-- Usar tabla movements (todavía no se ha renombrado a transactions)
ALTER TABLE movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_periods DISABLE ROW LEVEL SECURITY;
ALTER TABLE pre_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_adjustments DISABLE ROW LEVEL SECURITY;
ALTER TABLE contributions DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_incomes DISABLE ROW LEVEL SECURITY;
ALTER TABLE household_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE household_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE households DISABLE ROW LEVEL SECURITY;

-- Si existe profiles (de migración parcial), deshabilitarla también
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    EXECUTE 'ALTER TABLE profiles DISABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Eliminar datos en orden correcto (respetando FKs)
-- 1. Transacciones y detalles
DELETE FROM movements;
DELETE FROM monthly_periods;

-- 2. Sistema de contribuciones
DELETE FROM pre_payments;
DELETE FROM contribution_adjustments;
DELETE FROM contributions;
DELETE FROM member_incomes;
DELETE FROM household_settings;

-- 3. Categorías
DELETE FROM categories;

-- 4. Invitaciones
DELETE FROM invitations;

-- 5. Configuración de usuario
DELETE FROM user_settings;

-- 6. Membresías y hogares
DELETE FROM household_members;
DELETE FROM households;

-- 7. Perfiles (excepto administradores) - solo si existe la tabla
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    EXECUTE 'DELETE FROM profiles WHERE auth_user_id NOT IN (SELECT user_id FROM system_admins)';
  END IF;
END $$;

-- Habilitar RLS nuevamente
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;

-- Habilitar profiles si existe
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    EXECUTE 'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Resetear secuencias (si existen)
-- No tenemos secuencias, todos son UUIDs

-- Resumen
DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'WIPE COMPLETED SUCCESSFULLY';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Data removed:';
  RAISE NOTICE '- All movements (transactions)';
  RAISE NOTICE '- All monthly periods';
  RAISE NOTICE '- All contributions and pre-payments';
  RAISE NOTICE '- All categories';
  RAISE NOTICE '- All invitations';
  RAISE NOTICE '- All households and memberships';
  RAISE NOTICE '- All user profiles except system admins (if profiles table exists)';
  RAISE NOTICE '';
  RAISE NOTICE 'Preserved:';
  RAISE NOTICE '- Database structure (tables, columns, indexes)';
  RAISE NOTICE '- Functions and triggers';
  RAISE NOTICE '- RLS policies';
  RAISE NOTICE '- System admins (%)', (SELECT COUNT(*) FROM system_admins);
  RAISE NOTICE '';
  RAISE NOTICE 'The database is now clean and ready for fresh data.';
  RAISE NOTICE 'Next step: Run "npx supabase db push" to apply all migrations.';
  RAISE NOTICE '============================================================================';
END $$;
