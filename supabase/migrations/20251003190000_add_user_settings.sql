-- =====================================================
-- Tabla de Configuración de Usuario
-- =====================================================
-- Almacena el household activo y preferencias del usuario
-- Permite soportar múltiples households por usuario

create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_household_id uuid references households(id) on delete set null,
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índice para búsquedas rápidas
create index if not exists idx_user_settings_active_household 
  on user_settings(active_household_id);

-- RLS
alter table user_settings enable row level security;

-- Usuario solo puede ver/editar sus propios settings
drop policy if exists "read_own_settings" on user_settings;
create policy "read_own_settings" on user_settings
  for select using (user_id = auth.uid());

drop policy if exists "insert_own_settings" on user_settings;
create policy "insert_own_settings" on user_settings
  for insert with check (user_id = auth.uid());

drop policy if exists "update_own_settings" on user_settings;
create policy "update_own_settings" on user_settings
  for update using (user_id = auth.uid());

-- Función para actualizar updated_at automáticamente
create or replace function update_user_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_settings_updated_at on user_settings;
create trigger user_settings_updated_at
  before update on user_settings
  for each row
  execute function update_user_settings_updated_at();

-- Poblar con datos existentes (migración de data)
-- Cada usuario existente tendrá como activo su primer household
insert into user_settings (user_id, active_household_id)
select distinct on (hm.user_id)
  hm.user_id,
  hm.household_id
from household_members hm
order by hm.user_id, hm.household_id
on conflict (user_id) do nothing;

-- Comentarios
comment on table user_settings is 
'Configuración de usuario incluyendo household activo y preferencias';

comment on column user_settings.active_household_id is 
'Household que el usuario está viendo actualmente. NULL si no tiene households.';

comment on column user_settings.preferences is 
'Preferencias del usuario en formato JSON (tema, idioma, notificaciones, etc)';
