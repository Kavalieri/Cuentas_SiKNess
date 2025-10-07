-- Migración: Crear función RPC get_balance_breakdown
-- Fecha: 7 octubre 2025
-- Propósito: Obtener desglose del balance del hogar (total, libre, créditos activos, créditos reservados)

CREATE OR REPLACE FUNCTION get_balance_breakdown(p_household_id UUID)
RETURNS TABLE (
  total_balance NUMERIC,
  free_balance NUMERIC,
  active_credits NUMERIC,
  reserved_credits NUMERIC
) AS $$
DECLARE
  v_total_income NUMERIC := 0;
  v_total_expenses NUMERIC := 0;
  v_active_credits NUMERIC := 0;
  v_reserved_credits NUMERIC := 0;
BEGIN
  -- 1. Calcular total de ingresos del hogar
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_income
  FROM transactions
  WHERE household_id = p_household_id
    AND type = 'income'
    AND status IN ('confirmed', 'locked');
  
  -- 2. Calcular total de gastos del hogar
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_expenses
  FROM transactions
  WHERE household_id = p_household_id
    AND type = 'expense'
    AND status IN ('confirmed', 'locked');
  
  -- 3. Calcular créditos activos de miembros (no reservados, no aplicados, no transferidos)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_active_credits
  FROM member_credits
  WHERE household_id = p_household_id
    AND status = 'active'
    AND reserved_at IS NULL
    AND transferred_to_savings = FALSE;
  
  -- 4. Calcular créditos reservados (con reserved_at pero aún activos)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_reserved_credits
  FROM member_credits
  WHERE household_id = p_household_id
    AND status = 'active'
    AND reserved_at IS NOT NULL
    AND transferred_to_savings = FALSE;
  
  -- 5. Retornar resultados
  RETURN QUERY
  SELECT
    (v_total_income - v_total_expenses)::NUMERIC AS total_balance,
    (v_total_income - v_total_expenses - v_active_credits - v_reserved_credits)::NUMERIC AS free_balance,
    v_active_credits::NUMERIC AS active_credits,
    v_reserved_credits::NUMERIC AS reserved_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario de la función
COMMENT ON FUNCTION get_balance_breakdown(UUID) IS 
  'Calcula el desglose completo del balance del hogar: total, libre, créditos activos y créditos reservados';
