#!/bin/bash
# Script para generar seed baseline v2.1.0
# Issue #6 - Unificación de ownership

set -e

echo "🌱 Generando seed baseline v2.1.0..."

TARGET_FILE="/home/kava/workspace/proyectos/CuentasSiK/repo/database/migrations/applied/20251101_000000_baseline_v2.1.0.sql"

# Crear header
cat > "$TARGET_FILE" << 'HEADER'
-- CuentasSiK Database Baseline v2.1.0
-- Fecha: 31 Octubre 2025
-- Propósito: Seed baseline limpia con ownership unificado
-- Issue: #6
-- Owner: cuentassik_owner (unificado para DEV y PROD)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Establecer rol owner unificado
SET ROLE cuentassik_owner;

HEADER

# Agregar dump de estructura (sin comentarios de dump innecesarios)
echo "📦 Agregando estructura de base de datos..."
grep -v "^-- Dumped" /tmp/baseline_v2.1.0_temp.sql | \
grep -v "^-- Dumped by" | \
grep -v "SET default_table_access_method" >> "$TARGET_FILE"

# Agregar datos de configuración esenciales
cat >> "$TARGET_FILE" << 'ESSENTIALS'

-- ============================================
-- DATOS DE CONFIGURACIÓN ESENCIALES
-- ============================================

-- Registro inicial en _migrations
INSERT INTO _migrations (migration_name, applied_at, applied_by, description)
VALUES ('20251101_000000_baseline_v2.1.0.sql', CURRENT_TIMESTAMP, CURRENT_USER, 'Baseline v2.1.0 - Ownership unificado')
ON CONFLICT (migration_name) DO NOTHING;

ESSENTIALS

# Agregar permisos finales
cat >> "$TARGET_FILE" << 'PERMISSIONS'

-- ============================================
-- PERMISOS PARA cuentassik_user
-- ============================================

-- Otorgar permisos en schema public
GRANT USAGE ON SCHEMA public TO cuentassik_user;

-- Otorgar permisos en todas las tablas
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cuentassik_user;

-- Otorgar permisos en secuencias
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cuentassik_user;

-- Otorgar permisos en funciones
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO cuentassik_user;

-- Configurar default privileges para objetos futuros
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cuentassik_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO cuentassik_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO cuentassik_user;

-- Resetear rol
RESET ROLE;

-- ============================================
-- FIN BASELINE v2.1.0
-- ============================================
PERMISSIONS

echo "✅ Seed baseline v2.1.0 generada exitosamente"
echo "📄 Ubicación: $TARGET_FILE"
echo "📊 Total líneas: $(wc -l < "$TARGET_FILE")"
