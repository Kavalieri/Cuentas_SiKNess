-- Tabla de control de migraciones para PostgreSQL
-- CuentasSiK - Sistema de seguimiento de migraciones

CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  applied_by VARCHAR(100) DEFAULT CURRENT_USER,
  checksum VARCHAR(64), -- MD5 del archivo para verificar integridad
  execution_time_ms INTEGER,
  description TEXT
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON _migrations(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_migrations_name ON _migrations(migration_name);

-- Comentarios
COMMENT ON TABLE _migrations IS 'Control de migraciones aplicadas al esquema de base de datos';
COMMENT ON COLUMN _migrations.migration_name IS 'Nombre del archivo de migración (ej: 20251010000001_add_system_admin.sql)';
COMMENT ON COLUMN _migrations.applied_at IS 'Timestamp de cuándo se aplicó la migración';
COMMENT ON COLUMN _migrations.applied_by IS 'Usuario de PostgreSQL que aplicó la migración';
COMMENT ON COLUMN _migrations.checksum IS 'Hash MD5 del contenido del archivo para validación';
COMMENT ON COLUMN _migrations.execution_time_ms IS 'Tiempo de ejecución en milisegundos';

-- Vista para consulta rápida
CREATE OR REPLACE VIEW v_migrations_summary AS
SELECT
  migration_name,
  applied_at,
  applied_by,
  execution_time_ms,
  description
FROM _migrations
ORDER BY applied_at DESC;

COMMENT ON VIEW v_migrations_summary IS 'Vista resumen de migraciones aplicadas';
