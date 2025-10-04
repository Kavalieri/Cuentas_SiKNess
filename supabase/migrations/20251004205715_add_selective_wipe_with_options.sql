-- ===========================================================================
-- SELECTIVE WIPE: Funciones con opciones configurables
-- ===========================================================================
-- Permite elegir qué elementos eliminar en cada wipe

-- =============================
-- 1. SELECTIVE WIPE HOUSEHOLD (con opciones)
-- =============================

CREATE OR REPLACE FUNCTION selective_wipe_household(
  p_household_id uuid,
  p_options jsonb DEFAULT '{"transactions": true, "contributions": true, "adjustments": true, "categories": true, "memberIncomes": true, "householdSettings": true, "households": false}'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_user_id uuid;
  v_profile_id uuid;
  v_role text;
  v_deleted int;
  v_result jsonb := '{}'::jsonb;
BEGIN
  -- Obtener el auth user ID
  v_auth_user_id := auth.uid();
  
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Obtener el profile_id del usuario autenticado
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE auth_user_id = v_auth_user_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil no encontrado';
  END IF;

  -- Verificar que el usuario es owner del household O system admin
  SELECT role INTO v_role
  FROM household_members
  WHERE household_id = p_household_id
    AND profile_id = v_profile_id;

  IF v_role IS NULL THEN
    -- Verificar si es system admin
    IF NOT EXISTS (SELECT 1 FROM system_admins WHERE user_id = v_auth_user_id) THEN
      RAISE EXCEPTION 'No tienes permisos para ejecutar esta acción';
    END IF;
  ELSIF v_role != 'owner' THEN
    -- Verificar si es system admin
    IF NOT EXISTS (SELECT 1 FROM system_admins WHERE user_id = v_auth_user_id) THEN
      RAISE EXCEPTION 'Solo el owner o system admin puede ejecutar wipe';
    END IF;
  END IF;

  -- Eliminar según opciones
  
  -- 1. Adjustments (si está marcado)
  IF (p_options->>'adjustments')::boolean THEN
    DELETE FROM contribution_adjustments 
    WHERE contribution_id IN (
      SELECT id FROM contributions WHERE household_id = p_household_id
    );
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_result := v_result || jsonb_build_object('adjustments', v_deleted);
  END IF;

  -- 2. Contributions (si está marcado)
  IF (p_options->>'contributions')::boolean THEN
    DELETE FROM contributions 
    WHERE household_id = p_household_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_result := v_result || jsonb_build_object('contributions', v_deleted);
  END IF;

  -- 3. Member incomes (si está marcado)
  IF (p_options->>'memberIncomes')::boolean THEN
    DELETE FROM member_incomes 
    WHERE household_id = p_household_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_result := v_result || jsonb_build_object('memberIncomes', v_deleted);
  END IF;

  -- 4. Household settings (si está marcado)
  IF (p_options->>'householdSettings')::boolean THEN
    DELETE FROM household_settings 
    WHERE household_id = p_household_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_result := v_result || jsonb_build_object('householdSettings', v_deleted);
  END IF;

  -- 5. Transactions (si está marcado)
  IF (p_options->>'transactions')::boolean THEN
    DELETE FROM transactions 
    WHERE household_id = p_household_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_result := v_result || jsonb_build_object('transactions', v_deleted);
  END IF;

  -- 6. Categories (si está marcado, las recrearemos después)
  IF (p_options->>'categories')::boolean THEN
    DELETE FROM categories 
    WHERE household_id = p_household_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_result := v_result || jsonb_build_object('categories', v_deleted);
    
    -- Recrear categorías por defecto
    PERFORM create_default_categories(p_household_id);
  END IF;

  -- 7. Household completo (si está marcado - solo para admin)
  IF (p_options->>'households')::boolean THEN
    -- Verificar que es system admin
    IF NOT EXISTS (SELECT 1 FROM system_admins WHERE user_id = v_auth_user_id) THEN
      RAISE EXCEPTION 'Solo system admin puede eliminar hogares';
    END IF;
    
    -- Eliminar membresías
    DELETE FROM household_members WHERE household_id = p_household_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_result := v_result || jsonb_build_object('members', v_deleted);
    
    -- Eliminar hogar
    DELETE FROM households WHERE id = p_household_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_result := v_result || jsonb_build_object('households', v_deleted);
  END IF;

  -- Retornar resumen
  RETURN json_build_object(
    'success', true,
    'message', 'Wipe selectivo completado',
    'deleted', v_result
  );
END;
$$;

COMMENT ON FUNCTION selective_wipe_household(uuid, jsonb) IS 
'Wipe selectivo de un hogar con opciones configurables. Solo para owner o system admin.';

-- =============================
-- 2. SELECTIVE WIPE SYSTEM (con opciones)
-- =============================

CREATE OR REPLACE FUNCTION selective_wipe_system(
  p_options jsonb DEFAULT '{"transactions": true, "contributions": true, "adjustments": true, "categories": true, "memberIncomes": true, "householdSettings": true, "households": true}'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted int;
  v_result jsonb := '{}'::jsonb;
  v_household_ids uuid[];
BEGIN
  -- Verificar que el usuario es system admin
  IF NOT EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Solo los administradores del sistema pueden ejecutar esta acción';
  END IF;

  -- Si NO vamos a eliminar hogares, aplicar wipe a cada hogar individualmente
  IF NOT (p_options->>'households')::boolean THEN
    -- Obtener todos los hogares
    SELECT array_agg(id) INTO v_household_ids FROM households;
    
    -- Aplicar wipe selectivo a cada hogar
    FOR i IN 1..array_length(v_household_ids, 1) LOOP
      PERFORM selective_wipe_household(v_household_ids[i], p_options);
    END LOOP;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Wipe selectivo aplicado a todos los hogares',
      'households_affected', array_length(v_household_ids, 1)
    );
  END IF;

  -- Si vamos a eliminar hogares, hacer wipe completo

  -- 1. Adjustments
  IF (p_options->>'adjustments')::boolean THEN
    DELETE FROM contribution_adjustments;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_result := v_result || jsonb_build_object('adjustments', v_deleted);
  END IF;

  -- 2. Contributions
  IF (p_options->>'contributions')::boolean THEN
    DELETE FROM contributions;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_result := v_result || jsonb_build_object('contributions', v_deleted);
  END IF;

  -- 3. Member incomes
  IF (p_options->>'memberIncomes')::boolean THEN
    DELETE FROM member_incomes;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_result := v_result || jsonb_build_object('memberIncomes', v_deleted);
  END IF;

  -- 4. Household settings
  IF (p_options->>'householdSettings')::boolean THEN
    DELETE FROM household_settings;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_result := v_result || jsonb_build_object('householdSettings', v_deleted);
  END IF;

  -- 5. Transactions
  IF (p_options->>'transactions')::boolean THEN
    DELETE FROM transactions;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_result := v_result || jsonb_build_object('transactions', v_deleted);
  END IF;

  -- 6. Categories
  IF (p_options->>'categories')::boolean THEN
    DELETE FROM categories;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_result := v_result || jsonb_build_object('categories', v_deleted);
  END IF;

  -- 7. Households (si está marcado)
  IF (p_options->>'households')::boolean THEN
    DELETE FROM invitations;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_result := v_result || jsonb_build_object('invitations', v_deleted);
    
    DELETE FROM user_settings;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_result := v_result || jsonb_build_object('user_settings', v_deleted);
    
    DELETE FROM household_members;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_result := v_result || jsonb_build_object('members', v_deleted);
    
    DELETE FROM households;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_result := v_result || jsonb_build_object('households', v_deleted);
    
    -- Eliminar profiles NO protegidos (no system admins)
    DELETE FROM profiles 
    WHERE auth_user_id NOT IN (
      SELECT user_id FROM system_admins
    );
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_result := v_result || jsonb_build_object('profiles', v_deleted);
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Wipe selectivo del sistema completado',
    'deleted', v_result
  );
END;
$$;

COMMENT ON FUNCTION selective_wipe_system(jsonb) IS 
'Wipe selectivo del sistema con opciones configurables. Solo para system admins.';

-- =============================
-- 3. Mantener funciones antiguas para compatibilidad
-- =============================
-- Las funciones wipe_household_data, wipe_system_data y restore_to_stock
-- ya existen y funcionan. Las mantenemos para compatibilidad.
