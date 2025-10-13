#!/bin/bash

# =============================================================================
# LIMPIAR ENTORNO DEV PARA TESTING - Mantener solo Admin
# =============================================================================
# Este script limpia la base de datos DEV manteniendo únicamente:
# - Usuario admin: caballeropomes@gmail.com
# - Estructura de tablas intacta
# - Sistema de migraciones funcional
#
# PROPÓSITO: Entorno limpio para probar workflow completo:
# onboarding → invitaciones → dual-flow → sistema completo
# =============================================================================

set -euo pipefail

DB_NAME="cuentassik_dev"
DB_USER="cuentassik_user"
ADMIN_EMAIL="caballeropomes@gmail.com"

echo "🧹 LIMPIANDO ENTORNO DEV PARA TESTING"
echo "======================================"
echo "📧 Manteniendo admin: $ADMIN_EMAIL"
echo "🗃️  Base de datos: $DB_NAME"
echo ""

# Función para ejecutar SQL (usando postgres para administración)
execute_sql() {
    local sql="$1"
    echo "🔄 Ejecutando: ${sql:0:50}..."
    sudo -u postgres psql -d "$DB_NAME" -c "$sql"
}

# Función para mostrar contadores
show_counts() {
    echo ""
    echo "📊 ESTADO ACTUAL DE LA BASE DE DATOS:"
    echo "───────────────────────────────────────"

    # Perfiles
    local profiles_count=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM profiles;" | xargs)
    echo "👤 Perfiles: $profiles_count"

    # Hogares
    local households_count=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM households;" | xargs)
    echo "🏠 Hogares: $households_count"

    # Miembros
    local members_count=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM household_members;" | xargs)
    echo "👥 Miembros: $members_count"

    # Transacciones
    local transactions_count=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM transactions;" | xargs)
    echo "💳 Transacciones: $transactions_count"

    # Categorías
    local categories_count=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM categories;" | xargs)
    echo "📂 Categorías: $categories_count"

    echo ""
}

# Mostrar estado inicial
echo "📊 ESTADO INICIAL:"
show_counts

# Confirmación de seguridad
echo "⚠️  CONFIRMACIÓN REQUERIDA:"
echo "   Este script eliminará TODOS los datos excepto el admin"
echo "   ¿Estás seguro de continuar? (sí/no)"
read -r confirmation

if [[ "$confirmation" != "sí" ]]; then
    echo "❌ Operación cancelada por el usuario"
    exit 1
fi

echo ""
echo "🚀 INICIANDO LIMPIEZA..."
echo ""

# ============================================
# PASO 1: Obtener ID del admin antes de limpiar
# ============================================
echo "🔍 1. Obteniendo ID del usuario admin..."

