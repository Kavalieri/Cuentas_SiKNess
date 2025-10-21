-- Añadir columna contribution_disabled a monthly_periods
-- Para permitir ignorar el sistema de contribuciones en períodos específicos

ALTER TABLE monthly_periods
ADD COLUMN IF NOT EXISTS contribution_disabled BOOLEAN DEFAULT FALSE NOT NULL;

COMMENT ON COLUMN monthly_periods.contribution_disabled IS
'Si TRUE, este período ignora el sistema de contribuciones.
Útil para meses pasados donde no se hizo ingreso común y todo se manejó con gastos directos.
Cuando TRUE, las contribuciones se establecen a 0€ para todos los miembros.';

-- Registrar migración
INSERT INTO _migrations (migration_name, description, checksum)
VALUES (
    '20251020_174955_add_contribution_disabled.sql',
    'Añadir columna contribution_disabled a monthly_periods para soportar períodos sin sistema de contribuciones',
    MD5('ALTER TABLE monthly_periods ADD COLUMN IF NOT EXISTS contribution_disabled BOOLEAN DEFAULT FALSE NOT NULL;')
)
ON CONFLICT (migration_name) DO NOTHING;
