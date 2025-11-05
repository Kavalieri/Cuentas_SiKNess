#!/bin/bash

# CuentasSiK - Detener entorno PRODUCCIÓN
# Autor: AI Assistant | Fecha: $(date '+%Y-%m-%d')

set -e

echo "🔴 DETENIENDO ENTORNO PRODUCCIÓN"
echo "================================="

# Verificar si el proceso está ejecutándose
if ! pm2 list | grep -q "cuentassik-prod"; then
    echo "⚠️  El proceso de producción no está ejecutándose"
    exit 0
fi

# Mostrar información actual
echo "📊 Estado actual del proceso:"
pm2 status cuentassik-prod

# Detener proceso gradualmente
echo "🛑 Deteniendo proceso de producción..."
pm2 stop cuentassik-prod

# Eliminar proceso de PM2
echo "🗑️  Eliminando proceso de PM2..."
pm2 delete cuentassik-prod

# Confirmación
echo "✅ Proceso de producción detenido correctamente"
echo "📋 Estado PM2 actual:"
pm2 status
