# scripts/AGENTS.md

# scripts/AGENTS.md

> **Scripts operativos v3.0.0**: PM2, migraciones, testing. Reorganizados por función.

---

## 📁 Estructura de Directorios (Issue #53 - Nov 2025)

```
scripts/
├── PM2_build_and_deploy_and_dev/    # 8 scripts PM2 + build
│   ├── pm2-dev-start.sh             # Iniciar desarrollo
│   ├── pm2-dev-stop.sh              # Detener desarrollo
│   ├── pm2-prod-start.sh            # Iniciar producción
│   ├── pm2-prod-stop.sh             # Detener producción
│   ├── pm2-status.sh                # Estado general PM2
│   ├── pm2-clean-logs.sh            # Limpiar logs archivados
│   ├── build-and-deploy.sh          # Build + deploy completo
│   └── load-env.js                  # Utilidad carga .env
│
└── migrations/                       # 7 scripts migraciones
    ├── apply_baseline.sh            # Aplicar baseline completo
    ├── apply_migration.sh           # Aplicar migración específica
    ├── create_migration.sh          # Crear nueva migración
    ├── generate-types.js            # Regenerar types TypeScript
    ├── migration_status.sh          # Ver estado migraciones
    ├── diff_migrations.sh           # Comparar entre entornos
    └── rollback_migration.sh        # Marcar como revertida
```

---

## 🎯 Reglas de Uso

### ✅ HACER:

1. **Usar SIEMPRE las Tareas de VS Code** (`Ctrl+Shift+P` → Tasks: Run Task)
   - Evita ejecutar scripts manualmente desde terminal
   - Las tareas gestionan paths, logs y confirmaciones correctamente

2. **PM2: Gestión de procesos**
   - DEV: "🟢 DEV: Iniciar", "🔄 DEV: Reiniciar", "🔴 DEV: Detener"
   - PROD: "🟢/🔄/🔴 PROD" equivalentes
   - Estado: "📊 Estado PM2 General"
   - Logs: "📋 DEV/PROD: Ver Logs"

3. **Migraciones: Workflow completo**
   - Crear: "➕ Crear Nueva Migración"
   - Estado: "📊 Ver Estado de Migraciones"
   - Comparar: "🔍 Comparar Migraciones entre Entornos"
   - Aplicar DEV: "🔧 DEV: Aplicar Migración Específica"
   - Testing: "🧪 TEST: Aplicar Migración Específica" (en test_baseline_v3)
   - Aplicar PROD: "🚀 PROD: Aplicar Migración Específica" (con confirmación)
   - Revertir: "↩️ Rollback: Marcar Migración como Revertida"

4. **Testing de migraciones**
   - Usa `test_baseline_v3` para probar cambios antes de DEV/PROD
   - Nunca pruebes directamente en DEV o PROD

### ❌ NO HACER:

- ❌ NO ejecutar scripts manualmente sin usar las tareas VS Code
- ❌ NO aplicar migraciones desde la aplicación Next.js
- ❌ NO hacer build en producción salvo petición explícita
- ❌ NO modificar scripts sin actualizar `.vscode/tasks.json`
- ❌ NO usar scripts obsoletos eliminados (ver lista abajo)

---

## 🗑️ Scripts Obsoletos Eliminados (Issue #53)

**Total eliminados**: 22 scripts

**Principales**:
- `promote_migration.sh` → Usar directorio único `migrations/`
- `apply_migrations_dev.sh` → Aplicar individualmente con `apply_migration.sh`
- `sync_dev_to_prod.sh` → No usado, workflow cambió
- `audit_unified_ownership.sh` → Auditoría no necesaria (v2.1.0 estable)
- `archive_old_migrations.sh` → Archivado manual si necesario
- `generate_baseline_v2.1.0.sh` → Baseline ya generado

---

## 🔧 Scripts Principales

### PM2 - Gestión de Procesos

**`pm2-dev-start.sh`** / **`pm2-prod-start.sh`**
- Archiva logs automáticamente antes de iniciar
- Carga variables de entorno (`.env.*.local`)
- Inicia proceso PM2 correspondiente
- Muestra URL de acceso

**`pm2-dev-stop.sh`** / **`pm2-prod-stop.sh`**
- Detiene proceso gradualmente
- Elimina proceso de PM2
- Confirma detención exitosa

**`pm2-status.sh`**
- Estado completo de procesos PM2
- Información de logs activos y archivados
- URLs disponibles

**`pm2-clean-logs.sh`**
- Limpia logs archivados antiguos
- Parámetro: días de retención (7 o 30)
- Uso: `./pm2-clean-logs.sh 30`

**`build-and-deploy.sh`**
- Build completo para producción
- Reinicia proceso PROD automáticamente
- Workflow: Clean → Build → Stop → Start

### Migraciones - Sistema v3.0.0

