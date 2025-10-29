#!/bin/bash
# Script para sincronizar base de datos DEV → PROD
# Elimina completamente cuentassik_prod y la recrea con contenido exacto de cuentassik_dev

set -e  # Salir si cualquier comando falla

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    log_error "Este script debe ejecutarse desde la raíz del proyecto CuentasSiK"
    exit 1
fi

# Banner
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  CuentasSiK - Sincronización DEV → PROD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Variables
DEV_DB="cuentassik_dev"
PROD_DB="cuentassik_prod"
BACKUP_DIR="${HOME}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/prod_backup_${TIMESTAMP}.sql"
DUMP_FILE="/tmp/cuentassik_dev_dump_${TIMESTAMP}.sql"

# Crear directorio de backups si no existe
mkdir -p "${BACKUP_DIR}"

# PASO 1: Verificar que DEV existe
log_info "Verificando base de datos DEV..."
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "${DEV_DB}"; then
    log_error "Base de datos ${DEV_DB} no existe. Debe crearla primero."
    exit 1
fi
log_success "Base de datos ${DEV_DB} encontrada"

# PASO 2: Contar registros en DEV
log_info "Contando registros en DEV..."
DEV_PROFILES=$(sudo -u postgres psql -d "${DEV_DB}" -tAc "SELECT COUNT(*) FROM profiles;")
DEV_TRANSACTIONS=$(sudo -u postgres psql -d "${DEV_DB}" -tAc "SELECT COUNT(*) FROM transactions;")
DEV_HOUSEHOLDS=$(sudo -u postgres psql -d "${DEV_DB}" -tAc "SELECT COUNT(*) FROM households;")
log_success "DEV tiene: ${DEV_PROFILES} profiles, ${DEV_TRANSACTIONS} transactions, ${DEV_HOUSEHOLDS} households"

# PASO 3: Confirmar operación
echo ""
log_warning "⚠️  ADVERTENCIA: Esta operación es DESTRUCTIVA ⚠️"
echo ""
echo "  Se eliminará COMPLETAMENTE la base de datos ${PROD_DB}"
echo "  Se creará una copia EXACTA desde ${DEV_DB}"
echo ""
echo "  Datos que se copiarán:"
echo "    - ${DEV_PROFILES} perfiles de usuario"
echo "    - ${DEV_TRANSACTIONS} transacciones"
echo "    - ${DEV_HOUSEHOLDS} hogares"
echo "    - Todas las categorías, períodos, configuraciones, etc."
echo ""
read -p "¿Deseas continuar? (escribe 'SI' en mayúsculas): " CONFIRM

if [ "$CONFIRM" != "SI" ]; then
    log_warning "Operación cancelada por el usuario"
    exit 0
fi

echo ""
log_info "Iniciando sincronización..."
echo ""

# PASO 4: Backup de PROD actual (si existe)
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "${PROD_DB}"; then
    log_info "Haciendo backup de ${PROD_DB} actual..."
    sudo -u postgres pg_dump -d "${PROD_DB}" > "${BACKUP_FILE}" 2>/dev/null || {
        log_warning "No se pudo hacer backup (la DB puede estar vacía o corrupta)"
        rm -f "${BACKUP_FILE}"
    }

    if [ -f "${BACKUP_FILE}" ]; then
        BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
        log_success "Backup guardado en ${BACKUP_FILE} (${BACKUP_SIZE})"
    fi
fi

# PASO 5: Hacer dump de DEV
log_info "Exportando base de datos ${DEV_DB}..."
sudo -u postgres pg_dump \
    -d "${DEV_DB}" \
    --no-owner \
    --no-privileges \
    --format=plain \
    > "${DUMP_FILE}"

DUMP_SIZE=$(du -h "${DUMP_FILE}" | cut -f1)
log_success "Dump creado: ${DUMP_FILE} (${DUMP_SIZE})"

# PASO 6: Terminar conexiones activas a PROD
log_info "Terminando conexiones activas a ${PROD_DB}..."
sudo -u postgres psql -d postgres -c "
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname='${PROD_DB}' AND pid <> pg_backend_pid();
" > /dev/null 2>&1 || true
log_success "Conexiones terminadas"

# PASO 7: Eliminar PROD
log_info "Eliminando base de datos ${PROD_DB}..."
sudo -u postgres dropdb --if-exists "${PROD_DB}"
log_success "Base de datos eliminada"

# PASO 8: Crear PROD con owner correcto
log_info "Creando base de datos ${PROD_DB}..."
sudo -u postgres createdb --owner=cuentassik_prod_owner "${PROD_DB}"
log_success "Base de datos creada con owner cuentassik_prod_owner"

# PASO 9: Restaurar dump
log_info "Restaurando datos desde DEV..."
sudo -u postgres psql \
    -v ON_ERROR_STOP=1 \
    --set=SEED_OWNER=cuentassik_prod_owner \
    -d "${PROD_DB}" \
    -f "${DUMP_FILE}" > /dev/null

