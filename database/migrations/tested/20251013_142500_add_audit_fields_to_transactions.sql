-- Migración: 20251013_142500_add_audit_fields_to_transactions.sql
-- Descripción: Añadir campos de auditoría completos a tabla transactions

-- Campos de auditoría con emails y timestamps específicos
-- Esto permitirá tracking completo de quién hace qué y cuándo

-- Añadir campos de auditoría para emails
ALTER TABLE transactions
ADD COLUMN created_by_email TEXT,
ADD COLUMN performed_by_email TEXT;

-- Añadir campo para fecha real de transacción (diferente de created_at)
ALTER TABLE transactions
ADD COLUMN performed_at TIMESTAMP WITH TIME ZONE;

-- Comentarios para documentar los campos
COMMENT ON COLUMN transactions.created_by_email IS 'Email del usuario que creó el registro en el sistema';
COMMENT ON COLUMN transactions.performed_by_email IS 'Email del usuario que realmente realizó la transacción';
COMMENT ON COLUMN transactions.performed_at IS 'Fecha/hora real cuando se realizó la transacción (diferente de created_at que es cuando se registró en el sistema)';

-- Nota: created_at ya existe y representa cuando se creó el registro en el sistema
-- performed_at representa cuando realmente ocurrió la transacción en el mundo real
