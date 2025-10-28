-- Migración: Añadir categoría 'Lavandería' por defecto
-- Fecha: 2025-10-28
-- Propósito: Añadir nueva categoría de gasto 'Lavandería' con icono 🧺 a todos los hogares existentes

SET ROLE cuentassik_dev_owner;

-- Insertar categoría 'Lavandería' para todos los hogares existentes
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at)
SELECT
    gen_random_uuid(),
    h.id as household_id,
    'Lavandería',
    '🧺',
    'expense',
    NULL,
    NOW(),
    NULL,
    NOW()
FROM households h
WHERE NOT EXISTS (
    SELECT 1 FROM categories c
    WHERE c.household_id = h.id
    AND c.name = 'Lavandería'
);

RESET ROLE;

-- Comentarios sobre la migración
COMMENT ON TABLE public.categories IS 'Tabla de categorías de transacciones. Actualizada con categoría Lavandería para gastos domésticos.';
