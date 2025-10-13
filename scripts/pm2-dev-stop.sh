#!/bin/bash

# CuentasSiK - Detener entorno DESARROLLO
# Autor: AI Assistant | Fecha: $(date '+%Y-%m-%d')

set -e

echo "🔴 DETENIENDO ENTORNO DESARROLLO"
echo "================================="

# Verificar si el proceso está ejecutándose
if ! pm2 list | grep -q "cuentassik-dev"; then
    echo "⚠️  El proceso de desarrollo no está ejecutándose"
    exit 0
fi

# Mostrar información actual
echo "📊 Estado actual del proceso:"
pm2 status cuentassik-dev

# Detener proceso
echo "🛑 Deteniendo proceso de desarrollo..."
pm2 stop cuentassik-dev

# Eliminar proceso de PM2
echo "🗑️  Eliminando proceso de PM2..."
pm2 delete cuentassik-dev

# Confirmación
echo "✅ Proceso de desarrollo detenido correctamente"
echo "📋 Estado PM2 actual:"
pm2 status
