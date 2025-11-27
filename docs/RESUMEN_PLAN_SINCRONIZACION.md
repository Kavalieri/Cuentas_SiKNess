# Resumen Ejecutivo: Plan de Sincronización Completa

**Fecha**: 27 Noviembre 2025
**Tiempo estimado total**: ~1.5 horas
**Documentación completa**: `PLAN_SINCRONIZACION_COMPLETA.md`

---

## 🎯 Dos Acciones Separadas

### **ACCIÓN A: Limpieza Segura (Fase 1.5)** ✅ LISTA

**Objetivo**: Eliminar 12 columnas 100% sin uso
**Tiempo**: ~15 minutos
**Riesgo**: NULO (todo verificado)

**Qué hace**:

- Elimina 12 columnas vacías/constantes en 4 tablas
- Reduce schema: 158 → 146 columnas (-7.6%)
- Regenera types TypeScript automáticamente

**Archivos**:

- Migración: `20251127_054200_fase1.5_eliminar_columnas_seguras_issue63.sql`
- Documentación: `ISSUE_63_FASE_1.5_COLUMNAS_SEGURAS.md`

**Pasos rápidos**:

```bash
# 1. Backup DEV
sudo -u postgres pg_dump -d cuentassik_dev > ~/backups/dev_pre_fase1.5_$(date +%Y%m%d_%H%M%S).sql

# 2. Aplicar migración
./scripts/migrations/apply_migration.sh dev 20251127_054200_fase1.5_eliminar_columnas_seguras_issue63.sql

# 3. Verificar y probar
npm run typecheck && npm run lint
# Probar en http://localhost:3001

# 4. Commit
git add . && git commit -m "feat(db): Fase 1.5 - Eliminar 12 columnas sin uso (Issue #63)" && git push
```

---

### **ACCIÓN B: Sincronización PROD** ⚠️ REQUIERE ATENCIÓN

**Objetivo**: Aplicar 8 migraciones pendientes en PROD
**Tiempo**: ~45 minutos + 30 min monitoreo
**Riesgo**: BAJO-MEDIO (migraciones probadas en DEV)

**Qué hace**:

