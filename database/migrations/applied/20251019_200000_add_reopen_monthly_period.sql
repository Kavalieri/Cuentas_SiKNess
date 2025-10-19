-- Migración: add reopen metadata y función revertir fase
-- Fecha: 2025-10-19 20:00:00
-- Nota: Cambios de estructura y funciones (sin modificar datos de usuario)

SET client_min_messages = warning;
SET search_path = public, pg_catalog;

-- Asegurar columnas de auditoría de reaperturas
ALTER TABLE IF EXISTS public.monthly_periods
  ADD COLUMN IF NOT EXISTS reopened_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reopened_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS last_reopened_by UUID NULL REFERENCES public.profiles(id);

COMMENT ON COLUMN public.monthly_periods.reopened_count IS 'Número de veces que el período ha retrocedido de fase (reaperturas).';
COMMENT ON COLUMN public.monthly_periods.last_reopened_at IS 'Última fecha/hora de retroceso de fase.';
COMMENT ON COLUMN public.monthly_periods.last_reopened_by IS 'Perfil que ejecutó el último retroceso de fase.';

-- Función helper para mapear estado por fase
CREATE OR REPLACE FUNCTION public._phase_to_status(p_phase text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE p_phase
    WHEN 'preparing' THEN RETURN 'open';
    WHEN 'validation' THEN RETURN 'open';
    WHEN 'active' THEN RETURN 'open';
    WHEN 'closing' THEN RETURN 'pending_close';
    WHEN 'closed' THEN RETURN 'closed';
    ELSE RETURN 'open';
  END CASE;
END;
$$;

-- Revertir a la fase anterior, con control de hogar y ownership
CREATE OR REPLACE FUNCTION public.reopen_monthly_period(
  p_household_id uuid,
  p_period_id uuid,
  p_reopened_by uuid,
  p_reason text DEFAULT NULL
) RETURNS uuid
    LANGUAGE plpgsql
    SECURITY DEFINER
AS $$
DECLARE
  v_period RECORD;
  v_new_phase text;
  v_new_status text;
  v_prev_phase text;
  v_is_owner boolean;
BEGIN
  -- Cargar período con lock de fila
  SELECT id, household_id, phase
  INTO v_period
  FROM public.monthly_periods
  WHERE id = p_period_id
    AND household_id = p_household_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período % no pertenece al hogar %', p_period_id, p_household_id;
  END IF;

  -- Permisos: solo owners del hogar
  SELECT public.is_user_household_owner(p_reopened_by, p_household_id)
  INTO v_is_owner;
  IF NOT COALESCE(v_is_owner, false) THEN
    RAISE EXCEPTION 'Solo los owners del hogar pueden revertir fases';
  END IF;

  v_prev_phase := v_period.phase;

  -- Determinar fase anterior válida
  IF v_prev_phase = 'validation' THEN
    v_new_phase := 'preparing';
  ELSIF v_prev_phase = 'active' THEN
    v_new_phase := 'validation';
  ELSIF v_prev_phase = 'closing' THEN
    v_new_phase := 'active';
  ELSIF v_prev_phase = 'closed' THEN
    v_new_phase := 'closing';
  ELSE
    RAISE EXCEPTION 'La fase % no permite retroceso', v_prev_phase;
  END IF;

  v_new_status := public._phase_to_status(v_new_phase);

  UPDATE public.monthly_periods
  SET
    phase = v_new_phase::period_phase_enum,
    status = v_new_status,
    last_reopened_at = NOW(),
    last_reopened_by = p_reopened_by,
    reopened_count = COALESCE(reopened_count, 0) + 1,
    -- Guardar motivo si se proporciona (no sobrescribe si es NULL)
    notes = CASE WHEN p_reason IS NOT NULL THEN p_reason ELSE notes END,
    updated_at = NOW()
  WHERE id = p_period_id;

  -- Audit log
  PERFORM public.log_dual_flow_event(
    p_household_id,
    p_period_id,
    'period.reopened',
    jsonb_build_object('from', v_prev_phase, 'to', v_new_phase, 'reason', p_reason, 'reopened_by', p_reopened_by)
  );

  RETURN p_period_id;
END;
$$;

-- Overload sin household_id (compatibilidad con tipos antiguos)
CREATE OR REPLACE FUNCTION public.reopen_monthly_period(
  p_period_id uuid,
  p_reopened_by uuid,
  p_reason text DEFAULT NULL
) RETURNS uuid
    LANGUAGE plpgsql
    SECURITY DEFINER
AS $$
DECLARE
  v_household_id uuid;
BEGIN
  SELECT household_id INTO v_household_id FROM public.monthly_periods WHERE id = p_period_id;
  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'Período % no encontrado', p_period_id;
  END IF;
  RETURN public.reopen_monthly_period(v_household_id, p_period_id, p_reopened_by, p_reason);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reopen_monthly_period(uuid, uuid, uuid, text) TO cuentassik_user;
GRANT EXECUTE ON FUNCTION public.reopen_monthly_period(uuid, uuid, text) TO cuentassik_user;
