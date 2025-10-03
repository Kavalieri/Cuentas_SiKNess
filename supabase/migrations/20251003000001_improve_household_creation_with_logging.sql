-- Mejorar create_household_with_member con logging y validación robusta
-- Migration: add_logging_to_household_creation

-- Primero eliminamos la versión anterior
drop function if exists create_household_with_member(text, uuid);

-- Recreamos con mejor logging y manejo de errores
create or replace function create_household_with_member(
  p_household_name text,
  p_user_id uuid
)
returns json
language plpgsql
security definer -- Bypasea RLS
set search_path = public
as $$
declare
  v_household_id uuid;
  v_member_count int;
  v_result json;
begin
  -- Log inicio
  raise notice '[create_household_with_member] Starting for user % with name "%"', p_user_id, p_household_name;

  -- Verificar que el usuario esté autenticado
  if p_user_id is null then
    raise exception 'Usuario no autenticado: user_id es null';
  end if;

  if p_user_id != auth.uid() then
    raise exception 'Usuario no autorizado: % != %', p_user_id, auth.uid();
  end if;

  -- Verificar que el nombre no esté vacío
  if p_household_name is null or trim(p_household_name) = '' then
    raise exception 'El nombre del hogar es requerido';
  end if;

  -- Crear el household
  insert into households (name)
  values (trim(p_household_name))
  returning id into v_household_id;
  
  raise notice '[create_household_with_member] Household created with id: %', v_household_id;

  -- Agregar el usuario como owner
  insert into household_members (household_id, user_id, role)
  values (v_household_id, p_user_id, 'owner');
  
  raise notice '[create_household_with_member] User added as owner';

  -- Verificar que la inserción fue exitosa
  select count(*) into v_member_count
  from household_members
  where household_id = v_household_id and user_id = p_user_id;

  if v_member_count = 0 then
    raise exception 'Failed to insert user into household_members';
  end if;

  raise notice '[create_household_with_member] Verified member count: %', v_member_count;

  -- Crear categorías por defecto
  perform create_default_categories(v_household_id);
  
  raise notice '[create_household_with_member] Default categories created';

  -- Retornar resultado
  v_result := json_build_object(
    'household_id', v_household_id,
    'name', p_household_name,
    'user_id', p_user_id,
    'role', 'owner',
    'success', true
  );

  raise notice '[create_household_with_member] Success! Returning: %', v_result;

  return v_result;

exception
  when others then
    raise exception '[create_household_with_member] ERROR: % (SQLSTATE: %)', sqlerrm, sqlstate;
end;
$$;

-- Comentario
comment on function create_household_with_member(text, uuid) is 
'Crea un household y agrega al usuario como owner. Bypasea RLS usando SECURITY DEFINER. Incluye logging detallado.';

-- Grant para usuarios autenticados
grant execute on function create_household_with_member(text, uuid) to authenticated;
