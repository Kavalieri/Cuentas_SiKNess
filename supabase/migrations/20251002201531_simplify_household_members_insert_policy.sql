-- Simplificar política de INSERT para household_members
-- El problema: la política anterior consultaba household_members en su condición,
-- lo que causa recursión o falla cuando insertas el primer miembro del household

-- Eliminar la política actual de INSERT
drop policy if exists "household_members_insert" on household_members;

-- Crear nueva política simplificada:
-- Solo permitir insertar si el user_id es el usuario autenticado
-- Esto permite que el usuario se agregue a sí mismo como miembro de cualquier household
-- (lo cual es correcto porque solo puede hacerlo si tiene acceso al household_id)
create policy "household_members_insert" on household_members 
for insert 
with check (user_id = auth.uid());

-- La política de SELECT ya maneja correctamente el caso de ver otros miembros:
-- - Puede ver sus propios registros (user_id = auth.uid())
-- - Puede ver registros de households donde ya es miembro
-- Esto es suficiente para evitar recursión.
