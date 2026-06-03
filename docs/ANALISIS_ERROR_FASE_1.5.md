# Análisis de Errores Post-Fase 1.5

**Fecha**: 27 Noviembre 2025
**Situación**: Migración Fase 1.5 aplicada, errores en runtime detectados
**Estado**: ⚠️ ANÁLISIS EN CURSO - NO HAY URGENCIA (entorno DEV seguro)

---

## 🎯 Resumen Ejecutivo

**Problema**: La migración eliminó columnas que **SÍ se referencian en el código**, pero **NUNCA contenían datos reales**.

**Impacto**:

- ❌ 2 errores críticos detectados
- ✅ Datos NO corruptos (columnas estaban vacías)
- ✅ Backup disponible (fácil rollback)
- ✅ Entorno DEV (sin impacto usuarios)

**Solución**: Dos opciones viables (análisis completo abajo)

---

## 🔍 Errores Detectados

### Error 1: `owner_profile_id` en tabla `households`

**Ubicación**: `lib/auth.ts:694`

**Código que falla**:

```typescript
const result = await query<{ owner_profile_id: string }>(
  `SELECT owner_profile_id FROM households WHERE id = $1`,
  [householdId],
);
return result.rows[0].owner_profile_id === currentUser.profile_id;
```

**Estado de la columna**:

- ❌ **NO EXISTE en el schema actual**
- ⚠️ **NUNCA estuvo en `households`** (error de código legacy)

**Schema real de `households`**:

```sql
-- Columnas actuales (9 columnas):
id                    | uuid
name                  | text
created_at            | timestamptz
status                | text
settings_archivo      | jsonb
created_by_profile_id | uuid  ← Esta SÍ existe (columna de auditoría)
updated_by_profile_id | uuid  ← Esta SÍ existe (columna de auditoría)
updated_at            | timestamptz
deleted_at            | timestamptz
```

**Análisis**:

- `owner_profile_id` **NUNCA existió** en la tabla `households`
- El sistema de ownership se implementa mediante `household_members.role = 'owner'`
- Función `isHouseholdOwner()` está usando una columna **incorrecta** desde su implementación

**Uso real de la función**:

```bash
grep -r "isHouseholdOwner" --include="*.ts" --include="*.tsx"
```

Resultados:

1. `lib/auth.ts:687` - Definición de la función
2. `lib/loans/counts.ts:15` - Usado para contar préstamos pendientes (badge)

**Frecuencia**: Se ejecuta en cada carga de layout `/sickness/*`

---

### Error 2: `calculation_method` en tabla `contributions`

**Ubicación**: `lib/contributions/getContributionsData.ts:277`

**Código que falla**:

```typescript
const contributionsRes = await query<{
  profile_id: string;
  email: string;
  expected_amount: number | null;
  paid_amount: number | null;
  status: string | null;
  calculation_method: string | null; // ← Columna eliminada
}>(
  `
    SELECT
      c.profile_id,
      p.email,
      c.expected_amount,
      c.paid_amount,
      c.status,
      c.calculation_method  -- ❌ NO EXISTE
    FROM contributions c
    ...
  `,
  [householdId, period.year, period.month],
);
```

**Estado de la columna**:

- ✅ **Existía en el schema** (eliminada por Fase 1.5)
- ✅ **NUNCA tuvo datos**: 0/12 filas pobladas (verificado pre-migración)
- ⚠️ **Pero SÍ se leía en el código**

**Datos reales en `contributions` (antes de eliminar columna)**:

```sql
-- Estructura actual (11 columnas, antes: 16):
id                      | uuid
household_id            | uuid
year                    | integer
month                   | integer
expected_amount         | numeric
paid_amount             | numeric
status                  | text
created_at              | timestamptz
updated_at              | timestamptz
profile_id              | uuid
adjustments_paid_amount | numeric

-- 12 filas totales, TODAS con:
calculation_method = NULL (100%)
```

**Usos en el código** (29 referencias):

1. **`lib/contributions/getContributionsData.ts`** (5 refs):

   - Línea 40: Type definition
   - Línea 173: Hardcoded `'disabled'`
   - Línea 268: Type definition (query result)
   - Línea 277: SELECT statement ❌
   - Línea 372: Assignment `existing?.calculation_method ?? calculationType`

2. **`lib/balance/getMemberBalanceHistory.ts`** (2 refs):

   - Línea 33: Type definition
   - Línea 147: Mapping `contrib.calculation_method`

3. **`lib/contributions/periods.ts`** (1 ref):

   - Línea 157: Hardcoded `'direct_adjusted'`

