-- Migration: Create Monthly Periods System
-- Description: Sistema de períodos mensuales con balance de apertura/cierre
-- Author: AI Agent
-- Date: 2025-10-03

-- ============================================================================
-- 1. Crear tabla monthly_periods
-- ============================================================================

CREATE TABLE monthly_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  
  -- Estado del período
  status TEXT NOT NULL CHECK (status IN ('open', 'pending_close', 'closed')) DEFAULT 'open',
  
  -- Balance del mes (EUR con 2 decimales)
  opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0, -- Balance inicial (del mes anterior)
  total_income NUMERIC(12,2) NOT NULL DEFAULT 0,    -- Suma de ingresos del mes
  total_expenses NUMERIC(12,2) NOT NULL DEFAULT 0,  -- Suma de gastos del mes
  closing_balance NUMERIC(12,2) NOT NULL DEFAULT 0, -- Balance final = opening + income - expenses
  
  -- Metadatos de cierre
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Un solo período por mes/hogar
  CONSTRAINT unique_household_month UNIQUE(household_id, year, month)
);

-- Índices para consultas eficientes
CREATE INDEX idx_monthly_periods_household_date ON monthly_periods(household_id, year DESC, month DESC);
CREATE INDEX idx_monthly_periods_status ON monthly_periods(household_id, status);
CREATE INDEX idx_monthly_periods_closed_at ON monthly_periods(household_id, closed_at DESC) WHERE closed_at IS NOT NULL;

-- Comentarios
COMMENT ON TABLE monthly_periods IS 'Períodos mensuales con balance de apertura/cierre para contabilidad profesional';
COMMENT ON COLUMN monthly_periods.opening_balance IS 'Balance al inicio del mes (heredado del mes anterior)';
COMMENT ON COLUMN monthly_periods.closing_balance IS 'Balance al final del mes (se convierte en opening_balance del siguiente)';
COMMENT ON COLUMN monthly_periods.status IS 'Estado: open (actual), pending_close (pasado sin cerrar), closed (cerrado)';

-- ============================================================================
-- 2. Modificar tabla movements para referenciar períodos
-- ============================================================================

-- Añadir columna period_id
ALTER TABLE movements ADD COLUMN period_id UUID REFERENCES monthly_periods(id) ON DELETE SET NULL;

-- Índice para búsqueda por período
CREATE INDEX idx_movements_period ON movements(period_id);

-- Comentario
COMMENT ON COLUMN movements.period_id IS 'Referencia al período mensual al que pertenece este movimiento';

-- ============================================================================
-- 3. Función para actualizar totales de un período
-- ============================================================================

CREATE OR REPLACE FUNCTION update_period_totals(p_period_id UUID)
RETURNS monthly_periods
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period monthly_periods;
  v_income NUMERIC;
  v_expenses NUMERIC;
BEGIN
  -- Calcular totales desde movimientos
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO v_income, v_expenses
  FROM movements
  WHERE period_id = p_period_id;
  
  -- Actualizar período
  UPDATE monthly_periods
  SET 
    total_income = v_income,
    total_expenses = v_expenses,
    closing_balance = opening_balance + v_income - v_expenses,
    updated_at = NOW()
  WHERE id = p_period_id
  RETURNING * INTO v_period;
  
  RETURN v_period;
END;
$$;

COMMENT ON FUNCTION update_period_totals IS 'Actualiza los totales de ingresos/gastos/balance de un período basándose en sus movimientos';

