#!/bin/bash

# Script para detener PM2
# Uso: ./scripts/pm2-stop.sh [dev|prod|all]

set -e

TARGET=${1:-all}

echo "🛑 Deteniendo procesos PM2 (target: $TARGET)"

if [ "$TARGET" = "all" ]; then
    pm2 stop all
    pm2 delete all
    echo "✅ Todos los procesos detenidos"
elif [ "$TARGET" = "dev" ]; then
    pm2 stop cuentassik-dev
    pm2 delete cuentassik-dev
    echo "✅ Proceso de desarrollo detenido"
elif [ "$TARGET" = "prod" ]; then
    pm2 stop cuentassik-prod
    pm2 delete cuentassik-prod
    echo "✅ Proceso de producción detenido"
else
    echo "❌ Target no válido. Use 'dev', 'prod' o 'all'"
    exit 1
fi
