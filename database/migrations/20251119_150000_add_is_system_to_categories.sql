-- ============================================
-- Descripción: Añadir columna is_system a categories
-- Fecha: 2025-11-19
-- Autor: AI Assistant
-- Issue: #58 (Phase 2 - Implementación Base)
-- ============================================

-- OBJETIVO:
-- Marcar categorías como "del sistema" (no editables/eliminables por usuarios)
-- para distinguir categorías especiales como "Préstamo Personal" y "Pago Préstamo"

BEGIN;

-- 1. Añadir columna is_system
ALTER TABLE categories
  ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT false;

-- 2. Crear índice para búsquedas de categorías sistema
CREATE INDEX idx_categories_is_system
  ON categories(is_system)
  WHERE is_system = true;

-- 3. Añadir comentario descriptivo
COMMENT ON COLUMN categories.is_system IS
  'Indica si la categoría es del sistema (no editable ni eliminable por usuarios).
  Usado para categorías especiales como "Préstamo Personal" y "Pago Préstamo".';

-- 4. OWNERSHIP (usar cuentassik_owner)
ALTER TABLE categories OWNER TO cuentassik_owner;

-- 5. PERMISOS (mantener permisos existentes)
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO cuentassik_user;

-- 6. VERIFICACIÓN
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'categories'
  AND column_name = 'is_system';

COMMIT;

-- Resultado esperado:
-- ✅ Nueva columna: is_system BOOLEAN NOT NULL DEFAULT false
-- ✅ Índice: idx_categories_is_system creado
-- ✅ Ownership: cuentassik_owner
-- ✅ Permisos: cuentassik_user tiene SELECT, INSERT, UPDATE, DELETE