ADMIN_ID=$(sudo -u postgres psql -d "$DB_NAME" -t -c "
    SELECT id FROM profiles WHERE email = '$ADMIN_EMAIL';
" | xargs)

if [[ -z "$ADMIN_ID" ]]; then
    echo "❌ ERROR: No se encontró el usuario admin '$ADMIN_EMAIL'"
    echo "   Verifica que el email esté correcto y que el usuario exista"
    exit 1
fi

echo "✅ Admin encontrado con ID: $ADMIN_ID"

# ============================================
# PASO 2: Limpiar datos manteniendo integridad referencial
# ============================================
echo ""
echo "🧹 2. Limpiando datos (orden por dependencias)..."

# 2.1 Tablas de datos transaccionales (sin FK a profiles)
echo "   💳 Limpiando transacciones y datos relacionados..."
execute_sql "DELETE FROM transactions;"
execute_sql "DELETE FROM contribution_adjustments;"
execute_sql "DELETE FROM contributions;"
execute_sql "DELETE FROM monthly_periods;"

# 2.1.1 Tablas del dual-flow
echo "   🔄 Limpiando tablas dual-flow..."
execute_sql "DELETE FROM dual_flow_transactions;"
execute_sql "DELETE FROM journal_transactions;"
execute_sql "DELETE FROM journal_adjustments;"
execute_sql "DELETE FROM journal_invitations;"
execute_sql "DELETE FROM journal_roles;"
execute_sql "DELETE FROM contribution_periods;"

# 2.2 Tablas de configuración de hogar
echo "   ⚙️  Limpiando configuraciones de hogar..."
execute_sql "DELETE FROM household_settings;"
execute_sql "DELETE FROM household_savings;"
execute_sql "DELETE FROM member_credits;"
execute_sql "DELETE FROM member_incomes;"
execute_sql "DELETE FROM user_active_household;"
execute_sql "DELETE FROM user_settings;"
execute_sql "DELETE FROM contribution_adjustment_templates;"

# 2.3 Invitaciones
echo "   📧 Limpiando invitaciones..."
execute_sql "DELETE FROM invitations;"

# 2.4 Categorías (manteniendo solo las del admin si las tiene)
echo "   📂 Limpiando categorías..."
execute_sql "DELETE FROM categories WHERE household_id NOT IN (
    SELECT household_id FROM household_members WHERE profile_id = '$ADMIN_ID'
);"

# 2.5 Miembros de hogar (excepto admin)
echo "   👥 Limpiando miembros de hogar (excepto admin)..."
execute_sql "DELETE FROM household_members WHERE profile_id != '$ADMIN_ID';"

# 2.6 Hogares sin miembros (excepto los del admin)
echo "   🏠 Limpiando hogares sin miembros..."
execute_sql "DELETE FROM households WHERE id NOT IN (
    SELECT DISTINCT household_id FROM household_members WHERE profile_id = '$ADMIN_ID'
);"

# 2.7 Perfiles (excepto admin)
echo "   👤 Limpiando perfiles (excepto admin)..."
execute_sql "DELETE FROM profiles WHERE id != '$ADMIN_ID';"

# ============================================
# PASO 3: Resetear secuencias (solo las que existen y son enteros)
# ============================================
echo ""
echo "🔄 3. Reseteando secuencias..."

# Solo resetear secuencias de enteros que existan
# NOTA: profiles, households usan UUIDs, no secuencias
execute_sql "SELECT setval('categories_id_seq', COALESCE(MAX(id), 1)) FROM categories;"
execute_sql "SELECT setval('transactions_id_seq', COALESCE(MAX(id), 1)) FROM transactions;"
execute_sql "SELECT setval('invitations_id_seq', COALESCE(MAX(id), 1)) FROM invitations;"

# ============================================
# PASO 4: Verificar resultado
# ============================================
echo ""
echo "✅ 4. LIMPIEZA COMPLETADA"
echo ""

# Mostrar estado final
show_counts

# Mostrar detalles del admin
echo "👤 DETALLES DEL ADMIN PRESERVADO:"
echo "─────────────────────────────────"
sudo -u postgres psql -d "$DB_NAME" -c "
    SELECT
        p.id,
        p.email,
        p.display_name,
        COALESCE(h.name, 'Sin hogar') as household_name
    FROM profiles p
    LEFT JOIN household_members hm ON p.id = hm.profile_id
    LEFT JOIN households h ON hm.household_id = h.id
    WHERE p.email = '$ADMIN_EMAIL';
"

echo ""
echo "🎯 ENTORNO PREPARADO PARA TESTING"
echo "================================="
echo "✅ Admin preservado: $ADMIN_EMAIL"
echo "✅ Estructura de tablas intacta"
echo "✅ Sistema de migraciones funcional"
echo "✅ Listo para workflow completo:"
echo "   → Login del admin"
echo "   → Redirección automática a /dual-flow"
echo "   → Crear hogar (onboarding)"
echo "   → Invitar miembros"
echo "   → Probar sistema completo"
echo ""
echo "🚀 Puedes proceder con las pruebas!"
