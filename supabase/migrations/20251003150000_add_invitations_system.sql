-- =====================================================
-- Sistema de Invitaciones a Hogares
-- =====================================================
-- Permite a los owners invitar nuevos miembros por email

-- Tabla de invitaciones
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  email text not null,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  
  -- Un email solo puede tener una invitación pendiente por household
  constraint invitations_household_email_pending_key unique (household_id, email, status)
);

-- Índices para búsquedas eficientes
create index if not exists idx_invitations_token on invitations(token);
create index if not exists idx_invitations_household_status on invitations(household_id, status);
create index if not exists idx_invitations_email_status on invitations(email, status);

-- RLS
alter table invitations enable row level security;

-- Los owners del household pueden ver todas las invitaciones de su hogar
drop policy if exists "read_invitations" on invitations;
create policy "read_invitations" on invitations for select using (
  exists (
    select 1 from household_members hm
    where hm.household_id = invitations.household_id
      and hm.user_id = auth.uid()
      and hm.role = 'owner'
  )
);

-- Solo owners pueden crear invitaciones
drop policy if exists "insert_invitations" on invitations;
create policy "insert_invitations" on invitations for insert with check (
  exists (
    select 1 from household_members hm
    where hm.household_id = invitations.household_id
      and hm.user_id = auth.uid()
      and hm.role = 'owner'
  )
);

-- Solo owners pueden actualizar invitaciones (cancelar)
drop policy if exists "update_invitations" on invitations;
create policy "update_invitations" on invitations for update using (
  exists (
    select 1 from household_members hm
    where hm.household_id = invitations.household_id
      and hm.user_id = auth.uid()
      and hm.role = 'owner'
  )
);

-- Función para validar y aceptar una invitación
create or replace function accept_invitation(p_token text)
returns table (
  success boolean,
  household_id uuid,
  household_name text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation invitations%rowtype;
  v_household_name text;
  v_user_id uuid;
  v_user_email text;
begin
  -- Obtener user_id y email del usuario autenticado
  v_user_id := auth.uid();
  
  if v_user_id is null then
    return query select false, null::uuid, null::text, 'Usuario no autenticado';
    return;
  end if;
  
  select email into v_user_email from auth.users where id = v_user_id;
  
  -- Buscar la invitación
  select * into v_invitation
  from invitations
  where token = p_token
    and status = 'pending';
  
  if not found then
    return query select false, null::uuid, null::text, 'Invitación no encontrada o ya utilizada';
    return;
  end if;
  
  -- Verificar que no ha expirado
  if v_invitation.expires_at < now() then
    -- Marcar como expirada
    update invitations
    set status = 'expired'
    where id = v_invitation.id;
    
    return query select false, null::uuid, null::text, 'La invitación ha expirado';
    return;
  end if;
  
  -- Verificar que el email coincide
  if lower(v_invitation.email) != lower(v_user_email) then
    return query select false, null::uuid, null::text, 'Esta invitación fue enviada a otro email';
    return;
  end if;
  
  -- Verificar que el usuario no es ya miembro del household
  if exists (
    select 1 from household_members
    where household_id = v_invitation.household_id
      and user_id = v_user_id
  ) then
    return query select false, null::uuid, null::text, 'Ya eres miembro de este hogar';
    return;
  end if;
  
  -- Obtener nombre del household
  select name into v_household_name
  from households
  where id = v_invitation.household_id;
  
  -- Agregar al usuario como miembro del household
  insert into household_members (household_id, user_id, role)
  values (v_invitation.household_id, v_user_id, 'member');
  
  -- Marcar invitación como aceptada
  update invitations
  set status = 'accepted',
      accepted_at = now()
  where id = v_invitation.id;
  
  return query select true, v_invitation.household_id, v_household_name, 'Invitación aceptada correctamente';
end;
$$;

-- Grant execute para usuarios autenticados
grant execute on function accept_invitation(text) to authenticated;

-- Comentario
comment on table invitations is 
'Invitaciones pendientes para unirse a un hogar';

comment on function accept_invitation(text) is 
'Valida y acepta una invitación para unirse a un hogar. Verifica expiración, email y agrega al usuario como member.';
