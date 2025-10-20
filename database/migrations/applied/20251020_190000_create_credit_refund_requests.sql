-- Crea tabla para solicitudes de reembolso de saldo a favor
-- ESTRUCTURA SOLAMENTE: sin modificar datos existentes

SET ROLE cuentassik_dev_owner;

CREATE TABLE IF NOT EXISTS credit_refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_by UUID NOT NULL REFERENCES profiles(id),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  refund_transaction_id UUID REFERENCES transactions(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_credit_refunds_household_status
  ON credit_refund_requests(household_id, status);

CREATE INDEX IF NOT EXISTS idx_credit_refunds_profile
  ON credit_refund_requests(profile_id);

RESET ROLE;