-- ============================================================================
-- 4. Función para obtener o crear período mensual
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_monthly_period(
  p_household_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS monthly_periods
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period monthly_periods;
  v_previous_period monthly_periods;
  v_previous_year INTEGER;
  v_previous_month INTEGER;
  v_opening_balance NUMERIC := 0;
  v_status TEXT;
  v_current_year INTEGER;
  v_current_month INTEGER;
BEGIN
  -- Buscar período existente
  SELECT * INTO v_period
  FROM monthly_periods
  WHERE household_id = p_household_id
    AND year = p_year
    AND month = p_month;
  
  -- Si existe, retornar
  IF FOUND THEN
    RETURN v_period;
  END IF;
  
  -- Calcular mes anterior
  IF p_month = 1 THEN
    v_previous_year := p_year - 1;
    v_previous_month := 12;
  ELSE
    v_previous_year := p_year;
    v_previous_month := p_month - 1;
  END IF;
  
  -- Obtener balance de cierre del mes anterior
  SELECT * INTO v_previous_period
  FROM monthly_periods
  WHERE household_id = p_household_id
    AND year = v_previous_year
    AND month = v_previous_month;
  
  IF FOUND THEN
    v_opening_balance := v_previous_period.closing_balance;
  END IF;
  
  -- Determinar estado inicial
  SELECT 
    EXTRACT(YEAR FROM CURRENT_DATE),
    EXTRACT(MONTH FROM CURRENT_DATE)
  INTO v_current_year, v_current_month;
  
  IF p_year = v_current_year AND p_month = v_current_month THEN
    v_status := 'open';
  ELSIF (p_year < v_current_year) OR (p_year = v_current_year AND p_month < v_current_month) THEN
    v_status := 'pending_close';
  ELSE
    v_status := 'open'; -- Meses futuros también abiertos
  END IF;
  
  -- Crear nuevo período
  INSERT INTO monthly_periods (
    household_id,
    year,
    month,
    status,
    opening_balance,
    closing_balance
  ) VALUES (
    p_household_id,
    p_year,
    p_month,
    v_status,
    v_opening_balance,
    v_opening_balance -- Inicialmente igual al opening
  ) RETURNING * INTO v_period;
  
  RETURN v_period;
END;
$$;

COMMENT ON FUNCTION ensure_monthly_period IS 'Obtiene un período mensual existente o lo crea con balance de arrastre del mes anterior';

-- ============================================================================
-- 5. Trigger para actualizar período cuando se modifica un movimiento
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_update_period_on_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Al insertar o actualizar
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.period_id IS NOT NULL THEN
    PERFORM update_period_totals(NEW.period_id);
  END IF;
  
  -- Al eliminar o cambiar de período
  IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.period_id IS DISTINCT FROM NEW.period_id)) 
     AND OLD.period_id IS NOT NULL THEN
    PERFORM update_period_totals(OLD.period_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_movement_update_period ON movements;
CREATE TRIGGER trigger_movement_update_period
  AFTER INSERT OR UPDATE OR DELETE ON movements
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_period_on_movement();

COMMENT ON FUNCTION trigger_update_period_on_movement IS 'Trigger que actualiza automáticamente los totales del período cuando cambian sus movimientos';

-- ============================================================================
-- 6. RLS Policies para monthly_periods
-- ============================================================================

ALTER TABLE monthly_periods ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Ver períodos de hogares donde eres miembro
CREATE POLICY "Users can view periods of their households"
  ON monthly_periods
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- Política INSERT: Solo la función ensure_monthly_period puede crear (SECURITY DEFINER)
-- Los usuarios no crean períodos directamente
CREATE POLICY "Only system can create periods"
  ON monthly_periods
  FOR INSERT
  WITH CHECK (false); -- Nadie puede insertar directamente, solo via función

-- Política UPDATE: Solo owners pueden actualizar (cerrar meses, etc.)
CREATE POLICY "Owners can update periods"
  ON monthly_periods
  FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Política DELETE: Nadie puede borrar períodos
CREATE POLICY "No one can delete periods"
  ON monthly_periods
  FOR DELETE
  USING (false);

-- ============================================================================
-- 7. Función para cerrar un mes
-- ============================================================================

CREATE OR REPLACE FUNCTION close_monthly_period(
  p_period_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS monthly_periods
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period monthly_periods;
  v_next_year INTEGER;
  v_next_month INTEGER;
BEGIN
  -- Obtener período y verificar permisos
  SELECT * INTO v_period
  FROM monthly_periods
  WHERE id = p_period_id
    AND household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    );
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período no encontrado o sin permisos';
  END IF;
  
  -- Verificar que no esté ya cerrado
  IF v_period.status = 'closed' THEN
    RAISE EXCEPTION 'El período ya está cerrado';
  END IF;
  
  -- Actualizar totales finales
  v_period := update_period_totals(p_period_id);
  
  -- Cerrar período
  UPDATE monthly_periods
  SET 
    status = 'closed',
    closed_at = NOW(),
    closed_by = auth.uid(),
    notes = p_notes,
    updated_at = NOW()
  WHERE id = p_period_id
  RETURNING * INTO v_period;
  
  -- Calcular mes siguiente
  IF v_period.month = 12 THEN
    v_next_year := v_period.year + 1;
    v_next_month := 1;
  ELSE
    v_next_year := v_period.year;
    v_next_month := v_period.month + 1;
  END IF;
  
  -- Crear período siguiente (con balance de arrastre)
  PERFORM ensure_monthly_period(v_period.household_id, v_next_year, v_next_month);
  
  RETURN v_period;
END;
$$;

COMMENT ON FUNCTION close_monthly_period IS 'Cierra un período mensual, actualiza totales, y crea el siguiente período con balance de arrastre';

-- ============================================================================
-- 8. Función para reabrir un mes (solo admins/owners)
-- ============================================================================

CREATE OR REPLACE FUNCTION reopen_monthly_period(p_period_id UUID)
RETURNS monthly_periods
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period monthly_periods;
  v_next_period monthly_periods;
BEGIN
  -- Obtener período y verificar permisos
  SELECT * INTO v_period
  FROM monthly_periods
  WHERE id = p_period_id
    AND household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    );
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período no encontrado o sin permisos';
  END IF;
  
  -- Verificar que esté cerrado
  IF v_period.status != 'closed' THEN
    RAISE EXCEPTION 'El período no está cerrado';
  END IF;
  
  -- Reabrir
  UPDATE monthly_periods
  SET 
    status = 'pending_close',
    closed_at = NULL,
    closed_by = NULL,
    notes = NULL,
    updated_at = NOW()
  WHERE id = p_period_id
  RETURNING * INTO v_period;
  
  RETURN v_period;
