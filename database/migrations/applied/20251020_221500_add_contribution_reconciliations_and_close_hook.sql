-- 20251020_221500_add_contribution_reconciliations_and_close_hook.sql
-- Idempotent reconciliation tracking and hook on period close

SET client_min_messages = warning;
SET search_path = public, pg_catalog;

-- 1) Create table to track reconciliation runs per contribution
CREATE TABLE IF NOT EXISTS public.contribution_reconciliations (
  contribution_id UUID PRIMARY KEY REFERENCES public.contributions(id) ON DELETE CASCADE,
  last_reconciled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_result JSONB,
  reconciled_by UUID REFERENCES public.profiles(id),
  notes TEXT
);

COMMENT ON TABLE public.contribution_reconciliations IS 'Registro idempotente de reconciliaciones por contribución.';

-- 2) Replace reconcile_contribution_balance to be idempotent based on last result
CREATE OR REPLACE FUNCTION public.reconcile_contribution_balance(
  p_contribution_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_contribution RECORD;
  v_previous_balance NUMERIC;
  v_delta NUMERIC;
  v_final_balance NUMERIC;
  v_applied_credit NUMERIC := 0;
  v_last JSONB;
BEGIN
  -- Load contribution
  SELECT * INTO v_contribution
  FROM public.contributions
  WHERE id = p_contribution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contribution not found: %', p_contribution_id;
  END IF;

  -- Compute current delta
  v_delta := COALESCE(v_contribution.paid_amount, 0) - COALESCE(v_contribution.expected_amount, 0);

  -- If we already reconciled with same delta, short-circuit
  SELECT last_result INTO v_last
  FROM public.contribution_reconciliations
  WHERE contribution_id = p_contribution_id;

  IF v_last IS NOT NULL AND (v_last->>'delta')::numeric = v_delta THEN
    -- Update timestamp and return previous result (idempotent)
    UPDATE public.contribution_reconciliations
    SET last_reconciled_at = NOW()
    WHERE contribution_id = p_contribution_id;
    RETURN v_last || jsonb_build_object('idempotent', true, 'timestamp', NOW());
  END IF;

  -- Compute previous balance
  SELECT COALESCE(current_balance, 0) INTO v_previous_balance
  FROM public.member_balances
  WHERE household_id = v_contribution.household_id
    AND profile_id = v_contribution.profile_id;

  -- Apply reconciliation
  IF v_previous_balance > 0 AND v_delta < 0 THEN
    v_applied_credit := LEAST(v_previous_balance, ABS(v_delta));
    v_final_balance := v_previous_balance + v_delta;

    UPDATE public.member_balances
    SET current_balance = v_final_balance,
        last_updated_at = NOW(),
        notes = 'Auto-reconciled: applied ' || v_applied_credit || '€ credit to cover debt from period ' || v_contribution.year || '-' || v_contribution.month
    WHERE household_id = v_contribution.household_id
      AND profile_id = v_contribution.profile_id;
  ELSE
    v_final_balance := public.update_member_balance(
      v_contribution.household_id,
      v_contribution.profile_id,
      v_delta,
      'Contribution balance from period ' || v_contribution.year || '-' || v_contribution.month
    );
  END IF;

  -- Persist reconciliation record
  INSERT INTO public.contribution_reconciliations (contribution_id, last_reconciled_at, last_result)
  VALUES (p_contribution_id, NOW(), jsonb_build_object(
    'contribution_id', p_contribution_id,
    'period', v_contribution.year || '-' || LPAD(v_contribution.month::TEXT, 2, '0'),
    'expected', v_contribution.expected_amount,
    'paid', v_contribution.paid_amount,
    'delta', v_delta,
    'previous_balance', v_previous_balance,
    'applied_credit', v_applied_credit,
    'final_balance', v_final_balance,
    'reconciled', true
  ))
  ON CONFLICT (contribution_id)
  DO UPDATE SET
    last_reconciled_at = EXCLUDED.last_reconciled_at,
    last_result = EXCLUDED.last_result;

  RETURN (
    SELECT last_result FROM public.contribution_reconciliations WHERE contribution_id = p_contribution_id
  ) || jsonb_build_object('timestamp', NOW());
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.reconcile_contribution_balance(UUID) IS 'Idempotent reconciliation for contribution → member_balances with tracking table.';

-- 3) Hook reconciliation on close_monthly_period (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'close_monthly_period'
  ) THEN
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
      SELECT id, household_id, year, month, phase, opening_balance
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

      -- Reconciliar todas las contribuciones del período (idempotente)
      PERFORM public.reconcile_contribution_balance(c.id)
      FROM public.contributions c
      WHERE c.household_id = p_household_id
        AND c.year = v_period.year
        AND c.month = v_period.month;

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
  END IF;
END $$;

-- 4) Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contribution_reconciliations TO cuentassik_user;
GRANT EXECUTE ON FUNCTION public.reconcile_contribution_balance(UUID) TO cuentassik_user;

-- 5) Register migration
INSERT INTO _migrations (migration_name, description)
VALUES ('20251020_221500_add_contribution_reconciliations_and_close_hook.sql', 'Idempotent reconciliation tracking and period close hook')
ON CONFLICT (migration_name) DO NOTHING;
