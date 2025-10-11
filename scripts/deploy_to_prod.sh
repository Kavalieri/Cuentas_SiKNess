#!/bin/bash
# ============================================================================
# Script de Deploy de Desarrollo a Producción
# ============================================================================
#
# FLUJO CORRECTO:
# 1. Desarrollo (cuentasdev.sikwow.com:3001) - Pruebas y cambios
# 2. Deploy → Producción (cuentas.sikwow.com:3000) - Solo recibe código validado
#
# Este script:
# - Aplica migraciones SQL pendientes en PROD
# - Despliega código desde DEV a PROD
# - Reinicia servicios
# - NO toca datos de usuarios
#
# ============================================================================

set -e  # Exit on error

PROD_DIR="/home/kava/workspace/proyectos/CuentasSiK/repo"
MIGRATIONS_DIR="$PROD_DIR/supabase/migrations"
BACKUP_DIR="$PROD_DIR/.deploy-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Funciones auxiliares
# ============================================================================

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# ============================================================================
# 1. Validación previa
# ============================================================================

log_info "Validando estado del entorno..."

# Verificar que estamos en el directorio correcto
if [ ! -d "$PROD_DIR" ]; then
    log_error "Directorio de producción no encontrado: $PROD_DIR"
    exit 1
fi

cd "$PROD_DIR"

# Verificar que existe directorio de migraciones
if [ ! -d "$MIGRATIONS_DIR" ]; then
    log_error "Directorio de migraciones no encontrado: $MIGRATIONS_DIR"
    exit 1
fi

# Verificar que PM2 está corriendo
if ! pm2 list | grep -q "cuentassik"; then
    log_warning "PM2 no está corriendo cuentassik, se iniciará después del deploy"
fi

log_success "Validación completada"

# ============================================================================
# 2. Backup de seguridad
# ============================================================================

log_info "Creando backup de seguridad..."

mkdir -p "$BACKUP_DIR"

# Backup del build actual
if [ -d ".next" ]; then
    log_info "Respaldando build actual (.next)..."
    tar -czf "$BACKUP_DIR/next-build-$TIMESTAMP.tar.gz" .next
    log_success "Backup creado: next-build-$TIMESTAMP.tar.gz"
fi

# ============================================================================
# 3. Aplicar migraciones SQL pendientes
# ============================================================================

log_info "Aplicando migraciones SQL a PRODUCCIÓN..."

# Conexión a BD de producción
DB_URL="postgresql://cuentassik_user:LkEVkbZvzDvyqhRvoaXo6Um1I@localhost:5432/cuentassik_prod"

# Buscar archivos .sql en directorio de migraciones
MIGRATION_FILES=$(find "$MIGRATIONS_DIR" -name "*.sql" -type f | sort)

if [ -z "$MIGRATION_FILES" ]; then
    log_warning "No se encontraron archivos de migración"
else
    log_info "Encontradas $(echo "$MIGRATION_FILES" | wc -l) migraciones"

    # Crear tabla de control de migraciones si no existe
    psql "$DB_URL" -c "
        CREATE TABLE IF NOT EXISTS _migrations (
            filename TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ DEFAULT NOW()
        );
    " > /dev/null 2>&1

    for migration in $MIGRATION_FILES; do
        filename=$(basename "$migration")

        # Verificar si ya fue aplicada
        already_applied=$(psql "$DB_URL" -tAc "SELECT COUNT(*) FROM _migrations WHERE filename = '$filename';")

        if [ "$already_applied" -eq "0" ]; then
            log_info "Aplicando: $filename"

            # Intentar aplicar migración
            if psql "$DB_URL" -f "$migration" 2>&1 | tee /tmp/migration_output.log | grep -q "ERROR"; then
                log_error "Error al aplicar migración: $filename"
                echo "Output:"
                cat /tmp/migration_output.log

                # Preguntar si continuar
                read -p "¿Continuar con el resto del deploy? (y/N): " continue_deploy
                if [[ ! $continue_deploy =~ ^[Yy]$ ]]; then
                    log_error "Deploy cancelado por error en migración"
                    exit 1
                fi
            else
                # Registrar como aplicada
                psql "$DB_URL" -c "INSERT INTO _migrations (filename) VALUES ('$filename');" > /dev/null
                log_success "Aplicada: $filename"
            fi
        else
            log_info "Ya aplicada: $filename (skip)"
        fi
    done
fi

log_success "Migraciones completadas"

# ============================================================================
# 4. Build de producción
# ============================================================================

log_info "Construyendo aplicación para producción..."

# Asegurar que usamos las variables de entorno correctas
export NODE_ENV=production

if npm run build; then
    log_success "Build completado exitosamente"
else
    log_error "Error en el build"

    # Restaurar backup si existe
    if [ -f "$BACKUP_DIR/next-build-$TIMESTAMP.tar.gz" ]; then
        log_warning "Restaurando backup anterior..."
        rm -rf .next
        tar -xzf "$BACKUP_DIR/next-build-$TIMESTAMP.tar.gz"
        log_success "Backup restaurado"
    fi

    exit 1
fi

# ============================================================================
# 5. Reiniciar servicios
# ============================================================================

log_info "Reiniciando PM2..."

if pm2 list | grep -q "cuentassik"; then
    pm2 restart cuentassik --update-env
    log_success "PM2 reiniciado"
else
    log_info "Iniciando PM2 por primera vez..."
    pm2 start npm --name "cuentassik" -- start
    pm2 save
    log_success "PM2 iniciado"
fi

# Esperar a que la aplicación esté lista
log_info "Esperando a que la aplicación responda..."
sleep 5

# ============================================================================
# 6. Verificación de salud
# ============================================================================

log_info "Verificando estado de la aplicación..."

# Verificar que responde en localhost:3000
if curl -f -s -o /dev/null "http://localhost:3000"; then
    log_success "✅ Aplicación respondiendo en localhost:3000"
else
    log_error "Aplicación no responde en localhost:3000"

    # Mostrar logs
    log_info "Últimas líneas de logs PM2:"
    pm2 logs cuentassik --lines 20 --nostream

    exit 1
fi

# Verificar que responde en el dominio
if curl -f -s -o /dev/null -k "https://cuentas.sikwow.com"; then
    log_success "✅ Aplicación accesible en https://cuentas.sikwow.com"
else
    log_warning "No se pudo verificar acceso público (puede ser problema de DNS/SSL)"
fi

# ============================================================================
# 7. Limpieza
# ============================================================================

log_info "Limpiando backups antiguos (>7 días)..."
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete
log_success "Limpieza completada"

# ============================================================================
# Resumen final
# ============================================================================

echo ""
echo "════════════════════════════════════════════════════════════"
log_success "🚀 DEPLOY COMPLETADO EXITOSAMENTE"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📋 Resumen:"
echo "  - Migraciones aplicadas"
echo "  - Build de producción completado"
echo "  - Servicios PM2 reiniciados"
echo "  - Aplicación verificada y funcionando"
echo ""
echo "🔗 URLs:"
echo "  - Local: http://localhost:3000"
echo "  - Público: https://cuentas.sikwow.com"
echo ""
echo "📊 Ver logs en vivo:"
echo "  pm2 logs cuentassik"
echo ""
echo "💾 Backup guardado en:"
echo "  $BACKUP_DIR/next-build-$TIMESTAMP.tar.gz"
echo ""
echo "════════════════════════════════════════════════════════════"
