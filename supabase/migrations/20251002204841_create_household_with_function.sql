-- SOLUCIÓN ALTERNATIVA: Función SQL con SECURITY DEFINER
--
-- Si las políticas RLS siguen fallando, usamos una función que bypasea RLS
-- La función se ejecuta con permisos del owner (postgres) usando SECURITY DEFINER
--
-- Esta es una solución común cuando RLS es problemático para operaciones específicas

create or replace function create_household_with_member(
  p_household_name text,
  p_user_id uuid
)
returns json
language plpgsql
security definer -- ← Ejecuta con permisos elevados, bypasea RLS
set search_path = public
as $$
declare
  v_household_id uuid;
  v_result json;
begin
  -- Verificar que el usuario esté autenticado
  if p_user_id is null or p_user_id != auth.uid() then
    raise exception 'Usuario no autenticado o ID inválido';
  end if;

  -- Verificar que el nombre no esté vacío
  if p_household_name is null or trim(p_household_name) = '' then
    raise exception 'El nombre del hogar es requerido';
  end if;

  -- Crear el household
  insert into households (name)
  values (p_household_name)
  returning id into v_household_id;

  -- Agregar el usuario como owner
  insert into household_members (household_id, user_id, role)
  values (v_household_id, p_user_id, 'owner');

  -- Crear categorías por defecto
  perform create_default_categories(v_household_id);

  -- Retornar resultado
  v_result := json_build_object(
    'household_id', v_household_id,
    'name', p_household_name,
    'success', true
  );

  return v_result;

exception
  when others then
    raise exception 'Error al crear household: %', sqlerrm;
end;
$$;

-- Comentario
comment on function create_household_with_member(text, uuid) is 
'Crea un household y agrega al usuario como owner. Bypasea RLS usando SECURITY DEFINER.';

-- Grant para usuarios autenticados
grant execute on function create_household_with_member(text, uuid) to authenticated;
