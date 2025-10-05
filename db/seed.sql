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
-- ⚠️ DEPRECADA: Ahora se usa trigger automático (ver migration 20251005_011_seed_default_categories.sql)
-- Esta función se mantiene por compatibilidad con scripts existentes
create or replace function create_default_categories(p_household_id uuid)
returns void as $$
begin
  -- CATEGORÍAS DE GASTO (15 categorías)
  insert into categories (household_id, name, icon, type) values
    (p_household_id, 'Vivienda', '🏠', 'expense'),
    (p_household_id, 'Supermercado', '�', 'expense'),
    (p_household_id, 'Transporte', '🚗', 'expense'),
    (p_household_id, 'Restaurantes', '�️', 'expense'),
    (p_household_id, 'Ocio', '🎬', 'expense'),
    (p_household_id, 'Salud', '💊', 'expense'),
    (p_household_id, 'Educación', '�', 'expense'),
    (p_household_id, 'Menaje', '🍴', 'expense'),
    (p_household_id, 'Ropa', '👕', 'expense'),
    (p_household_id, 'Mascotas', '�', 'expense'),
    (p_household_id, 'Regalos', '🎁', 'expense'),
    (p_household_id, 'Suscripciones', '�', 'expense'),
    (p_household_id, 'Deportes', '⚽', 'expense'),
    (p_household_id, 'Belleza', '💅', 'expense'),
    (p_household_id, 'Varios', '�', 'expense')
  on conflict (household_id, name, type) do nothing;

  -- CATEGORÍAS DE INGRESO (8 categorías)
  insert into categories (household_id, name, icon, type) values
    (p_household_id, 'Nómina', '💰', 'income'),
    (p_household_id, 'Freelance', '💼', 'income'),
    (p_household_id, 'Inversiones', '📈', 'income'),
    (p_household_id, 'Ventas', '🏷️', 'income'),
    (p_household_id, 'Devoluciones', '↩️', 'income'),
    (p_household_id, 'Aportación Cuenta Conjunta', '🏦', 'income'),
    (p_household_id, 'Bonus', '�', 'income'),
    (p_household_id, 'Varios', '💵', 'income')
  on conflict (household_id, name, type) do nothing;
end;
$$ language plpgsql security definer;

-- NOTA: Las categorías ahora se crean automáticamente con trigger al crear household
-- Ver: supabase/migrations/20251005_011_seed_default_categories.sql

-- Ejemplo de uso de la función (ejecutar después de crear un household):
-- select create_default_categories('00000000-0000-0000-0000-000000000001');
