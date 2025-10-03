-- SOLUCIÓN DEFINITIVA: Eliminar TODA recursión de household_members
-- 
-- PROBLEMA RAÍZ:
-- Las políticas SELECT, UPDATE y DELETE de household_members consultan
-- household_members en sus condiciones, causando recursión infinita.
--
-- SOLUCIÓN:
-- Simplificar TODAS las políticas para que NO consulten household_members.
-- Para household_members, solo verificamos user_id directamente.

-- 1. Eliminar TODAS las políticas actuales de household_members
drop policy if exists "household_members_select" on household_members;
drop policy if exists "household_members_insert" on household_members;
drop policy if exists "household_members_update" on household_members;
drop policy if exists "household_members_delete" on household_members;

-- 2. Crear políticas SIMPLES sin recursión

-- SELECT: Solo puede ver sus propias membresías
-- No necesita ver las de otros usuarios en este nivel de RLS
create policy "household_members_select" on household_members 
for select 
using (user_id = auth.uid());

-- INSERT: Solo puede agregarse a sí mismo
create policy "household_members_insert" on household_members 
for insert 
with check (user_id = auth.uid());

-- UPDATE: Solo puede actualizar sus propias membresías
create policy "household_members_update" on household_members 
for update 
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- DELETE: Solo puede eliminar sus propias membresías
create policy "household_members_delete" on household_members 
for delete 
using (user_id = auth.uid());

-- NOTA: Para ver otros miembros del household, las queries deben hacer JOIN
-- explícito desde el código de la aplicación, no desde RLS.
-- Ejemplo:
-- SELECT hm.* FROM household_members hm
-- WHERE hm.household_id IN (
--   SELECT household_id FROM household_members WHERE user_id = auth.uid()
-- )
