-- Migración: 20251016_120000_normalize_monthly_periods.sql
-- Descripción: Normaliza monthly_periods con fases explícitas, metadatos de validación y control de estados.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'period_phase_enum') THEN
    CREATE TYPE public.period_phase_enum AS ENUM (
      'preparing',
      'validation',
      'active',
      'closing',
      'closed'
    );

    COMMENT ON TYPE public.period_phase_enum IS 'Fases del workflow mensual: preparing, validation, active, closing y closed';
  END IF;
END
$$;

ALTER TABLE public.monthly_periods
  ADD COLUMN IF NOT EXISTS phase public.period_phase_enum DEFAULT 'preparing'::public.period_phase_enum NOT NULL;

ALTER TABLE public.monthly_periods
  ADD COLUMN IF NOT EXISTS validated_at timestamptz;

ALTER TABLE public.monthly_periods
  ADD COLUMN IF NOT EXISTS validated_by uuid;

ALTER TABLE public.monthly_periods
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

ALTER TABLE public.monthly_periods
  ADD COLUMN IF NOT EXISTS locked_by uuid;

ALTER TABLE public.monthly_periods
  ADD COLUMN IF NOT EXISTS opened_at timestamptz DEFAULT NOW();

ALTER TABLE public.monthly_periods
  ADD COLUMN IF NOT EXISTS opened_by uuid;

ALTER TABLE public.monthly_periods
  ADD COLUMN IF NOT EXISTS closing_started_at timestamptz;

ALTER TABLE public.monthly_periods
  ADD COLUMN IF NOT EXISTS closing_started_by uuid;

