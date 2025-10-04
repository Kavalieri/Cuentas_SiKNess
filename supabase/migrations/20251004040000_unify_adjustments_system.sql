-- Unificar sistema de ajustes: pre_payments → contribution_adjustments
-- Simplifica el modelo eliminando la tabla pre_payments y usando un sistema único de ajustes

BEGIN;

-- ============================================================================
-- PASO 1: Ampliar contribution_adjustments para soportar todos los tipos
-- ============================================================================

-- Agregar nuevas columnas
ALTER TABLE contribution_adjustments 
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS movement_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Cambiar created_by de auth.users a profiles (si aún no está)
DO $$
BEGIN
  -- Verificar si el constraint existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'contribution_adjustments_created_by_fkey'
    AND table_name = 'contribution_adjustments'
  ) THEN
    -- Obtener el tipo de la columna referenced
    IF EXISTS (
      SELECT 1 FROM information_schema.key_column_usage kcu
      JOIN information_schema.referential_constraints rc ON kcu.constraint_name = rc.constraint_name
      WHERE kcu.constraint_name = 'contribution_adjustments_created_by_fkey'
      AND rc.unique_constraint_schema || '.' || rc.unique_constraint_name LIKE '%auth.users%'
    ) THEN
      -- Es auth.users, necesitamos cambiarlo
      ALTER TABLE contribution_adjustments DROP CONSTRAINT contribution_adjustments_created_by_fkey;
      
      -- Cambiar tipo de columna created_by temporalmente a text para la conversión
      ALTER TABLE contribution_adjustments ALTER COLUMN created_by TYPE TEXT;
      
      -- Mapear created_by de auth.users.id a profiles.id
      UPDATE contribution_adjustments ca
      SET created_by = p.id::text
      FROM profiles p
      WHERE ca.created_by = p.auth_user_id::text;
      
      -- Cambiar de vuelta a UUID
      ALTER TABLE contribution_adjustments ALTER COLUMN created_by TYPE UUID USING created_by::uuid;
      
      -- Agregar nuevo constraint a profiles
      ALTER TABLE contribution_adjustments
        ADD CONSTRAINT contribution_adjustments_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;
END;
$$;

-- Comentarios
COMMENT ON COLUMN contribution_adjustments.type IS 'Tipo de ajuste: prepayment, manual, bonus, penalty';
COMMENT ON COLUMN contribution_adjustments.category_id IS 'Categoría del gasto (para pre-pagos)';
COMMENT ON COLUMN contribution_adjustments.movement_id IS 'Transacción asociada (para pre-pagos)';

-- ============================================================================
-- PASO 2: Migrar datos de pre_payments a contribution_adjustments
-- ============================================================================

-- Migrar pre-pagos como ajustes negativos
INSERT INTO contribution_adjustments (
  contribution_id,
  amount,
  type,
  reason,
  category_id,
  movement_id,
  created_by,
  created_at
)
SELECT 
  c.id as contribution_id,
  -pp.amount as amount,              -- NEGATIVO para restar
  'prepayment' as type,
  COALESCE(pp.description, 'Pre-pago migrado') as reason,
  pp.category_id,
  pp.movement_id,
  p.id as created_by,                -- Mapear auth.users → profiles
  pp.created_at
FROM pre_payments pp
JOIN contributions c 
  ON c.household_id = pp.household_id 
  AND c.profile_id = pp.profile_id
  AND c.year = pp.year
  AND c.month = pp.month
LEFT JOIN profiles p 
  ON p.auth_user_id = pp.created_by
WHERE NOT EXISTS (
  -- Evitar duplicados si la migración se ejecuta múltiples veces
  SELECT 1 FROM contribution_adjustments ca
  WHERE ca.movement_id = pp.movement_id
  AND ca.type = 'prepayment'
);

-- ============================================================================
-- PASO 3: Actualizar contributions para usar ajustes totales
-- ============================================================================

-- Agregar columna para ajustes totales
ALTER TABLE contributions 
  ADD COLUMN IF NOT EXISTS adjustments_total NUMERIC(10,2) DEFAULT 0;