4. **`app/api/periods/contributions/route.ts`** (2 refs):

   - Línea 60: Response mapping

5. **Components** (2 refs):

   - `FinancialSummaryCard.tsx`: Type definition
   - `ContributionsOverview.tsx`: Type definition

6. **Types** (4 refs):
   - `types/database.ts`: Type definitions legacy

**Frecuencia de uso**: Se ejecuta al cargar `/sickness/periodo/actual`

---

## 📊 Análisis de Impacto

### ¿Por qué pasó el análisis inicial?

**Criterio usado**: "Columna sin datos = segura para eliminar"

**Query de verificación ejecutada**:

```sql
SELECT COUNT(*) FILTER (WHERE calculation_method IS NOT NULL) FROM contributions;
-- Resultado: 0 (correcto)
```

**Lo que SE VERIFICÓ**:

- ✅ 0 filas con datos en la columna
- ✅ Columna completamente vacía en BD

**Lo que NO SE VERIFICÓ**:

- ❌ Referencias en código TypeScript
- ❌ Queries SQL que seleccionan la columna
- ❌ Lógica de negocio que depende del campo (aunque sea NULL)

### ¿Por qué el código la usa si siempre es NULL?

**Hipótesis basada en el código**:

1. **Diseño anticipado**: Campo creado para funcionalidad futura
2. **Fallback a default**: El código tiene lógica `existing?.calculation_method ?? calculationType`
   - Si `calculation_method` es NULL → usa `calculationType` del período
3. **Compatibilidad**: Types incluyen el campo para mantener estructura consistente

**Evidencia en el código**:

```typescript
// lib/contributions/getContributionsData.ts:372
calculation_method: existing?.calculation_method ?? calculationType,
```

Esto significa:

- Si la columna existe pero es NULL → usa `calculationType`
- Si la columna NO existe (ahora) → **ERROR** porque el SELECT falla

### ¿Afecta a datos reales?

**NO**. Análisis de flujo:

1. **Lectura**: El código lee `calculation_method` de BD (siempre NULL)
2. **Fallback**: Usa `calculationType` del período en su lugar
3. **Display**: UI muestra el valor calculado, no el de BD
4. **Escritura**: El campo se leía pero ~~no se escribía~~ **SÍ se escribe** (línea 372)

**IMPORTANTE**: Aunque la columna estaba vacía (0/12), el código **SÍ intentaba escribir valores**:

