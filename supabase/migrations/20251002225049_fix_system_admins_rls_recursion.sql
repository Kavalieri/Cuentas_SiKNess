-- Fix infinite recursion in system_admins RLS policies
-- El problema: Las políticas intentaban hacer SELECT en system_admins para verificar
-- si el usuario es admin, pero ese SELECT activa la política de nuevo → recursión infinita

-- Paso 1: Eliminar políticas problemáticas
DROP POLICY IF EXISTS "system_admins_select_policy" ON system_admins;
DROP POLICY IF EXISTS "system_admins_insert_policy" ON system_admins;
DROP POLICY IF EXISTS "system_admins_delete_policy" ON system_admins;

-- Paso 2: Crear función helper SECURITY DEFINER que bypasea RLS
-- Esta función se ejecuta con privilegios del owner, no del usuario actual
CREATE OR REPLACE FUNCTION public.is_system_admin_check()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar directamente sin activar RLS
  RETURN EXISTS (
    SELECT 1 
    FROM system_admins 
    WHERE user_id = auth.uid()
  );
END;
$$;

-- Paso 3: Crear nuevas políticas usando la función SECURITY DEFINER
-- Política SELECT: Solo admins pueden ver la tabla
CREATE POLICY "system_admins_select_policy" ON system_admins
  FOR SELECT
  USING (public.is_system_admin_check());

-- Política INSERT: Solo admins pueden agregar otros admins
CREATE POLICY "system_admins_insert_policy" ON system_admins
  FOR INSERT
  WITH CHECK (public.is_system_admin_check());

-- Política DELETE: Solo admins pueden eliminar otros admins
CREATE POLICY "system_admins_delete_policy" ON system_admins
  FOR DELETE
  USING (public.is_system_admin_check());

-- Paso 4: Grant necesario para la función
GRANT EXECUTE ON FUNCTION public.is_system_admin_check() TO authenticated;

-- Comentario para documentación
COMMENT ON FUNCTION public.is_system_admin_check() IS 
  'Verifica si auth.uid() es system admin sin activar RLS (evita recursión infinita)';

