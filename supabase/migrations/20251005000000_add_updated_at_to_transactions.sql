-- ============================================================================
-- ADD UPDATED_AT TO TRANSACTIONS
-- Fecha: 2025-10-05
-- Propósito: Agregar campo updated_at para trazabilidad completa
-- ============================================================================

-- 1. Agregar columna updated_at
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- 2. Inicializar con el valor de created_at para registros existentes
UPDATE transactions 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- 3. Hacer NOT NULL después de inicializar
ALTER TABLE transactions 
ALTER COLUMN updated_at SET NOT NULL;

-- 4. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Crear trigger que actualiza updated_at en cada UPDATE
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Comentarios
COMMENT ON COLUMN transactions.updated_at IS 'Fecha y hora de la última modificación del movimiento';
COMMENT ON TRIGGER update_transactions_updated_at ON transactions IS 'Actualiza automáticamente updated_at en cada modificación';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- SELECT 
--   id,
--   description,
--   created_at,
--   updated_at,
--   updated_at - created_at as time_since_creation
-- FROM transactions
-- ORDER BY created_at DESC
-- LIMIT 5;
