-- Create contribution_adjustment_templates table
CREATE TABLE contribution_adjustment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  
  -- Template info
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  
  -- Default values
  default_amount DECIMAL(10,2), -- Opcional, monto sugerido inicial
  last_used_amount DECIMAL(10,2), -- Último monto usado
  last_used_at TIMESTAMPTZ,
  
  -- Metadata
  is_default BOOLEAN DEFAULT false, -- True para plantillas del sistema
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  UNIQUE(household_id, name)
);

CREATE INDEX idx_templates_household ON contribution_adjustment_templates(household_id);
CREATE INDEX idx_templates_default ON contribution_adjustment_templates(is_default) WHERE is_default = true;

-- RLS
ALTER TABLE contribution_adjustment_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY templates_household_members ON contribution_adjustment_templates
  FOR ALL USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE profile_id = auth.uid()
    )
  );

-- Función para crear plantillas predeterminadas
CREATE OR REPLACE FUNCTION create_default_adjustment_templates()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar 4 plantillas predeterminadas usando la categoría "Vivienda"
  INSERT INTO contribution_adjustment_templates (household_id, name, description, category_id, is_default, created_by)
  SELECT 
    NEW.id,
    template_name,
    template_description,
    (SELECT id FROM categories WHERE household_id = NEW.id AND name = 'Vivienda' AND type = 'expense' LIMIT 1),
    true,
    auth.uid()
  FROM (
    VALUES 
      ('Alquiler Vivienda', 'Pago mensual del alquiler o hipoteca'),
      ('Luz', 'Factura de electricidad'),
      ('Agua', 'Factura de agua y alcantarillado'),
      ('Internet', 'Servicio de internet y telecomunicaciones')
  ) AS templates(template_name, template_description);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear plantillas al crear household
-- NOTA: Este trigger se ejecuta DESPUÉS del trigger on_household_created_create_categories
-- por lo que las categorías ya existen cuando se ejecuta
CREATE TRIGGER on_household_created_create_templates
  AFTER INSERT ON households
  FOR EACH ROW
  EXECUTE FUNCTION create_default_adjustment_templates();

-- Agregar template_id a contribution_adjustments (opcional, para trazabilidad)
ALTER TABLE contribution_adjustments
  ADD COLUMN template_id UUID REFERENCES contribution_adjustment_templates(id) ON DELETE SET NULL;

CREATE INDEX idx_adjustments_template ON contribution_adjustments(template_id) WHERE template_id IS NOT NULL;

-- Comentarios
COMMENT ON TABLE contribution_adjustment_templates IS 'Plantillas predefinidas para crear ajustes de contribución recurrentes (alquiler, luz, agua, internet, etc.)';
COMMENT ON COLUMN contribution_adjustment_templates.name IS 'Nombre de la plantilla (ej: "Alquiler Vivienda")';
COMMENT ON COLUMN contribution_adjustment_templates.last_used_amount IS 'Último monto usado con esta plantilla, para pre-rellenar el formulario';
COMMENT ON COLUMN contribution_adjustment_templates.is_default IS 'True para plantillas del sistema (alquiler, luz, agua, internet), false para plantillas personalizadas';
COMMENT ON COLUMN contribution_adjustment_templates.usage_count IS 'Contador de veces que se ha usado esta plantilla';
COMMENT ON COLUMN contribution_adjustments.template_id IS 'ID de la plantilla usada para crear este ajuste (si aplica), para trazabilidad';
