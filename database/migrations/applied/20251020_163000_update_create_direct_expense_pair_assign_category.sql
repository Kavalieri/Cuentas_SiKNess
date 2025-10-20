-- Migration: Update create_direct_expense_pair to assign compensatory category to auto income
-- Safe DDL: CREATE OR REPLACE FUNCTION only (no user data modifications)

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
    -- Resolve compensatory income category ('Aportación Cuenta Conjunta') for this household
    SELECT c.id
    INTO v_income_category_id
    FROM public.categories c
    WHERE c.household_id = p_household_id
      AND c.name ILIKE 'Aportación Cuenta Conjunta'
      AND (c.type = 'income' OR c.type IS NULL)
    ORDER BY c.created_at DESC NULLS LAST
    LIMIT 1;

    -- Generate pair UUID for both transactions
    v_pair_id := gen_random_uuid();

    -- Create direct expense (out-of-pocket)
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

    -- Create matching automatic income (compensatory)
    INSERT INTO public.transactions (
        household_id, category_id, type, amount, currency,
        description, occurred_at, flow_type, transaction_pair_id,
        created_by_email, performed_by_email, performed_at,
        profile_id
    ) VALUES (
        p_household_id, v_income_category_id, 'income', p_amount, 'EUR',
        'Ingreso automático por gasto directo: ' || p_description,
        p_occurred_at, 'direct', v_pair_id,
        'system@cuentassik.com', p_created_by_email, p_occurred_at,
        p_real_payer_id
    ) RETURNING id INTO v_income_id;

    RETURN v_pair_id;
END;
$$;
