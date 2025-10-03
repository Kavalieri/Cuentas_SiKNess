-- SOLUCIÓN DEFINITIVA: Asegurar que households INSERT funcione
--
-- El problema persiste porque puede haber múltiples políticas conflictivas
-- o RLS configurado incorrectamente.
--
-- ESTRATEGIA:
-- 1. Limpiar TODAS las políticas de households
-- 2. Deshabilitar y rehabilitar RLS para reset completo
-- 3. Crear políticas nuevas desde cero con la configuración correcta
-- 4. Verificar que FORCE ROW LEVEL SECURITY esté deshabilitado

-- PASO 1: Eliminar TODAS las políticas existentes de households
do $$ 
declare
  pol record;
begin
  for pol in 
    select policyname 
    from pg_policies 
    where tablename = 'households'
  loop
    execute format('drop policy if exists %I on households', pol.policyname);
  end loop;
end $$;

-- PASO 2: Deshabilitar FORCE RLS (esto puede estar causando el problema)
alter table households no force row level security;

-- PASO 3: Asegurar que RLS esté habilitado normalmente
alter table households enable row level security;

-- PASO 4: Crear políticas desde cero

-- INSERT: Cualquier usuario autenticado puede crear un household
create policy "households_insert_authenticated" on households
as permissive
for insert
to authenticated
with check (true);

-- SELECT: Solo puede ver households donde es miembro
create policy "households_select_member" on households
as permissive
for select
to authenticated
using (
  id in (
    select household_id 
    from household_members 
    where user_id = auth.uid()
  )
);

-- UPDATE: Solo puede actualizar households donde es miembro
create policy "households_update_member" on households
as permissive
for update
to authenticated
using (
  id in (
    select household_id 
    from household_members 
    where user_id = auth.uid()
  )
)
with check (
  id in (
    select household_id 
    from household_members 
    where user_id = auth.uid()
  )
);

-- DELETE: Solo puede eliminar households donde es owner
create policy "households_delete_owner" on households
as permissive
for delete
to authenticated
using (
  id in (
    select household_id 
    from household_members 
    where user_id = auth.uid()
    and role = 'owner'
  )
);

-- PASO 5: Verificar configuración
do $$
begin
  raise notice 'RLS habilitado en households: %', (
    select pg_class.relrowsecurity 
    from pg_class 
    where relname = 'households'
  );
  raise notice 'FORCE RLS en households: %', (
    select pg_class.relforcerowsecurity 
    from pg_class 
    where relname = 'households'
  );
  raise notice 'Políticas creadas: %', (
    select count(*) 
    from pg_policies 
    where tablename = 'households'
  );
end $$;
