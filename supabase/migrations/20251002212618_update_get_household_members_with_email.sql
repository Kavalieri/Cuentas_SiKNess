-- Actualizar función get_household_members para incluir email
-- Primero dropear la función existente

drop function if exists get_household_members(uuid);

create or replace function get_household_members(p_household_id uuid)
returns table (
  id uuid,
  household_id uuid,
  user_id uuid,
  role text,
  email text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Verificar que el usuario actual es miembro del household
  if not exists (
    select 1 from household_members
    where household_members.household_id = p_household_id
    and household_members.user_id = auth.uid()
  ) then
    raise exception 'No tienes acceso a este household';
  end if;

  -- Devolver todos los miembros con sus emails
  return query
  select 
    hm.id,
    hm.household_id,
    hm.user_id,
    hm.role,
    coalesce(u.email, 'Sin email') as email,
    hm.created_at
  from household_members hm
  left join auth.users u on u.id = hm.user_id
  where hm.household_id = p_household_id
  order by hm.created_at;
end;
$$;

comment on function get_household_members(uuid) is 
'Obtiene todos los miembros de un household con sus emails si el usuario autenticado es miembro';
