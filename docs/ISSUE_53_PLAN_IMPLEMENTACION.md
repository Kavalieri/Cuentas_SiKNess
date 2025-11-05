# Issue #53 - Plan de Implementación Completo

**Fecha**: 5 Noviembre 2025 | **Estado**: Listo para implementar

---

## 📊 Estado Actual (Post Issue #47 y #52)

### ✅ Ya Completado
- ✅ Estructura simplificada: `database/migrations/` + `archive/`
- ✅ Eliminados directorios: `development/`, `tested/`, `applied/`
- ✅ Baseline v3.0.0 funcional y validado
- ✅ Script `apply_baseline.sh` creado y probado
- ✅ Sistema `_migrations` como source of truth verificado

### 📂 Estructura Actual Scripts
```
scripts/
├── PM2_build_and_deploy_and_dev/  ← 7 scripts PM2
│   ├── pm2-dev-start.sh
│   ├── pm2-dev-stop.sh
│   ├── pm2-prod-start.sh
│   ├── pm2-prod-stop.sh
│   ├── pm2-status.sh
│   ├── pm2-clean-logs.sh
│   └── build-and-deploy.sh
└── migrations/  ← 4 scripts migraciones
    ├── apply_baseline.sh ✅ NUEVO
    ├── apply_migration.sh
    ├── create_migration.sh
    └── generate-types.js
```

### ⚠️ Problemas Detectados

**1. Tareas VS Code con rutas incorrectas** (14 tareas):
- Apuntan a `./scripts/` o `${workspaceFolder}/scripts/`
- Deberían apuntar a subdirectorios: `PM2_build_and_deploy_and_dev/` o `migrations/`

**2. Scripts referenciados que NO existen** (5 tareas):
- ❌ `migration_status.sh` (tarea existe, script NO)
- ❌ `promote_migration.sh` (tarea existe, script NO)
- ❌ `apply_migrations_dev.sh` (tarea existe, script NO)
- ❌ `sync_dev_to_prod.sh` (tarea existe, script NO)
- ❌ `audit_unified_ownership.sh` (tarea existe, script NO)

**3. Scripts obsoletos en tareas**:
- `promote_migration.sh` - Ya no tiene sentido (directorio único)
- `apply_migrations_dev.sh` - Redundante con `apply_migration.sh`
- `sync_dev_to_prod.sh` - ¿Necesario? (verificar uso)
- `audit_unified_ownership.sh` - ¿Necesario? (verificar uso)

---

## 🎯 Plan de Implementación

### **FASE 1: Scripts de Migraciones (2-3 horas)**

#### 1.1 Crear Scripts Nuevos (1h)

**A. `migration_status.sh`** - Ver estado de migraciones
```bash
#!/bin/bash
# Muestra migraciones aplicadas en DEV, PROD y TEST
# Lista migraciones disponibles en database/migrations/
# Identifica diferencias entre entornos
```

**Output esperado**:
```
📊 ESTADO DE MIGRACIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔵 DEV (cuentassik_dev):
  ✅ 20251105_150000_baseline_v3.0.0_complete.sql (5 Nov 10:00)

🔴 PROD (cuentassik_prod):
  ✅ 20251105_150000_baseline_v3.0.0_complete.sql (5 Nov 10:00)

🧪 TEST (test_baseline_v3):
  ✅ 20251105_150000_baseline_v3.0.0_complete.sql (5 Nov 15:00)

📁 DISPONIBLES (database/migrations/):
  20251105_150000_baseline_v3.0.0_complete.sql

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Todos los entornos sincronizados
```

**B. `diff_migrations.sh`** - Comparar DEV vs PROD
```bash
#!/bin/bash
# Muestra qué migraciones están solo en DEV (listas para PROD)
# Muestra qué migraciones están solo en PROD (inconsistencia)
# Muestra migraciones en ambos entornos
```