ALTER TABLE public.monthly_periods
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'monthly_periods_validated_by_fkey'
      AND table_name = 'monthly_periods'
  ) THEN
    ALTER TABLE public.monthly_periods
      ADD CONSTRAINT monthly_periods_validated_by_fkey
        FOREIGN KEY (validated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'monthly_periods_locked_by_fkey'
      AND table_name = 'monthly_periods'
  ) THEN
    ALTER TABLE public.monthly_periods
      ADD CONSTRAINT monthly_periods_locked_by_fkey
        FOREIGN KEY (locked_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'monthly_periods_opened_by_fkey'
      AND table_name = 'monthly_periods'
  ) THEN
    ALTER TABLE public.monthly_periods
      ADD CONSTRAINT monthly_periods_opened_by_fkey
        FOREIGN KEY (opened_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'monthly_periods_closing_started_by_fkey'
      AND table_name = 'monthly_periods'
  ) THEN
    ALTER TABLE public.monthly_periods
      ADD CONSTRAINT monthly_periods_closing_started_by_fkey
        FOREIGN KEY (closing_started_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END
$$;

UPDATE public.monthly_periods
SET phase = CASE
  WHEN status = 'closed' THEN 'closed'
  WHEN status IN ('pending_close', 'closing') THEN 'closing'
  WHEN status IN ('validation', 'locked') THEN 'validation'
  WHEN status IN ('open', 'active') THEN 'active'
  ELSE 'preparing'
END;

UPDATE public.monthly_periods
SET status = CASE
  WHEN status = 'closed' THEN 'closed'
  WHEN status IN ('pending_close', 'closing') THEN 'pending_close'
  ELSE 'open'
END;

ALTER TABLE public.monthly_periods
  DROP CONSTRAINT IF EXISTS monthly_periods_status_check;

ALTER TABLE public.monthly_periods
  ADD CONSTRAINT monthly_periods_status_check CHECK (
    status = ANY (ARRAY['open', 'pending_close', 'closed'])
  );

UPDATE public.monthly_periods
SET opened_at = COALESCE(opened_at, created_at);

ALTER TABLE public.monthly_periods
  ALTER COLUMN opened_at SET NOT NULL;

UPDATE public.monthly_periods
SET closing_started_at = COALESCE(closing_started_at, validated_at, created_at)
WHERE phase IN ('closing', 'closed');

UPDATE public.monthly_periods
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

ALTER TABLE public.monthly_periods
  ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.monthly_periods
  ALTER COLUMN updated_at SET DEFAULT NOW();

UPDATE public.monthly_periods
SET closed_at = NULL
WHERE status <> 'closed' AND closed_at IS NOT NULL;

UPDATE public.monthly_periods
SET closed_at = COALESCE(closed_at, created_at)
WHERE status = 'closed' AND closed_at IS NULL;

UPDATE public.monthly_periods
SET validated_at = COALESCE(validated_at, created_at)
WHERE phase = 'validation';

COMMENT ON COLUMN public.monthly_periods.phase IS 'Fase operativa del período mensual (preparing, validation, active, closing o closed)';
COMMENT ON COLUMN public.monthly_periods.validated_at IS 'Momento en el que el período fue validado para activar contribuciones';
COMMENT ON COLUMN public.monthly_periods.validated_by IS 'Perfil que validó el período para activar contribuciones';
COMMENT ON COLUMN public.monthly_periods.locked_at IS 'Marca temporal de cierre de aportaciones manuales en el período';
COMMENT ON COLUMN public.monthly_periods.locked_by IS 'Perfil que ejecutó el cierre manual de aportaciones';
COMMENT ON COLUMN public.monthly_periods.opened_at IS 'Fecha y hora en la que el período pasó a fase activa';
COMMENT ON COLUMN public.monthly_periods.opened_by IS 'Perfil que activó el período';
COMMENT ON COLUMN public.monthly_periods.closing_started_at IS 'Fecha y hora en la que se inició el cierre del período';
COMMENT ON COLUMN public.monthly_periods.closing_started_by IS 'Perfil que inició el cierre del período';
COMMENT ON COLUMN public.monthly_periods.updated_at IS 'Marca de tiempo de la última actualización del período mensual';

CREATE INDEX IF NOT EXISTS idx_monthly_periods_household_phase
  ON public.monthly_periods (household_id, phase);

DROP TRIGGER IF EXISTS trigger_update_monthly_periods_timestamp ON public.monthly_periods;
CREATE TRIGGER trigger_update_monthly_periods_timestamp
BEFORE UPDATE ON public.monthly_periods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.dual_flow_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  period_id uuid REFERENCES public.monthly_periods(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT NOW() NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.dual_flow_events IS 'Bitácora de eventos del sistema dual-flow (periodos, contribuciones y transacciones)';
COMMENT ON COLUMN public.dual_flow_events.event_type IS 'Identificador canónico del evento (ej. period.validated, period.closed)';
COMMENT ON COLUMN public.dual_flow_events.payload IS 'Información adicional del evento en formato JSON';

CREATE INDEX IF NOT EXISTS idx_dual_flow_events_household_created_at
  ON public.dual_flow_events (household_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dual_flow_events_period
  ON public.dual_flow_events (period_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dual_flow_events TO cuentassik_user;

CREATE OR REPLACE FUNCTION public.log_dual_flow_event(
  p_household_id uuid,
  p_period_id uuid,
  p_event_type text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_created_by uuid DEFAULT NULL
) RETURNS uuid
    LANGUAGE plpgsql
    SECURITY DEFINER
AS $function$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO public.dual_flow_events (
    household_id,
    period_id,
    event_type,
    payload,
    created_by
  ) VALUES (
    p_household_id,
    p_period_id,
    p_event_type,
    COALESCE(p_payload, '{}'::jsonb),
    p_created_by
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.log_dual_flow_event(uuid, uuid, text, jsonb, uuid) TO cuentassik_user;

CREATE OR REPLACE FUNCTION public.ensure_monthly_period(
  p_household_id uuid,
  p_year integer,
  p_month integer
) RETURNS uuid
    LANGUAGE plpgsql
    SECURITY DEFINER
AS $function$
DECLARE
  v_period_id uuid;
  v_previous_year integer;
  v_previous_month integer;
  v_opening_balance numeric := 0;
  v_status text;
  v_phase public.period_phase_enum;
  v_current_year integer;
  v_current_month integer;
BEGIN
  SELECT id INTO v_period_id
  FROM public.monthly_periods
  WHERE household_id = p_household_id
    AND year = p_year
    AND month = p_month;

  IF FOUND THEN
    RETURN v_period_id;
  END IF;

  IF p_month = 1 THEN
    v_previous_year := p_year - 1;
    v_previous_month := 12;
  ELSE
    v_previous_year := p_year;
    v_previous_month := p_month - 1;
  END IF;

  SELECT closing_balance
  INTO v_opening_balance
  FROM public.monthly_periods
  WHERE household_id = p_household_id
    AND year = v_previous_year
    AND month = v_previous_month;

  SELECT
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
  INTO v_current_year, v_current_month;

  IF p_year < v_current_year OR (p_year = v_current_year AND p_month < v_current_month) THEN
    v_status := 'pending_close';
    v_phase := 'closing';
  ELSE
    v_status := 'open';
    v_phase := 'preparing';
  END IF;

  INSERT INTO public.monthly_periods (
    household_id,
    year,
    month,
    status,
    phase,
    opening_balance,
    closing_balance,
    opened_at
  ) VALUES (
    p_household_id,
    p_year,
    p_month,
    v_status,
    v_phase,
    COALESCE(v_opening_balance, 0),
    COALESCE(v_opening_balance, 0),
    NOW()
  )
  RETURNING id INTO v_period_id;

  PERFORM public.log_dual_flow_event(
    p_household_id,
    v_period_id,
    'period.created',
    jsonb_build_object('year', p_year, 'month', p_month)
  );

  RETURN v_period_id;
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.open_monthly_period(
  p_household_id uuid,
  p_period_id uuid,
  p_opened_by uuid
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

  IF v_period.phase <> 'validation' THEN
    RAISE EXCEPTION 'Solo se puede abrir un período que esté en fase validation (fase actual: %)', v_period.phase;
  END IF;

  UPDATE public.monthly_periods
  SET
    phase = 'active',
    status = 'open',
    opened_at = NOW(),
    opened_by = p_opened_by,
    updated_at = NOW()
  WHERE id = p_period_id;

  PERFORM public.log_dual_flow_event(
    p_household_id,
    p_period_id,
    'period.opened',
    jsonb_build_object('opened_by', p_opened_by)
  );

  RETURN p_period_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.start_monthly_closing(
  p_household_id uuid,
  p_period_id uuid,
  p_started_by uuid,
  p_reason text DEFAULT NULL
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

  IF v_period.phase <> 'active' THEN
    RAISE EXCEPTION 'Solo se puede iniciar el cierre de un período activo (fase actual: %)', v_period.phase;
  END IF;

  UPDATE public.monthly_periods
  SET
    phase = 'closing',
    status = 'pending_close',
    closing_started_at = NOW(),
    closing_started_by = p_started_by,
    notes = CASE WHEN p_reason IS NOT NULL THEN p_reason ELSE notes END,
    updated_at = NOW()
  WHERE id = p_period_id;

  PERFORM public.log_dual_flow_event(
    p_household_id,
    p_period_id,
    'period.closing_started',
    jsonb_build_object('started_by', p_started_by, 'reason', p_reason)
  );

  RETURN p_period_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.close_monthly_period(
  p_household_id uuid,
  p_period_id uuid,
  p_closed_by uuid,
  p_reason text DEFAULT NULL
) RETURNS uuid
    LANGUAGE plpgsql
    SECURITY DEFINER
AS $function$
DECLARE
  v_period RECORD;
  v_total_income numeric := 0;
  v_total_expenses numeric := 0;
  v_closing_balance numeric := 0;
BEGIN
  SELECT
    id,
    household_id,
    year,
    month,
    phase,
    opening_balance
  INTO v_period
  FROM public.monthly_periods
  WHERE id = p_period_id
    AND household_id = p_household_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período % no pertenece al hogar %', p_period_id, p_household_id;
  END IF;

  IF v_period.phase = 'closed' THEN
    RETURN p_period_id;
  END IF;

  IF v_period.phase <> 'closing' THEN
    RAISE EXCEPTION 'Solo se puede cerrar un período que esté en fase closing (fase actual: %)', v_period.phase;
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN t.type IN ('income', 'income_direct') THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type IN ('expense', 'expense_direct') THEN t.amount ELSE 0 END), 0)
  INTO v_total_income, v_total_expenses
  FROM public.transactions t
  WHERE t.household_id = p_household_id
    AND (
      t.period_id = p_period_id
      OR (
        t.period_id IS NULL
        AND t.occurred_at IS NOT NULL
        AND EXTRACT(YEAR FROM t.occurred_at) = v_period.year
        AND EXTRACT(MONTH FROM t.occurred_at) = v_period.month
      )
    );

  v_closing_balance := COALESCE(v_period.opening_balance, 0) + v_total_income - v_total_expenses;

  UPDATE public.monthly_periods
  SET
    phase = 'closed',
    status = 'closed',
    closed_at = NOW(),
    closed_by = p_closed_by,
    closing_started_at = COALESCE(closing_started_at, NOW()),
    closing_started_by = COALESCE(closing_started_by, p_closed_by),
    total_income = v_total_income,
    total_expenses = v_total_expenses,
    closing_balance = v_closing_balance,
    notes = CASE WHEN p_reason IS NOT NULL THEN p_reason ELSE notes END,
    updated_at = NOW()
  WHERE id = p_period_id;

  PERFORM public.log_dual_flow_event(
    p_household_id,
    p_period_id,
    'period.closed',
    jsonb_build_object(
      'closed_by', p_closed_by,
      'total_income', v_total_income,
      'total_expenses', v_total_expenses,
      'closing_balance', v_closing_balance,
      'reason', p_reason
    )
  );

  RETURN p_period_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.log_dual_flow_event(uuid, uuid, text, jsonb, uuid) TO cuentassik_user;
GRANT EXECUTE ON FUNCTION public.ensure_monthly_period(uuid, integer, integer) TO cuentassik_user;
GRANT EXECUTE ON FUNCTION public.lock_contributions_period(uuid, uuid, uuid) TO cuentassik_user;
GRANT EXECUTE ON FUNCTION public.open_monthly_period(uuid, uuid, uuid) TO cuentassik_user;
GRANT EXECUTE ON FUNCTION public.start_monthly_closing(uuid, uuid, uuid, text) TO cuentassik_user;
GRANT EXECUTE ON FUNCTION public.close_monthly_period(uuid, uuid, uuid, text) TO cuentassik_user;

GRANT EXECUTE ON FUNCTION public.lock_contributions_period(uuid, uuid, uuid) TO cuentassik_user;
GRANT EXECUTE ON FUNCTION public.open_monthly_period(uuid, uuid, uuid) TO cuentassik_user;
GRANT EXECUTE ON FUNCTION public.close_monthly_period(uuid, uuid, uuid, text) TO cuentassik_user;