-- Calcular total de ajustes para cada contribución
UPDATE contributions c
SET adjustments_total = COALESCE(
  (SELECT SUM(amount) FROM contribution_adjustments WHERE contribution_id = c.id),
  0
);

-- Actualizar expected_amount incorporando los ajustes
-- expected_amount ahora incluye: base + ajustes totales
-- Si pre_payment_amount existía, debemos quitarlo y usar adjustments_total
UPDATE contributions
SET expected_amount = expected_amount + adjustments_total - COALESCE(pre_payment_amount, 0);

-- Eliminar columna obsoleta
ALTER TABLE contributions DROP COLUMN IF EXISTS pre_payment_amount;

COMMENT ON COLUMN contributions.adjustments_total IS 'Suma total de todos los ajustes (positivos y negativos)';

-- ============================================================================
-- PASO 4: Crear trigger unificado para actualizar ajustes
-- ============================================================================

CREATE OR REPLACE FUNCTION update_contribution_adjustments_total()
RETURNS TRIGGER AS $$
DECLARE
  v_contribution_id UUID;
  v_new_total NUMERIC;
  v_base_amount NUMERIC;
  v_new_expected NUMERIC;
BEGIN
  v_contribution_id := COALESCE(NEW.contribution_id, OLD.contribution_id);
  
  -- Calcular suma de todos los ajustes
  SELECT COALESCE(SUM(amount), 0)
  INTO v_new_total
  FROM contribution_adjustments
  WHERE contribution_id = v_contribution_id;
  
  -- Obtener el monto base (expected_amount sin ajustes)
  -- Para esto, necesitamos recalcular desde calculate_monthly_contributions
  -- O simplemente actualizar adjustments_total y mantener expected_amount como está
  
  -- Actualizar solo adjustments_total
  UPDATE contributions
  SET adjustments_total = v_new_total,
      updated_at = NOW()
  WHERE id = v_contribution_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar triggers antiguos de pre_payments
DROP TRIGGER IF EXISTS trigger_update_pre_payment_amount ON pre_payments;

-- Crear nuevo trigger en contribution_adjustments
DROP TRIGGER IF EXISTS trigger_update_adjustments_total ON contribution_adjustments;
CREATE TRIGGER trigger_update_adjustments_total
  AFTER INSERT OR UPDATE OR DELETE ON contribution_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_contribution_adjustments_total();

COMMENT ON FUNCTION update_contribution_adjustments_total IS 
  'Actualiza el total de ajustes en contributions cuando cambian los ajustes';

-- ============================================================================
-- PASO 5: Eliminar sistema antiguo de pre_payments
-- ============================================================================

-- Eliminar funciones obsoletas
DROP FUNCTION IF EXISTS update_contribution_pre_payment_amount();
DROP FUNCTION IF EXISTS calculate_pre_payment_amount(UUID);

-- Eliminar tabla pre_payments (los datos ya están migrados)
DROP TABLE IF EXISTS pre_payments;

-- ============================================================================
-- PASO 6: Actualizar función de cálculo de contribuciones
-- ============================================================================

-- La función calculate_monthly_contributions ahora debe retornar solo el monto base
-- Los ajustes se suman después desde contribution_adjustments

COMMENT ON TABLE contribution_adjustments IS 
  'Ajustes a las contribuciones mensuales: pre-pagos (negativos), ajustes manuales, bonificaciones, penalizaciones';

COMMIT;

-- Reportar migración completada
DO $$
DECLARE
  v_total_adjustments INTEGER;
  v_total_contributions INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_adjustments FROM contribution_adjustments;
  SELECT COUNT(*) INTO v_total_contributions FROM contributions;
  
  RAISE NOTICE '✓ Sistema de ajustes unificado';
  RAISE NOTICE '  - % ajustes totales', v_total_adjustments;
  RAISE NOTICE '  - % contribuciones actualizadas', v_total_contributions;
  RAISE NOTICE '  - Tabla pre_payments eliminada';
  RAISE NOTICE '  - Trigger unificado creado';
END;
$$;
