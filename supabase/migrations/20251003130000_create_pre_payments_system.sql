-- Sistema de Pre-pagos (Advance Payments)
-- Permite registrar gastos que los miembros hacen antes del ciclo de contribución
-- Estos gastos se descuentan de su contribución mensual esperada

-- 1. Crear tabla pre_payments
CREATE TABLE IF NOT EXISTS pre_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  year INT NOT NULL CHECK (year >= 2020),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  movement_id UUID REFERENCES movements(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_pre_payments_household_month ON pre_payments(household_id, year, month);
CREATE INDEX idx_pre_payments_user ON pre_payments(user_id);
CREATE INDEX idx_pre_payments_movement ON pre_payments(movement_id);

-- 2. Añadir columnas a contributions
ALTER TABLE contributions 
ADD COLUMN IF NOT EXISTS pre_payment_amount NUMERIC(10,2) DEFAULT 0 NOT NULL;

-- Comentarios
COMMENT ON TABLE pre_payments IS 'Gastos adelantados por miembros que se descuentan de su contribución mensual';
COMMENT ON COLUMN pre_payments.amount IS 'Cantidad del gasto adelantado';
COMMENT ON COLUMN pre_payments.movement_id IS 'Referencia al movimiento de gasto asociado';
COMMENT ON COLUMN contributions.pre_payment_amount IS 'Total de pre-pagos aplicados a esta contribución';

-- 3. Función para calcular pre_payment_amount de una contribución
CREATE OR REPLACE FUNCTION calculate_pre_payment_amount(
  p_contribution_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_household_id UUID;
  v_user_id UUID;
  v_month INT;
  v_year INT;
  v_total NUMERIC;
BEGIN
  -- Obtener datos de la contribución
  SELECT household_id, user_id, month, year
  INTO v_household_id, v_user_id, v_month, v_year
  FROM contributions
  WHERE id = p_contribution_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Sumar todos los pre-pagos del usuario para ese mes/año
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total
  FROM pre_payments
  WHERE household_id = v_household_id
    AND user_id = v_user_id
    AND month = v_month
    AND year = v_year;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger para actualizar pre_payment_amount automáticamente
CREATE OR REPLACE FUNCTION update_contribution_pre_payment_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_contribution_id UUID;
  v_new_total NUMERIC;
BEGIN
  -- Buscar la contribución correspondiente
  SELECT id INTO v_contribution_id
  FROM contributions
  WHERE household_id = NEW.household_id
    AND user_id = NEW.user_id
    AND month = NEW.month
    AND year = NEW.year;

  IF FOUND THEN
    -- Calcular nuevo total de pre-pagos
    v_new_total := calculate_pre_payment_amount(v_contribution_id);
    
    -- Actualizar la contribución
    UPDATE contributions
    SET pre_payment_amount = v_new_total,
        updated_at = now()
    WHERE id = v_contribution_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_pre_payment_amount
  AFTER INSERT OR UPDATE OR DELETE ON pre_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_contribution_pre_payment_amount();

-- 5. Row Level Security
ALTER TABLE pre_payments ENABLE ROW LEVEL SECURITY;

-- Policy: Los miembros del hogar pueden ver pre-pagos
CREATE POLICY "pre_payments_select_policy" ON pre_payments
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Solo owners pueden crear pre-pagos
CREATE POLICY "pre_payments_insert_policy" ON pre_payments
  FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Policy: Solo owners pueden actualizar pre-pagos
CREATE POLICY "pre_payments_update_policy" ON pre_payments
  FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Policy: Solo owners pueden eliminar pre-pagos
CREATE POLICY "pre_payments_delete_policy" ON pre_payments
  FOR DELETE
  USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );
