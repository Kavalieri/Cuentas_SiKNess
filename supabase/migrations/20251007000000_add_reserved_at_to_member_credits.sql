-- Migration: Agregar columna reserved_at a member_credits
-- Fecha: 7 octubre 2025
-- Propósito: Permitir "reservar" créditos para aplicar al mes siguiente,
--            sacándolos del balance principal disponible

-- Agregar columna reserved_at
ALTER TABLE member_credits
ADD COLUMN reserved_at TIMESTAMPTZ DEFAULT NULL;

-- Comentario explicativo
COMMENT ON COLUMN member_credits.reserved_at IS 
'Timestamp cuando el crédito fue reservado para aplicar al mes siguiente.
NULL = crédito activo (puede gastarse, forma parte del balance principal)
NOT NULL = crédito reservado (bloqueado para próximo mes, NO disponible para gastos)

Cuando un miembro decide "aplicar al mes siguiente" su crédito, se marca reserved_at.
Esto retira el crédito del balance principal disponible inmediatamente.';

-- Índice para queries eficientes de créditos activos vs reservados
CREATE INDEX idx_member_credits_reserved_at 
ON member_credits(profile_id, household_id, reserved_at)
WHERE status = 'active';

COMMENT ON INDEX idx_member_credits_reserved_at IS
'Índice para filtrar créditos activos (reserved_at NULL) vs reservados (reserved_at NOT NULL) 
por usuario y hogar. Usado en cálculos de balance principal.';

-- Función helper: Obtener créditos activos (no reservados) de un hogar
CREATE OR REPLACE FUNCTION get_active_credits_sum(p_household_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total
  FROM member_credits
  WHERE household_id = p_household_id
    AND status = 'active'
    AND reserved_at IS NULL;  -- Solo créditos NO reservados
  
  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION get_active_credits_sum IS
'Suma total de créditos activos (no reservados) de un hogar.
Solo cuenta créditos con reserved_at NULL, que forman parte del balance principal disponible.';

-- Función helper: Obtener créditos reservados de un hogar
CREATE OR REPLACE FUNCTION get_reserved_credits_sum(p_household_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total
  FROM member_credits
  WHERE household_id = p_household_id
    AND status = 'active'
    AND reserved_at IS NOT NULL;  -- Solo créditos reservados
  
  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION get_reserved_credits_sum IS
'Suma total de créditos reservados (bloqueados) de un hogar.
Solo cuenta créditos con reserved_at NOT NULL, que YA NO forman parte del balance principal disponible.';

-- Función: Reservar crédito para aplicar al mes siguiente
CREATE OR REPLACE FUNCTION reserve_credit_for_next_month(
  p_credit_id UUID,
  p_reserved_by UUID  -- profile_id del usuario que reserva (validación)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credit member_credits%ROWTYPE;
  v_result JSONB;
BEGIN
  -- 1. Obtener y bloquear el crédito
  SELECT * INTO v_credit
  FROM member_credits
  WHERE id = p_credit_id
    AND profile_id = p_reserved_by  -- Solo el dueño puede reservar
    AND status = 'active'
    AND reserved_at IS NULL  -- Solo si no está ya reservado
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Crédito no encontrado, ya reservado, o no eres el propietario'
    );
  END IF;
  
  -- 2. Marcar como reservado
  UPDATE member_credits
  SET 
    reserved_at = NOW(),
    monthly_decision = 'apply_to_month',
    auto_apply = true,
    updated_at = NOW()
  WHERE id = p_credit_id;
  
  -- 3. Retornar resultado exitoso
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Crédito reservado exitosamente para el próximo mes',
    'credit_id', p_credit_id,
    'amount', v_credit.amount,
    'reserved_at', NOW()
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION reserve_credit_for_next_month IS
'Reserva un crédito para aplicar al mes siguiente.
El crédito se marca con reserved_at = NOW() y se retira del balance principal disponible.
Solo el propietario del crédito (profile_id) puede reservarlo.';

-- Función: Desreservar crédito (en caso de cambio de decisión)
CREATE OR REPLACE FUNCTION unreserve_credit(
  p_credit_id UUID,
  p_unreserved_by UUID  -- profile_id del usuario que desreserva (validación)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credit member_credits%ROWTYPE;
  v_result JSONB;
BEGIN
  -- 1. Obtener y bloquear el crédito
  SELECT * INTO v_credit
  FROM member_credits
  WHERE id = p_credit_id
    AND profile_id = p_unreserved_by  -- Solo el dueño puede desreservar
    AND status = 'active'
    AND reserved_at IS NOT NULL  -- Solo si está reservado
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Crédito no encontrado, no está reservado, o no eres el propietario'
    );
  END IF;
  
  -- 2. Desmarcar como reservado
  UPDATE member_credits
  SET 
    reserved_at = NULL,
    monthly_decision = 'keep_active',
    auto_apply = false,
    updated_at = NOW()
  WHERE id = p_credit_id;
  
  -- 3. Retornar resultado exitoso
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Crédito desreservado exitosamente. Ahora está disponible para gastos.',
    'credit_id', p_credit_id,
    'amount', v_credit.amount
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION unreserve_credit IS
'Desreserva un crédito previamente reservado.
El crédito vuelve a formar parte del balance principal disponible (reserved_at = NULL).
Solo el propietario del crédito (profile_id) puede desreservarlo.';

-- Grants para las nuevas funciones
GRANT EXECUTE ON FUNCTION get_active_credits_sum TO authenticated;
GRANT EXECUTE ON FUNCTION get_reserved_credits_sum TO authenticated;
GRANT EXECUTE ON FUNCTION reserve_credit_for_next_month TO authenticated;
GRANT EXECUTE ON FUNCTION unreserve_credit TO authenticated;
