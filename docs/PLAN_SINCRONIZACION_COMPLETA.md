# Plan de Sincronización Completa - Issue #63 + Migraciones Pendientes

**Fecha**: 27 Noviembre 2025
**Autor**: AI Assistant
**Estado**: ⚙️ PREPARADO PARA EJECUCIÓN

---

## 📋 Resumen Ejecutivo

**Situación Detectada**:

- **DEV**: 10 migraciones aplicadas (última: Fase 1 Issue #63 - 20 Nov)
- **PROD**: 2 migraciones aplicadas (última: baseline v3.0.0 - 5 Nov)
- **Drift**: 8 migraciones pendientes en PROD (15 días de trabajo)
- **Nueva**: Fase 1.5 (12 columnas) creada pero no aplicada

**Estrategia**: Dos fases separadas y secuenciales

---

## 🎯 FASE A: Limpieza Segura (Fase 1.5)

**Objetivo**: Eliminar 12 columnas 100% seguras sin riesgo

### Alcance

- **Archivo**: `20251127_054200_fase1.5_eliminar_columnas_seguras_issue63.sql`
- **Impacto**: 4 tablas, 12 columnas (-7.6% schema)
- **Riesgo**: NULO (todas vacías/constantes, verificación exhaustiva)
- **Duración estimada**: 15 minutos (backup + aplicación + test)

### Pasos de Ejecución

#### A.1. Backup DEV (Obligatorio)

```bash
cd /home/kava/workspace/proyectos/CuentasSiK/repo
sudo -u postgres pg_dump -d cuentassik_dev > ~/backups/dev_pre_fase1.5_$(date +%Y%m%d_%H%M%S).sql
```

**Verificación**:

```bash
ls -lh ~/backups/dev_pre_fase1.5_*.sql
# Debe mostrar archivo reciente (>1MB)
```

#### A.2. Aplicar Migración en DEV

```bash
./scripts/migrations/apply_migration.sh dev 20251127_054200_fase1.5_eliminar_columnas_seguras_issue63.sql
```

**Output esperado**:

```
✅ Migración aplicada exitosamente en DEV (XXXms)
🔄 Regenerando types TypeScript...
✅ Types regenerados exitosamente
```

#### A.3. Verificación Post-Migración

**Verificar columnas eliminadas**:

```bash
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev -c "
SELECT
  'transactions' as tabla, COUNT(*) as columnas
FROM information_schema.columns
WHERE table_name = 'transactions' AND table_schema = 'public'
UNION ALL
SELECT
  'contributions', COUNT(*)
FROM information_schema.columns
WHERE table_name = 'contributions' AND table_schema = 'public'
UNION ALL
SELECT
  'categories', COUNT(*)
FROM information_schema.columns
WHERE table_name = 'categories' AND table_schema = 'public'
UNION ALL
SELECT
  'journal_transactions', COUNT(*)
FROM information_schema.columns
WHERE table_name = 'journal_transactions' AND table_schema = 'public';
"
```

**Resultado esperado**:

```
      tabla          | columnas
---------------------+----------
 transactions        |       30  (antes: 34)
 contributions       |       11  (antes: 16)
 categories          |       10  (antes: 12)
 journal_transactions|        7  (antes: 8)
```

#### A.4. Compilación y Linting

```bash
npm run typecheck
# Debe pasar sin errores

npm run lint
# Debe pasar sin nuevos warnings
```

#### A.5. Testing Funcional

**Test 1: Crear transacción**

- Acceder: http://localhost:3001/sickness/periodo/actual
- Crear gasto común desde cuenta conjunta
- Verificar: Se crea correctamente sin errores

**Test 2: Ver contribuciones**

- Acceder: http://localhost:3001/sickness/periodo/actual
- Ver tabla de contribuciones de miembros
- Verificar: Muestra datos correctos (esperado/pagado/pendiente)

**Test 3: Ver categorías**

- Acceder: http://localhost:3001/sickness/periodo/actual
- Crear transacción y seleccionar categoría
- Verificar: Selector funciona correctamente

**Test 4: Ver journal de auditoría**

- Acceder: http://localhost:3001/sickness/estadisticas (o donde esté el journal)
- Verificar: Muestra log de cambios correctamente

#### A.6. Commit y Push

```bash
git add database/migrations/ types/database.generated.ts
git commit -m "feat(db): Fase 1.5 - Eliminar 12 columnas sin uso (Issue #63)

- transactions: -4 cols (created_by_email, auto_paired, review_days, pairing_threshold)
- contributions: -5 cols (paid_at, adjustments_total, calculation_method, audit cols)
- categories: -2 cols (created_by_profile_id, updated_by_profile_id)
- journal_transactions: -1 col (reason)

Schema: 158 → 146 columnas (-7.6%)
Types regenerados automáticamente
Tests funcionales pasados

Ref: Issue #63 Fase 1.5"

git push origin main
```

**Validación**:

```bash
git log --oneline -1
# Debe mostrar el nuevo commit
```

---

## 🚀 FASE B: Sincronización PROD (8 Migraciones Pendientes)

**Objetivo**: Poner PROD al día con todo el trabajo desde 5 Nov

### Inventario de Migraciones Pendientes

| #   | Archivo                                                           | Fecha  | Descripción                                      | Estado DEV              |
| --- | ----------------------------------------------------------------- | ------ | ------------------------------------------------ | ----------------------- |
| 1   | `20251119_150000_add_is_system_to_categories.sql`                 | 19 Nov | Añadir campo is_system                           | ✅ success              |
| 2   | `20251119_160000_create_loan_categories.sql`                      | 19 Nov | Categorías "Préstamo Personal" y "Pago Préstamo" | ✅ success              |
| 3   | `20251119_170000_deprecate_legacy_balance_tables.sql`             | 19 Nov | Deprecar tablas legacy balance                   | ✅ success              |
| 4   | `20251119_180000_rename_legacy_tables.sql`                        | 19 Nov | Renombrar tablas legacy                          | ✅ success              |
| 5   | `20251120_005739_add_household_loan_requests_table.sql`           | 20 Nov | Tabla loan_requests (Phase 40)                   | ✅ success              |
| 6   | `20251120_053150_remove_redundant_empty_tables_fase1_issue63.sql` | 20 Nov | Eliminar 6 tablas vacías (Fase 1)                | ✅ success              |
| 7   | `20251127_054200_fase1.5_eliminar_columnas_seguras_issue63.sql`   | 27 Nov | Eliminar 12 columnas sin uso (Fase 1.5)          | ⚙️ **Pendiente Fase A** |
| 8   | `20251119_170000_create_balance_calculation.sql`                  | 19 Nov | ⚠️ **NO ESTÁ EN DISCO**                          | ✅ success (DEV)        |

**⚠️ HALLAZGO CRÍTICO**: Migración #8 aplicada en DEV pero **NO existe archivo en disco**
→ Necesita investigación antes de sync PROD

### Análisis de Dependencias

**Grupo 1: Sistema de Balance (Phase 40 - Issues #57-62)**

```
20251119_150000_add_is_system_to_categories.sql
    ↓
20251119_160000_create_loan_categories.sql
    ↓
20251119_170000_create_balance_calculation.sql (⚠️ ARCHIVO FALTANTE)
    ↓
20251119_170000_deprecate_legacy_balance_tables.sql
    ↓
20251119_180000_rename_legacy_tables.sql
    ↓
20251120_005739_add_household_loan_requests_table.sql
```

**Grupo 2: Limpieza Schema (Issue #63)**

```
20251120_053150_remove_redundant_empty_tables_fase1_issue63.sql (Fase 1)
    ↓
20251127_054200_fase1.5_eliminar_columnas_seguras_issue63.sql (Fase 1.5)
```

**Orden de Aplicación Correcto**:

1. Primero: Grupo 1 completo (Phase 40)
2. Después: Grupo 2 (Issue #63)

### Pasos de Ejecución

#### B.1. Investigación Previa: Migración Faltante

**Buscar archivo**:

```bash
cd /home/kava/workspace/proyectos/CuentasSiK/repo
find . -name "*balance_calculation*" -type f
grep -r "create_balance_calculation" database/
git log --all --oneline -- "*balance_calculation*"
```

**Opciones según resultado**:

**Opción A**: Si se encuentra en git history

```bash
git show <commit>:database/migrations/20251119_170000_create_balance_calculation.sql > /tmp/recovered_migration.sql
# Revisar contenido y restaurar en migrations/
```

**Opción B**: Si está en migrations/archive/

```bash
cp database/migrations/archive/20251119_170000_create_balance_calculation.sql database/migrations/
```

**Opción C**: Si no existe y DEV la tiene aplicada

```bash
# Extraer desde DEV lo que creó esa migración
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev -c "\df *balance*"
# Ver funciones creadas y reconstruir SQL manualmente
```

**Opción D (FALLBACK)**: Omitir si la función ya existe en baseline

```bash
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "\df *balance*"
# Si ya existe la función, marcar como "aplicada" manualmente
```

**⚠️ DECISIÓN REQUERIDA**: Parar aquí y consultar al usuario sobre migración faltante

#### B.2. Backup PROD (OBLIGATORIO - Crítico)

**⚠️ ADVERTENCIA**: Este backup es CRÍTICO, contiene datos reales de producción

```bash
sudo -u postgres pg_dump -d cuentassik_prod > ~/backups/prod_pre_sync_completa_$(date +%Y%m%d_%H%M%S).sql

# Backup adicional comprimido (más rápido de restaurar)
sudo -u postgres pg_dump -d cuentassik_prod | gzip > ~/backups/prod_pre_sync_completa_$(date +%Y%m%d_%H%M%S).sql.gz
```

**Verificación**:

```bash
ls -lh ~/backups/prod_pre_sync_*.sql*
# Debe mostrar 2 archivos recientes (>10MB sin comprimir, ~2MB comprimido)

# Test de integridad
gunzip -t ~/backups/prod_pre_sync_*.sql.gz
# Debe imprimir: OK
```

#### B.3. Aplicar Migraciones en Orden (PROD)

**⚠️ IMPORTANTE**: Aplicar UNA POR UNA, verificar cada una antes de continuar

**Migración 1: is_system**

```bash
./scripts/migrations/apply_migration.sh prod 20251119_150000_add_is_system_to_categories.sql

# Verificar
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'categories' AND column_name = 'is_system';
"
# Debe mostrar: is_system | boolean
```

**Migración 2: loan_categories**

```bash
./scripts/migrations/apply_migration.sh prod 20251119_160000_create_loan_categories.sql

# Verificar
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "
SELECT name, type, is_system FROM categories WHERE is_system = true;
"
# Debe mostrar: Préstamo Personal | income | true
#               Pago Préstamo      | income | true
```

**Migración 3: balance_calculation (⚠️ RESOLVER PRIMERO)**

```bash
# SOLO si se resolvió investigación B.1
./scripts/migrations/apply_migration.sh prod 20251119_170000_create_balance_calculation.sql

# Verificar
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "\df *balance*"
# Debe mostrar función calculate_member_balance o similar
```

**Migración 4: deprecate_legacy**

```bash
./scripts/migrations/apply_migration.sh prod 20251119_170000_deprecate_legacy_balance_tables.sql

# Verificar
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%legacy%';
"
# Debe listar tablas con sufijo _legacy
```

**Migración 5: rename_legacy**

```bash
./scripts/migrations/apply_migration.sh prod 20251119_180000_rename_legacy_tables.sql

# Verificar
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "\dt"
# Ver que tablas legacy tienen nombres correctos
```

**Migración 6: loan_requests**

```bash
./scripts/migrations/apply_migration.sh prod 20251120_005739_add_household_loan_requests_table.sql

# Verificar
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "
SELECT COUNT(*) as column_count FROM information_schema.columns
WHERE table_name = 'loan_requests';
"
# Debe mostrar: 13 columnas
```

**Migración 7: Fase 1 (6 tablas)**

```bash
./scripts/migrations/apply_migration.sh prod 20251120_053150_remove_redundant_empty_tables_fase1_issue63.sql

# Verificar
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "
SELECT COUNT(*) as total_tables FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
"
# Debe mostrar: 35 tablas (antes: 41)
```

**Migración 8: Fase 1.5 (12 columnas)**

```bash
./scripts/migrations/apply_migration.sh prod 20251127_054200_fase1.5_eliminar_columnas_seguras_issue63.sql

# Verificar (mismo query que Fase A.3)
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "
SELECT
  'transactions' as tabla, COUNT(*) as columnas
FROM information_schema.columns
WHERE table_name = 'transactions' AND table_schema = 'public'
UNION ALL
SELECT 'contributions', COUNT(*) FROM information_schema.columns
WHERE table_name = 'contributions' AND table_schema = 'public'
UNION ALL
SELECT 'categories', COUNT(*) FROM information_schema.columns
WHERE table_name = 'categories' AND table_schema = 'public'
UNION ALL
SELECT 'journal_transactions', COUNT(*) FROM information_schema.columns
WHERE table_name = 'journal_transactions' AND table_schema = 'public';
"
# Debe coincidir con DEV (ver Fase A.3)
```

#### B.4. Regenerar Types PROD

```bash
npm run types:generate:prod
```

**Verificación**:

```bash
git diff types/database.generated.ts
# NO debe haber diferencias (ya generado en DEV Fase A)
```

#### B.5. Build Producción

```bash
npm run build
```

**Output esperado**:

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Creating an optimized production build
✓ Collecting page data
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
...
○  (Static)  prerendered as static content
```

#### B.6. Deploy a PROD (Reiniciar PM2)

**Usando tarea VS Code** (recomendado):

```
Ctrl+Shift+P → Tasks: Run Task → 🔄 PROD: Reiniciar
```

**O manualmente**:

```bash
./scripts/PM2_build_and_deploy_and_dev/pm2-prod-stop.sh
sleep 2
./scripts/PM2_build_and_deploy_and_dev/pm2-prod-start.sh
```

**Verificación inmediata**:

```bash
pm2 status
# cuentassik-prod debe estar "online"

pm2 logs cuentassik-prod --lines 20 --nostream
# No debe mostrar errores críticos
```

#### B.7. Testing PROD (15-30 minutos)

**Test 1: Acceso básico**

- URL: http://localhost:3000 (o dominio real)
- Login con Google OAuth
- Verificar: Accede correctamente al dashboard

**Test 2: Ver período actual**

- Navegar: /sickness/periodo/actual
- Verificar: Muestra contribuciones y transacciones

**Test 3: Crear transacción**

- Crear gasto común desde cuenta conjunta
- Verificar: Se crea sin errores y aparece en listado

**Test 4: Ver balance global**

- Navegar: /sickness/credito-deuda
- Verificar: Muestra saldos correctos de miembros

**Test 5: Ver categorías sistema**

- Crear transacción tipo "Préstamo Personal"
- Verificar: Aparece en selector (is_system = true)

**Test 6: Verificar tablas eliminadas**

- Navegar por todas las páginas de la app
- Verificar: NO hay errores 500 relacionados con tablas faltantes

**Test 7: Monitoreo de logs**

```bash
pm2 logs cuentassik-prod --timestamp
# Dejar corriendo 15-30 minutos
# Buscar: ERROR, FATAL, stack traces
```

#### B.8. Verificación Final: Schema Sync

**Comparar DEV vs PROD**:

```bash
# DEV
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev -c "
SELECT COUNT(*) as total_tables FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
"

# PROD
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "
SELECT COUNT(*) as total_tables FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
"

# Ambos deben mostrar: 35 tablas
```

**Comparar migraciones**:

```bash
./scripts/migrations/diff_migrations.sh
# Debe mostrar: "✅ DEV y PROD sincronizados"
```

#### B.9. Documentar en CHANGELOG

Añadir a `CHANGELOG.md`:

```markdown
## [Unreleased]

### Added (Phase 40 - Issues #57-62)

- Sistema de balance global para créditos/deudas entre miembros
- Categorías sistema: "Préstamo Personal" y "Pago Préstamo"
- Tabla `loan_requests` para préstamos household-to-member
- Campo `is_system` en categorías para distinguir automáticas

### Changed

- Tablas legacy renombradas con sufijo `_legacy_deprecated`
- Concepto "objetivo" → "presupuesto" (Issue #25)

### Removed (Issue #63)

- **Fase 1**: 6 tablas vacías sin uso (contribution*periods, dual_flow*_, journal\__)
- **Fase 1.5**: 12 columnas sin uso en 4 tablas:
  - transactions: 4 columnas (created_by_email, auto_paired, review_days, pairing_threshold)
  - contributions: 5 columnas (paid_at, adjustments_total, calculation_method, audit cols)
  - categories: 2 columnas (created_by/updated_by_profile_id)
  - journal_transactions: 1 columna (reason)

### Database

- Schema: 41 → 35 tablas (-14.6%)
- Columns: 158 → 146 (-7.6%)
- Migraciones aplicadas: 8 (del 19 Nov al 27 Nov)

### Dependencies

- TypeScript types regenerados automáticamente desde PostgreSQL
```

#### B.10. Commit Final

```bash
git add CHANGELOG.md
git commit -m "docs: actualizar CHANGELOG con sincronización PROD completa

- Phase 40 (Balance Global) aplicado
- Issue #63 Fase 1 y 1.5 aplicadas
- 8 migraciones sincronizadas DEV → PROD
- Schema: 41 → 35 tablas, 158 → 146 columnas

Ref: Issues #57-62 (Phase 40), #63 (Cleanup)"

git push origin main
```

---

## 📊 Métricas de Impacto

### Reducción de Schema

**Antes (5 Nov - baseline v3.0.0)**:

- Tablas: 41
- Columnas totales: ~170 (estimado)

**Después (27 Nov - post sincronización)**:

- Tablas: 35 (-14.6%)
- Columnas totales: ~146 (-14.1%)

### Desglose por Fase

| Fase                   | Reducción               | Porcentaje        |
| ---------------------- | ----------------------- | ----------------- |
| Fase 1 (6 tablas)      | -6 tablas               | -14.6% tablas     |
| Fase 1.5 (12 columnas) | -12 columnas            | -7.6% columnas    |
| **TOTAL**              | -6 tablas, -24 columnas | -15% schema total |

### Funcionalidad Añadida (Phase 40)

- ✅ Sistema de balance global
- ✅ Préstamos entre miembros
- ✅ Categorías sistema automáticas
- ✅ Tracking de créditos/deudas
- ✅ Historial de préstamos

---

## ⚠️ Riesgos y Mitigaciones

### Riesgo 1: Migración Faltante (#8)

**Problema**: `create_balance_calculation.sql` no existe en disco pero está aplicada en DEV

**Impacto**: ALTO (puede fallar sync PROD si función no existe)

**Mitigación**:

1. Investigar en Paso B.1 antes de continuar
2. Si no se encuentra, verificar si función ya existe en baseline PROD
3. Si es necesario, reconstruir SQL desde DEV
4. **PARAR y consultar usuario** si no se puede resolver

**Estado**: ⚠️ BLOQUEANTE para Fase B

### Riesgo 2: Build Producción Falla

**Problema**: npm run build puede fallar por errores TypeScript no detectados en DEV

**Impacto**: MEDIO (bloquea deploy pero datos intactos)

**Mitigación**:

1. Backup PROD ya realizado
2. Si falla build, NO aplicar migraciones en PROD
3. Fix en DEV primero, luego reintentar
4. Rollback migraciones PROD si es necesario (restore backup)

### Riesgo 3: PM2 No Reinicia

**Problema**: Proceso cuentassik-prod no inicia después de deploy

**Impacto**: ALTO (app caída, pero datos intactos)

**Mitigación**:

1. Ver logs: `pm2 logs cuentassik-prod --lines 50`
2. Intentar start manual: `pm2 start ecosystem.config.js --only cuentassik-prod`
3. Si persiste, rollback:
   ```bash
   # Restaurar backup
   sudo -u postgres psql -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='cuentassik_prod';"
   sudo -u postgres dropdb cuentassik_prod
   sudo -u postgres createdb --owner=cuentassik_owner cuentassik_prod
   sudo -u postgres psql -d cuentassik_prod < ~/backups/prod_pre_sync_completa_YYYYMMDD_HHMMSS.sql
   pm2 restart cuentassik-prod
   ```

### Riesgo 4: Datos Corruptos Post-Migración

**Problema**: Migraciones alteran datos no intencionalmente

**Impacto**: CRÍTICO (pérdida de integridad)

**Mitigación**:

1. TODAS las migraciones son DDL puro (NO tocan datos)
2. Verificaciones post-migración incluyen conteos
3. Backup disponible para restauración completa
4. Monitoreo 15-30 min post-deploy

**Probabilidad**: BAJA (migraciones ya probadas en DEV)

---

## 🔒 Plan de Rollback

### Rollback Fase A (si falla en DEV)

**Escenario**: Migración Fase 1.5 causa errores en DEV

**Pasos**:

```bash
# 1. Restaurar backup
sudo -u postgres psql -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='cuentassik_dev';"
sudo -u postgres dropdb cuentassik_dev
sudo -u postgres createdb --owner=cuentassik_owner cuentassik_dev
sudo -u postgres psql -d cuentassik_dev < ~/backups/dev_pre_fase1.5_YYYYMMDD_HHMMSS.sql

# 2. Regenerar types desde schema restaurado
npm run types:generate:dev

# 3. Marcar migración como rolled_back
./scripts/migrations/rollback_migration.sh dev 20251127_054200_fase1.5_eliminar_columnas_seguras_issue63.sql

# 4. Verificar funcionalidad
npm run dev
# Probar manualmente en http://localhost:3001
```

**Tiempo estimado**: 5 minutos

### Rollback Fase B (si falla en PROD)

**Escenario**: Alguna migración causa error en PROD o app no funciona

**Pasos**:

```bash
# 1. Detener aplicación
pm2 stop cuentassik-prod

# 2. Restaurar backup (método rápido con .gz)
sudo -u postgres psql -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='cuentassik_prod';"
sudo -u postgres dropdb cuentassik_prod
sudo -u postgres createdb --owner=cuentassik_owner cuentassik_prod
gunzip -c ~/backups/prod_pre_sync_completa_YYYYMMDD_HHMMSS.sql.gz | sudo -u postgres psql -d cuentassik_prod

# 3. Regenerar types desde schema restaurado
npm run types:generate:prod

# 4. Build con schema antiguo
npm run build

# 5. Reiniciar aplicación
pm2 start cuentassik-prod

# 6. Verificar funcionamiento
pm2 logs cuentassik-prod --lines 50
# Probar acceso a http://localhost:3000
```

**Tiempo estimado**: 10-15 minutos

**⚠️ IMPORTANTE**: Backup debe conservarse por 30 días mínimo

---

## ✅ Checklist de Pre-Ejecución

### Antes de Fase A (DEV)

- [ ] Usuario confirmó inicio de Fase A
- [ ] Backup DEV realizado y verificado
- [ ] Espacio en disco suficiente (>1GB libre)
- [ ] DEV actualmente funcional (npm run dev sin errores)
- [ ] No hay cambios sin commitear en git

### Antes de Fase B (PROD)

- [ ] Fase A completada exitosamente
- [ ] Migración faltante (#8) resuelta o confirmada innecesaria
- [ ] Usuario confirmó inicio de Fase B
- [ ] Backup PROD realizado y verificado (2 copias)
- [ ] Horario de bajo tráfico (ej: noche/madrugada)
- [ ] Usuario disponible para validación post-deploy
- [ ] Plan de rollback comprendido y listo

### Verificaciones Técnicas

- [ ] Scripts migrations/ tienen permisos ejecución
- [ ] ~/.pgpass configurado correctamente
- [ ] Ambas bases de datos accesibles (psql sin contraseña)
- [ ] PM2 en estado online
- [ ] Último commit pusheado a remote

---

## 📞 Contactos de Emergencia

**⚠️ Si algo sale mal durante Fase B (PROD)**:

1. **DETENER inmediatamente**: `pm2 stop cuentassik-prod`
2. **Notificar al usuario** con detalles del error
3. **Consultar este documento** sección "Plan de Rollback"
4. **NO intentar fix rápido** sin backup/rollback primero
5. **Documentar** todo lo sucedido para post-mortem

---

## 📝 Notas Finales

**Orden de Ejecución**:

1. ✅ Resolver migración faltante (#8) PRIMERO
2. ✅ Ejecutar Fase A completa
3. ✅ Validar Fase A exitosa
4. ✅ Obtener confirmación usuario
5. ✅ Ejecutar Fase B completa
6. ✅ Monitoreo intensivo 30 min
7. ✅ Documentar resultados

**Duración Total Estimada**:

- Fase A: ~15 minutos
- Resolución migración faltante: ~30 minutos
- Fase B: ~45 minutos
- Testing y monitoreo: ~30 minutos
- **TOTAL**: ~2 horas (con imprevistos)

**Estado Actual**: ⚙️ LISTO PARA COMENZAR (pendiente resolución migración #8)

---

**Última actualización**: 27 Noviembre 2025
**Revisado por**: AI Assistant
**Aprobación requerida**: Usuario/Owner
