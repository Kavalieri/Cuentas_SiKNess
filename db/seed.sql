-- CuentasSiK - Seed Data
-- Ejecutar DESPUÉS de schema.sql y DESPUÉS del primer login de usuario

-- NOTA: Este script es un ejemplo. 
-- En producción, el household y las categorías se crean automáticamente
-- al registrarse el primer usuario mediante Server Actions.

-- Ejemplo de household (reemplazar con datos reales)
-- insert into households (id, name) values 
--   ('00000000-0000-0000-0000-000000000001', 'Casa SiK');

-- Ejemplo de household_member (reemplazar user_id con el UUID real del usuario autenticado)
-- insert into household_members (household_id, user_id, role) values
--   ('00000000-0000-0000-0000-000000000001', 'USER_UUID_AQUI', 'owner');

-- Categorías de ejemplo por tipo (se crearán automáticamente al crear el household)
-- GASTOS:
-- - Vivienda
-- - Luz
-- - Internet
-- - Supermercado
-- - Butano
-- - Transporte
-- - Ocio
-- - Salud

-- INGRESOS:
-- - Nómina
-- - Extra

-- Función helper para crear categorías por defecto al crear un household
create or replace function create_default_categories(p_household_id uuid)
returns void as $$
begin
  -- Categorías de gastos
  insert into categories (household_id, name, icon, type) values
    (p_household_id, 'Vivienda', '🏠', 'expense'),
    (p_household_id, 'Luz', '💡', 'expense'),
    (p_household_id, 'Internet', '🌐', 'expense'),
    (p_household_id, 'Supermercado', '🛒', 'expense'),
    (p_household_id, 'Butano', '🔥', 'expense'),
    (p_household_id, 'Transporte', '🚗', 'expense'),
    (p_household_id, 'Ocio', '🎉', 'expense'),
    (p_household_id, 'Salud', '💊', 'expense')
  on conflict (household_id, name, type) do nothing;

  -- Categorías de ingresos
  insert into categories (household_id, name, icon, type) values
    (p_household_id, 'Nómina', '💰', 'income'),
    (p_household_id, 'Extra', '🎁', 'income')
  on conflict (household_id, name, type) do nothing;
end;
$$ language plpgsql security definer;

-- Ejemplo de uso de la función (ejecutar después de crear un household):
-- select create_default_categories('00000000-0000-0000-0000-000000000001');
