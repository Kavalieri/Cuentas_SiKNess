-- ========================================================================
-- SISTEMA DE HISTORIAL DE CAMBIOS EN TRANSACCIONES
-- ========================================================================
-- Permite editar transacciones guardando un historial completo de cambios
-- ========================================================================

-- 1. Crear tabla de historial
CREATE TABLE IF NOT EXISTS transaction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  
  -- Campos editables (guardamos el valor ANTERIOR)
  old_description TEXT,
  old_occurred_at DATE,
  old_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  old_amount NUMERIC(12, 2),
  
  -- Nuevos valores (para referencia rápida)
  new_description TEXT,
  new_occurred_at DATE,
  new_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  new_amount NUMERIC(12, 2),
  
  -- Metadatos del cambio
  changed_by UUID NOT NULL REFERENCES profiles(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  change_reason TEXT,
  
  -- Household para RLS
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Índices para performance
CREATE INDEX idx_transaction_history_transaction ON transaction_history(transaction_id);
CREATE INDEX idx_transaction_history_household ON transaction_history(household_id);
CREATE INDEX idx_transaction_history_changed_at ON transaction_history(changed_at DESC);

-- 3. Habilitar RLS
ALTER TABLE transaction_history ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS
-- Miembros pueden ver historial de transacciones de su hogar
CREATE POLICY "Members can view transaction history"
  ON transaction_history
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members
      WHERE profile_id = get_profile_id_from_auth()
    )
  );

-- Miembros pueden crear entradas de historial (cuando editan)
CREATE POLICY "Members can create transaction history"
  ON transaction_history
  FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members
      WHERE profile_id = get_profile_id_from_auth()
    )
  );

-- 5. Función trigger para guardar historial automáticamente al editar
CREATE OR REPLACE FUNCTION save_transaction_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo guardar si hubo cambios en campos editables
  IF (OLD.description IS DISTINCT FROM NEW.description) OR
     (OLD.occurred_at IS DISTINCT FROM NEW.occurred_at) OR
     (OLD.category_id IS DISTINCT FROM NEW.category_id) OR
     (OLD.amount IS DISTINCT FROM NEW.amount) THEN
    
    INSERT INTO transaction_history (
      transaction_id,
      old_description,
      old_occurred_at,
      old_category_id,
      old_amount,
      new_description,
      new_occurred_at,
      new_category_id,
      new_amount,
      changed_by,
      change_reason,
      household_id
    ) VALUES (
      OLD.id,
      OLD.description,
      OLD.occurred_at,
      OLD.category_id,
      OLD.amount,
      NEW.description,
      NEW.occurred_at,
      NEW.category_id,
      NEW.amount,
      get_profile_id_from_auth(),
      'Editado desde la aplicación',
      OLD.household_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Crear trigger
DROP TRIGGER IF EXISTS transaction_history_trigger ON transactions;
CREATE TRIGGER transaction_history_trigger
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION save_transaction_history();

-- 7. Comentarios
COMMENT ON TABLE transaction_history IS 
  'Historial de cambios en transacciones para auditoría';
COMMENT ON COLUMN transaction_history.old_description IS 
  'Descripción anterior al cambio';
COMMENT ON COLUMN transaction_history.changed_by IS 
  'Profile ID del usuario que realizó el cambio';
COMMENT ON FUNCTION save_transaction_history IS 
  'Guarda automáticamente el historial cuando se edita una transacción';
