-- Migración: Mejorar sistema de invitaciones para soportar múltiples tipos
-- Fecha: 2025-10-03
-- Descripción: Añade soporte para invitaciones a household y invitaciones generales a la app

-- 1. Añadir nuevas columnas a la tabla invitations
alter table invitations
  add column type text not null default 'household'
    check (type in ('household', 'app')),
  add column max_uses int default 1
    check (max_uses is null or max_uses > 0),
  add column current_uses int not null default 0
    check (current_uses >= 0),
  add column metadata jsonb default '{}'::jsonb,
  add column accepted_by uuid references auth.users(id);

-- 2. Hacer email nullable (para invitaciones compartibles)
alter table invitations
  alter column email drop not null;

-- 2b. Hacer household_id nullable (para invitaciones tipo 'app')
alter table invitations
  alter column household_id drop not null;

-- 3. Modificar constraint de household_id (puede ser null para invitaciones 'app')
alter table invitations
  drop constraint if exists invitations_household_id_fkey;

alter table invitations
  add constraint invitations_household_id_fkey
    foreign key (household_id)
    references households(id)
    on delete cascade;

-- 4. Añadir check: household_id obligatorio si type='household'
alter table invitations
  add constraint invitations_household_required
    check (
      (type = 'household' and household_id is not null) or
      (type = 'app' and household_id is null)
    );

-- 5. Actualizar unique constraint para permitir múltiples invitaciones del mismo email
--    si son de tipo 'app' o tienen diferente household
alter table invitations
  drop constraint if exists invitations_email_household_unique;

-- Nueva constraint: solo una invitación pendiente por (email, household_id) si email no es null
create unique index invitations_email_household_pending_unique
  on invitations (email, household_id, status)
  where status = 'pending' and email is not null and household_id is not null;

-- 6. Índice para invitaciones tipo 'app'
create index idx_invitations_type_status on invitations (type, status)
  where status = 'pending';

-- 7. Actualizar función accept_invitation para soportar nuevos tipos
drop function if exists accept_invitation(text);

create or replace function accept_invitation(p_token text)
returns table(success boolean, message text, household_id uuid)
language plpgsql
security definer
as $$
declare
  v_invitation record;
  v_user_id uuid;
  v_household_id uuid;
  v_already_member boolean;
begin
  -- Obtener el usuario actual
  v_user_id := auth.uid();
  if v_user_id is null then
    return query select false, 'Usuario no autenticado'::text, null::uuid;
    return;
  end if;

  -- Buscar la invitación
  select * into v_invitation
  from invitations
  where token = p_token
  and status = 'pending';

  if not found then
    return query select false, 'Invitación no encontrada o ya procesada'::text, null::uuid;
    return;
  end if;

  -- Validar que no esté expirada
  if v_invitation.expires_at < now() then
    update invitations set status = 'expired' where id = v_invitation.id;
    return query select false, 'La invitación ha expirado'::text, null::uuid;
    return;
  end if;

  -- Validar max_uses si está configurado
  if v_invitation.max_uses is not null and v_invitation.current_uses >= v_invitation.max_uses then
    return query select false, 'Esta invitación ha alcanzado el límite de usos'::text, null::uuid;
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
          return query select false, 'Esta invitación es para otro email'::text, null::uuid;
          return;
        end if;
      end;
    end if;

    -- Verificar que no sea ya miembro del household
    select exists(
      select 1 from household_members
      where user_id = v_user_id
      and household_id = v_invitation.household_id
    ) into v_already_member;

    if v_already_member then
      return query select false, 'Ya eres miembro de este hogar'::text, v_invitation.household_id;
      return;
    end if;

    -- Añadir al household
    insert into household_members (household_id, user_id, role)
    values (v_invitation.household_id, v_user_id, 'member');

    v_household_id := v_invitation.household_id;
  else
    -- Invitación tipo 'app': no hay household al que unirse
    v_household_id := null;
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
  return query select true, 'Invitación aceptada correctamente'::text, v_household_id;
end;
$$;

-- 8. Comentarios para documentación
comment on column invitations.type is 'Tipo de invitación: household (unirse a hogar específico) o app (invitación general)';
comment on column invitations.max_uses is 'Máximo número de veces que puede usarse esta invitación (null = ilimitado)';
comment on column invitations.current_uses is 'Número de veces que se ha usado esta invitación';
comment on column invitations.metadata is 'Datos adicionales en formato JSON para extensibilidad futura';
comment on column invitations.accepted_by is 'Último usuario que aceptó esta invitación (si max_uses > 1, puede haber múltiples)';

-- 9. Actualizar invitaciones existentes para tener valores por defecto
update invitations
set type = 'household',
    max_uses = 1,
    current_uses = 0,
    metadata = '{}'::jsonb
where type is null;
