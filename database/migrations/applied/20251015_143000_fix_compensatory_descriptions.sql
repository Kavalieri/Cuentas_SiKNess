-- Migración: 20251015_143000_fix_compensatory_descriptions.sql
-- Descripción: Unificar descripciones de transacciones compensatorias a patrón "Equilibrio:"

-- Actualizar función create_direct_expense_pair para usar patrón "Equilibrio:"
CREATE OR REPLACE FUNCTION public.create_direct_expense_pair(
    p_household_id uuid,
    p_category_id uuid,
    p_amount numeric,
    p_description text,
    p_real_payer_id uuid,
    p_occurred_at date,
    p_created_by_email text
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_pair_id UUID;
    v_expense_id UUID;
    v_income_id UUID;
    v_income_category_id UUID;
BEGIN
    -- Generate unique UUID for the pair
    v_pair_id := gen_random_uuid();

    -- Get "Aportación Cuenta Conjunta" category for income compensation
    SELECT id INTO v_income_category_id
    FROM public.categories
    WHERE household_id = p_household_id
      AND type = 'income'
      AND name = 'Aportación Cuenta Conjunta'
    LIMIT 1;

    -- Create direct expense transaction
    INSERT INTO public.transactions (
        household_id, category_id, type, amount, currency, description,
        occurred_at, flow_type, transaction_pair_id, real_payer_id,
        created_by_email, performed_by_email, performed_at,
        profile_id, paid_by
    ) VALUES (
        p_household_id, p_category_id, 'expense', p_amount, 'EUR', p_description,
        p_occurred_at, 'direct', v_pair_id, p_real_payer_id,
        p_created_by_email, p_created_by_email, p_occurred_at,
        p_real_payer_id, p_real_payer_id
    ) RETURNING id INTO v_expense_id;

    -- Create matching automatic income (compensatory) with standardized description
    INSERT INTO public.transactions (
        household_id, category_id, type, amount, currency,
        description, occurred_at, flow_type, transaction_pair_id,
        created_by_email, performed_by_email, performed_at,
        profile_id
    ) VALUES (
        p_household_id, v_income_category_id, 'income', p_amount, 'EUR',
        'Equilibrio: ' || COALESCE(p_description, 'Gasto directo'),
        p_occurred_at, 'direct', v_pair_id,
        'system@cuentassik.com', p_created_by_email, p_occurred_at,
        p_real_payer_id
    ) RETURNING id INTO v_income_id;

    RETURN v_pair_id;
END;
$$;

COMMENT ON FUNCTION public.create_direct_expense_pair(uuid, uuid, numeric, text, uuid, date, text) IS 'Crea automáticamente el par gasto directo + ingreso compensatorio con descripción estandarizada "Equilibrio:"';

-- Actualizar transacciones compensatorias existentes para usar el patrón unificado
UPDATE public.transactions
SET description = 'Equilibrio: ' || COALESCE(
    SUBSTRING(description FROM '.*: (.*)$'),
    'Gasto directo'
),
updated_at = NOW()
WHERE flow_type = 'direct'
  AND type = 'income'
  AND (description LIKE 'Ingreso automático por gasto directo:%'
       OR description = 'Ingreso automático por gasto directo')
  AND transaction_pair_id IS NOT NULL;

-- Log de la migración
INSERT INTO public._migrations (migration_name, description)
VALUES ('20251015_143000_fix_compensatory_descriptions.sql', 'Unificar descripciones de transacciones compensatorias a patrón "Equilibrio:"')
ON CONFLICT (migration_name) DO NOTHING;
