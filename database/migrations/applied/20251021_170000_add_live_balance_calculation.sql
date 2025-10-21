-- ============================================================================
-- MIGRACIÓN: 20251021_170000_add_live_balance_calculation
-- PROPÓSITO: Permitir cálculo de balance EN VIVO durante cualquier fase
--           sin esperar a cerrar el período
-- ============================================================================
-- PROBLEMA ACTUAL:
--   member_balances se puebla SOLO al cerrar período
--   → No puedes gestionar crédito/débito DURANTE el período
--   → 0.75€ visible en UI pero rechaza reembolsos (member_balances vacía)
--
-- SOLUCIÓN:
--   Nueva función get_member_balance_status_v2()
--   Calcula balance EN TIEMPO REAL:
--     = balance histórico (períodos cerrados)
--     + contribuciones pendientes (período actual)
--     - gastos directos (período actual)
--     + préstamos personales aprobados
-- ============================================================================

-- ============================================================================
-- FUNCIÓN: get_member_balance_status_v2
-- Calcula balance VIVO considerando períodos cerrados + pendientes
-- ============================================================================
CREATE OR REPLACE FUNCTION get_member_balance_status_v2(
  p_household_id UUID,
  p_profile_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_historical_balance NUMERIC;
  v_pending_contributions NUMERIC;
  v_current_direct_expenses NUMERIC;
  v_total_balance NUMERIC;
  v_active_loans_amount NUMERIC;
  v_active_loans_count INTEGER;
  v_total_debt NUMERIC;
  v_credit NUMERIC;
  v_status TEXT;
  v_last_closed_year INTEGER;
  v_last_closed_month INTEGER;
BEGIN
  -- 1. Obtener balance HISTÓRICO (períodos ya cerrados)
  -- member_balances solo contiene balances de períodos liquidados
  SELECT COALESCE(current_balance, 0) INTO v_historical_balance
  FROM member_balances
  WHERE household_id = p_household_id
    AND profile_id = p_profile_id;

  -- 2. Encontrar el último período cerrado
  -- Cualquier contribución/período después de esto está ABIERTO
  SELECT MAX(COALESCE(year, 0)), MAX(COALESCE(month, 0))
  INTO v_last_closed_year, v_last_closed_month
  FROM monthly_periods
  WHERE household_id = p_household_id
    AND status IN ('closed', 'CLOSED')
    AND closed_at IS NOT NULL;

  -- Si no hay períodos cerrados, inicializar como 0,0
  IF v_last_closed_year IS NULL THEN
    v_last_closed_year := 0;
    v_last_closed_month := 0;
  END IF;

  -- 3. Sumar CONTRIBUCIONES PENDIENTES (períodos aún abiertos/activos)
  -- Estos son (expected_amount - paid_amount) de períodos NO cerrados
  SELECT COALESCE(SUM(COALESCE(expected_amount, 0) - COALESCE(paid_amount, 0)), 0)
  INTO v_pending_contributions
  FROM contributions
  WHERE household_id = p_household_id
    AND profile_id = p_profile_id
    AND (
      -- Período está abierto (más reciente que el último cerrado)
      (year > v_last_closed_year)
      OR (year = v_last_closed_year AND month > v_last_closed_month)
    );

  -- 4. Sumar GASTOS DIRECTOS DEL MES ACTUAL
  -- Estos se descuentan del balance (ya fueron pagados de bolsillo)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_current_direct_expenses
  FROM transactions
  WHERE household_id = p_household_id
    AND real_payer_id = p_profile_id
    AND flow_type = 'direct'
    AND type = 'expense'
    AND EXTRACT(YEAR FROM occurred_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM occurred_at) = EXTRACT(MONTH FROM CURRENT_DATE);

  -- 5. Calcular BALANCE TOTAL EN VIVO
  -- = Histórico (cerrado) + Pendiente (abierto) - Gastos directos (mes actual)
  v_total_balance := v_historical_balance + v_pending_contributions - v_current_direct_expenses;

  -- 6. Sumar PRÉSTAMOS PERSONALES ACTIVOS
  SELECT
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO v_active_loans_amount, v_active_loans_count
  FROM personal_loans
  WHERE household_id = p_household_id
    AND profile_id = p_profile_id
    AND status = 'approved'
    AND settled_at IS NULL;

  -- 7. Calcular crédito y deuda totales
  v_credit := GREATEST(v_total_balance, 0);
  v_total_debt := ABS(LEAST(v_total_balance, 0)) + v_active_loans_amount;

  -- 8. Determinar status
  IF v_total_debt > 0 THEN
    v_status := 'debt';
  ELSIF v_credit > 0 THEN
    v_status := 'credit';
  ELSE
    v_status := 'settled';
  END IF;

  -- 9. Retornar resultado JSON
  RETURN jsonb_build_object(
    'household_id', p_household_id,
    'profile_id', p_profile_id,
    'balance', v_total_balance,
    'credit', v_credit,
    'total_debt', v_total_debt,
    'status', v_status,
    'breakdown', jsonb_build_object(
      'historical_balance', v_historical_balance,
      'pending_contributions', v_pending_contributions,
      'current_direct_expenses', v_current_direct_expenses,
      'active_loans', jsonb_build_object(
        'amount', v_active_loans_amount,
        'count', v_active_loans_count
      ),
      'calculation', format(
        'histór: %.2f + pendiente: %.2f - directo: %.2f = total: %.2f',
        v_historical_balance,
        v_pending_contributions,
        v_current_direct_expenses,
        v_total_balance
      )
    ),
    'summary', CASE
      WHEN v_status = 'credit' THEN 'El hogar te debe ' || ROUND(v_credit::numeric, 2) || '€'
      WHEN v_status = 'debt' THEN 'Debes al hogar ' || ROUND(v_total_debt::numeric, 2) || '€'
      ELSE 'Saldado'
    END
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_member_balance_status_v2 IS
  'Calcula balance EN VIVO (incluyendo períodos abiertos) sin esperar cierre del período. 
   Fórmula: balance_histórico + contribuciones_pendientes - gastos_directos_mes + préstamos_activos.
   Permite solicitar reembolsos/préstamos en cualquier fase (SETUP/LOCKED/CLOSED).';

-- ============================================================================
-- GRANT: Permiso de ejecución a cuentassik_user
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_member_balance_status_v2(UUID, UUID) 
  TO cuentassik_user;

-- ============================================================================
-- COMENTARIO DE IMPLEMENTACIÓN PARA AGENTES IA
-- ============================================================================
-- CAMBIOS EN CÓDIGO NECESARIOS:
--
-- 1. app/sickness/credito-deuda/actions.ts:
--    - getMemberBalanceStatus(): Cambiar get_member_balance_status() → get_member_balance_status_v2()
--    - requestCreditRefund(): Cambiar get_member_balance_status() → get_member_balance_status_v2()
--    - Cualquier otra función que valide saldo
--
-- 2. Mantener backward compatibility:
--    - get_member_balance_status() sigue existiendo (para períodos cerrados)
--    - get_member_balance_status_v2() es NEW (cálculo en vivo)
--    - Fase de cierre (reconcile_contribution_balance) sigue igual
--
-- 3. Testing:
--    - Verificar que 0.75€ se reconoce ANTES de cerrar período
--    - Verificar que requestCreditRefund() acepta reembolsos
--    - Verificar que valores coinciden entre UI y validación
-- ============================================================================
