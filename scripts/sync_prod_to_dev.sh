#!/bin/bash
# sync_prod_to_dev.sh - Sincroniza base de datos de PROD a DEV
#
# CUIDADO: Sobrescribe completamente cuentassik_dev con datos de PROD

set -e

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly BACKUP_DIR="$HOME/backups"
readonly TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "📥 ESCENARIO 1: Sincronizar PROD → DEV"
echo "======================================"
echo ""

# 1. Backup de DEV por seguridad
echo "💾 1. Backup de DEV..."
mkdir -p "$BACKUP_DIR"
sudo -u postgres pg_dump -d cuentassik_dev > "$BACKUP_DIR/dev_backup_$TIMESTAMP.sql"
echo "✅ Backup guardado: $BACKUP_DIR/dev_backup_$TIMESTAMP.sql"
echo ""

# 2. Dump de PROD
echo "📦 2. Dump de PROD..."
sudo -u postgres pg_dump -d cuentassik_prod > "$BACKUP_DIR/prod_dump_$TIMESTAMP.sql"
echo "✅ Dump PROD guardado"
echo ""

# 3. Drop y recrear DEV
echo "🗑️ 3. Limpiando DEV..."
sudo -u postgres psql << 'EOF'
DROP DATABASE IF EXISTS cuentassik_dev;
CREATE DATABASE cuentassik_dev;
ALTER DATABASE cuentassik_dev OWNER TO cuentassik_user;
GRANT ALL PRIVILEGES ON DATABASE cuentassik_dev TO cuentassik_user;
EOF
echo "✅ Base de datos DEV recreada"
echo ""

# 4. Restaurar dump de PROD en DEV
echo "📥 4. Restaurando datos de PROD en DEV..."
sudo -u postgres psql -d cuentassik_dev < "$BACKUP_DIR/prod_dump_$TIMESTAMP.sql"
echo "✅ Datos restaurados"
echo ""

# 5. Verificación
echo "🔍 5. Verificación..."
TABLES=$(sudo -u postgres psql -d cuentassik_dev -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "   Tablas en DEV: $TABLES"
echo ""

echo "✅ Sincronización completada"
echo ""
echo "📊 Próximos pasos:"
echo "   1. Verificar datos: psql -U cuentassik_user -d cuentassik_dev"
echo "   2. Iniciar dev server: npm run dev"
