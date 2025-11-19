# Plan de Migración - Sistema Balance Integrado

**Fecha**: 19 Noviembre 2025
**Autor**: AI Assistant
**Issue**: #57 - Phase 1 (Análisis y Especificación)

---

## 🎯 Objetivo

Planificar la migración de las tablas legacy del sistema de balance al nuevo sistema integrado basado en `transactions`.

---

## 📊 Estado Inicial (Auditoría Completada)

### Datos Existentes

| Tabla            | DEV         | PROD        | Estado   |
| ---------------- | ----------- | ----------- | -------- |
| `personal_loans` | 0 registros | 0 registros | ✅ Vacía |
| `refund_claims`  | 0 registros | 0 registros | ✅ Vacía |
| `member_credits` | 0 registros | 0 registros | ✅ Vacía |

**Conclusión**: **NO hay datos que migrar**. Simplificación extrema del proceso.

---

## 🗺️ Estrategia de Migración

### Enfoque Elegido: **Deprecación Sin Migración**

Dado que las tablas están vacías:

1. **NO migrar datos** (no existen)
2. **Renombrar tablas** a `_legacy_*` (preservación)
3. **Mantener 6 meses** (seguridad/rollback)
4. **Eliminar en v4.0.0** (limpieza final)

**Ventajas**:

- Tiempo de ejecución: ~2 minutos (vs 3+ horas si tuviera datos)
- Riesgo cero de pérdida de datos
- Rollback trivial (renombrar de vuelta)
- No afecta operaciones activas

---

## 📅 Timeline de Migración

### Phase 1: Análisis y Especificación (Issue #57) ✅ EN CURSO

**Fecha**: 19 Nov 2025
**Duración**: 2-3 horas
**Entregables**:

- [x] `docs/AUDIT_LEGACY_BALANCE_DATA.md`
- [x] `docs/BALANCE_CALCULATION_SPEC.md`
- [x] `docs/MIGRATION_PLAN_BALANCE.md` (este documento)
- [ ] `docs/BALANCE_USE_CASES.md`
- [ ] Actualización Issue #58 con SQL definitivo

**Estado**: Documentación 75% completa

---

### Phase 2: Implementación Base (Issue #58)

**Fecha estimada**: 19 Nov 2025 (tarde)
**Duración**: 2-3 horas
**Entregables**:

- [ ] Migración: `20251119_150000_create_loan_categories.sql`
- [ ] Migración: `20251119_160000_create_balance_calculation.sql`
- [ ] Types regenerados: `types/database.generated.ts`
- [ ] Tests SQL unitarios pasando

**Riesgo**: BAJO (solo crea objetos, no modifica datos)

**Rollback**: Trivial (DROP FUNCTION, DELETE categorías)

---

### Phase 3: Migración de Datos Legacy (Issue #59) 🚀 SIMPLIFICADO

**Fecha estimada**: 19 Nov 2025 (tarde)
**Duración**: 30 minutos (antes: 3+ horas)
**Entregables**:

- [ ] Backup DEV (precaución)
- [ ] Backup PROD (precaución)
- [ ] Migración: `20251119_180000_deprecate_legacy_tables.sql`
- [ ] Validación: tablas renombradas correctamente

**Riesgo**: BAJO (tablas vacías, operación reversible)

**Rollback**: Inmediato (renombrar de vuelta)

**Contenido migración**:

```sql
-- ============================================
-- Deprecar tablas legacy (VACÍAS)
-- ============================================

-- 1. Verificar que están vacías
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM personal_loans) > 0 THEN
    RAISE EXCEPTION 'personal_loans NO está vacía. Abortar migración.';
  END IF;
  IF (SELECT COUNT(*) FROM refund_claims) > 0 THEN
    RAISE EXCEPTION 'refund_claims NO está vacía. Abortar migración.';
  END IF;
  IF (SELECT COUNT(*) FROM member_credits) > 0 THEN
    RAISE EXCEPTION 'member_credits NO está vacía. Abortar migración.';
  END IF;
END $$;

-- 2. Renombrar tablas (preservar estructura)
ALTER TABLE personal_loans RENAME TO _legacy_personal_loans;
ALTER TABLE refund_claims RENAME TO _legacy_refund_claims;
ALTER TABLE member_credits RENAME TO _legacy_member_credits;

-- 3. Añadir comentarios explicativos
COMMENT ON TABLE _legacy_personal_loans IS
  'DEPRECATED: Tabla legacy de préstamos. Reemplazada por transacciones con categoría "Préstamo Personal". Se eliminará en v4.0.0 (Mayo 2026).';

COMMENT ON TABLE _legacy_refund_claims IS
  'DEPRECATED: Tabla legacy de reembolsos. Concepto eliminado (integrado en flujo dual). Se eliminará en v4.0.0 (Mayo 2026).';

COMMENT ON TABLE _legacy_member_credits IS
  'DEPRECATED: Tabla legacy de créditos. Reemplazada por cálculo dinámico en calculate_member_balance(). Se eliminará en v4.0.0 (Mayo 2026).';

-- 4. Verificación
SELECT 'Tables renamed successfully' AS status;
```