- Valores que se escribirían: `calculationType` (`'proportional'`, `'equal'`, `'custom'`, `'disabled'`)
- Pero NUNCA se guardaron porque la tabla `contributions` prácticamente no se usa (Issue #60)

---

## 🔧 Opciones de Solución

### Opción A: Rollback de Base de Datos ⏮️

**Acción**: Restaurar backup pre-Fase 1.5

**Ventajas**:

- ✅ Restaura todo al estado anterior (100% seguro)
- ✅ No requiere cambios de código
- ✅ Rápido (5 minutos)

**Desventajas**:

- ❌ Perdemos la limpieza de schema (-7.6%)
- ❌ Columnas inútiles vuelven a la BD
- ❌ No resuelve el bug de `owner_profile_id` (nunca existió)

**Comandos**:

```bash
# 1. Detener DEV
pm2 stop cuentassik-dev

# 2. Restaurar backup
sudo -u postgres psql -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='cuentassik_dev';"
sudo -u postgres dropdb cuentassik_dev
sudo -u postgres createdb --owner=cuentassik_owner cuentassik_dev
sudo -u postgres psql -d cuentassik_dev < ~/backups/dev_pre_fase1.5_20251127_215032.sql

# 3. Regenerar types
npm run types:generate:dev

# 4. Reiniciar DEV
pm2 start cuentassik-dev
```

**Tiempo**: ~5 minutos

---

### Opción B: Fix de Código (Eliminar Referencias) 🔧

**Acción**: Remover columnas fantasma del código

**Ventajas**:

- ✅ Mantiene la limpieza de schema (-7.6% columnas)
- ✅ Resuelve AMBOS problemas (owner_profile_id + calculation_method)
- ✅ Código más limpio y correcto
- ✅ Alineado con Issue #60 (contributions deprecated)

**Desventajas**:

- ⚠️ Requiere cambios en 6 archivos
- ⚠️ Necesita testing manual

**Archivos a modificar**:

#### 1. `lib/auth.ts` (owner_profile_id)

**Problema**: Busca columna que nunca existió

**Solución**: Usar la tabla correcta `household_members`

```typescript
// ❌ ANTES (incorrecto):
const result = await query<{ owner_profile_id: string }>(
  `SELECT owner_profile_id FROM households WHERE id = $1`,
  [householdId],
);
return result.rows[0].owner_profile_id === currentUser.profile_id;

// ✅ DESPUÉS (correcto):
const result = await query<{ profile_id: string }>(
  `
    SELECT hm.profile_id
    FROM household_members hm
    WHERE hm.household_id = $1 AND hm.role = 'owner'
  `,
  [householdId],
);
if (result.rows.length === 0) return false;
return result.rows[0].profile_id === currentUser.profile_id;
```

**Impacto**: ✅ Función ahora funciona correctamente (antes era un bug latente)

#### 2. `lib/contributions/getContributionsData.ts` (calculation_method)

**Cambios necesarios** (3 lugares):

**2.1. Línea 268-277: Remover del SELECT**

```typescript
// ❌ ANTES:
const contributionsRes = await query<{
  profile_id: string;
  email: string;
  expected_amount: number | null;
  paid_amount: number | null;
  status: string | null;
  calculation_method: string | null; // ← Eliminar
}>(
  `
    SELECT
      c.profile_id,
      p.email,
      c.expected_amount,
      c.paid_amount,
      c.status,
      c.calculation_method  -- ← Eliminar
    FROM contributions c
    ...
  `,
  [householdId, period.year, period.month],
);

// ✅ DESPUÉS:
const contributionsRes = await query<{
  profile_id: string;
  email: string;
  expected_amount: number | null;
  paid_amount: number | null;
  status: string | null;
}>(
  `
    SELECT
      c.profile_id,
      p.email,
      c.expected_amount,
      c.paid_amount,
      c.status
    FROM contributions c
    ...
  `,
  [householdId, period.year, period.month],
);
```

**2.2. Línea 372: Remover assignment**

```typescript
// ❌ ANTES:
calculation_method: existing?.calculation_method ?? calculationType,

// ✅ DESPUÉS:
calculation_method: calculationType,  // Siempre usa el del período (como ya hacía en práctica)
```

**2.3. Línea 40: Actualizar type definition**

```typescript
// Mantener el campo en el type de retorno (para compatibilidad con UI)
// pero ahora SIEMPRE será el calculationType, no de BD
calculation_method: string; // Ya no es nullable
```

#### 3. `lib/balance/getMemberBalanceHistory.ts` (calculation_method)

**Cambio**: Similar a #2, remover lectura de BD

```typescript
// Línea 147:
// ❌ ANTES:
calculation_method: contrib.calculation_method,

// ✅ DESPUÉS:
calculation_method: 'proportional',  // O el default del hogar
```

#### 4. `app/api/periods/contributions/route.ts`

**Cambio**: Ya no viene de BD, pero sí del cálculo

```typescript
// Línea 60: NO cambiar, recibe el valor calculado del lib
calculation_method: c.calculation_method,  // OK (viene de getContributionsData)
```

#### 5. Components (NO cambiar)

Los componentes solo usan el tipo, no necesitan cambios:

- `FinancialSummaryCard.tsx`
- `ContributionsOverview.tsx`

#### 6. `types/database.ts` (Opcional - será regenerado)

**Acción**: Regenerar types desde schema

```bash
npm run types:generate:dev
```

Esto eliminará automáticamente las referencias a `calculation_method` en los types de BD.

---

### Opción C: Híbrida (Rollback + Fix owner_profile_id) 🔄

**Acción**:

1. Restaurar columnas eliminadas (rollback Fase 1.5)
2. Fix solo el bug de `owner_profile_id`
3. Reanalizar `calculation_method` con más cuidado

**Ventajas**:

- ✅ Restaura funcionalidad inmediata
- ✅ Fix del bug crítico de ownership
- ✅ Tiempo para analizar `calculation_method` mejor

**Desventajas**:

- ⚠️ Más trabajo (rollback + fix + re-migración futura)
- ⚠️ Columnas inútiles vuelven temporalmente

---

## 🎯 Recomendación

### **Opción B: Fix de Código** ✅ RECOMENDADA

**Justificación**:

1. **`owner_profile_id` nunca existió**: Rollback no lo arregla, es un bug del código
2. **`calculation_method` nunca tuvo datos**: Su eliminación es correcta, solo falta actualizar código
3. **Alineado con Issue #60**: La tabla `contributions` está deprecada
4. **Código más limpio**: Elimina referencias a campos fantasma
5. **Beneficio neto**: Mantenemos -7.6% schema + arreglamos 2 bugs

### Tiempo estimado: ~30 minutos

- Fix código: 15 min (6 archivos)
- Testing: 10 min
- Commit: 5 min

---

## 📋 Plan de Acción Propuesto (Opción B)

### Paso 1: Fix Crítico - owner_profile_id (5 min)

```bash
# Editar lib/auth.ts líneas 694-701
# Usar household_members.role = 'owner' en lugar de columna inexistente
```

### Paso 2: Fix calculation_method (10 min)

```bash
# Editar 3 archivos:
# - lib/contributions/getContributionsData.ts (3 lugares)
# - lib/balance/getMemberBalanceHistory.ts (1 lugar)
# - app/api/periods/contributions/route.ts (verificar, puede no necesitar cambios)
```

### Paso 3: Regenerar Types (2 min)

```bash
npm run types:generate:dev
```

### Paso 4: Testing Manual (10 min)

- [ ] Login y acceso a /sickness
- [ ] Ver período actual (debe cargar sin errores)
- [ ] Ver balance/créditos (badge contador debe funcionar)
- [ ] Crear transacción (verificar cálculo contribuciones)

### Paso 5: Commit Fix (3 min)

```bash
git add lib/ app/ types/
git commit -m "fix(db): corregir referencias a columnas eliminadas en Fase 1.5

- Fix isHouseholdOwner: usar household_members.role en lugar de owner_profile_id inexistente
- Fix calculation_method: remover referencias a columna eliminada (siempre era NULL)
- Types regenerados desde schema actualizado

Resuelve errores post-migración Fase 1.5
Ref: Issue #63"
```

---

## ⚠️ Alternativa si Fix Falla: Rollback Rápido

Si el fix de código resulta más complejo de lo esperado:

```bash
# Rollback en 5 minutos (ver Opción A arriba)
pm2 stop cuentassik-dev
# ... restore backup
pm2 start cuentassik-dev
```

**Decisión**: Probar Opción B primero, rollback como plan B

---

## 📝 Lecciones Aprendidas

### Para Futuras Migraciones

1. **✅ Hacer**: Verificar datos en columnas (lo hicimos)
2. **❌ Faltó**: Verificar referencias en código (grep por nombre columna)
3. **✅ Hacer**: Backups antes de aplicar (lo hicimos)
4. **✅ Hacer**: Testing manual post-migración (lo detectamos)
5. **➕ Añadir**: Script de verificación pre-migración:

```bash
#!/bin/bash
# pre_migration_check.sh
COLUMN_NAME=$1

echo "Verificando referencias a columna: $COLUMN_NAME"
echo ""
echo "🔍 Referencias en código TypeScript:"
grep -r "$COLUMN_NAME" --include="*.ts" --include="*.tsx" | wc -l

echo ""
echo "🔍 Referencias en SQL migrations:"
grep -r "$COLUMN_NAME" database/migrations/ | wc -l

echo ""
echo "⚠️ Si hay referencias, revisar antes de eliminar columna"
```

### Mejora al Análisis

**Antes (lo que hicimos)**:

```sql
SELECT COUNT(*) FILTER (WHERE column_name IS NOT NULL) FROM table;
```

**Después (lo que faltó)**:

```bash
# 1. Verificar BD
psql ... -c "SELECT COUNT(*) FILTER (WHERE column_name IS NOT NULL) FROM table;"

# 2. Verificar código
grep -r "column_name" --include="*.ts" --include="*.tsx"

# 3. Verificar queries SQL en el código
grep -r "SELECT.*column_name" --include="*.ts"

# 4. Solo si AMBOS están limpios → eliminar
```

---

## 🎯 Decisión Final

**Esperando confirmación del usuario**:

- **Opción A**: Rollback completo (5 min, sin riesgo, pierde limpieza)
- **Opción B**: Fix código (30 min, mantiene limpieza, arregla 2 bugs) ✅ RECOMENDADA
- **Opción C**: Híbrida (45 min, más trabajo, solución temporal)

**Mi recomendación**: **Opción B** - Fix de código

**Razones**:

1. `owner_profile_id` es un bug que hay que arreglar de todos modos
2. `calculation_method` era correcta eliminar, solo faltó limpiar código
3. Mantenemos los beneficios de Fase 1.5
4. Código queda más limpio y correcto
5. Tiempo razonable (30 min)

---

**Estado**: ⏸️ ESPERANDO DECISIÓN DEL USUARIO
