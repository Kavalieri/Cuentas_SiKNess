-- Deprecación del campo legacy settings (jsonb) en households
-- Se archiva como settings_archivo para compatibilidad y trazabilidad
ALTER TABLE households RENAME COLUMN settings TO settings_archivo;
COMMENT ON COLUMN households.settings_archivo IS 'LEGACY: Campo jsonb de configuración antigua, archivado. No usar en lógica actual.';
