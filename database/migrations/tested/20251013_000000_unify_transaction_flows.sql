-- MIGRACIÓN: Unificación de flujos de transacciones
-- Archivo: database/migrations/development/20251013_000000_unify_transaction_flows.sql

-- 1. Añadir nuevos campos para el sistema unificado
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS flow_type text DEFAULT 'common' CHECK (flow_type IN ('common', 'direct')),
ADD COLUMN IF NOT EXISTS transaction_pair_id uuid NULL,
ADD COLUMN IF NOT EXISTS created_by_member_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS real_payer_id uuid REFERENCES profiles(id);

-- 2. Actualizar el tipo para incluir los nuevos valores
-- Primero, eliminar la restricción existente si existe
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Crear nueva restricción con los 4 tipos
ALTER TABLE transactions
ADD CONSTRAINT transactions_type_check
CHECK (type IN ('income', 'expense', 'income_direct', 'expense_direct'));

-- 3. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_transactions_flow_type ON transactions(flow_type);
CREATE INDEX IF NOT EXISTS idx_transactions_pair_id ON transactions(transaction_pair_id);
CREATE INDEX IF NOT EXISTS idx_transactions_real_payer ON transactions(real_payer_id);

-- 4. Comentarios para documentar los campos
COMMENT ON COLUMN transactions.flow_type IS 'Flujo al que pertenece: common (flujo común) o direct (flujo directo con equilibrio)';
COMMENT ON COLUMN transactions.transaction_pair_id IS 'UUID que vincula transacciones emparejadas en flujo directo (expense_direct + income_direct)';
COMMENT ON COLUMN transactions.created_by_member_id IS 'Miembro que creó la transacción (puede diferir de quien pagó)';
COMMENT ON COLUMN transactions.real_payer_id IS 'En flujo directo, quien realmente pagó de su bolsillo';

-- 5. Actualizar transacciones existentes para compatibilidad
UPDATE transactions
SET flow_type = 'common'
WHERE flow_type IS NULL;

-- 6. Hacer flow_type NOT NULL ahora que todos los registros tienen valor
ALTER TABLE transactions
ALTER COLUMN flow_type SET NOT NULL;

-- 7. Crear tabla de períodos de contribución para el sistema de bloqueo
CREATE TABLE IF NOT EXISTS contribution_periods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    year integer NOT NULL,
    month integer NOT NULL CHECK (month >= 1 AND month <= 12),
    status text NOT NULL DEFAULT 'SETUP' CHECK (status IN ('SETUP', 'LOCKED', 'CLOSED')),
    created_at timestamp with time zone DEFAULT NOW(),
    locked_at timestamp with time zone NULL,
    locked_by uuid REFERENCES profiles(id),
    closed_at timestamp with time zone NULL,
    closed_by uuid REFERENCES profiles(id),
    UNIQUE(household_id, year, month)
);

-- Índices para contribution_periods
CREATE INDEX IF NOT EXISTS idx_contribution_periods_household ON contribution_periods(household_id);
CREATE INDEX IF NOT EXISTS idx_contribution_periods_date ON contribution_periods(year, month);
CREATE INDEX IF NOT EXISTS idx_contribution_periods_status ON contribution_periods(status);

-- Comentarios para contribution_periods
COMMENT ON TABLE contribution_periods IS 'Períodos de contribución con estados SETUP→LOCKED→CLOSED para controlar flujos de transacciones';
COMMENT ON COLUMN contribution_periods.status IS 'SETUP: solo gastos directos, LOCKED: ambos flujos, CLOSED: período cerrado';
COMMENT ON COLUMN contribution_periods.locked_by IS 'Owner que bloqueó el período y calculó contribuciones';
COMMENT ON COLUMN contribution_periods.closed_by IS 'Owner que cerró el período';
