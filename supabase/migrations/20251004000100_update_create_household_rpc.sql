-- Migration: Update create_household_with_member to use profile_id
-- Actualiza la función RPC para usar profile_id en lugar de user_id

drop function if exists create_household_with_member(text, uuid);

create or replace function create_household_with_member(
  p_household_name text,
  p_profile_id uuid
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
  v_auth_user_id uuid;
begin
  -- Log inicio
  raise notice '[create_household_with_member] Starting for profile % with name "%"', p_profile_id, p_household_name;

  -- Obtener el auth_user_id del profile para validación
  select auth_user_id into v_auth_user_id
  from profiles
  where id = p_profile_id;

  if v_auth_user_id is null then
    raise exception '[create_household_with_member] ERROR: Profile % not found', p_profile_id;
  end if;

  -- Verificar que el usuario autenticado coincida con el profile
  if v_auth_user_id != auth.uid() then
    raise exception '[create_household_with_member] ERROR: Unauthorized - auth.uid() % does not match profile auth_user_id %', auth.uid(), v_auth_user_id;
  end if;

  -- Verificar que el nombre no esté vacío
  if p_household_name is null or trim(p_household_name) = '' then
    raise exception '[create_household_with_member] ERROR: Household name is required';
  end if;

  -- Crear el household
  insert into households (name)
  values (trim(p_household_name))
  returning id into v_household_id;
  
  raise notice '[create_household_with_member] Household created with id: %', v_household_id;

  -- Agregar el profile como owner (UPDATED: profile_id instead of user_id)
  insert into household_members (household_id, profile_id, role)
  values (v_household_id, p_profile_id, 'owner');
  
  raise notice '[create_household_with_member] Profile added as owner';

  -- Verificar que la inserción fue exitosa
  select count(*) into v_member_count
  from household_members
  where household_id = v_household_id and profile_id = p_profile_id;

  if v_member_count = 0 then
    raise exception '[create_household_with_member] ERROR: Failed to insert profile into household_members';
  end if;

  raise notice '[create_household_with_member] Verified member count: %', v_member_count;

  -- Crear categorías por defecto
  perform create_default_categories(v_household_id);
  
  raise notice '[create_household_with_member] Default categories created';

  -- Actualizar user_settings para activar este household automáticamente
  insert into user_settings (profile_id, active_household_id, preferences)
  values (p_profile_id, v_household_id, '{}')
  on conflict (profile_id) 
  do update set 
    active_household_id = v_household_id,
    updated_at = now();

  raise notice '[create_household_with_member] Set as active household in user_settings';

  -- Retornar resultado
  v_result := json_build_object(
    'household_id', v_household_id,
    'name', p_household_name,
    'profile_id', p_profile_id,
    'role', 'owner',
    'success', true
  );

  raise notice '[create_household_with_member] Success! Returning: %', v_result;

  return v_result;

exception
  when others then
    raise exception '[create_household_with_member] ERROR: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
end;
$$;

COMMENT ON FUNCTION create_household_with_member IS 'Creates a household and adds the profile as owner. Also sets it as active household in user_settings.';
