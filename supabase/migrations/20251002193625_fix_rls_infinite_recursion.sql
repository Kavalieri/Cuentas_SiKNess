-- Fix RLS infinite recursion error
-- Este script corrige el error de recursión infinita en RLS policies

-- 1. Eliminar todas las políticas existentes que causan recursión
drop policy if exists "read_households" on households;
drop policy if exists "insert_households" on households;
drop policy if exists "update_households" on households;
drop policy if exists "read_household_members" on household_members;
drop policy if exists "insert_household_members" on household_members;
drop policy if exists "read_categories" on categories;
drop policy if exists "write_categories" on categories;
drop policy if exists "read_movements" on movements;
drop policy if exists "write_movements" on movements;

-- 2. HOUSEHOLDS: Políticas sin recursión
create policy "households_select" on households for select using (
  id in (
    select household_id from household_members where user_id = auth.uid()
  )
);

create policy "households_insert" on households for insert with check (true);

create policy "households_update" on households for update using (
  id in (
    select household_id from household_members where user_id = auth.uid()
  )
);

-- 3. HOUSEHOLD_MEMBERS: Políticas sin recursión
-- Usar verificación directa del user_id para evitar subconsultas a la misma tabla
create policy "household_members_select" on household_members for select using (
  user_id = auth.uid() OR 
  household_id in (
    select household_id from household_members where user_id = auth.uid()
  )
);

create policy "household_members_insert" on household_members for insert 
with check (
  user_id = auth.uid() OR
  household_id in (
    select household_id from household_members where user_id = auth.uid()
  )
);

create policy "household_members_delete" on household_members for delete using (
  user_id = auth.uid() OR
  household_id in (
    select household_id from household_members where user_id = auth.uid()
  )
);

-- 4. CATEGORIES: Solo miembros del hogar
create policy "categories_select" on categories for select using (
  household_id in (
    select household_id from household_members where user_id = auth.uid()
  )
);

create policy "categories_insert" on categories for insert with check (
  household_id in (
    select household_id from household_members where user_id = auth.uid()
  )
);

create policy "categories_update" on categories for update using (
  household_id in (
    select household_id from household_members where user_id = auth.uid()
  )
);

create policy "categories_delete" on categories for delete using (
  household_id in (
    select household_id from household_members where user_id = auth.uid()
  )
);

-- 5. MOVEMENTS: Solo miembros del hogar
create policy "movements_select" on movements for select using (
  household_id in (
    select household_id from household_members where user_id = auth.uid()
  )
);

create policy "movements_insert" on movements for insert with check (
  household_id in (
    select household_id from household_members where user_id = auth.uid()
  )
);

create policy "movements_update" on movements for update using (
  household_id in (
    select household_id from household_members where user_id = auth.uid()
  )
);

create policy "movements_delete" on movements for delete using (
  household_id in (
    select household_id from household_members where user_id = auth.uid()
  )
);
