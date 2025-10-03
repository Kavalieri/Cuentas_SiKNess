-- Migration: Add get_household_members RPC function
-- Fecha: 2025-10-03
-- Descripción: Función para obtener miembros de un hogar con sus emails de auth.users

-- Drop existing function if exists (with any signature)
drop function if exists get_household_members(uuid);

-- Función para obtener miembros de un hogar
create or replace function get_household_members(p_household_id uuid)
returns table (
  id uuid,
  user_id uuid,
  email text,
  role text,
  household_id uuid
)
language sql
security definer
as $$
  select 
    hm.household_id as id,
    hm.user_id,
    au.email,
    hm.role,
    hm.household_id
  from household_members hm
  inner join auth.users au on au.id = hm.user_id
  where hm.household_id = p_household_id
  order by 
    case when hm.role = 'owner' then 0 else 1 end,
    au.email;
$$;

-- Grant execute permission
grant execute on function get_household_members(uuid) to authenticated;

-- Comentario
comment on function get_household_members(uuid) is 
  'Retorna los miembros de un hogar específico con su información de usuario';
