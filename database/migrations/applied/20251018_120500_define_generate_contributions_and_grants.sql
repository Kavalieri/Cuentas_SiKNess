-- 20251018_120500_define_generate_contributions_and_grants.sql
-- Corrige error al bloquear período: falta la función public.generate_contributions_for_period(uuid, uuid)
-- Además otorga permisos de ejecución al rol de aplicación.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'generate_contributions_for_period'
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

      -- Crear contribuciones placeholder para cada miembro (cálculo real se hará en la app)
      FOR v_profile_id IN
        SELECT profile_id FROM public.household_members
        WHERE household_id = p_household_id
      LOOP
        -- Método por defecto: equal (placeholder). El cálculo real lo maneja la API.
        v_method := 'equal';
        v_expected_amount := 0;

        -- Solo crear si no existe aún
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

-- Otorgar permisos de ejecución al rol de aplicación (idempotente)
DO $$
BEGIN
  BEGIN
    GRANT EXECUTE ON FUNCTION public.generate_contributions_for_period(uuid, uuid) TO cuentassik_user;
  EXCEPTION WHEN undefined_function THEN
    -- Si la función aún no existe por cualquier razón, no fallar.
    NULL;
  END;
END $$;

-- Opcional: refrescar vistas materializadas clave
-- NOTA: si no existen se ignoran silenciosamente
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM pg_matviews WHERE matviewname = 'mv_member_pending_contributions';
    IF FOUND THEN
      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_pending_contributions;
    END IF;
  EXCEPTION WHEN others THEN NULL;
  END;

  BEGIN
    PERFORM 1 FROM pg_matviews WHERE matviewname = 'household_stats';
    IF FOUND THEN
      REFRESH MATERIALIZED VIEW CONCURRENTLY household_stats;
    END IF;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;
