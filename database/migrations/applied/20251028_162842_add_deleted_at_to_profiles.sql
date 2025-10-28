-- Migración: Agregar soft delete a profiles
-- Fecha: 2025-10-28
-- Descripción: Agrega columna deleted_at para borrado lógico de perfiles

-- Agregar columna deleted_at a profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Crear índice para consultas de perfiles activos (deleted_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at 
ON profiles(deleted_at) 
WHERE deleted_at IS NULL;

-- Comentario explicativo
COMMENT ON COLUMN profiles.deleted_at IS 'Timestamp de borrado lógico. NULL = perfil activo, NOT NULL = perfil eliminado';

-- Registrar migración
INSERT INTO _migrations (migration_name, description)
VALUES (
  '$(basename $(ls -t *.sql | head -1))',
  'Agregar soft delete a profiles con columna deleted_at e índice'
)
ON CONFLICT (migration_name) DO NOTHING;
