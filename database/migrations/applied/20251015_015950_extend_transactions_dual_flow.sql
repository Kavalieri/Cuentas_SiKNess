-- Migración: 20251015_015950_extend_transactions_dual_flow.sql
-- Descripción: Extiende transactions con metadatos dual-flow y crea vista unificada compatible con el plan de consolidación

BEGIN;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS dual_flow_status public.dual_flow_status NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_paired boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_days integer DEFAULT 7,
  ADD COLUMN IF NOT EXISTS pairing_threshold numeric(5,2) DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_review_days_positive;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_review_days_positive
    CHECK (review_days IS NULL OR review_days >= 0);

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_pairing_threshold_positive;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_pairing_threshold_positive
    CHECK (pairing_threshold IS NULL OR pairing_threshold >= 0);

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_approved_by_fkey;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_approved_by_fkey
    FOREIGN KEY (approved_by) REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_transactions_dual_flow_status
  ON public.transactions (dual_flow_status);

CREATE INDEX IF NOT EXISTS idx_transactions_requires_approval
  ON public.transactions (requires_approval)
  WHERE requires_approval IS TRUE;

CREATE INDEX IF NOT EXISTS idx_transactions_auto_paired
  ON public.transactions (auto_paired)
  WHERE auto_paired IS TRUE;

COMMENT ON COLUMN public.transactions.dual_flow_status IS 'Estado operativo dual-flow de la transacción';
COMMENT ON COLUMN public.transactions.requires_approval IS 'Indica si la transacción necesita aprobación manual';
COMMENT ON COLUMN public.transactions.auto_paired IS 'Marca si la transacción fue emparejada automáticamente';
COMMENT ON COLUMN public.transactions.review_days IS 'Días límite para revisión antes de la auto-aprobación';
COMMENT ON COLUMN public.transactions.pairing_threshold IS 'Umbral de importe para emparejamiento automático (diferencia aceptada)';
COMMENT ON COLUMN public.transactions.approved_at IS 'Fecha/hora en la que la transacción fue aprobada';
COMMENT ON COLUMN public.transactions.approved_by IS 'Perfil que aprobó la transacción dual-flow';

DROP VIEW IF EXISTS public.v_dual_flow_transactions_unified;

CREATE VIEW public.v_dual_flow_transactions_unified AS
SELECT
  t.id,
  t.household_id,
  COALESCE(NULLIF(t.description, ''), cat.name, 'Movimiento sin descripción') AS concepto,
  COALESCE(cat.name, 'Sin categoría') AS categoria,
  t.amount AS importe,
  t.occurred_at::date AS fecha,
  CASE
    WHEN t.type = 'expense_direct' THEN 'gasto_directo'::public.transaction_type_dual_flow
    WHEN t.type = 'income_direct' THEN 'ingreso_directo'::public.transaction_type_dual_flow
    WHEN t.type = 'expense' THEN 'gasto'::public.transaction_type_dual_flow
    ELSE 'ingreso'::public.transaction_type_dual_flow
  END AS tipo,
  t.dual_flow_status AS estado,
  CASE
    WHEN t.flow_type = 'direct' AND t.type LIKE 'expense%' THEN 'personal_to_common'::public.dual_flow_type
    WHEN t.flow_type = 'direct' AND t.type LIKE 'income%' THEN 'common_to_personal'::public.dual_flow_type
    ELSE 'common_fund'::public.dual_flow_type
  END AS tipo_flujo,
  t.created_by_profile_id AS creado_por,
  COALESCE(t.real_payer_id, t.paid_by) AS pagado_por,
  t.transaction_pair_id AS transaccion_pareja,
  t.auto_paired,
  t.requires_approval AS requiere_aprobacion,
  COALESCE(t.pairing_threshold, 5.00::numeric(5,2)) AS umbral_emparejamiento,
  COALESCE(t.review_days, 7) AS dias_revision,
  t.created_at,
  t.updated_at,
  t.approved_at,
  t.approved_by
FROM public.transactions t
LEFT JOIN public.categories cat ON cat.id = t.category_id;

COMMENT ON VIEW public.v_dual_flow_transactions_unified IS
  'Proyección de transactions con metadatos dual-flow equivalentes a la tabla dual_flow_transactions.';

-- Portar funciones de auto-pairing hacia transactions
DROP TRIGGER IF EXISTS trigger_dual_flow_auto_pairing ON public.dual_flow_transactions;
DROP TRIGGER IF EXISTS trigger_dual_flow_auto_pairing ON public.transactions;

