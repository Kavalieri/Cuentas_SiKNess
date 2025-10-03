-- Fix: "new row violates row-level security policy for table households"
--
-- PROBLEMA:
-- La política de INSERT en households puede estar siendo evaluada DESPUÉS
-- de que se inserta la fila, causando que falle.
--
-- SOLUCIÓN:
-- 1. Asegurar que RLS está habilitado
-- 2. Recrear política INSERT para que sea explícitamente permisiva
-- 3. La política debe permitir a cualquier usuario autenticado crear un household

-- Asegurar que RLS está habilitado
alter table households enable row level security;

-- Eliminar política INSERT existente
drop policy if exists "households_insert" on households;

-- Crear política INSERT permisiva para usuarios autenticados
-- Cualquier usuario autenticado puede crear un household
create policy "households_insert" on households 
for insert 
to authenticated
with check (true);

-- Comentario
comment on policy "households_insert" on households is 
'Permite a cualquier usuario autenticado crear un household. El usuario se agregará como owner en household_members.';
