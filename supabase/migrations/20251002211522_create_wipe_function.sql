-- Función para limpiar todos los datos del household (solo para testing)
-- Solo puede ser ejecutada por el owner del household

create or replace function wipe_household_data(p_household_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_role text;
  v_deleted_movements int;
  v_deleted_categories int;
  v_deleted_contributions int;
  v_deleted_adjustments int;
  v_deleted_incomes int;
  v_deleted_settings int;
begin
  -- Obtener el ID del usuario autenticado
  v_user_id := auth.uid();
  
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  -- Verificar que el usuario es owner del household
  select role into v_role
  from household_members
  where household_id = p_household_id
    and user_id = v_user_id;

  if v_role is null then
    raise exception 'No perteneces a este household';
  end if;

  if v_role != 'owner' then
    raise exception 'Solo el owner puede ejecutar wipe';
  end if;

  -- Eliminar datos en orden de dependencias
  -- 1. Adjustments (depende de contributions)
  delete from contribution_adjustments 
  where household_id = p_household_id;
  get diagnostics v_deleted_adjustments = row_count;

  -- 2. Contributions
  delete from contributions 
  where household_id = p_household_id;
  get diagnostics v_deleted_contributions = row_count;

  -- 3. Member incomes
  delete from member_incomes 
  where household_id = p_household_id;
  get diagnostics v_deleted_incomes = row_count;

  -- 4. Household settings
  delete from household_settings 
  where household_id = p_household_id;
  get diagnostics v_deleted_settings = row_count;

  -- 5. Movements (gastos/ingresos)
  delete from movements 
  where household_id = p_household_id;
  get diagnostics v_deleted_movements = row_count;

  -- 6. Categories (las recrearemos después)
  delete from categories 
  where household_id = p_household_id;
  get diagnostics v_deleted_categories = row_count;

  -- 7. Recrear categorías por defecto
  perform create_default_categories(p_household_id);

  -- Retornar resumen de lo eliminado
  return json_build_object(
    'success', true,
    'message', 'Datos limpiados correctamente',
    'deleted', json_build_object(
      'movements', v_deleted_movements,
      'categories', v_deleted_categories,
      'contributions', v_deleted_contributions,
      'adjustments', v_deleted_adjustments,
      'incomes', v_deleted_incomes,
      'settings', v_deleted_settings
    )
  );
end;
$$;

-- Grant execute permission a usuarios autenticados
grant execute on function wipe_household_data(uuid) to authenticated;

comment on function wipe_household_data(uuid) is 
'Limpia todos los datos del household excepto miembros. Solo para owners. Uso: testing.';
