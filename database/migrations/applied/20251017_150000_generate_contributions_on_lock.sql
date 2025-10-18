-- 20251017_150000_generate_contributions_on_lock.sql
-- Genera registros de contribución para todos los miembros al bloquear el período (fase 'validation')
-- Autor: GitHub Copilot

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_name = 'generate_contributions_for_period'
      AND routine_schema = 'public'
  ) THEN
    CREATE OR REPLACE FUNCTION public.generate_contributions_for_period(
      p_household_id uuid,
      p_period_id uuid
    ) RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      v_year integer;
      v_month integer;
      v_profile_id uuid;
      v_expected_amount numeric;
      v_method text;
      v_contribution_id uuid;
    BEGIN
      -- Obtener año y mes del período
      SELECT year, month INTO v_year, v_month
      FROM public.monthly_periods
      WHERE id = p_period_id;

      -- Para cada miembro activo del hogar, crear registro de contribución si no existe
      FOR v_profile_id IN
        SELECT profile_id FROM public.household_members
        WHERE household_id = p_household_id
      LOOP
        -- Lógica de cálculo: aquí puedes ajustar el método según reglas del hogar
        v_method := 'equal';
        v_expected_amount := 0; -- TODO: calcular según reglas reales

        -- Solo crear si no existe
        IF NOT EXISTS (
          SELECT 1 FROM public.contributions
          WHERE household_id = p_household_id
            AND profile_id = v_profile_id
            AND year = v_year
            AND month = v_month
        ) THEN
          INSERT INTO public.contributions (
            household_id, year, month, profile_id, expected_amount, paid_amount, status, calculation_method, created_at
          ) VALUES (
            p_household_id, v_year, v_month, v_profile_id, v_expected_amount, 0, 'pending', v_method, NOW()
          ) RETURNING id INTO v_contribution_id;
        END IF;
      END LOOP;
    END;
    $$;
  END IF;
END $$;

-- Modifica lock_contributions_period para llamar a la función de generación
CREATE OR REPLACE FUNCTION public.lock_contributions_period(
  p_household_id uuid,
  p_period_id uuid,
  p_locked_by uuid
) RETURNS uuid
    LANGUAGE plpgsql
    SECURITY DEFINER
AS $function$
DECLARE
  v_period RECORD;
BEGIN
  SELECT
    id,
    household_id,
    phase
  INTO v_period
  FROM public.monthly_periods
  WHERE id = p_period_id
    AND household_id = p_household_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período % no pertenece al hogar %', p_period_id, p_household_id;
  END IF;

  IF v_period.phase = 'closed' THEN
    RAISE EXCEPTION 'El período ya está cerrado';
  END IF;

  IF v_period.phase NOT IN ('preparing', 'validation') THEN
    RAISE EXCEPTION 'Solo se puede validar un período en fases preparing o validation (fase actual: %)', v_period.phase;
  END IF;

  -- Generar contribuciones para todos los miembros
  PERFORM public.generate_contributions_for_period(p_household_id, p_period_id);

  UPDATE public.monthly_periods
  SET
    phase = 'validation',
    status = 'open',
    validated_at = COALESCE(validated_at, NOW()),
    validated_by = COALESCE(validated_by, p_locked_by),
    locked_at = NOW(),
    locked_by = p_locked_by,
    updated_at = NOW()
  WHERE id = p_period_id;

  PERFORM public.log_dual_flow_event(
    p_household_id,
    p_period_id,
    'period.validated',
    jsonb_build_object('locked_by', p_locked_by)
  );

  RETURN p_period_id;
END;
$function$;

-- Refresca vistas materializadas tras generar contribuciones
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_pending_contributions;
REFRESH MATERIALIZED VIEW CONCURRENTLY household_stats;
