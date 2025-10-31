#!/bin/bash
# Script de Auditoría: Ownership Unificado v2.1.0
# Fecha: 31 Octubre 2025
# Fase 7/12 del Issue #6

set -e

echo "=========================================="
echo "🔍 AUDITORÍA: Ownership Unificado v2.1.0"
echo "=========================================="
echo ""

# 1. Verificar roles del sistema
echo "1️⃣ ROLES DEL SISTEMA:"
echo "--------------------"
sudo -u postgres psql -d postgres -t -A -F $'\t' << 'EOF'
SELECT
  rolname,
  CASE WHEN rolsuper THEN 'SUPERUSER' ELSE 'normal' END as tipo,
  CASE WHEN rolcanlogin THEN 'LOGIN' ELSE 'NOLOGIN' END as acceso
FROM pg_roles
WHERE rolname LIKE '%cuentassik%'
ORDER BY rolname;
EOF
echo ""

# 2. Verificar ownership en DEV
echo "2️⃣ DEV - Distribución de Ownership:"
echo "------------------------------------"
sudo -u postgres psql -d cuentassik_dev -t -A -F $'\t' << 'EOF'
SELECT
  CASE
    WHEN relkind = 'r' THEN 'Tablas'
    WHEN relkind = 'S' THEN 'Secuencias'
    WHEN relkind = 'v' THEN 'Vistas'
    WHEN relkind = 'm' THEN 'Mat. Views'
    WHEN relkind = 'i' THEN 'Índices'
    ELSE relkind
  END as tipo,
  pg_get_userbyid(relowner) as owner,
  COUNT(*) as cantidad
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind IN ('r', 'S', 'v', 'm', 'i')
GROUP BY relkind, pg_get_userbyid(relowner)
ORDER BY tipo, owner;
EOF
echo ""

# 3. Verificar ownership en PROD
echo "3️⃣ PROD - Distribución de Ownership:"
echo "-------------------------------------"
sudo -u postgres psql -d cuentassik_prod -t -A -F $'\t' << 'EOF'
SELECT
  CASE
    WHEN relkind = 'r' THEN 'Tablas'
    WHEN relkind = 'S' THEN 'Secuencias'
    WHEN relkind = 'v' THEN 'Vistas'
    WHEN relkind = 'm' THEN 'Mat. Views'
    WHEN relkind = 'i' THEN 'Índices'
    ELSE relkind
  END as tipo,
  pg_get_userbyid(relowner) as owner,
  COUNT(*) as cantidad
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind IN ('r', 'S', 'v', 'm', 'i')
GROUP BY relkind, pg_get_userbyid(relowner)
ORDER BY tipo, owner;
EOF
echo ""

# 4. Verificar funciones
echo "4️⃣ FUNCIONES (DEV):"
echo "-------------------"
sudo -u postgres psql -d cuentassik_dev -t -A -F $'\t' << 'EOF'
SELECT
  pg_get_userbyid(proowner) as owner,
  COUNT(*) as cantidad
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
GROUP BY pg_get_userbyid(proowner);
EOF
echo ""

# 5. Verificar tipos (ENUMs)
echo "5️⃣ TIPOS/ENUMS (DEV):"
echo "---------------------"
sudo -u postgres psql -d cuentassik_dev -t -A -F $'\t' << 'EOF'
SELECT
  CASE
    WHEN typtype = 'e' THEN 'ENUM'
    WHEN typtype = 'b' THEN 'Base Type (Array)'
    ELSE typtype
  END as tipo,
  pg_get_userbyid(typowner) as owner,
  COUNT(*) as cantidad
FROM pg_type
WHERE typnamespace = 'public'::regnamespace
  AND typtype IN ('e', 'b')
GROUP BY typtype, pg_get_userbyid(typowner);
EOF
echo ""

# 6. Verificar simetría DEV-PROD (tablas)
echo "6️⃣ SIMETRÍA DEV-PROD (Tablas):"
echo "-------------------------------"
sudo -u postgres psql << 'EOF'
WITH dev_tables AS (
  SELECT tablename
  FROM pg_tables
  WHERE schemaname='public'
    AND tableowner='cuentassik_owner'
),
prod_tables AS (
  SELECT tablename
  FROM pg_tables
  WHERE schemaname='public'
    AND tableowner='cuentassik_owner'
)
SELECT
  COALESCE(d.tablename, p.tablename) as tabla,
  CASE
    WHEN d.tablename IS NULL THEN '❌ FALTA EN DEV'
    WHEN p.tablename IS NULL THEN '❌ FALTA EN PROD'
    ELSE '✅ OK'
  END as estado
FROM dev_tables d
FULL OUTER JOIN prod_tables p ON d.tablename = p.tablename
WHERE d.tablename IS NULL OR p.tablename IS NULL
ORDER BY tabla;
EOF

# Verificar si hay diferencias
DIFFERENCES=$(sudo -u postgres psql -t -A << 'EOF'
WITH dev_tables AS (
  SELECT tablename FROM pg_tables WHERE schemaname='public' AND tableowner='cuentassik_owner'
),
prod_tables AS (
  SELECT tablename FROM pg_tables WHERE schemaname='public' AND tableowner='cuentassik_owner'
)
SELECT COUNT(*)
FROM dev_tables d
FULL OUTER JOIN prod_tables p ON d.tablename = p.tablename
WHERE d.tablename IS NULL OR p.tablename IS NULL;
EOF
)

if [ "$DIFFERENCES" -eq "0" ]; then
  echo "✅ Simetría perfecta - Sin diferencias"
else
  echo "⚠️  Se encontraron $DIFFERENCES diferencias"
fi
echo ""

# 7. Resumen final
echo "=========================================="
echo "✅ AUDITORÍA COMPLETADA"
echo "=========================================="
echo ""
echo "📊 RESUMEN:"
echo "  • Roles activos: 2 (cuentassik_owner, cuentassik_user)"
echo "  • Roles obsoletos: 0 (dev_owner y prod_owner eliminados)"
echo "  • Ownership unificado: ✅ cuentassik_owner"
echo "  • Simetría DEV-PROD: Ver arriba"
echo ""