**`create_migration.sh`**
- Crea nueva migración en `database/migrations/`
- Template v3.0.0 con estructura DDL estándar
- Naming: `YYYYMMDD_HHMMSS_descripcion.sql`
- Uso: `./create_migration.sh "add refund system"`

**`apply_migration.sh`**
- Aplica migración a entorno especificado
- Entornos: `dev`, `prod`, `test`, `both`
- Conexión: `sudo -u postgres psql -d <database>`
- Validación: Checksum, duplicados, sintaxis SQL
- Auto-regeneración de types TypeScript
- Uso: `./apply_migration.sh dev 20251105_120000_add_feature.sql`

**`migration_status.sh`** ⭐ **NUEVO**
- Muestra estado completo de migraciones
- Consulta DEV, PROD y TEST simultáneamente
- Últimas 10 migraciones por entorno (timestamp, status, tiempo ejecución)
- Lista migraciones disponibles en `database/migrations/`
- Verifica sincronización DEV-PROD
- Salida con colores (azul=DEV, rojo=PROD, cyan=TEST)

**`diff_migrations.sh`** ⭐ **NUEVO**
- Compara migraciones entre entornos
- Muestra: Solo en DEV (listas para PROD), Solo en PROD (inconsistencias), Solo en TEST (experimentales)
- Provee recomendaciones automáticas
- Usa archivos temporales y comando `comm` para comparación
- Ideal antes de deployment a producción

**`rollback_migration.sh`** ⭐ **NUEVO**
- Marca migración como `rolled_back` en `_migrations`
- NO ejecuta SQL automáticamente (seguridad)
- Requiere confirmación del usuario
- Valida: entorno, existencia migración, status actual
- Muestra status actualizado y próximos pasos
- Uso: `./rollback_migration.sh dev 20251105_120000_feature.sql`

**`apply_baseline.sh`**
- Aplica baseline completo (`20251101_000000_baseline_v2.1.0.sql`)
- Recrea base de datos desde cero
- Solo para setup inicial o restauración completa

**`generate-types.js`**
- Regenera `types/database.generated.ts` desde PostgreSQL
- Ejecutado automáticamente por `apply_migration.sh`
- Puede ejecutarse manualmente: `npm run types:generate:dev`

---

## 🔐 Seguridad y Permisos

### Conexiones PostgreSQL

**Patrón v3.0.0**: `sudo -u postgres psql -d <database>`
- Sin contraseñas (peer authentication)
- Usuario `postgres` para DDL en migraciones
- Usuario `cuentassik_user` para aplicación Next.js

### Roles de Base de Datos

- **`cuentassik_owner`**: Owner de objetos (NOLOGIN)
- **`cuentassik_user`**: Usuario aplicación (LOGIN, permisos DML)
- **`postgres`**: Administración PostgreSQL

### Variables de Entorno

- `.env.development.local` → DEV
- `.env.production.local` → PROD
- `load-env.js` → Carga variables en scripts PM2

---

## 📚 Referencias

- **Documentación Issue #53**: `docs/ISSUE_53_PLAN_IMPLEMENTACION.md`
- **Database README**: `database/README.md` (sección migraciones)
- **Tareas VS Code**: `.vscode/tasks.json` (25 tareas disponibles)
- **Sistema PM2**: `docs/PM2_SISTEMA_COMPLETO.md`
- **Sistema PostgreSQL**: `docs/POSTGRESQL_SISTEMA_COMPLETO.md`

---

**Última actualización**: 5 Noviembre 2025 - Issue #53 (v3.0.0)
**Scripts totales**: 15 (8 PM2 + 7 migraciones)
**Obsoletos eliminados**: 22

## Reglas clave

- Usa siempre las Tareas de VS Code (Tasks) para ejecutar scripts. No ejecutes comandos manuales.
- DEV y PROD se reinician exclusivamente mediante tareas:
  - DEV: "🟢 DEV: Iniciar", "🔄 DEV: Reiniciar", "🔴 DEV: Detener"
  - PROD: "🟢/🔴/🔄" equivalentes
- No aplicar migraciones desde la app. Usa scripts dedicados y el usuario adecuado.
- No hacer build en producción salvo instrucción explícita.

## Tareas relevantes

- PM2: estado, logs, iniciar/detener/reiniciar
- Migraciones: crear, aplicar en DEV, promover a tested, desplegar a PROD
- Sincronización: PROD → DEV (solo datos)

## Seguridad

- Ejecuta scripts con los usuarios correctos (p. ej., `sudo -u postgres` cuando corresponda).
- No almacenes secretos en scripts; usa `.env.*.local` y carga con `load-env.js` si aplica.
- Migraciones: aplica cambios de estructura conectando como `postgres` y usando `SET ROLE cuentassik_[env]_owner;` según entorno (DEV/PROD).