END;
$$;

COMMENT ON FUNCTION reopen_monthly_period IS 'Reabre un período cerrado (solo owners)';

-- ============================================================================
-- 9. Vista para estadísticas de períodos
-- ============================================================================

CREATE OR REPLACE VIEW v_period_stats AS
SELECT 
  p.id,
  p.household_id,
  p.year,
  p.month,
  p.status,
  p.opening_balance,
  p.total_income,
  p.total_expenses,
  p.closing_balance,
  
  -- Ahorro del mes
  (p.total_income - p.total_expenses) AS monthly_savings,
  
  -- Porcentaje de ahorro
  CASE 
    WHEN p.total_income > 0 THEN 
      ROUND(((p.total_income - p.total_expenses) / p.total_income * 100)::NUMERIC, 2)
    ELSE 0
  END AS savings_percentage,
  
  -- Número de movimientos
  (SELECT COUNT(*) FROM movements WHERE period_id = p.id) AS movement_count,
  
  -- Número de movimientos por tipo
  (SELECT COUNT(*) FROM movements WHERE period_id = p.id AND type = 'income') AS income_count,
  (SELECT COUNT(*) FROM movements WHERE period_id = p.id AND type = 'expense') AS expense_count,
  
  -- Categoría con más gastos
  (
    SELECT c.name
    FROM movements m
    JOIN categories c ON m.category_id = c.id
    WHERE m.period_id = p.id AND m.type = 'expense'
    GROUP BY c.name
    ORDER BY SUM(m.amount) DESC
    LIMIT 1
  ) AS top_expense_category,
  
  p.closed_at,
  p.closed_by,
  p.created_at,
  p.updated_at
FROM monthly_periods p;

COMMENT ON VIEW v_period_stats IS 'Vista con estadísticas calculadas de cada período';

-- ============================================================================
-- 10. Migrar datos existentes (movimientos sin período asignado)
-- ============================================================================

-- Esta función se ejecuta una sola vez para asignar movimientos históricos a períodos
CREATE OR REPLACE FUNCTION migrate_existing_movements()
RETURNS TABLE(household_id UUID, periods_created INTEGER, movements_assigned INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_household RECORD;
  v_movement RECORD;
  v_period monthly_periods;
  v_periods_count INTEGER := 0;
  v_movements_count INTEGER := 0;
BEGIN
  -- Por cada hogar
  FOR v_household IN 
    SELECT DISTINCT h.id, h.name
    FROM households h
  LOOP
    -- Por cada movimiento sin período del hogar
    FOR v_movement IN 
      SELECT *
      FROM movements m
      WHERE m.household_id = v_household.id
        AND m.period_id IS NULL
      ORDER BY m.occurred_at
    LOOP
      -- Obtener o crear período del mes del movimiento
      v_period := ensure_monthly_period(
        v_household.id,
        EXTRACT(YEAR FROM v_movement.occurred_at)::INTEGER,
        EXTRACT(MONTH FROM v_movement.occurred_at)::INTEGER
      );
      
      -- Asignar movimiento al período
      UPDATE movements
      SET period_id = v_period.id
      WHERE id = v_movement.id;
      
      v_movements_count := v_movements_count + 1;
    END LOOP;
    
    -- Contar períodos creados para este hogar
    SELECT COUNT(*)::INTEGER INTO v_periods_count
    FROM monthly_periods
    WHERE monthly_periods.household_id = v_household.id;
    
    -- Actualizar totales de todos los períodos del hogar
    FOR v_period IN 
      SELECT * FROM monthly_periods WHERE monthly_periods.household_id = v_household.id
    LOOP
      PERFORM update_period_totals(v_period.id);
    END LOOP;
    
    RETURN QUERY SELECT v_household.id, v_periods_count, v_movements_count;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION migrate_existing_movements IS 'Migra movimientos existentes a su período mensual correspondiente (ejecutar una sola vez)';

-- ============================================================================
-- Ejecutar migración (comentado para seguridad)
-- ============================================================================

-- Descomentar y ejecutar SOLO UNA VEZ después de aplicar la migración:
-- SELECT * FROM migrate_existing_movements();
