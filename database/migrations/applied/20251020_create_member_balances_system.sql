-- ============================================================================
-- CuentasSiK - Sistema de Crédito y Deuda Global
-- ============================================================================
-- Fecha: 2025-10-20
-- Descripción: Sistema para tracking de crédito/deuda por miembro
--   - Crédito: hogar debe a miembro (overpaid contributions)
--   - Deuda: miembro debe al hogar (underpaid contributions + préstamos)
--   - Reconciliación automática al calcular contribuciones
--   - Préstamos personales con aprobación owner
-- ============================================================================

-- ============================================================================
-- TABLA: member_balances
-- Balance global por miembro (independiente de periodos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS member_balances (
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_balance NUMERIC(10,2) DEFAULT 0 NOT NULL,
  -- Positivo: hogar debe a miembro (crédito a favor)
  -- Negativo: miembro debe al hogar (deuda)
  -- Zero: saldado
  last_updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  notes TEXT,
  PRIMARY KEY (household_id, profile_id),
  CONSTRAINT member_balances_household_member_fk
    FOREIGN KEY (household_id, profile_id)
    REFERENCES household_members(household_id, profile_id)
    ON DELETE CASCADE
);

CREATE INDEX idx_member_balances_household ON member_balances(household_id);
CREATE INDEX idx_member_balances_positive ON member_balances(household_id, profile_id)
  WHERE current_balance > 0;
CREATE INDEX idx_member_balances_negative ON member_balances(household_id, profile_id)
  WHERE current_balance < 0;

COMMENT ON TABLE member_balances IS
  'Balance global de crédito/deuda por miembro. Positivo = hogar debe, negativo = miembro debe.';
COMMENT ON COLUMN member_balances.current_balance IS
  'Balance actual: (+) hogar debe a miembro, (-) miembro debe al hogar, (0) saldado';

-- ============================================================================
-- TABLA: personal_loans
-- Préstamos personales solicitados por miembros
-- ============================================================================
CREATE TABLE IF NOT EXISTS personal_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'settled')),

  -- Auditoría de solicitud
  requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  requested_by UUID NOT NULL REFERENCES profiles(id),

  -- Auditoría de aprobación
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,

  -- Link a transacción de retiro
  withdrawal_transaction_id UUID REFERENCES transactions(id),

  -- Liquidación
  settled_at TIMESTAMPTZ,
  settled_by UUID REFERENCES profiles(id),
  settlement_transaction_id UUID REFERENCES transactions(id),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_personal_loans_household ON personal_loans(household_id);
CREATE INDEX idx_personal_loans_profile ON personal_loans(profile_id);
CREATE INDEX idx_personal_loans_status ON personal_loans(status)
  WHERE status IN ('pending', 'approved');
CREATE INDEX idx_personal_loans_pending ON personal_loans(household_id, status)
  WHERE status = 'pending';
CREATE INDEX idx_personal_loans_active ON personal_loans(household_id, profile_id, status)
  WHERE status = 'approved' AND settled_at IS NULL;

COMMENT ON TABLE personal_loans IS
  'Préstamos personales solicitados por miembros con aprobación del owner.';
COMMENT ON COLUMN personal_loans.status IS
  'Estado: pending (pendiente aprobación), approved (aprobado y retirado), rejected (rechazado), settled (liquidado)';

-- ============================================================================
-- FUNCIÓN: update_member_balance
-- Actualiza balance de un miembro (upsert)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_member_balance(
  p_household_id UUID,
  p_profile_id UUID,
  p_delta_amount NUMERIC,
  p_notes TEXT DEFAULT NULL
) RETURNS NUMERIC AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  INSERT INTO member_balances (household_id, profile_id, current_balance, last_updated_at, notes)
  VALUES (p_household_id, p_profile_id, p_delta_amount, NOW(), p_notes)
  ON CONFLICT (household_id, profile_id)
  DO UPDATE SET
    current_balance = member_balances.current_balance + p_delta_amount,
    last_updated_at = NOW(),
    notes = COALESCE(p_notes, member_balances.notes)
  RETURNING current_balance INTO v_new_balance;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_member_balance IS
  'Actualiza balance de miembro sumando delta. Retorna nuevo balance.';