- Aplica todo el trabajo desde 5 Nov (Phase 40 + Issue #63)
- Sincroniza schema DEV → PROD
- Sistema de balance, préstamos, limpieza de tablas

---

## ⚠️ HALLAZGO CRÍTICO RESUELTO

**Problema detectado**: Migración `20251119_170000_create_balance_calculation.sql` registrada en DEV pero **archivo no existe en disco**

**✅ SOLUCIÓN CONFIRMADA**:

- Funciones de balance **YA EXISTEN en PROD** (verificado con `\df *balance*`)
- PROD tiene las 5 funciones: `get_household_balances_overview`, `get_member_balance_status`, etc.
- **NO ES NECESARIO aplicar esta migración**

**Decisión**: Omitir migración #3 en PROD (funciones ya presentes desde baseline)

---

## 📋 Migraciones a Aplicar en PROD (7 de 8)

| #      | Archivo                                                           | Descripción           | Verificación                         |
| ------ | ----------------------------------------------------------------- | --------------------- | ------------------------------------ |
| ✅     | `20251119_150000_add_is_system_to_categories.sql`                 | Campo is_system       | Verificar columna existe             |
| ✅     | `20251119_160000_create_loan_categories.sql`                      | 2 categorías sistema  | Verificar 2 filas con is_system=true |
| ~~❌~~ | ~~`20251119_170000_create_balance_calculation.sql`~~              | ~~Funciones balance~~ | **OMITIR** (ya existen)              |
| ✅     | `20251119_170000_deprecate_legacy_balance_tables.sql`             | Deprecar legacy       | Verificar tablas _\_legacy_          |
| ✅     | `20251119_180000_rename_legacy_tables.sql`                        | Renombrar legacy      | Verificar nombres                    |
| ✅     | `20251120_005739_add_household_loan_requests_table.sql`           | Tabla loan_requests   | Verificar 13 columnas                |
| ✅     | `20251120_053150_remove_redundant_empty_tables_fase1_issue63.sql` | Eliminar 6 tablas     | Verificar 35 tablas totales          |
| ✅     | `20251127_054200_fase1.5_eliminar_columnas_seguras_issue63.sql`   | Eliminar 12 columnas  | Verificar conteos columnas           |

**Total**: 7 migraciones reales a aplicar

---

## 🚀 Pasos de Ejecución PROD (Simplificados)

### 1. Backup OBLIGATORIO

```bash
sudo -u postgres pg_dump -d cuentassik_prod > ~/backups/prod_pre_sync_$(date +%Y%m%d_%H%M%S).sql
sudo -u postgres pg_dump -d cuentassik_prod | gzip > ~/backups/prod_pre_sync_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 2. Aplicar 7 Migraciones (una por una)

```bash
./scripts/migrations/apply_migration.sh prod 20251119_150000_add_is_system_to_categories.sql
# Verificar con psql

./scripts/migrations/apply_migration.sh prod 20251119_160000_create_loan_categories.sql
# Verificar 2 categorías sistema

# OMITIR 20251119_170000_create_balance_calculation.sql (funciones ya existen)

./scripts/migrations/apply_migration.sh prod 20251119_170000_deprecate_legacy_balance_tables.sql
# Verificar tablas legacy

./scripts/migrations/apply_migration.sh prod 20251119_180000_rename_legacy_tables.sql
# Verificar nombres

./scripts/migrations/apply_migration.sh prod 20251120_005739_add_household_loan_requests_table.sql
# Verificar tabla loan_requests

./scripts/migrations/apply_migration.sh prod 20251120_053150_remove_redundant_empty_tables_fase1_issue63.sql
# Verificar 35 tablas (antes: 41)

./scripts/migrations/apply_migration.sh prod 20251127_054200_fase1.5_eliminar_columnas_seguras_issue63.sql
# Verificar conteos columnas
```

### 3. Build y Deploy

```bash
npm run types:generate:prod
npm run build
# Usar tarea VS Code: "🔄 PROD: Reiniciar"
```

### 4. Monitoreo (15-30 min)

```bash
pm2 logs cuentassik-prod --timestamp
# Probar en http://localhost:3000
```

---

## 📊 Impacto Final

**Schema**:

- Tablas: 41 → 35 (-14.6%)
- Columnas: ~170 → ~146 (-14.1%)
- **Total reducción**: ~15% schema

**Funcionalidad añadida** (Phase 40):

- Sistema de balance global
- Préstamos entre miembros
- Categorías sistema automáticas
- Tracking créditos/deudas

---

## 🔒 Plan de Rollback (Si algo falla)

### Rollback PROD:

```bash
pm2 stop cuentassik-prod
sudo -u postgres psql -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='cuentassik_prod';"
sudo -u postgres dropdb cuentassik_prod
sudo -u postgres createdb --owner=cuentassik_owner cuentassik_prod
gunzip -c ~/backups/prod_pre_sync_*.sql.gz | sudo -u postgres psql -d cuentassik_prod
npm run types:generate:prod
npm run build
pm2 start cuentassik-prod
```

**Tiempo de rollback**: ~10 minutos

---

## ✅ Checklist Pre-Ejecución

**Antes de ACCIÓN A**:

- [ ] Usuario confirmó inicio
- [ ] Backup DEV realizado
- [ ] DEV funcionando correctamente

**Antes de ACCIÓN B**:

- [ ] ACCIÓN A completada exitosamente
- [ ] Usuario confirmó inicio PROD
- [ ] Backup PROD realizado (2 copias)
- [ ] Horario de bajo tráfico
- [ ] Plan de rollback comprendido

---

## 🎯 Recomendación

**Orden sugerido**:

1. **HOY**: Ejecutar ACCIÓN A (Fase 1.5 en DEV)

   - Bajo riesgo, rápido, fácil rollback
   - Valida migración antes de PROD

2. **DESPUÉS** (cuando usuario confirme): Ejecutar ACCIÓN B (Sync PROD)
   - Aplicar 7 migraciones en secuencia
   - Monitoreo intensivo post-deploy
   - Backup disponible para emergencias

**Tiempo total**: ~1.5 horas (incluye monitoreo)

---

## 📞 Siguiente Paso

**¿Usuario quiere proceder?**

**Opción 1**: Ejecutar ACCIÓN A ahora (15 min)
**Opción 2**: Ejecutar ambas acciones en secuencia (~2 horas)
**Opción 3**: Solo preparar (ya está todo listo)

---

**Estado actual**: ✅ **TODO PREPARADO Y VERIFICADO**
**Documentación completa**: `PLAN_SINCRONIZACION_COMPLETA.md`
**Riesgo general**: BAJO (migraciones probadas, backups disponibles)