log_success "Datos restaurados"

# PASO 10: Establecer ownership correcto
log_info "Configurando ownership de objetos..."
sudo -u postgres psql -d "${PROD_DB}" << 'EOF' > /dev/null
-- Cambiar owner de todas las tablas
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO cuentassik_prod_owner';
    END LOOP;
END$$;

-- Cambiar owner de todas las secuencias
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequence_name) || ' OWNER TO cuentassik_prod_owner';
    END LOOP;
END$$;

-- Cambiar owner de todas las vistas materializadas
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT matviewname FROM pg_matviews WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER MATERIALIZED VIEW public.' || quote_ident(r.matviewname) || ' OWNER TO cuentassik_prod_owner';
    END LOOP;
END$$;
EOF
log_success "Ownership configurado"

# PASO 11: Restaurar permisos de cuentassik_user
log_info "Restaurando permisos para cuentassik_user..."
sudo -u postgres psql -d "${PROD_DB}" << 'EOF' > /dev/null
-- Permisos en schema
GRANT USAGE ON SCHEMA public TO cuentassik_user;

-- Permisos en tablas
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cuentassik_user;

-- Permisos en secuencias
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cuentassik_user;

-- Permisos en funciones
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO cuentassik_user;

-- Permisos en rutinas
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO cuentassik_user;

-- Default privileges para objetos futuros
ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_prod_owner IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cuentassik_user;

ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_prod_owner IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO cuentassik_user;

ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_prod_owner IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO cuentassik_user;

ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_prod_owner IN SCHEMA public
    GRANT EXECUTE ON ROUTINES TO cuentassik_user;
EOF
log_success "Permisos restaurados"

# PASO 12: Refrescar vistas materializadas
log_info "Refrescando vistas materializadas..."
sudo -u postgres psql -d "${PROD_DB}" << 'EOF' > /dev/null
REFRESH MATERIALIZED VIEW CONCURRENTLY household_stats;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_household_balances;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_pending_contributions;
EOF
log_success "Vistas materializadas refrescadas"

# PASO 13: Verificar resultado
log_info "Verificando sincronización..."
PROD_PROFILES=$(sudo -u postgres psql -d "${PROD_DB}" -tAc "SELECT COUNT(*) FROM profiles;")
PROD_TRANSACTIONS=$(sudo -u postgres psql -d "${PROD_DB}" -tAc "SELECT COUNT(*) FROM transactions;")
PROD_HOUSEHOLDS=$(sudo -u postgres psql -d "${PROD_DB}" -tAc "SELECT COUNT(*) FROM households;")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Verificación de Datos"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
printf "  %-20s %10s %10s %10s\n" "Tabla" "DEV" "PROD" "Estado"
printf "  %-20s %10s %10s %10s\n" "────────────────────" "──────────" "──────────" "──────────"
printf "  %-20s %10s %10s" "profiles" "${DEV_PROFILES}" "${PROD_PROFILES}"
if [ "${DEV_PROFILES}" -eq "${PROD_PROFILES}" ]; then
    echo -e " ${GREEN}✓${NC}"
else
    echo -e " ${RED}✗${NC}"
fi

printf "  %-20s %10s %10s" "transactions" "${DEV_TRANSACTIONS}" "${PROD_TRANSACTIONS}"
if [ "${DEV_TRANSACTIONS}" -eq "${PROD_TRANSACTIONS}" ]; then
    echo -e " ${GREEN}✓${NC}"
else
    echo -e " ${RED}✗${NC}"
fi

printf "  %-20s %10s %10s" "households" "${DEV_HOUSEHOLDS}" "${PROD_HOUSEHOLDS}"
if [ "${DEV_HOUSEHOLDS}" -eq "${PROD_HOUSEHOLDS}" ]; then
    echo -e " ${GREEN}✓${NC}"
else
    echo -e " ${RED}✗${NC}"
fi

echo ""

# PASO 14: Limpiar archivos temporales
log_info "Limpiando archivos temporales..."
rm -f "${DUMP_FILE}"
log_success "Archivos temporales eliminados"

# PASO 15: Mostrar resumen
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Sincronización Completada"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
log_success "Base de datos ${PROD_DB} es ahora una copia exacta de ${DEV_DB}"
echo ""
echo "  Siguiente paso:"
echo "    1. Verificar que la aplicación PROD funciona correctamente"
echo "    2. Si todo está bien, reiniciar PM2:"
echo "       ./scripts/pm2-prod-stop.sh && ./scripts/pm2-prod-start.sh"
echo ""

if [ -f "${BACKUP_FILE}" ]; then
    echo "  Backup del PROD anterior guardado en:"
    echo "    ${BACKUP_FILE}"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
