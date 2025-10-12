#!/bin/bash

# Script para detener TODOS los procesos PM2
# Uso: ./scripts/pm2-stop-all.sh

set -e

echo "🛑 Deteniendo TODOS los procesos de CuentasSiK"

echo "Deteniendo procesos..."
sudo -u www-data pm2 stop all
sudo -u www-data pm2 delete all

echo "✅ Todos los procesos detenidos correctamente"
echo ""
echo "📊 Estado actual:"
sudo -u www-data pm2 list
