-- Migration: Fix monthly_periods schema
-- Description: Elimina start_date/end_date si existen y asegura schema correcto
-- Date: 2025-10-06

-- Eliminar columnas start_date y end_date si existen (de alguna migración vieja)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'monthly_periods' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE monthly_periods DROP COLUMN start_date;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'monthly_periods' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE monthly_periods DROP COLUMN end_date;
  END IF;
END $$;

-- Asegurar que existen las columnas correctas
DO $$
BEGIN
  -- Verificar year
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'monthly_periods' AND column_name = 'year'
  ) THEN
    ALTER TABLE monthly_periods ADD COLUMN year INTEGER NOT NULL;
  END IF;
  
  -- Verificar month
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'monthly_periods' AND column_name = 'month'
  ) THEN
    ALTER TABLE monthly_periods ADD COLUMN month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12);
  END IF;
  
  -- Verificar status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'monthly_periods' AND column_name = 'status'
  ) THEN
    ALTER TABLE monthly_periods ADD COLUMN status TEXT NOT NULL CHECK (status IN ('open', 'pending_close', 'closed')) DEFAULT 'open';
  END IF;
  
  -- Verificar opening_balance
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'monthly_periods' AND column_name = 'opening_balance'
  ) THEN
    ALTER TABLE monthly_periods ADD COLUMN opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0;
  END IF;
  
  -- Verificar total_income
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'monthly_periods' AND column_name = 'total_income'
  ) THEN
    ALTER TABLE monthly_periods ADD COLUMN total_income NUMERIC(12,2) NOT NULL DEFAULT 0;
  END IF;
  
  -- Verificar total_expenses
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'monthly_periods' AND column_name = 'total_expenses'
  ) THEN
    ALTER TABLE monthly_periods ADD COLUMN total_expenses NUMERIC(12,2) NOT NULL DEFAULT 0;
  END IF;
  
  -- Verificar closing_balance
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'monthly_periods' AND column_name = 'closing_balance'
  ) THEN
    ALTER TABLE monthly_periods ADD COLUMN closing_balance NUMERIC(12,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

COMMENT ON COLUMN monthly_periods.year IS 'Año del período (ej: 2025)';
COMMENT ON COLUMN monthly_periods.month IS 'Mes del período (1-12)';