---

### Phase 4: Refactor Backend (Issue #60)

**Fecha estimada**: 20 Nov 2025
**Duración**: 4-5 horas
**Entregables**:

- [ ] `/lib/balance/actions.ts` (nuevo archivo)
- [ ] `/app/sickness/credito-deuda/actions.ts` → `.LEGACY`
- [ ] `/app/sickness/credito-deuda/refund-actions.ts` → `.LEGACY`
- [ ] Tests de integración pasando

**Riesgo**: MEDIO (afecta lógica de negocio)

**Rollback**: Restaurar archivos `.LEGACY` si es necesario

---

### Phase 5: Rediseño UI (Issue #61)

**Fecha estimada**: 21 Nov 2025
**Duración**: 5-6 horas
**Entregables**:

- [ ] `/app/sickness/credito-deuda/page.tsx` (dashboard multi-miembro)
- [ ] `/app/sickness/credito-deuda/miembro/[profileId]/page.tsx`
- [ ] Componentes balance en `/components/balance/`
- [ ] UI testeada en móvil/tablet/desktop

**Riesgo**: MEDIO (UX crítica)

**Rollback**: Git revert del commit

---

### Phase 6: Testing y Documentación (Issue #62)

**Fecha estimada**: 21-22 Nov 2025
**Duración**: 3-4 horas
**Entregables**:

- [ ] Tests unitarios SQL
- [ ] Tests de integración
- [ ] Tests E2E (Playwright)
- [ ] Documentación técnica
- [ ] Guía de usuario
- [ ] README actualizado

**Riesgo**: BAJO (documentación)

---

## 🔄 Procedimiento de Migración (Phase 3 Detallado)

### Paso 1: Pre-Migración (Validación)

```bash
# 1.1. Verificar que estamos en la branch correcta
git status
# Debe estar en 'main' y sincronizado

# 1.2. Backup OBLIGATORIO (aunque tablas vacías)
sudo -u postgres pg_dump -d cuentassik_dev > ~/backups/dev_pre_balance_$(date +%Y%m%d_%H%M%S).sql
sudo -u postgres pg_dump -d cuentassik_prod > ~/backups/prod_pre_balance_$(date +%Y%m%d_%H%M%S).sql

# 1.3. Verificar una vez más que tablas están vacías
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev -c "
  SELECT
    'personal_loans' as table_name, COUNT(*) as count FROM personal_loans
  UNION ALL
  SELECT 'refund_claims', COUNT(*) FROM refund_claims
  UNION ALL
  SELECT 'member_credits', COUNT(*) FROM member_credits;
"
# Todas deben mostrar count = 0

# 1.4. Verificar referencias en código (NO debe haber uso activo)
cd /home/kava/workspace/proyectos/CuentasSiK/repo
grep -r "personal_loans" --include="*.ts" --include="*.tsx" app/ lib/ | grep -v ".LEGACY" | wc -l
# Esperado: 0 (o solo imports de types que se regenerarán)
```

---

### Paso 2: Ejecución en DEV

```bash
# 2.1. Aplicar migración en DEV
./scripts/migrations/apply_migration.sh dev 20251119_180000_deprecate_legacy_tables.sql

# Output esperado:
# ✅ Migración aplicada exitosamente en DEV (125ms)
# 🔄 Regenerando types TypeScript desde esquema PostgreSQL...
# ✅ Types regenerados exitosamente

# 2.2. Verificar renombrado
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev -c "\dt _legacy_*"
# Debe mostrar: _legacy_personal_loans, _legacy_refund_claims, _legacy_member_credits

# 2.3. Verificar que tablas originales NO existen
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev -c "\dt personal_loans"
# Debe mostrar: "Did not find any relation named 'personal_loans'"

# 2.4. Compilar TypeScript (validar types)
npm run typecheck
# Esperado: 0 errors
```

