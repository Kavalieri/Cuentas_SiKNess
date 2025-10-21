-- Añadir tipos de reembolso a la tabla credit_refund_requests
-- TIPO 1: balance - Reduce el crédito acumulado del miembro (usado para saldos a favor)
-- TIPO 2: transaction - Vincula a una transacción existente sin cálculos extra

SET ROLE cuentassik_dev_owner;

ALTER TABLE credit_refund_requests
  ADD COLUMN IF NOT EXISTS refund_type TEXT DEFAULT 'balance' CHECK (refund_type IN ('balance', 'transaction'));

-- Documentación
COMMENT ON COLUMN credit_refund_requests.refund_type IS 
  'Tipo de reembolso: 
   - balance: Reembolso de saldo acumulado a favor (requiere validación de owner, genera movimiento)
   - transaction: Reembolso asociado a transacción existente (sin cálculos extra, solo resta saldo)';

COMMENT ON COLUMN credit_refund_requests.refund_transaction_id IS 
  'Si refund_type=transaction: ID de la transacción de gasto vinculada que justifica el reembolso';
