-- Agregar columnas faltantes a contribution_adjustment_templates
ALTER TABLE contribution_adjustment_templates
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0 NOT NULL;

-- Actualizar plantillas existentes con datos por defecto
UPDATE contribution_adjustment_templates
SET 
  icon = CASE name
    WHEN 'Alquiler/Hipoteca' THEN '🏠'
    WHEN 'Luz' THEN '💡'
    WHEN 'Agua' THEN '💧'
    WHEN 'Internet/Teléfono' THEN '📡'
    ELSE '📋'
  END,
  sort_order = CASE name
    WHEN 'Alquiler/Hipoteca' THEN 1
    WHEN 'Luz' THEN 2
    WHEN 'Agua' THEN 3
    WHEN 'Internet/Teléfono' THEN 4
    ELSE 999
  END,
  is_active = true
WHERE icon IS NULL OR sort_order IS NULL;