---

### Paso 3: Validación en DEV

```bash
# 3.1. Reiniciar servidor DEV
pm2 restart cuentassik-dev

# 3.2. Verificar logs (NO debe haber errores de DB)
pm2 logs cuentassik-dev --lines 50 --nostream

# 3.3. Probar UI manualmente
# Abrir http://localhost:3001/app/sickness/credito-deuda
# Debe cargar sin errores (aunque funcionalidad antigua no funcione)

# 3.4. Tests de integración
npm run test:integration
# Esperado: Todos pasando (o skipped si no implementados aún)
```

---

### Paso 4: Ejecución en PROD (Con Aprobación)

```bash
# 4.1. STOP - Punto de decisión
echo "⚠️ Aplicar a PRODUCCIÓN requiere aprobación explícita"
read -p "¿Continuar con PROD? (escribir 'YES PROD' para confirmar): " CONFIRM

if [ "$CONFIRM" != "YES PROD" ]; then
  echo "❌ Operación cancelada"
  exit 1
fi

# 4.2. Aplicar migración en PROD
./scripts/migrations/apply_migration.sh prod 20251119_180000_deprecate_legacy_tables.sql

# 4.3. Verificar renombrado en PROD
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "\dt _legacy_*"

# 4.4. Reiniciar servidor PROD
pm2 restart cuentassik-prod

# 4.5. Monitorear logs PROD (5 minutos)
pm2 logs cuentassik-prod --lines 100
```

---

### Paso 5: Post-Migración

```bash
# 5.1. Commit de la migración
git add database/migrations/20251119_180000_deprecate_legacy_tables.sql
git add types/database.generated.ts  # Si cambió
git commit -m "refactor(db): deprecar tablas legacy balance (vacías)

- Renombrar personal_loans → _legacy_personal_loans
- Renombrar refund_claims → _legacy_refund_claims
- Renombrar member_credits → _legacy_member_credits
- Añadir comentarios de deprecación
- NO hay datos que migrar (tablas vacías)

Ref: Issue #59 (Phase 3 - Migración Simplificada)"

git push origin main

# 5.2. Actualizar Issue #59 con resultado
# (Vía GitHub MCP)

# 5.3. Continuar con Issue #60 (Backend Refactor)
```

---

## 🛡️ Plan de Rollback

### Escenario 1: Error en DEV (Fase 3)

```sql
-- Renombrar de vuelta (inmediato)
ALTER TABLE _legacy_personal_loans RENAME TO personal_loans;
ALTER TABLE _legacy_refund_claims RENAME TO refund_claims;
ALTER TABLE _legacy_member_credits RENAME TO member_credits;

-- Regenerar types
-- npm run types:generate:dev
```

**Tiempo de rollback**: < 1 minuto

---

### Escenario 2: Error en PROD (Fase 3)

```bash
# 1. Rollback migración
./scripts/migrations/rollback_migration.sh prod 20251119_180000_deprecate_legacy_tables.sql

# 2. Ejecutar SQL manual si rollback automático falla
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "
  ALTER TABLE _legacy_personal_loans RENAME TO personal_loans;
  ALTER TABLE _legacy_refund_claims RENAME TO refund_claims;
  ALTER TABLE _legacy_member_credits RENAME TO member_credits;
"

# 3. Reiniciar PROD
pm2 restart cuentassik-prod

# 4. Restaurar desde backup (último recurso)
sudo -u postgres psql -d cuentassik_prod < ~/backups/prod_pre_balance_YYYYMMDD_HHMMSS.sql
```

**Tiempo de rollback**: < 5 minutos

---

### Escenario 3: Error en Backend (Fase 4)

```bash
# 1. Revertir commit
git revert <commit_hash>
git push origin main

# 2. Restaurar archivos .LEGACY
mv app/sickness/credito-deuda/actions.ts.LEGACY app/sickness/credito-deuda/actions.ts
mv app/sickness/credito-deuda/refund-actions.ts.LEGACY app/sickness/credito-deuda/refund-actions.ts

# 3. Eliminar nuevo archivo
rm -f lib/balance/actions.ts

# 4. Reiniciar servidores
pm2 restart all
```

