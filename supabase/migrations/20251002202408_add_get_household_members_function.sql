-- Función helper para obtener todos los miembros de un household
-- Esto evita depender de políticas RLS complejas en household_members

create or replace function get_household_members(p_household_id uuid)
returns table (
  id uuid,
  household_id uuid,
  user_id uuid,
  role text,
  created_at timestamptz
)
language plpgsql
security definer -- Ejecuta con permisos del owner de la función
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

  -- Devolver todos los miembros del household
  return query
  select 
    hm.id,
    hm.household_id,
    hm.user_id,
    hm.role,
    hm.created_at
  from household_members hm
  where hm.household_id = p_household_id
  order by hm.created_at;
end;
$$;

-- Comentario de la función
comment on function get_household_members(uuid) is 
'Obtiene todos los miembros de un household si el usuario autenticado es miembro';