**Output esperado**:
```
🔄 DIFERENCIAS DE MIGRACIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 SOLO en DEV (listas para PROD):
  (ninguna)

🔴 SOLO en PROD (inconsistencia):
  (ninguna)

🟡 SOLO en TEST (pruebas):
  20251105_160000_test_feature.sql

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**C. `rollback_migration.sh`** - Deshacer migración **(NUEVO)**
```bash
#!/bin/bash
# Marca migración como 'rolled_back' en _migrations
# NO ejecuta SQL automáticamente (debe crearse manualmente)
# Registra timestamp y usuario que hizo rollback
```

**Uso**:
```bash
./scripts/migrations/rollback_migration.sh <entorno> <archivo.sql>
```

**Comportamiento**:
1. Verificar que la migración existe y está aplicada (`status = 'success'`)
2. Actualizar registro en `_migrations`: `status = 'rolled_back'`, `rolled_back_at = NOW()`
3. NO ejecutar SQL de rollback (debe crearse manualmente si se necesita)
4. Mostrar instrucciones para crear SQL de rollback si se desea

#### 1.2 Actualizar Scripts Existentes (30min)

**`create_migration.sh`**:
- ✅ Ya crea en `database/migrations/` (verificar)
- Actualizar comentarios si necesario

**`apply_migration.sh`**:
- ✅ Ya busca en `database/migrations/` (verificar)
- Eliminar referencias a `development/` y `tested/`
- Simplificar lógica de directorios

#### 1.3 Testing Completo en `test_baseline_v3` (1-1.5h)

**Test 1: Crear migración**
```bash
./scripts/migrations/create_migration.sh "test_feature"
# Verificar: Se crea en database/migrations/
```

**Test 2: Aplicar a TEST**
```bash
./scripts/migrations/apply_migration.sh test YYYYMMDD_HHMMSS_test_feature.sql
# Verificar: Registro en _migrations de test_baseline_v3
```

**Test 3: Ver estado**
```bash
./scripts/migrations/migration_status.sh
# Ver: DEV, PROD, TEST (test tiene +1 migración)
```

**Test 4: Ver diferencias**
```bash
./scripts/migrations/diff_migrations.sh
# Ver: Migración de prueba solo en TEST
```

**Test 5: Rollback**
```bash
./scripts/migrations/rollback_migration.sh test YYYYMMDD_HHMMSS_test_feature.sql
# Verificar: Status cambia a 'rolled_back' en _migrations
```

**Test 6: Limpiar**
```bash
# Eliminar migración de prueba
# Verificar que test_baseline_v3 queda limpia
```

---

### **FASE 2: Actualizar Tareas VS Code (30min)**

#### 2.1 Corregir Rutas de Scripts PM2
```json
// ANTES:
"command": "./scripts/pm2-dev-start.sh"

// DESPUÉS:
"command": "./scripts/PM2_build_and_deploy_and_dev/pm2-dev-start.sh"
```

**Afectadas**: 7 tareas PM2

#### 2.2 Corregir Rutas de Scripts Migraciones
```json
// ANTES:
"command": "${workspaceFolder}/scripts/create_migration.sh"

// DESPUÉS:
"command": "${workspaceFolder}/scripts/migrations/create_migration.sh"
```

**Afectadas**: 3 tareas migraciones

#### 2.3 Crear Tareas Nuevas

**A. Ver Estado Migraciones** (actualizar existente)
```json
{
  "label": "📊 Ver Estado de Migraciones",
  "command": "${workspaceFolder}/scripts/migrations/migration_status.sh"
}
```

**B. Comparar DEV vs PROD** (nueva)
```json
{
  "label": "🔄 Comparar Migraciones (DEV vs PROD)",
  "command": "${workspaceFolder}/scripts/migrations/diff_migrations.sh"
}
```

**C. Rollback Migración** (nueva)
```json
{
  "label": "⏪ Rollback Migración (TEST)",
  "command": "bash -c 'read -p \"Archivo: \" FILE && ./scripts/migrations/rollback_migration.sh test \"$FILE\"'"
}
```

#### 2.4 Eliminar Tareas Obsoletas
- ❌ "⬆️ Promover Migración (dev → tested)"
- ❌ "🔄 DEV: Aplicar Todas las Migraciones Pendientes"
- ❌ "🔄 Sincronizar DEV → PROD (Database)" (si no se usa)
- ❌ "🔍 Auditoría de Ownership Unificado" (si no se usa)

#### 2.5 Reorganizar Secciones
```jsonc
// ========================================
// 🎮 PM2 - GESTIÓN DE PROCESOS
// ========================================

// ========================================
// 📊 PM2 - MONITOREO Y LOGS
// ========================================

// ========================================
// 🧹 PM2 - MANTENIMIENTO
// ========================================

