-- Migración: add household loan requests table
-- Fecha: 20 November 2025
-- Autor: kava
-- Versión: v3.0.0+

-- ========================================
-- CAMBIOS DE ESTRUCTURA
-- ========================================
-- NOTA: Este archivo se aplica con apply_migration.sh <entorno>
--       No usar comandos \c (cambio de base de datos)

-- Crear función helper para updated_at si no existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ownership de la función
ALTER FUNCTION update_updated_at_column() OWNER TO cuentassik_owner;

-- Crear enum para estado de solicitudes de préstamo
CREATE TYPE loan_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- Tabla para solicitudes de préstamos del hogar a miembros
CREATE TABLE IF NOT EXISTS loan_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  status loan_request_status NOT NULL DEFAULT 'pending',

  -- Metadata de la solicitud
  requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by_profile_id UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- ID de la transacción creada cuando se aprueba
  transaction_id UUID REFERENCES transactions(id),

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índices para optimizar consultas
CREATE INDEX idx_loan_requests_household_status ON loan_requests(household_id, status);
CREATE INDEX idx_loan_requests_profile_status ON loan_requests(profile_id, status);
CREATE INDEX idx_loan_requests_transaction ON loan_requests(transaction_id) WHERE transaction_id IS NOT NULL;

-- Comentarios para documentación
COMMENT ON TABLE loan_requests IS 'Solicitudes de préstamos del hogar hacia miembros individuales';
COMMENT ON COLUMN loan_requests.amount IS 'Monto solicitado del préstamo';
COMMENT ON COLUMN loan_requests.status IS 'Estado: pending (pendiente), approved (aprobado), rejected (rechazado), cancelled (cancelado por el solicitante)';
COMMENT ON COLUMN loan_requests.transaction_id IS 'ID de la transacción de gasto común creada al aprobar el préstamo';

-- Ownership y permisos
ALTER TABLE loan_requests OWNER TO cuentassik_owner;
GRANT SELECT, INSERT, UPDATE, DELETE ON loan_requests TO cuentassik_user;

-- Trigger para updated_at
CREATE TRIGGER update_loan_requests_updated_at
  BEFORE UPDATE ON loan_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VERIFICACIÓN
-- ========================================
SELECT 'loan_requests' as table_name, COUNT(*) as initial_count FROM loan_requests;

\echo ''
\echo '✅ Migración completada'
