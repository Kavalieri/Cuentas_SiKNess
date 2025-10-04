-- Fix: accept_invitation uses user_id instead of profile_id
-- Error: "column hm.user_id does not exist"
-- household_members table uses profile_id after refactoring

DROP FUNCTION IF EXISTS accept_invitation(text);

CREATE OR REPLACE FUNCTION accept_invitation(p_token text)
RETURNS TABLE(
  success boolean,
  message text,
  household_id uuid,
  household_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation record;
  v_user_id uuid;
  v_profile_id uuid;
  v_result_household_id uuid;
  v_result_household_name text;
  v_already_member boolean;
BEGIN
  -- Obtener el usuario actual
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Usuario no autenticado'::text, null::uuid, null::text;
    RETURN;
  END IF;

  -- Obtener profile_id del usuario (NUEVO: Patrón de 2 pasos)
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE auth_user_id = v_user_id;

  IF v_profile_id IS NULL THEN
    RETURN QUERY SELECT false, 'Perfil de usuario no encontrado'::text, null::uuid, null::text;
    RETURN;
  END IF;

  -- Buscar la invitación
  SELECT * INTO v_invitation
  FROM invitations
  WHERE token = p_token
  AND status = 'pending';

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invitación no encontrada o ya procesada'::text, null::uuid, null::text;
    RETURN;
  END IF;

  -- Validar que no esté expirada
  IF v_invitation.expires_at < NOW() THEN
    UPDATE invitations SET status = 'expired' WHERE id = v_invitation.id;
    RETURN QUERY SELECT false, 'La invitación ha expirado'::text, null::uuid, null::text;
    RETURN;
  END IF;

  -- Validar max_uses si está configurado
  IF v_invitation.max_uses IS NOT NULL AND v_invitation.current_uses >= v_invitation.max_uses THEN
    RETURN QUERY SELECT false, 'Esta invitación ha alcanzado el límite de usos'::text, null::uuid, null::text;
    RETURN;
  END IF;

  -- Si es invitación tipo 'household', validar email y membership
  IF v_invitation.type = 'household' THEN
    -- Validar que el email coincida (si está especificado)
    IF v_invitation.email IS NOT NULL THEN
      DECLARE
        v_user_email text;
      BEGIN
        SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
        IF LOWER(v_user_email) != LOWER(v_invitation.email) THEN
          RETURN QUERY SELECT false, 'Esta invitación es para otro email'::text, null::uuid, null::text;
          RETURN;
        END IF;
      END;
    END IF;

    -- Verificar que no sea ya miembro del household (FIXED: profile_id)
    SELECT EXISTS(
      SELECT 1 FROM household_members hm
      WHERE hm.profile_id = v_profile_id
      AND hm.household_id = v_invitation.household_id
    ) INTO v_already_member;

    IF v_already_member THEN
      -- Obtener nombre del household
      SELECT name INTO v_result_household_name
      FROM households
      WHERE id = v_invitation.household_id;
      
      RETURN QUERY SELECT false, 'Ya eres miembro de este hogar'::text, v_invitation.household_id, v_result_household_name;
      RETURN;
    END IF;

    -- Añadir al household (FIXED: profile_id)
    INSERT INTO household_members (household_id, profile_id, role)
    VALUES (v_invitation.household_id, v_profile_id, 'member');

    v_result_household_id := v_invitation.household_id;
    
    -- Obtener nombre del household
    SELECT name INTO v_result_household_name
    FROM households
    WHERE id = v_result_household_id;
  ELSE
    -- Invitación tipo 'app': no hay household al que unirse
    v_result_household_id := NULL;
    v_result_household_name := NULL;
  END IF;

  -- Incrementar contador de usos
  UPDATE invitations
  SET current_uses = current_uses + 1,
      accepted_by = v_user_id,
      accepted_at = NOW(),
      status = CASE
        WHEN max_uses IS NOT NULL AND current_uses + 1 >= max_uses THEN 'accepted'
        ELSE status
      END
  WHERE id = v_invitation.id;

  -- Retornar éxito
  RETURN QUERY SELECT true, 'Invitación aceptada correctamente'::text, v_result_household_id, v_result_household_name;
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION accept_invitation(text) TO authenticated;

COMMENT ON FUNCTION accept_invitation(text) IS 
'Acepta una invitación por token. Valida email, expiración, límites y añade al usuario al household si es tipo household. UPDATED: Usa profile_id en lugar de user_id.';
