-- Migración: Sistema completo de créditos para sobrepagas
-- Fecha: 2025-10-06 19:00:00
-- Propósito: Funciones SQL para gestionar créditos cuando un miembro paga más de lo esperado

-- ============================================
-- FUNCIÓN 1: Crear crédito automático desde sobrepago
-- ============================================
CREATE OR REPLACE FUNCTION create_member_credit_from_overpayment(
  p_contribution_id UUID,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contribution RECORD;
  v_excess_amount NUMERIC;
  v_credit_id UUID;
BEGIN
  -- Obtener contribución
  SELECT * INTO v_contribution
  FROM contributions
  WHERE id = p_contribution_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contribución no encontrada: %', p_contribution_id;
  END IF;
  
  -- Verificar que haya sobrepago
  IF v_contribution.paid_amount IS NULL OR v_contribution.expected_amount IS NULL THEN
    RAISE EXCEPTION 'Contribución debe tener expected_amount y paid_amount';
  END IF;
  
  v_excess_amount := v_contribution.paid_amount - v_contribution.expected_amount;
  
  IF v_excess_amount <= 0 THEN
    RAISE EXCEPTION 'No hay sobrepago. Pagado: %, Esperado: %', 
      v_contribution.paid_amount, v_contribution.expected_amount;
  END IF;
  
  -- Crear crédito
  INSERT INTO member_credits (
    household_id,
    profile_id,
    amount,
    currency,
    source_period_id,
    source_month,
    source_year,
    status,
    auto_apply,
    transferred_to_savings,
    monthly_decision,
    created_by,
    created_at
  ) VALUES (
    v_contribution.household_id,
    v_contribution.profile_id,
    v_excess_amount,
    'EUR', -- TODO: obtener de household settings
    v_contribution.period_id,
    v_contribution.month,
    v_contribution.year,
    'active',
    FALSE, -- Usuario decide si auto-aplicar
    FALSE,
    'keep_active', -- Por defecto mantener activo
    COALESCE(p_created_by, v_contribution.profile_id),
    NOW()
  )
  RETURNING id INTO v_credit_id;
  
  RETURN v_credit_id;
END;
$$;

COMMENT ON FUNCTION create_member_credit_from_overpayment IS 
  'Crea un crédito activo cuando un miembro paga más de lo esperado';

-- ============================================
-- FUNCIÓN 2: Aplicar crédito a una contribución
-- ============================================
CREATE OR REPLACE FUNCTION apply_credit_to_contribution(
  p_credit_id UUID,
  p_contribution_id UUID,
  p_applied_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credit RECORD;
  v_contribution RECORD;
  v_amount_to_apply NUMERIC;
  v_new_expected NUMERIC;
  v_result JSONB;
BEGIN
  -- Obtener crédito
  SELECT * INTO v_credit
  FROM member_credits
  WHERE id = p_credit_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Crédito no encontrado: %', p_credit_id;
  END IF;
  
  -- Validar estado activo
  IF v_credit.status != 'active' THEN
    RAISE EXCEPTION 'Crédito no está activo (estado actual: %)', v_credit.status;
  END IF;
  
  -- Obtener contribución
  SELECT * INTO v_contribution
  FROM contributions
  WHERE id = p_contribution_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contribución no encontrada: %', p_contribution_id;
  END IF;
  
  -- Validar mismo hogar
  IF v_credit.household_id != v_contribution.household_id THEN
    RAISE EXCEPTION 'Crédito y contribución deben ser del mismo hogar';
  END IF;
  
  -- Validar mismo miembro
  IF v_credit.profile_id != v_contribution.profile_id THEN
    RAISE EXCEPTION 'Crédito y contribución deben ser del mismo miembro';
  END IF;
  
  -- Calcular monto a aplicar (puede ser parcial)
  IF v_credit.amount <= v_contribution.expected_amount THEN
    v_amount_to_apply := v_credit.amount;
  ELSE
    v_amount_to_apply := v_contribution.expected_amount;
  END IF;
  
  -- Reducir expected_amount de la contribución
  v_new_expected := v_contribution.expected_amount - v_amount_to_apply;
  
  UPDATE contributions
  SET 
    expected_amount = v_new_expected,
    status = CASE
      WHEN COALESCE(paid_amount, 0) >= v_new_expected THEN 'paid'
      WHEN COALESCE(paid_amount, 0) > 0 THEN 'partial'
      ELSE 'pending'
    END,
    updated_at = NOW()
  WHERE id = p_contribution_id;
  
  -- Marcar crédito como aplicado
  UPDATE member_credits
  SET 
    status = 'applied',
    applied_to_period_id = v_contribution.period_id,
    applied_to_contribution_id = p_contribution_id,
    applied_at = NOW()
  WHERE id = p_credit_id;
  
  -- Construir resultado
  v_result := jsonb_build_object(
    'credit_id', p_credit_id,
    'contribution_id', p_contribution_id,
    'amount_applied', v_amount_to_apply,
    'new_expected_amount', v_new_expected,
    'new_status', CASE
      WHEN COALESCE(v_contribution.paid_amount, 0) >= v_new_expected THEN 'paid'
      WHEN COALESCE(v_contribution.paid_amount, 0) > 0 THEN 'partial'
      ELSE 'pending'
    END
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION apply_credit_to_contribution IS 
  'Aplica un crédito activo a una contribución, reduciendo el monto esperado';

-- ============================================
-- FUNCIÓN 3: Auto-aplicar créditos de un período
-- ============================================
CREATE OR REPLACE FUNCTION auto_apply_active_credits(
  p_household_id UUID,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credit RECORD;
  v_contribution RECORD;
  v_applied_count INTEGER := 0;
  v_total_applied NUMERIC := 0;
  v_result JSONB;
  v_apply_result JSONB;
BEGIN
  -- Por cada miembro con créditos activos y auto_apply=true
  FOR v_credit IN
    SELECT *
    FROM member_credits
    WHERE household_id = p_household_id
      AND status = 'active'
      AND auto_apply = TRUE
    ORDER BY created_at ASC -- FIFO
  LOOP
    -- Buscar contribución pending del mismo miembro en el período
    SELECT * INTO v_contribution
    FROM contributions
    WHERE household_id = p_household_id
      AND period_id = p_period_id
      AND profile_id = v_credit.profile_id
      AND status IN ('pending', 'partial')
    ORDER BY expected_amount DESC -- Aplicar a la más grande primero
    LIMIT 1;
    
    -- Si hay contribución pending, aplicar crédito
    IF FOUND THEN
      v_apply_result := apply_credit_to_contribution(
        v_credit.id,
        v_contribution.id,
        v_credit.profile_id
      );
      
      v_applied_count := v_applied_count + 1;
      v_total_applied := v_total_applied + (v_apply_result->>'amount_applied')::NUMERIC;
    END IF;
  END LOOP;
  
  -- Construir resultado
  v_result := jsonb_build_object(
    'household_id', p_household_id,
    'period_id', p_period_id,
    'credits_applied', v_applied_count,
    'total_amount_applied', v_total_applied
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION auto_apply_active_credits IS 
  'Auto-aplica todos los créditos con auto_apply=true a contribuciones pending del período';

-- ============================================
-- FUNCIÓN 4: Obtener resumen de créditos de un miembro
-- ============================================
CREATE OR REPLACE FUNCTION get_member_credits_summary(
  p_household_id UUID,
  p_profile_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_total NUMERIC;
  v_active_count INTEGER;
  v_applied_total NUMERIC;
  v_applied_count INTEGER;
  v_result JSONB;
BEGIN
  -- Créditos activos
  SELECT 
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO v_active_total, v_active_count
  FROM member_credits
  WHERE household_id = p_household_id
    AND profile_id = p_profile_id
    AND status = 'active';
  
  -- Créditos aplicados (histórico)
  SELECT 
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO v_applied_total, v_applied_count
  FROM member_credits
  WHERE household_id = p_household_id
    AND profile_id = p_profile_id
    AND status = 'applied';
  
  -- Construir resultado
  v_result := jsonb_build_object(
    'active', jsonb_build_object(
      'count', v_active_count,
      'total_amount', v_active_total
    ),
    'applied', jsonb_build_object(
      'count', v_applied_count,
      'total_amount', v_applied_total
    )
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_member_credits_summary IS 
  'Obtiene resumen de créditos activos y aplicados de un miembro';

-- ============================================
-- FUNCIÓN 5: Expirar créditos antiguos (cron job)
-- ============================================
CREATE OR REPLACE FUNCTION expire_old_credits(
  p_months_to_expire INTEGER DEFAULT 6
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE member_credits
  SET 
    status = 'expired',
    applied_at = NOW()
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  RETURN v_expired_count;
END;
$$;

COMMENT ON FUNCTION expire_old_credits IS 
  'Marca como expirados los créditos activos que pasaron su fecha de expiración';

-- ============================================
-- RLS Policies para member_credits
-- ============================================
-- Ya deberían existir, pero las recreo por si acaso

DROP POLICY IF EXISTS "miembros_pueden_ver_sus_creditos" ON member_credits;
CREATE POLICY "miembros_pueden_ver_sus_creditos"
  ON member_credits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = member_credits.household_id
        AND hm.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "miembros_pueden_crear_creditos" ON member_credits;
CREATE POLICY "miembros_pueden_crear_creditos"
  ON member_credits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = member_credits.household_id
        AND hm.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "miembros_pueden_actualizar_sus_creditos" ON member_credits;
CREATE POLICY "miembros_pueden_actualizar_sus_creditos"
  ON member_credits FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = member_credits.household_id
        AND hm.profile_id = auth.uid()
    )
  );

-- ============================================
-- TRIGGER: Crear crédito automático al marcar sobrepago
-- ============================================
CREATE OR REPLACE FUNCTION auto_create_credit_on_overpayment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_excess NUMERIC;
  v_existing_credit UUID;
BEGIN
  -- Solo ejecutar si el status cambia a 'overpaid'
  IF NEW.status = 'overpaid' AND (OLD.status IS NULL OR OLD.status != 'overpaid') THEN
    v_excess := NEW.paid_amount - NEW.expected_amount;
    
    -- Verificar que realmente hay exceso
    IF v_excess > 0 THEN
      -- Verificar que no exista ya un crédito para esta contribución
      SELECT id INTO v_existing_credit
      FROM member_credits
      WHERE household_id = NEW.household_id
        AND profile_id = NEW.profile_id
        AND source_period_id = NEW.period_id
        AND source_month = NEW.month
        AND source_year = NEW.year
        AND status = 'active'
      LIMIT 1;
      
      -- Solo crear si no existe
      IF v_existing_credit IS NULL THEN
        PERFORM create_member_credit_from_overpayment(
          NEW.id,
          auth.uid()
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_create_credit_on_overpayment ON contributions;
CREATE TRIGGER trigger_auto_create_credit_on_overpayment
  AFTER INSERT OR UPDATE ON contributions
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_credit_on_overpayment();

COMMENT ON TRIGGER trigger_auto_create_credit_on_overpayment ON contributions IS
  'Crea automáticamente un crédito cuando una contribución tiene status=overpaid';
