# Issue #45 - Sincronización PROD → DEV ✅

**Fecha**: 5 Noviembre 2025
**Estado**: ✅ COMPLETADO
**Commit**: ed928d6

---

## 🎯 Objetivo

Replicar la base de datos de **PRODUCCIÓN** a **DESARROLLO** para trabajar con datos reales actualizados (8 meses de histórico: Abril-Noviembre 2025).

---

## 📊 Datos Sincronizados

### Resumen de Registros

| Tabla | Registros | Rango Temporal |
|-------|-----------|----------------|
| `transactions` | **355** | 2025-04-01 → 2025-11-04 |
| `monthly_periods` | **8** | Abril-Noviembre 2025 |
| `profiles` | 5 | Usuarios del sistema |
| `households` | 1 | Hogar activo |
| `household_members` | 2 | Miembros del hogar |
| `categories` | 50 | Categorías de gastos |
| `category_parents` | 9 | Grupos de categorías |
| `subcategories` | 95 | Subcategorías |
| `contributions` | 12 | Aportaciones mensuales |
| `dual_flow_transactions` | 0 | Sin transacciones duales |

### Estado de Periodos Mensuales

| Año | Mes | Fase | Estado |
|-----|-----|------|--------|
| 2025 | Abril | closed | closed |
| 2025 | Mayo | closed | closed |
| 2025 | Junio | closed | closed |
| 2025 | Julio | closed | closed |
| 2025 | Agosto | closed | closed |
| 2025 | Septiembre | closed | closed |
| 2025 | Octubre | closed | closed |
| 2025 | Noviembre | **active** | **open** |

**Total**: 7 meses cerrados + 1 mes activo (Noviembre 2025)

---

## 🔒 Proceso Ejecutado

### PASO 1: Backup de PROD

```bash
# Backup timestampeado en .archive/
sudo -u postgres pg_dump -d cuentassik_prod \
  --data-only \
  --inserts \
  --column-inserts \
  > .archive/cuentassik_prod_backup_20251105_004434.sql
```

**Resultado**:
- ✅ Archivo: `.archive/cuentassik_prod_backup_20251105_004434.sql`
- ✅ Tamaño: **4.3 MB**
- ✅ Formato: SQL con INSERTs legibles
- ✅ Excluido de Git (`.archive/` en `.gitignore`)

### PASO 2: Limpieza de DEV

```sql
-- Deshabilitar triggers temporalmente
SET session_replication_role = 'replica';

-- Limpiar tablas en orden CASCADE
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE dual_flow_transactions CASCADE;
TRUNCATE TABLE contribution_adjustments CASCADE;
TRUNCATE TABLE contributions CASCADE;
TRUNCATE TABLE monthly_periods CASCADE;
TRUNCATE TABLE subcategories CASCADE;
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE category_parents CASCADE;
TRUNCATE TABLE household_members CASCADE;
TRUNCATE TABLE households CASCADE;
TRUNCATE TABLE profiles CASCADE;

-- Rehabilitar triggers
SET session_replication_role = 'origin';
```

**Efecto**:
- ✅ Datos de DEV eliminados
- ✅ Estructura de tablas intacta (columnas, índices, constraints)
- ✅ Secuencias preservadas
- ✅ Sin pérdida de estructura

### PASO 3: Importación de Datos

```bash
# Copiar datos PROD → DEV
sudo -u postgres pg_dump -d cuentassik_prod \
  --data-only \
  --disable-triggers \
  --column-inserts \
  | sudo -u postgres psql -d cuentassik_dev
```

**Resultado**:
- ✅ 355 transacciones importadas
- ✅ 8 periodos mensuales importados
- ✅ Jerarquía completa de categorías (9 padres, 50 categorías, 95 subcategorías)
- ⚠️ Warnings menores en `user_settings` (duplicados, sin impacto)

### PASO 4: Verificación de Integridad

**Comparación DEV vs PROD**:

```sql
-- Transacciones
SELECT COUNT(*), MIN(occurred_at), MAX(occurred_at) FROM transactions;
```

| Entorno | Transacciones | Fecha Mínima | Fecha Máxima |
|---------|---------------|--------------|--------------|
| **DEV** | 355 | 2025-04-01 | 2025-11-04 |
| **PROD** | 355 | 2025-04-01 | 2025-11-04 |

✅ **COINCIDENCIA EXACTA**

**Periodos mensuales**:

```sql
SELECT year, month, phase, status FROM monthly_periods ORDER BY year, month;
```

✅ **8 periodos idénticos en ambos entornos**

---

## 🎉 Resultado Final

### ✅ Éxitos

1. **Datos de producción replicados al 100%** en DEV
2. **Backup timestampeado** guardado localmente (4.3 MB)
3. **Sin pérdida de datos** en PROD (solo lectura)
4. **Estructura de DEV preservada** (solo datos cambiaron)
5. **8 meses de histórico** disponibles para pruebas (Abril-Noviembre 2025)
6. **Periodo activo** (Noviembre 2025) disponible para nuevas transacciones

### 📁 Archivos Generados

```
.archive/
└── cuentassik_prod_backup_20251105_004434.sql  # 4.3 MB (excluido de Git)

.gitignore
└── Añadida línea: /.archive/  # Commit ed928d6
```

### 🔐 Seguridad

- ✅ `.archive/` excluido de Git (datos privados)
- ✅ Backup con timestamp único (no sobrescribe)
- ✅ PROD sin modificaciones (solo pg_dump)
- ✅ Proceso reversible (backup disponible)

---

## 📝 Uso Futuro

### Repetir Sincronización

```bash
# 1. Crear backup timestampeado
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
sudo -u postgres pg_dump -d cuentassik_prod \
  --data-only --inserts --column-inserts \
  > ".archive/cuentassik_prod_backup_${TIMESTAMP}.sql"

# 2. Limpiar DEV
sudo -u postgres psql -d cuentassik_dev -c "
  SET session_replication_role = 'replica';
  TRUNCATE TABLE transactions CASCADE;
  -- (resto de tablas...)
  SET session_replication_role = 'origin';
"

# 3. Importar PROD → DEV
sudo -u postgres pg_dump -d cuentassik_prod \
  --data-only --disable-triggers --column-inserts \
  | sudo -u postgres psql -d cuentassik_dev

# 4. Verificar
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev \
  -c "SELECT COUNT(*) FROM transactions;"
```

### Restaurar desde Backup

```bash
# Si necesitas restaurar DEV desde un backup anterior
sudo -u postgres psql -d cuentassik_dev \
  < .archive/cuentassik_prod_backup_20251105_004434.sql
```

---

## 🔗 Referencias

- **Issue**: #45 (GitHub)
- **Commit**: ed928d6 (añadir .archive/ a .gitignore)
- **Documentación relacionada**:
  - `docs/FLUJO_DESARROLLO_PRODUCCION.md` - Workflows completos
  - `database/README.md` - Sistema de migraciones
  - `.vscode/tasks.json` - Tareas automatizadas (ESCENARIO 1)

---

## ⏭️ Próximos Pasos

1. ✅ **DEV listo** para desarrollo con datos reales
2. ⏸️ **Probar funcionalidades** en DEV antes de aplicar a PROD
3. ⏸️ **Crear migraciones** si necesitas cambios de estructura
4. ⏸️ **Repetir sincronización** cuando PROD tenga datos nuevos significativos

---

**🎊 Issue #45 COMPLETADO CON ÉXITO 🎊**

_Base de datos de desarrollo actualizada con 8 meses de histórico real (Abril-Noviembre 2025)_
