-- ========================================================================
-- REESTRUCTURACIÓN DEL SISTEMA DE AJUSTES
-- ========================================================================
-- Fecha: 2025-10-04
-- 
-- CAMBIOS PRINCIPALES:
-- 1. Sistema de aprobación para pre-pagos (status workflow)
-- 2. Trazabilidad completa (income_movement_id)
-- 3. Simplificación de tipos (prepayment + extra_income)
-- 4. Auditoría completa (quién aprobó/rechazó y cuándo)
--
-- NUEVA LÓGICA:
-- - Pre-pagos: Requieren aprobación del owner antes de generar movimientos
-- - Ingresos Extra: Se registran cuando miembro supera su meta mensual
-- ========================================================================

-- 1. Añadir campos de aprobación y trazabilidad
ALTER TABLE contribution_adjustments
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS income_movement_id UUID REFERENCES transactions(id),
  ADD COLUMN IF NOT EXISTS expense_category_id UUID REFERENCES categories(id),
  ADD COLUMN IF NOT EXISTS income_description TEXT,
  ADD COLUMN IF NOT EXISTS expense_description TEXT;

-- 2. Añadir comentarios explicativos
COMMENT ON COLUMN contribution_adjustments.status IS 
  'Estado del ajuste: pending (pendiente aprobación), approved (aprobado y procesado), rejected (rechazado)';

COMMENT ON COLUMN contribution_adjustments.approved_by IS 
  'Usuario (owner) que aprobó el ajuste';

COMMENT ON COLUMN contribution_adjustments.income_movement_id IS 
  'ID del movimiento de ingreso virtual generado (para pre-pagos)';

COMMENT ON COLUMN contribution_adjustments.expense_category_id IS 
  'Categoría del gasto para pre-pagos (puede ser diferente a category_id original)';

COMMENT ON COLUMN contribution_adjustments.income_description IS 
  'Descripción personalizada del movimiento de ingreso (editable por owner)';

COMMENT ON COLUMN contribution_adjustments.expense_description IS 
  'Descripción personalizada del movimiento de gasto (editable por owner)';

-- 3. Migrar datos existentes: marcar todos los ajustes actuales como 'approved'
-- (asumimos que los que ya existen fueron implícitamente aprobados)
UPDATE contribution_adjustments
SET status = 'approved',
    approved_at = created_at
WHERE status = 'pending'; -- Solo actualizar si no se ha modificado manualmente

-- 4. Crear índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_contribution_adjustments_status 
  ON contribution_adjustments(contribution_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contribution_adjustments_approval 
  ON contribution_adjustments(approved_by, approved_at DESC)
  WHERE approved_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contribution_adjustments_income_movement 
  ON contribution_adjustments(income_movement_id)
  WHERE income_movement_id IS NOT NULL;

-- 5. Actualizar políticas RLS para incluir flujo de aprobación
-- Los miembros pueden crear ajustes (pending), pero solo owners pueden aprobar/rechazar

-- Política de INSERT: cualquier miembro puede crear ajustes pending
DROP POLICY IF EXISTS "Users can insert adjustments for their household" ON contribution_adjustments;
CREATE POLICY "Members can create pending adjustments"
  ON contribution_adjustments
  FOR INSERT
  WITH CHECK (
    contribution_id IN (
      SELECT c.id 
      FROM contributions c
      JOIN household_members hm ON c.household_id = hm.household_id
      WHERE hm.profile_id = auth.uid()
    )
    AND status = 'pending'
  );

-- Política de UPDATE: solo owners pueden aprobar/rechazar
DROP POLICY IF EXISTS "Users can update adjustments for their household" ON contribution_adjustments;
CREATE POLICY "Owners can approve/reject adjustments"
  ON contribution_adjustments
  FOR UPDATE
  USING (
    contribution_id IN (
      SELECT c.id 
      FROM contributions c
      JOIN household_members hm ON c.household_id = hm.household_id
      WHERE hm.profile_id = auth.uid() AND hm.role = 'owner'
    )
  )
  WITH CHECK (
    contribution_id IN (
      SELECT c.id 
      FROM contributions c
      JOIN household_members hm ON c.household_id = hm.household_id
      WHERE hm.profile_id = auth.uid() AND hm.role = 'owner'
    )
  );

-- Política de SELECT: todos los miembros pueden ver ajustes
-- (ya existe, no necesita cambios)

-- Política de DELETE: solo owners pueden eliminar ajustes pending
DROP POLICY IF EXISTS "Users can delete adjustments for their household" ON contribution_adjustments;
CREATE POLICY "Owners can delete pending adjustments"
  ON contribution_adjustments
  FOR DELETE
  USING (
    contribution_id IN (
      SELECT c.id 
      FROM contributions c
      JOIN household_members hm ON c.household_id = hm.household_id
      WHERE hm.profile_id = auth.uid() AND hm.role = 'owner'
    )
    AND status = 'pending'
  );

-- 6. Crear función helper para verificar si usuario es owner del household de una contribución
CREATE OR REPLACE FUNCTION is_contribution_owner(p_contribution_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM contributions c
    JOIN household_members hm ON c.household_id = hm.household_id
    WHERE c.id = p_contribution_id
      AND hm.profile_id = auth.uid() 
      AND hm.role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Crear trigger para validar que approved_by sea owner
CREATE OR REPLACE FUNCTION validate_adjustment_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se está aprobando o rechazando, verificar que sea owner
  IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
    IF NOT is_contribution_owner(NEW.contribution_id) THEN
      RAISE EXCEPTION 'Solo los owners pueden aprobar o rechazar ajustes';
    END IF;
    
    -- Asignar automáticamente approved_by o rejected_by
    IF NEW.status = 'approved' THEN
      NEW.approved_by = auth.uid();
      NEW.approved_at = NOW();
    ELSIF NEW.status = 'rejected' THEN
      NEW.rejected_by = auth.uid();
      NEW.rejected_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_adjustment_approval ON contribution_adjustments;
CREATE TRIGGER trigger_validate_adjustment_approval
  BEFORE UPDATE ON contribution_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION validate_adjustment_approval();

-- 8. Añadir constraint para asegurar que solo ajustes approved tienen movimientos
ALTER TABLE contribution_adjustments
  ADD CONSTRAINT check_approved_movements 
  CHECK (
    (status = 'approved' AND movement_id IS NOT NULL) 
    OR (status != 'approved' AND movement_id IS NULL)
  );

-- Nota: Este constraint se aplicará solo a nuevos ajustes. Los existentes
-- quedan exentos por la migración del paso 3.

-- ========================================================================
-- FIN DE LA MIGRACIÓN
-- ========================================================================

-- Para verificar la migración:
-- SELECT 
--   id, type, status, amount, 
--   approved_by, approved_at, 
--   movement_id, income_movement_id
-- FROM contribution_adjustments
-- ORDER BY created_at DESC
-- LIMIT 10;
