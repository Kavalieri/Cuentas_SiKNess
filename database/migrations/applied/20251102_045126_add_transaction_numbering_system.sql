-- Migración: add transaction numbering system
-- Issue: #27
-- Fecha: 02 November 2025
-- Descripción: Añade sistema de numeración automática de transacciones por household
-- Autor: AI Assistant
-- Sistema: v2.1.0+

-- ========================================
-- DESARROLLO (cuentassik_dev)
-- ========================================
\c cuentassik_dev

SET ROLE cuentassik_owner;

-- 1. Añadir columna transaction_number (nullable inicialmente para permitir backfill manual)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS transaction_number INTEGER;

COMMENT ON COLUMN transactions.transaction_number IS
  'Número secuencial único por household. Asignado automáticamente por trigger en nuevas inserciones.';

-- 2. Crear función de trigger para auto-numeración
CREATE OR REPLACE FUNCTION assign_transaction_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo asignar si no viene ya asignado (permite backfill manual)
  IF NEW.transaction_number IS NULL THEN
    -- Obtener el siguiente número para este household (operación atómica)
    SELECT COALESCE(MAX(transaction_number), 0) + 1
    INTO NEW.transaction_number
    FROM transactions
    WHERE household_id = NEW.household_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION assign_transaction_number() IS
  'Trigger function: Asigna automáticamente el siguiente transaction_number para el household_id de la transacción insertada. Solo asigna si NEW.transaction_number es NULL.';

-- 3. Crear trigger BEFORE INSERT
DROP TRIGGER IF EXISTS before_insert_transaction_number ON transactions;

CREATE TRIGGER before_insert_transaction_number
BEFORE INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION assign_transaction_number();

COMMENT ON TRIGGER before_insert_transaction_number ON transactions IS
  'Asigna automáticamente transaction_number antes de insertar una nueva transacción.';

-- 4. Crear índice compuesto (household + número) para queries rápidas
CREATE INDEX IF NOT EXISTS idx_transactions_household_number
  ON transactions(household_id, transaction_number);

COMMENT ON INDEX idx_transactions_household_number IS
  'Índice para consultas rápidas de transacciones por número dentro de un household.';

-- 5. Otorgar permisos al usuario de aplicación
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO cuentassik_user;
GRANT EXECUTE ON FUNCTION assign_transaction_number() TO cuentassik_user;

RESET ROLE;

\echo ''
\echo '✅ DEV: Sistema de numeración de transacciones creado'
\echo '⚠️  IMPORTANTE: Ejecutar script de backfill manualmente después de esta migración'
\echo '    ./scripts/backfill_transaction_numbers.sh dev'

-- ========================================
-- PRODUCCIÓN (cuentassik_prod)
-- ========================================
\c cuentassik_prod

SET ROLE cuentassik_owner;

-- 1. Añadir columna transaction_number
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS transaction_number INTEGER;

COMMENT ON COLUMN transactions.transaction_number IS
  'Número secuencial único por household. Asignado automáticamente por trigger en nuevas inserciones.';

-- 2. Crear función de trigger para auto-numeración
CREATE OR REPLACE FUNCTION assign_transaction_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_number IS NULL THEN
    SELECT COALESCE(MAX(transaction_number), 0) + 1
    INTO NEW.transaction_number
    FROM transactions
    WHERE household_id = NEW.household_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION assign_transaction_number() IS
  'Trigger function: Asigna automáticamente el siguiente transaction_number para el household_id de la transacción insertada. Solo asigna si NEW.transaction_number es NULL.';

-- 3. Crear trigger BEFORE INSERT
DROP TRIGGER IF EXISTS before_insert_transaction_number ON transactions;

CREATE TRIGGER before_insert_transaction_number
BEFORE INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION assign_transaction_number();

COMMENT ON TRIGGER before_insert_transaction_number ON transactions IS
  'Asigna automáticamente transaction_number antes de insertar una nueva transacción.';

-- 4. Crear índice compuesto
CREATE INDEX IF NOT EXISTS idx_transactions_household_number
  ON transactions(household_id, transaction_number);

COMMENT ON INDEX idx_transactions_household_number IS
  'Índice para consultas rápidas de transacciones por número dentro de un household.';

-- 5. Otorgar permisos
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO cuentassik_user;
GRANT EXECUTE ON FUNCTION assign_transaction_number() TO cuentassik_user;

RESET ROLE;

\echo ''
\echo '✅ PROD: Sistema de numeración de transacciones creado'
\echo '⚠️  IMPORTANTE: Ejecutar script de backfill manualmente después de esta migración'
\echo '    ./scripts/backfill_transaction_numbers.sh prod'

-- ========================================
-- VERIFICACIÓN
-- ========================================
\c cuentassik_dev
\echo ''
\echo '=== VERIFICACIÓN DEV ==='
\echo 'Columna transaction_number creada:'
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions' AND column_name = 'transaction_number';

\echo ''
\echo 'Trigger creado:'
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'before_insert_transaction_number';

\c cuentassik_prod
\echo ''
\echo '=== VERIFICACIÓN PROD ==='
\echo 'Columna transaction_number creada:'
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions' AND column_name = 'transaction_number';

\echo ''
\echo 'Trigger creado:'
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'before_insert_transaction_number';

\echo ''
\echo '✅ Migración completada - Issue #27'
\echo '📝 Próximo paso: Ejecutar backfill manual para numerar transacciones existentes'