**Tiempo de rollback**: < 10 minutos

---

## 📊 Métricas de Éxito

### Fase 3 (Migración)

- [x] Tablas renombradas correctamente (3/3)
- [x] Comentarios de deprecación añadidos
- [x] Types regenerados sin errores
- [x] TypeScript compilando sin errores
- [x] Servidores iniciando sin errores DB
- [x] Git commit/push exitoso

### Global (Todas las Fases)

- [ ] Sistema balance funcional en PROD
- [ ] Dashboard multi-miembro operativo
- [ ] Tests pasando (>80% coverage)
- [ ] Documentación completa
- [ ] Usuarios pueden solicitar/devolver préstamos
- [ ] Balance se calcula correctamente
- [ ] NO hay errores en logs de PROD (7 días)

---

## 🔍 Monitoreo Post-Migración

### Semana 1 (Crítico)

```bash
# Revisar logs diariamente
pm2 logs cuentassik-prod --lines 500 | grep -i "error\|exception\|legacy"

# Verificar que NO se intenta acceder a tablas renombradas
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "
  SELECT query, calls, total_time
  FROM pg_stat_statements
  WHERE query LIKE '%personal_loans%'
    OR query LIKE '%refund_claims%'
    OR query LIKE '%member_credits%'
  ORDER BY calls DESC;
"
# Esperado: 0 queries (o solo a tablas _legacy_*)
```

### Mes 1-6 (Evaluación)

- Recopilar feedback de usuarios
- Monitorear performance de `calculate_member_balance()`
- Verificar que NO hay código legacy activo
- Planificar eliminación definitiva (v4.0.0)

---

## 🗓️ Cronograma de Eliminación Definitiva

### v4.0.0 (Mayo 2026) - 6 Meses Después

```sql
-- ============================================
-- v4.0.0 - Eliminar tablas legacy definitivamente
-- ============================================

-- Verificar una última vez que NO hay código referenciando estas tablas
-- (Búsqueda manual en repo)

-- Eliminar tablas
DROP TABLE IF EXISTS _legacy_personal_loans CASCADE;
DROP TABLE IF EXISTS _legacy_refund_claims CASCADE;
DROP TABLE IF EXISTS _legacy_member_credits CASCADE;

-- Eliminar archivos .LEGACY
-- rm -f app/sickness/credito-deuda/actions.ts.LEGACY
-- rm -f app/sickness/credito-deuda/refund-actions.ts.LEGACY

-- Eliminar documentación legacy (opcional)
-- mv docs/AUDIT_LEGACY_BALANCE_DATA.md docs/archive/

SELECT 'Legacy balance system fully removed' AS status;
```

**Criterios para eliminación**:

- ✅ 6 meses de operación estable
- ✅ 0 errores relacionados con sistema balance
- ✅ 0 referencias a tablas legacy en código
- ✅ Usuarios satisfechos con nuevo sistema
- ✅ Aprobación de stakeholders

---

## ✅ Checklist de Preparación

### Antes de Iniciar Fase 3

- [x] Auditoría de datos legacy completada
- [x] Especificación de función PostgreSQL completada
- [x] Plan de migración documentado
- [ ] Casos de uso documentados (`BALANCE_USE_CASES.md`)
- [ ] Fase 2 (Issue #58) completada:
  - [ ] Categorías sistema creadas
  - [ ] Función `calculate_member_balance()` implementada
  - [ ] Tests SQL pasando
- [ ] Backups de DEV y PROD realizados
- [ ] Aprobación para proceder con migración

---

## 📎 Referencias

- **Issue #57**: Phase 1 - Análisis y Especificación
- **Issue #59**: Phase 3 - Migración de Datos Legacy
- **Auditoría**: `docs/AUDIT_LEGACY_BALANCE_DATA.md`
- **Especificación**: `docs/BALANCE_CALCULATION_SPEC.md`
- **Scripts**: `scripts/migrations/apply_migration.sh`

---

**✅ Plan de migración completado**
**Próximo documento**: `docs/BALANCE_USE_CASES.md`