-- ============================================================================
-- FUNCIÓN: reconcile_contribution_balance
-- Reconcilia balance al calcular/cerrar contribución
-- ============================================================================
CREATE OR REPLACE FUNCTION reconcile_contribution_balance(
  p_contribution_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_contribution RECORD;
  v_previous_balance NUMERIC;
  v_delta NUMERIC;
  v_final_balance NUMERIC;
  v_applied_credit NUMERIC := 0;
BEGIN
  -- Obtener contribución
  SELECT * INTO v_contribution
  FROM contributions
  WHERE id = p_contribution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contribution not found: %', p_contribution_id;
  END IF;

  -- Obtener balance previo del miembro
  SELECT COALESCE(current_balance, 0) INTO v_previous_balance
  FROM member_balances
  WHERE household_id = v_contribution.household_id
    AND profile_id = v_contribution.profile_id;

  -- Calcular delta de esta contribución (paid - expected)
  v_delta := COALESCE(v_contribution.paid_amount, 0) - COALESCE(v_contribution.expected_amount, 0);

  -- RECONCILIACIÓN AUTOMÁTICA:
  -- Si tenía crédito previo (balance positivo) y ahora debe dinero (delta negativo),
  -- usar el crédito para cubrir la deuda nueva
  IF v_previous_balance > 0 AND v_delta < 0 THEN
    -- Tiene crédito previo y genera deuda nueva
    -- Aplicar crédito para cubrir deuda
    v_applied_credit := LEAST(v_previous_balance, ABS(v_delta));
    v_final_balance := v_previous_balance + v_delta; -- crédito - deuda

    -- Actualizar balance directamente (no sumar, reemplazar)
    UPDATE member_balances
    SET current_balance = v_final_balance,
        last_updated_at = NOW(),
        notes = 'Auto-reconciled: applied ' || v_applied_credit || '€ credit to cover debt from period ' || v_contribution.year || '-' || v_contribution.month
    WHERE household_id = v_contribution.household_id
      AND profile_id = v_contribution.profile_id;

  ELSE
    -- Caso normal: simplemente añadir delta al balance existente
    v_final_balance := update_member_balance(
      v_contribution.household_id,
      v_contribution.profile_id,
      v_delta,
      'Contribution balance from period ' || v_contribution.year || '-' || v_contribution.month
    );
  END IF;

  RETURN jsonb_build_object(
    'contribution_id', p_contribution_id,
    'period', v_contribution.year || '-' || LPAD(v_contribution.month::TEXT, 2, '0'),
    'expected', v_contribution.expected_amount,
    'paid', v_contribution.paid_amount,
    'delta', v_delta,
    'previous_balance', v_previous_balance,
    'applied_credit', v_applied_credit,
    'final_balance', v_final_balance,
    'reconciled', true,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reconcile_contribution_balance IS
  'Reconcilia balance de miembro al calcular contribución. Aplica crédito automáticamente si aplica.';

-- ============================================================================
-- FUNCIÓN: get_member_balance_status
-- Consulta estado completo de balance de un miembro
-- ============================================================================
CREATE OR REPLACE FUNCTION get_member_balance_status(
  p_household_id UUID,
  p_profile_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_balance NUMERIC;
  v_active_loans_amount NUMERIC;
  v_active_loans_count INTEGER;
  v_total_debt NUMERIC;
  v_credit NUMERIC;
  v_status TEXT;
BEGIN
  -- Balance actual
  SELECT COALESCE(current_balance, 0) INTO v_balance
  FROM member_balances
  WHERE household_id = p_household_id
    AND profile_id = p_profile_id;

  -- Préstamos activos (aprobados pero no liquidados)
  SELECT
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO v_active_loans_amount, v_active_loans_count
  FROM personal_loans
  WHERE household_id = p_household_id
    AND profile_id = p_profile_id
    AND status = 'approved'
    AND settled_at IS NULL;

  -- Cálculos
  v_credit := GREATEST(v_balance, 0);
  v_total_debt := ABS(LEAST(v_balance, 0)) + v_active_loans_amount;

  -- Determinar status
  IF v_total_debt > 0 THEN
    v_status := 'debt';
  ELSIF v_credit > 0 THEN
    v_status := 'credit';
  ELSE
    v_status := 'settled';
  END IF;

  RETURN jsonb_build_object(
    'household_id', p_household_id,
    'profile_id', p_profile_id,
    'balance', v_balance,
    'credit', v_credit,
    'total_debt', v_total_debt,
    'status', v_status,
    'breakdown', jsonb_build_object(
      'contribution_balance', v_balance,
      'active_loans', jsonb_build_object(
        'amount', v_active_loans_amount,
        'count', v_active_loans_count
      )
    ),
    'summary', CASE
      WHEN v_status = 'credit' THEN 'El hogar te debe ' || v_credit || '€'
      WHEN v_status = 'debt' THEN 'Debes al hogar ' || v_total_debt || '€'
      ELSE 'Saldado'
    END
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_member_balance_status IS
  'Retorna estado completo de crédito/deuda de un miembro en formato JSON.';

-- ============================================================================
-- FUNCIÓN: get_household_balances_overview
-- Vista consolidada de todos los miembros del hogar (para owner)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_household_balances_overview(
  p_household_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_members JSONB;
  v_total_credits NUMERIC := 0;
  v_total_debts NUMERIC := 0;
  v_pending_loans INTEGER := 0;
BEGIN
  -- Obtener balance de cada miembro
  SELECT jsonb_agg(
    jsonb_build_object(
      'profile_id', hm.profile_id,
      'email', p.email,
      'display_name', p.display_name,
      'balance', COALESCE(mb.current_balance, 0),
      'status', get_member_balance_status(p_household_id, hm.profile_id)
    )
    ORDER BY p.email
  ) INTO v_members
  FROM household_members hm
  INNER JOIN profiles p ON p.id = hm.profile_id
  LEFT JOIN member_balances mb ON mb.household_id = hm.household_id
    AND mb.profile_id = hm.profile_id
  WHERE hm.household_id = p_household_id;

  -- Totales del hogar
  SELECT
    COALESCE(SUM(GREATEST(current_balance, 0)), 0),
    COALESCE(SUM(ABS(LEAST(current_balance, 0))), 0)
  INTO v_total_credits, v_total_debts
  FROM member_balances
  WHERE household_id = p_household_id;

  -- Préstamos pendientes de aprobación
  SELECT COUNT(*) INTO v_pending_loans
  FROM personal_loans
  WHERE household_id = p_household_id
    AND status = 'pending';

  RETURN jsonb_build_object(
    'household_id', p_household_id,
    'members', v_members,
    'totals', jsonb_build_object(
      'credits_owed', v_total_credits,
      'debts_owed', v_total_debts,
      'net_balance', v_total_debts - v_total_credits
    ),
    'pending_loans', v_pending_loans,
    'generated_at', NOW()
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_household_balances_overview IS
  'Vista consolidada de balances de todos los miembros del hogar (para owner).';

-- ============================================================================
-- TRIGGER: Actualizar updated_at en personal_loans
-- ============================================================================
CREATE OR REPLACE FUNCTION update_personal_loans_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_personal_loans_timestamp
  BEFORE UPDATE ON personal_loans
  FOR EACH ROW
  EXECUTE FUNCTION update_personal_loans_timestamp();

-- ============================================================================
-- PERMISOS
-- ============================================================================
-- Asegurar permisos para cuentassik_user
GRANT SELECT, INSERT, UPDATE, DELETE ON member_balances TO cuentassik_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON personal_loans TO cuentassik_user;
GRANT EXECUTE ON FUNCTION update_member_balance TO cuentassik_user;
GRANT EXECUTE ON FUNCTION reconcile_contribution_balance TO cuentassik_user;
GRANT EXECUTE ON FUNCTION get_member_balance_status TO cuentassik_user;
GRANT EXECUTE ON FUNCTION get_household_balances_overview TO cuentassik_user;

-- ============================================================================
-- REGISTRO DE MIGRACIÓN
-- ============================================================================
INSERT INTO _migrations (migration_name, description)
VALUES (
  '20251020_create_member_balances_system.sql',
  'Sistema de crédito/deuda global: member_balances, personal_loans, funciones de reconciliación'
)
ON CONFLICT (migration_name) DO NOTHING;
