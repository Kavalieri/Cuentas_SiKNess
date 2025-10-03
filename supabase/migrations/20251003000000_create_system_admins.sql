-- Crear tabla de administradores del sistema
CREATE TABLE IF NOT EXISTS system_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Habilitar RLS
ALTER TABLE system_admins ENABLE ROW LEVEL SECURITY;

-- Política: Solo system admins pueden ver la tabla
CREATE POLICY "system_admins_select_policy" ON system_admins
  FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM system_admins)
  );

-- Política: Solo system admins pueden insertar (para agregar otros admins)
CREATE POLICY "system_admins_insert_policy" ON system_admins
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM system_admins)
  );

-- Política: Solo system admins pueden eliminar
CREATE POLICY "system_admins_delete_policy" ON system_admins
  FOR DELETE
  USING (
    auth.uid() IN (SELECT user_id FROM system_admins)
  );

-- Función helper para verificar si un usuario es system admin
CREATE OR REPLACE FUNCTION is_system_admin(check_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si no se proporciona user_id, usar el usuario actual
  IF check_user_id IS NULL THEN
    check_user_id := auth.uid();
  END IF;
  
  -- Verificar si existe en system_admins
  RETURN EXISTS (
    SELECT 1 
    FROM system_admins 
    WHERE user_id = check_user_id
  );
END;
$$;

-- Comentarios para documentación
COMMENT ON TABLE system_admins IS 'Administradores del sistema con acceso completo a todas las funcionalidades';
COMMENT ON COLUMN system_admins.user_id IS 'ID del usuario que es administrador del sistema';
COMMENT ON COLUMN system_admins.granted_by IS 'ID del admin que otorgó los permisos';
COMMENT ON COLUMN system_admins.notes IS 'Notas sobre por qué se otorgó acceso admin';

-- ⚠️  NOTA DE SEGURIDAD:
-- Esta migración contenía un email hardcodeado para el admin permanente.
-- Para configurar tu admin permanente:
-- 1. Añade NEXT_PUBLIC_SYSTEM_ADMIN_EMAIL a tus variables de entorno
-- 2. Ejecuta manualmente en Supabase SQL Editor:
--    INSERT INTO system_admins (user_id, notes)
--    SELECT id, 'Administrador permanente del sistema'
--    FROM auth.users
--    WHERE email = 'TU_EMAIL@example.com'
--    ON CONFLICT (user_id) DO NOTHING;

-- El código original fue removido por razones de seguridad/privacidad.
-- Ver docs/SYSTEM_ADMIN_SETUP.md para instrucciones completas.

