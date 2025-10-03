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

-- Insertar admin permanente del sistema (caballeropomes@gmail.com)
-- Este admin se inserta automáticamente cuando el usuario existe
-- y NO se elimina en el wipe general
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Buscar el usuario por email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'caballeropomes@gmail.com';
  
  -- Si el usuario existe, agregarlo como admin (si no existe ya)
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO system_admins (user_id, notes)
    VALUES (admin_user_id, 'Administrador permanente del sistema - Auto-asignado')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

