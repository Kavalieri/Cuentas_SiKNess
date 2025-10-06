-- Migración: Fix updated_at NOT NULL constraint sin DEFAULT
-- Fecha: 2025-10-06 15:00:00
-- Problema: updated_at tiene NOT NULL pero sin DEFAULT now(), causando errores en INSERT
-- Solución: Agregar DEFAULT now() y crear trigger para auto-update

-- PASO 1: Agregar DEFAULT now() a updated_at
ALTER TABLE public.transactions
ALTER COLUMN updated_at SET DEFAULT now();

-- PASO 2: Crear función trigger para auto-actualizar updated_at en UPDATE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 3: Crear trigger para transactions
DROP TRIGGER IF EXISTS set_updated_at ON public.transactions;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- PASO 4: Aplicar lo mismo a otras tablas críticas que puedan tener el problema
ALTER TABLE public.contributions
ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS set_updated_at ON public.contributions;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.contributions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.contribution_adjustments
ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS set_updated_at ON public.contribution_adjustments;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.contribution_adjustments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- PASO 5: Verificar que created_at también tenga DEFAULT en todas las tablas
ALTER TABLE public.contributions
ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.contribution_adjustments
ALTER COLUMN created_at SET DEFAULT now();

-- Comentario final:
-- Ahora INSERT sin updated_at funcionará (usa DEFAULT now())
-- UPDATE automáticamente actualiza updated_at (vía trigger)
