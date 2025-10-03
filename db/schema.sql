-- CuentasSiK - Database Schema
-- Para ejecutar en Supabase SQL Editor

-- HOGAR COMPARTIDO
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists household_members (
  household_id uuid references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member',
  primary key (household_id, user_id)
);

-- CATEGORÍAS (comunes a un hogar)
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  icon text,
  type text not null default 'expense' check (type in ('expense', 'income')),
  unique (household_id, name, type)
);

-- MOVIMIENTOS (gastos e ingresos)
create table if not exists movements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  type text not null check (type in ('expense','income')),
  amount numeric(12,2) not null,
  currency text not null default 'EUR',
  note text,
  occurred_at date not null,
  created_at timestamptz default now()
);

-- Índices recomendados para performance
create index if not exists idx_movements_household_occurred_at_desc 
  on movements (household_id, occurred_at desc);

create index if not exists idx_movements_household_type_occurred_at_desc 
  on movements (household_id, type, occurred_at desc);

create index if not exists idx_categories_household_type 
  on categories (household_id, type);

create index if not exists idx_household_members_user_id 
  on household_members (user_id);

-- Row Level Security (RLS)
alter table households enable row level security;
alter table household_members enable row level security;
alter table categories enable row level security;
alter table movements enable row level security;

-- Políticas: solo miembros del hogar ven/escriben su contenido

-- Households: solo miembros pueden ver su hogar
drop policy if exists "read_households" on households;
create policy "read_households" on households for select using (
  exists (
    select 1 from household_members hm
    where hm.household_id = households.id
      and hm.user_id = auth.uid()
  )
);

drop policy if exists "insert_households" on households;
create policy "insert_households" on households for insert with check (true);

drop policy if exists "update_households" on households;
create policy "update_households" on households for update using (
  exists (
    select 1 from household_members hm
    where hm.household_id = households.id
      and hm.user_id = auth.uid()
  )
);

-- Household members: usuarios pueden ver membresías de su hogar
drop policy if exists "read_household_members" on household_members;
create policy "read_household_members" on household_members for select using (
  exists (
    select 1 from household_members hm
    where hm.household_id = household_members.household_id
      and hm.user_id = auth.uid()
  )
);

drop policy if exists "insert_household_members" on household_members;
create policy "insert_household_members" on household_members for insert with check (true);

-- Categories: solo miembros del hogar pueden ver/modificar categorías
drop policy if exists "read_categories" on categories;
create policy "read_categories" on categories for select using (
  exists (
    select 1 from household_members hm
    where hm.household_id = categories.household_id
      and hm.user_id = auth.uid()
  )
);

drop policy if exists "write_categories" on categories;
create policy "write_categories" on categories for all using (
  exists (
    select 1 from household_members hm
    where hm.household_id = categories.household_id
      and hm.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from household_members hm
    where hm.household_id = categories.household_id
      and hm.user_id = auth.uid()
  )
);

-- Movements: solo miembros del hogar pueden ver/modificar movimientos
drop policy if exists "read_movements" on movements;
create policy "read_movements" on movements for select using (
  exists (
    select 1 from household_members hm
    where hm.household_id = movements.household_id
      and hm.user_id = auth.uid()
  )
);

drop policy if exists "write_movements" on movements;
create policy "write_movements" on movements for all using (
  exists (
    select 1 from household_members hm
    where hm.household_id = movements.household_id
      and hm.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from household_members hm
    where hm.household_id = movements.household_id
      and hm.user_id = auth.uid()
  )
);
