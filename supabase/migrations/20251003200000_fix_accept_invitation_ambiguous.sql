-- Fix: Resolver ambigüedad en accept_invitation cuando hay joins
-- El error "column reference household_id is ambiguous" ocurre porque
-- la función retorna una columna llamada household_id y también se usa
-- en la consulta interna

-- Recrear la función con nombres más explícitos
drop function if exists accept_invitation(text);

create or replace function accept_invitation(p_token text)
returns table(
  success boolean,
  message text,
  household_id uuid,
  household_name text
)
language plpgsql
security definer
as $$
declare
  v_invitation record;
  v_user_id uuid;
  v_result_household_id uuid;
  v_result_household_name text;
  v_already_member boolean;
begin
  -- Obtener el usuario actual
  v_user_id := auth.uid();
  if v_user_id is null then
    return query select false, 'Usuario no autenticado'::text, null::uuid, null::text;
    return;
  end if;

  -- Buscar la invitación
  select * into v_invitation
  from invitations
  where token = p_token
  and status = 'pending';

  if not found then
    return query select false, 'Invitación no encontrada o ya procesada'::text, null::uuid, null::text;
    return;
  end if;

  -- Validar que no esté expirada
  if v_invitation.expires_at < now() then
    update invitations set status = 'expired' where id = v_invitation.id;
    return query select false, 'La invitación ha expirado'::text, null::uuid, null::text;
    return;
  end if;

  -- Validar max_uses si está configurado
  if v_invitation.max_uses is not null and v_invitation.current_uses >= v_invitation.max_uses then
    return query select false, 'Esta invitación ha alcanzado el límite de usos'::text, null::uuid, null::text;
    return;
  end if;

  -- Si es invitación tipo 'household', validar email y membership
  if v_invitation.type = 'household' then
    -- Validar que el email coincida (si está especificado)
    if v_invitation.email is not null then
      declare
        v_user_email text;
      begin
        select email into v_user_email from auth.users where id = v_user_id;
        if lower(v_user_email) != lower(v_invitation.email) then
          return query select false, 'Esta invitación es para otro email'::text, null::uuid, null::text;
          return;
        end if;
      end;
    end if;

    -- Verificar que no sea ya miembro del household
    select exists(
      select 1 from household_members hm
      where hm.user_id = v_user_id
      and hm.household_id = v_invitation.household_id
    ) into v_already_member;

    if v_already_member then
      -- Obtener nombre del household
      select name into v_result_household_name
      from households
      where id = v_invitation.household_id;
      
      return query select false, 'Ya eres miembro de este hogar'::text, v_invitation.household_id, v_result_household_name;
      return;
    end if;

    -- Añadir al household
    insert into household_members (household_id, user_id, role)
    values (v_invitation.household_id, v_user_id, 'member');

    v_result_household_id := v_invitation.household_id;
    
    -- Obtener nombre del household
    select name into v_result_household_name
    from households
    where id = v_result_household_id;
  else
    -- Invitación tipo 'app': no hay household al que unirse
    v_result_household_id := null;
    v_result_household_name := null;
  end if;

  -- Incrementar contador de usos
  update invitations
  set current_uses = current_uses + 1,
      accepted_by = v_user_id,
      accepted_at = now(),
      status = case
        when max_uses is not null and current_uses + 1 >= max_uses then 'accepted'
        else status
      end
  where id = v_invitation.id;

  -- Retornar éxito
  return query select true, 'Invitación aceptada correctamente'::text, v_result_household_id, v_result_household_name;
end;
$$;

-- Permisos
grant execute on function accept_invitation(text) to authenticated;

comment on function accept_invitation(text) is 
'Acepta una invitación por token. Valida email, expiración, límites y añade al usuario al household si es tipo household.';