CREATE OR REPLACE FUNCTION public.find_pairing_candidates(
  p_household_id uuid,
  p_transaction_id uuid,
  p_umbral numeric DEFAULT 5.00
) RETURNS TABLE(candidate_id uuid, diferencia_importe numeric, diferencia_dias integer, score numeric)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH transaction_data AS (
    SELECT
      type,
      amount,
      occurred_at::date AS fecha,
      category_id,
      COALESCE(pairing_threshold, p_umbral) AS threshold
    FROM public.transactions
    WHERE id = p_transaction_id
      AND household_id = p_household_id
      AND flow_type = 'direct'
      AND transaction_pair_id IS NULL
  )
  SELECT
    t.id AS candidate_id,
    ABS(t.amount - td.amount) AS diferencia_importe,
    ABS(EXTRACT(DAY FROM (t.occurred_at::date - td.fecha)))::integer AS diferencia_dias,
    (ABS(t.amount - td.amount) * 0.7 + ABS(EXTRACT(DAY FROM (t.occurred_at::date - td.fecha))) * 0.3) AS score
  FROM public.transactions t
  CROSS JOIN transaction_data td
  WHERE t.household_id = p_household_id
    AND t.id <> p_transaction_id
    AND t.flow_type = 'direct'
    AND t.transaction_pair_id IS NULL
    AND t.auto_paired = false
    AND t.dual_flow_status = 'approved'
    AND ((td.type = 'expense_direct' AND t.type = 'income_direct')
      OR (td.type = 'income_direct' AND t.type = 'expense_direct'))
    AND (t.category_id IS NULL OR t.category_id = td.category_id)
    AND ABS(t.amount - td.amount) <= td.threshold
    AND ABS(EXTRACT(DAY FROM (t.occurred_at::date - td.fecha))) <= 30
  ORDER BY score ASC
  LIMIT 5;
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_auto_pairing(
  p_transaction_id uuid,
  p_candidate_id uuid
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_pair_id uuid;
  v_household_id uuid;
  v_candidate_household uuid;
  v_rows integer;
BEGIN
  SELECT household_id INTO v_household_id
  FROM public.transactions
  WHERE id = p_transaction_id
    AND flow_type = 'direct';

  IF v_household_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT household_id INTO v_candidate_household
  FROM public.transactions
  WHERE id = p_candidate_id
    AND flow_type = 'direct';

  IF v_candidate_household IS NULL OR v_candidate_household <> v_household_id THEN
    RETURN FALSE;
  END IF;

  v_pair_id := gen_random_uuid();

  UPDATE public.transactions
  SET
    transaction_pair_id = v_pair_id,
    auto_paired = true,
    dual_flow_status = 'auto_paired',
    updated_at = NOW()
  WHERE id = p_transaction_id
    AND flow_type = 'direct'
    AND transaction_pair_id IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.transactions
  SET
    transaction_pair_id = v_pair_id,
    auto_paired = true,
    dual_flow_status = 'auto_paired',
    updated_at = NOW()
  WHERE id = p_candidate_id
    AND flow_type = 'direct'
    AND transaction_pair_id IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'No se pudo emparejar la transacción candidata %', p_candidate_id;
  END IF;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_auto_pairing()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_candidate_record RECORD;
  v_threshold numeric(5,2);
BEGIN
  IF NEW.dual_flow_status = 'approved'
     AND (OLD.dual_flow_status IS DISTINCT FROM 'approved')
     AND NEW.auto_paired = false
     AND NEW.transaction_pair_id IS NULL
     AND NEW.flow_type = 'direct'
     AND NEW.type IN ('expense_direct', 'income_direct') THEN

    v_threshold := COALESCE(NEW.pairing_threshold, 5.00);

    SELECT candidate_id, diferencia_importe, diferencia_dias, score
    INTO v_candidate_record
    FROM public.find_pairing_candidates(NEW.household_id, NEW.id, v_threshold)
    ORDER BY score ASC
    LIMIT 1;

    IF FOUND THEN
      PERFORM public.execute_auto_pairing(NEW.id, v_candidate_record.candidate_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_dual_flow_auto_pairing
AFTER UPDATE ON public.transactions
FOR EACH ROW
WHEN (NEW.flow_type = 'direct' AND NEW.type IN ('expense_direct', 'income_direct'))
EXECUTE FUNCTION public.trigger_auto_pairing();

COMMIT;
