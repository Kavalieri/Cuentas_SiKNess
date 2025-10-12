#!/bin/bash

# Script para iniciar TODOS los procesos PM2 con variables de entorno
# Uso: ./scripts/pm2-start-all.sh

set -e

echo "🚀 Iniciando TODOS los procesos de CuentasSiK con PM2"

# Verificar archivos .env
if [ ! -f ".env.development.local" ]; then
    echo "❌ Archivo .env.development.local no encontrado"
    exit 1
fi

if [ ! -f ".env.production.local" ]; then
    echo "❌ Archivo .env.production.local no encontrado"
    exit 1
fi

echo "📄 Cargando variables de entorno..."

# Cargar variables de desarrollo
export $(node scripts/load-env.js ".env.development.local" | grep -E '^[A-Z_]+="')

echo "🔧 Iniciando proceso de DESARROLLO..."
pm2 start ecosystem.config.js --only cuentassik-dev

# Cargar variables de producción
export $(node scripts/load-env.js ".env.production.local" | grep -E '^[A-Z_]+="')

echo "🔧 Iniciando proceso de PRODUCCIÓN..."
sudo -u www-data pm2 start ecosystem.config.js --only cuentassik-prod

echo "✅ Todos los procesos iniciados correctamente"
echo ""
echo "📊 Estado actual:"
sudo -u www-data pm2 list