// ========================================
// 🗄️ MIGRACIONES - CREACIÓN Y ESTADO
// ========================================

// ========================================
// 🔧 MIGRACIONES - APLICAR
// ========================================

// ========================================
// ⏪ MIGRACIONES - ROLLBACK Y TESTING
// ========================================

// ========================================
// 🔄 TYPES - AUTO-GENERACIÓN
// ========================================

// ========================================
// 🏗️ BUILD Y DEPLOY
// ========================================
```

---

### **FASE 3: Documentación (1-1.5h)**

#### 3.1 Actualizar `database/README.md`
**Secciones a modificar**:
- Sistema de migraciones (workflow simplificado)
- Scripts disponibles (con nuevas rutas)
- Comandos de ejemplo actualizados
- Sección nueva: "Rollback de Migraciones"

#### 3.2 Actualizar `scripts/AGENTS.md`
**Añadir**:
- Nueva organización por subdirectorios
- Scripts PM2 vs Scripts migraciones
- Descripción de cada script nuevo
- Workflow completo con ejemplos

#### 3.3 Actualizar `.github/copilot-instructions.md`
**Actualizar referencias**:
- Rutas de scripts (PM2 y migraciones)
- Workflow de migraciones simplificado
- Eliminar referencias a `development/`, `tested/`, `applied/`
- Añadir instrucciones de rollback

#### 3.4 Actualizar `database/AGENTS.md`
- Estructura simplificada de `migrations/`
- Sistema de testing en `test_baseline_v3`
- Workflow completo de migraciones

---

### **FASE 4: Validación Final (30min)**

#### 4.1 Checklist de Scripts
- [ ] Todos los scripts PM2 tienen tareas correctas
- [ ] Todos los scripts migraciones tienen tareas correctas
- [ ] No hay tareas apuntando a scripts inexistentes
- [ ] No hay scripts sin documentar

#### 4.2 Checklist de Documentación
- [ ] `database/README.md` actualizado
- [ ] `scripts/AGENTS.md` actualizado
- [ ] `.github/copilot-instructions.md` actualizado
- [ ] `database/AGENTS.md` actualizado
- [ ] Todos los cambios commitados y pusheados

#### 4.3 Testing End-to-End
```bash
# 1. Crear migración de prueba
# 2. Aplicar a test_baseline_v3
# 3. Ver estado (debe aparecer)
# 4. Ver diferencias (solo en TEST)
# 5. Rollback
# 6. Limpiar
# 7. Verificar todas las tareas VS Code funcionan
```

---

## ⏱️ Estimación de Tiempo

| Fase | Tarea | Tiempo Estimado |
|------|-------|-----------------|
| **FASE 1** | Crear 3 scripts nuevos | 1h |
| | Actualizar 2 scripts existentes | 30min |
| | Testing completo en TEST | 1-1.5h |
| **FASE 2** | Actualizar tareas VS Code | 30min |
| **FASE 3** | Documentación (4 archivos) | 1-1.5h |
| **FASE 4** | Validación final | 30min |
| **TOTAL** | | **4.5-5.5 horas** |

---

## ✅ Criterios de Aceptación

- [ ] Baseline v3.0.0 funciona en BD nueva ✅ (ya completado)
- [ ] 3 scripts nuevos creados y funcionando
- [ ] 2 scripts existentes actualizados
- [ ] Testing completo en `test_baseline_v3` sin errores
- [ ] 14 tareas VS Code con rutas corregidas
- [ ] 3 tareas nuevas creadas (estado, diff, rollback)
- [ ] 4 tareas obsoletas eliminadas
- [ ] 4 archivos de documentación actualizados
- [ ] Workflow end-to-end probado y documentado
- [ ] Todo commitado y pusheado

---

## 🎯 Resultado Esperado

**Sistema de migraciones simplificado y robusto**:
- ✅ Un solo directorio (`database/migrations/`)
- ✅ Source of truth: tabla `_migrations`
- ✅ Scripts organizados por función (PM2 vs migraciones)
- ✅ Tareas VS Code correctas y no redundantes
- ✅ Workflow claro y documentado
- ✅ Testing completo en BD de prueba
- ✅ Rollback documentado y soportado
- ✅ Documentación actualizada en 4 archivos clave

---

**Estado**: 🟡 Esperando aprobación para comenzar implementación
