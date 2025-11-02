# Testing Manual - Issue #23: Verificar el funcionamiento

**Fecha**: 2 Noviembre 2025
**Issue**: #23
**Objetivo**: Verificar que todos los cambios recientes funcionan correctamente

---

## 🎯 Objetivo del Testing

Después de los cambios recientes (especialmente Issue #22 - optimización de categorías), necesitamos verificar que:

1. ✅ Se pueden crear nuevos períodos mensuales
2. ✅ Se pueden crear movimientos de todos los tipos
3. ✅ Todos los campos se guardan correctamente
4. ✅ Las fases del período funcionan sin problemas
5. ✅ La jerarquía de categorías funciona correctamente

---

## 📋 Pre-requisitos

### Estado del Sistema

**Servidor DEV**:
- ✅ Estado: ONLINE (puerto 3001)
- ✅ Uptime: Estable
- ✅ Base de datos: cuentassik_dev conectada

**Acceso**:
- 🌐 URL: http://localhost:3001
- 👤 Usuario: [Tu cuenta Google]

---

## 🔬 Plan de Testing

### FASE 1: Verificación de Categorías (Issue #22)

**Objetivo**: Confirmar que la optimización de jerarquía funciona

#### Test 1.1: Cargar página de balance
1. Navegar a `/sickness/balance`
2. Verificar que la página carga sin errores
3. **Esperado**: Página carga en <2 segundos

#### Test 1.2: Abrir diálogo de edición
1. Buscar cualquier transacción existente
2. Clic en botón "Editar"
3. **Esperado**: Diálogo abre INSTANTÁNEAMENTE (<100ms)
4. **Esperado**: Campos de categoría se rellenan al instante

#### Test 1.3: Abrir/cerrar múltiples veces
1. Abrir diálogo de edición
2. Cerrar sin guardar
3. Repetir 5 veces
4. **Esperado**: SIEMPRE abre instantáneamente (sin ralentización)

**✅ RESULTADO FASE 1**: __________ (PASS/FAIL)

---

### FASE 2: Creación de Período Mensual

**Objetivo**: Verificar que se pueden crear nuevos períodos

#### Test 2.1: Navegar a gestión de períodos
1. Ir a `/sickness/periodo` o menú hamburguesa → "Períodos"
2. **Esperado**: Ver lista de períodos existentes

#### Test 2.2: Crear nuevo período
1. Seleccionar mes: **Diciembre 2025** (o el mes siguiente disponible)
2. Clic en "Crear Período"
3. **Esperado**:
   - Modal de confirmación aparece
   - Mensaje claro sobre qué se va a crear
4. Confirmar creación
5. **Esperado**:
   - Toast de éxito
   - Período aparece en la lista con fase "Preparing"

#### Test 2.3: Verificar en base de datos
```bash
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev
```

```sql
SELECT id, year, month, phase, status
FROM monthly_periods
ORDER BY year DESC, month DESC
LIMIT 5;
```

**Esperado**: Ver el período recién creado

**✅ RESULTADO FASE 2**: __________ (PASS/FAIL)

---

### FASE 3: Crear Movimientos - Todos los Tipos

**Objetivo**: Verificar creación de transacciones con nueva jerarquía

#### Setup: Seleccionar período activo
1. Ir a `/sickness/periodo`
2. Si el período está en "Preparing", avanzar a "Validation" o "Active"
3. Navegar a `/sickness/balance`

---

#### Test 3.1: Crear GASTO DIRECTO

**Pasos**:
1. Clic en "Nuevo Movimiento" (botón +)
2. Seleccionar:
   - Tipo: **Gasto Directo**
   - Grupo: **Egresos**
   - Categoría: (Ej: "Transporte")
   - Subcategoría: (Ej: "Gasolina")
   - Cantidad: **50.00 €**
   - Descripción: "Test gasto directo - Issue #23"
   - Fecha/Hora: (Usar fecha actual)
   - Pagador: (Tu perfil)
3. Clic en "Guardar"

**Verificaciones**:
- ✅ Toast de éxito aparece
- ✅ Diálogo se cierra
- ✅ Nueva transacción aparece en la lista
- ✅ Muestra correctamente:
  - Tipo: Gasto directo
  - Cantidad: -50.00 €
  - Categoría: Grupo > Categoría > Subcategoría
  - Pagador: Tu nombre

**Verificar en DB**:
```sql
SELECT
  id,
  type,
  flow_type,
  amount,
  description,
  subcategory_id,
  real_payer_id,
  performed_by_profile_id
FROM transactions
WHERE description LIKE '%Issue #23%'
ORDER BY created_at DESC
LIMIT 5;
```

**Campos esperados**:
- `type` = 'expense'
- `flow_type` = 'direct'
- `amount` = Negativo (ej: -50.00)
- `subcategory_id` = UUID válido (NOT NULL)
- `real_payer_id` = Tu profile_id
- `performed_by_profile_id` = Tu profile_id

**✅ RESULTADO Test 3.1**: __________ (PASS/FAIL)

---

#### Test 3.2: Crear GASTO COMÚN

**Pasos**:
1. Clic en "Nuevo Movimiento"
2. Seleccionar:
   - Tipo: **Gasto Común**
   - Grupo: **Egresos**
   - Categoría: (Ej: "Hogar")
   - Subcategoría: (Ej: "Supermercado")
   - Cantidad: **75.50 €**
   - Descripción: "Test gasto común - Issue #23"
   - Fecha/Hora: (Usar fecha actual)
   - Ejecutado por: (Tu perfil) ← **NUEVO CAMPO**
3. Clic en "Guardar"

**Verificaciones**:
- ✅ Toast de éxito aparece
- ✅ Nueva transacción aparece en la lista
- ✅ Muestra correctamente:
  - Tipo: Gasto común
  - Cantidad: -75.50 €
  - Categoría completa mostrada
  - Ejecutado por: Tu nombre

**Verificar en DB**:
```sql
SELECT
  id,
  type,
  flow_type,
  amount,
  description,
  subcategory_id,
  performed_by_profile_id
FROM transactions
WHERE description = 'Test gasto común - Issue #23';
```

**Campos esperados**:
- `type` = 'expense'
- `flow_type` = 'common'
- `amount` = Negativo (ej: -75.50)
- `subcategory_id` = UUID válido (NOT NULL)
- `performed_by_profile_id` = Tu profile_id (NOT NULL)

**✅ RESULTADO Test 3.2**: __________ (PASS/FAIL)

---

#### Test 3.3: Crear INGRESO COMÚN

**Pasos**:
1. Clic en "Nuevo Movimiento"
2. Seleccionar:
   - Tipo: **Ingreso**
   - Grupo: **Ingresos**
   - Categoría: (Ej: "Salario")
   - Subcategoría: (Ej: "Nómina")
   - Cantidad: **1000.00 €**
   - Descripción: "Test ingreso - Issue #23"
   - Fecha/Hora: (Usar fecha actual)
   - Ejecutado por: (Tu perfil)
3. Clic en "Guardar"

**Verificaciones**:
- ✅ Toast de éxito aparece
- ✅ Nueva transacción aparece en la lista
- ✅ Muestra correctamente:
  - Tipo: Ingreso
  - Cantidad: +1000.00 €
  - Categoría completa
  - Ejecutado por: Tu nombre

**Verificar en DB**:
```sql
SELECT
  id,
  type,
  flow_type,
  amount,
  description,
  subcategory_id,
  performed_by_profile_id
FROM transactions
WHERE description = 'Test ingreso - Issue #23';
```

**Campos esperados**:
- `type` = 'income'
- `flow_type` = 'common'
- `amount` = Positivo (ej: 1000.00)
- `subcategory_id` = UUID válido (NOT NULL)
- `performed_by_profile_id` = Tu profile_id (NOT NULL)

**✅ RESULTADO Test 3.3**: __________ (PASS/FAIL)

---

### FASE 4: Verificar Campos Guardados (Crítico)

**Objetivo**: Confirmar que TODOS los campos se guardan correctamente

#### Test 4.1: Inspección completa en DB

```sql
-- Ver las 3 transacciones de prueba con TODOS los campos
SELECT
  id,
  household_id,
  profile_id,
  type,
  flow_type,
  amount,
  currency,
  description,
  -- ✨ CAMPOS CRÍTICOS RECIENTES (Issue #19, #20, #21)
  category_id,           -- Debe ser NULL (eliminado en Issue #20)
  subcategory_id,        -- Debe ser NOT NULL (nuevo en Issue #20)
  real_payer_id,         -- Para gastos directos
  performed_by_profile_id, -- Para todos los movimientos (Issue #21)

  -- Fechas
  occurred_at,
  performed_at,

  -- Metadatos
  transaction_pair_id,
  period_id,
  created_at,
  updated_at
FROM transactions
WHERE description LIKE '%Issue #23%'
ORDER BY created_at DESC;
```

**Verificaciones por cada transacción**:

| Campo | Gasto Directo | Gasto Común | Ingreso |
|-------|---------------|-------------|---------|
| `category_id` | NULL ✅ | NULL ✅ | NULL ✅ |
| `subcategory_id` | UUID ✅ | UUID ✅ | UUID ✅ |
| `real_payer_id` | UUID ✅ | NULL ✅ | NULL ✅ |
| `performed_by_profile_id` | UUID ✅ | UUID ✅ | UUID ✅ |
| `occurred_at` | NOT NULL ✅ | NOT NULL ✅ | NOT NULL ✅ |
| `performed_at` | NOT NULL ✅ | NOT NULL ✅ | NOT NULL ✅ |
| `period_id` | UUID ✅ | UUID ✅ | UUID ✅ |

**✅ RESULTADO Test 4.1**: __________ (PASS/FAIL)

---

#### Test 4.2: Verificar ingreso compensatorio (Gasto Directo)

**Objetivo**: Confirmar que el gasto directo creó su ingreso compensatorio automáticamente

```sql
-- Buscar el gasto directo
SELECT id, transaction_pair_id, amount, description
FROM transactions
WHERE description = 'Test gasto directo - Issue #23';

-- Buscar su ingreso compensatorio usando transaction_pair_id
SELECT
  id,
  type,
  flow_type,
  amount,
  description,
  subcategory_id,
  real_payer_id
FROM transactions
WHERE transaction_pair_id = (
  SELECT transaction_pair_id
  FROM transactions
  WHERE description = 'Test gasto directo - Issue #23'
)
AND id != (
  SELECT id
  FROM transactions
  WHERE description = 'Test gasto directo - Issue #23'
);
```

**Verificaciones del ingreso compensatorio**:
- ✅ Existe una transacción pareada
- ✅ `type` = 'income'
- ✅ `flow_type` = 'direct'
- ✅ `amount` = POSITIVO (mismo valor absoluto que el gasto)
- ✅ `subcategory_id` = Mismo que el gasto
- ✅ `real_payer_id` = Mismo que el gasto
- ✅ `description` contiene referencia al gasto

**✅ RESULTADO Test 4.2**: __________ (PASS/FAIL)

---

### FASE 5: Testing de Fases del Período

**Objetivo**: Verificar que las transiciones de fase funcionan

#### Test 5.1: Fase Preparing → Validation

**Pasos**:
1. Ir a `/sickness/periodo`
2. Buscar el período de prueba (Diciembre 2025)
3. Si está en "Preparing":
   - Clic en "Pasar a Validación"
   - Confirmar
4. **Esperado**: Fase cambia a "Validation"

**Verificar en DB**:
```sql
SELECT id, year, month, phase, status
FROM monthly_periods
WHERE year = 2025 AND month = 12;
```

**✅ RESULTADO Test 5.1**: __________ (PASS/FAIL)

---

#### Test 5.2: Fase Validation → Active

**Pasos**:
1. En `/sickness/periodo`
2. Período en "Validation"
3. Clic en "Activar Período"
4. Confirmar
5. **Esperado**: Fase cambia a "Active"

**✅ RESULTADO Test 5.2**: __________ (PASS/FAIL)

---

#### Test 5.3: Restricciones por fase

**En Preparing** (si hay un período en esta fase):
- ❌ NO debe permitir crear transacciones
- **Test**: Intentar crear cualquier movimiento → Debe mostrar error

**En Validation**:
- ✅ Debe permitir crear SOLO gastos directos
- ❌ NO debe permitir gastos/ingresos comunes
- **Test**: Intentar crear gasto común → Debe mostrar error

**En Active**:
- ✅ Debe permitir TODO tipo de movimientos

**✅ RESULTADO Test 5.3**: __________ (PASS/FAIL)

---

### FASE 6: Testing de Edición (Issue #22)

**Objetivo**: Confirmar que la edición sigue funcionando rápido

#### Test 6.1: Editar gasto común

**Pasos**:
1. Buscar "Test gasto común - Issue #23"
2. Clic en "Editar" → Debe abrir INSTANTÁNEAMENTE
3. Cambiar:
   - Subcategoría: Elegir otra diferente
   - Cantidad: 85.75 €
   - Descripción: "Test gasto común - EDITADO"
4. Guardar
5. **Esperado**: Cambios se reflejan inmediatamente

**Verificar en DB**:
```sql
SELECT
  amount,
  description,
  subcategory_id,
  updated_at
FROM transactions
WHERE description = 'Test gasto común - EDITADO';
```

**✅ RESULTADO Test 6.1**: __________ (PASS/FAIL)

---

#### Test 6.2: Editar gasto directo (y verificar propagación)

**Pasos**:
1. Buscar "Test gasto directo - Issue #23"
2. Clic en "Editar"
3. Cambiar:
   - Cantidad: 60.00 €
   - Descripción: "Test gasto directo - EDITADO"
4. Guardar
5. **Esperado**:
   - Gasto actualizado
   - **CRÍTICO**: Ingreso compensatorio también actualizado

**Verificar propagación en DB**:
```sql
-- Ver gasto y su ingreso compensatorio
SELECT
  t1.id as gasto_id,
  t1.amount as gasto_amount,
  t1.description as gasto_desc,
  t2.id as ingreso_id,
  t2.amount as ingreso_amount,
  t2.description as ingreso_desc
FROM transactions t1
LEFT JOIN transactions t2 ON t2.transaction_pair_id = t1.transaction_pair_id
  AND t2.id != t1.id
WHERE t1.description = 'Test gasto directo - EDITADO';
```

**Verificaciones**:
- ✅ Gasto: amount = -60.00
- ✅ Ingreso compensatorio: amount = +60.00 (mismo valor absoluto)
- ✅ Ambos tienen `updated_at` reciente

**✅ RESULTADO Test 6.2**: __________ (PASS/FAIL)

---

### FASE 7: Testing de Eliminación

#### Test 7.1: Eliminar gasto común

**Pasos**:
1. Buscar "Test gasto común - EDITADO"
2. Clic en "Eliminar"
3. Confirmar
4. **Esperado**: Transacción desaparece

**Verificar en DB**:
```sql
SELECT COUNT(*) FROM transactions
WHERE description LIKE '%Test gasto común%';
```

**Esperado**: 0 resultados

**✅ RESULTADO Test 7.1**: __________ (PASS/FAIL)

---

#### Test 7.2: Eliminar gasto directo (debe eliminar ambos)

**Pasos**:
1. Buscar "Test gasto directo - EDITADO"
2. Clic en "Eliminar"
3. Confirmar
4. **Esperado**:
   - Gasto desaparece
   - Ingreso compensatorio también desaparece

**Verificar en DB**:
```sql
SELECT COUNT(*) FROM transactions
WHERE description LIKE '%Test gasto directo%';
```

**Esperado**: 0 resultados (ambos eliminados)

**✅ RESULTADO Test 7.2**: __________ (PASS/FAIL)

---

#### Test 7.3: Eliminar ingreso

**Pasos**:
1. Buscar "Test ingreso - Issue #23"
2. Clic en "Eliminar"
3. Confirmar
4. **Esperado**: Transacción desaparece

**Verificar en DB**:
```sql
SELECT COUNT(*) FROM transactions
WHERE description LIKE '%Test ingreso%';
```

**Esperado**: 0 resultados

**✅ RESULTADO Test 7.3**: __________ (PASS/FAIL)

---

## 📊 RESUMEN DE RESULTADOS

### Checklist Final

| Fase | Test | Estado | Notas |
|------|------|--------|-------|
| 1 | Categorías carga rápido | ☐ | |
| 1 | Edición instantánea | ☐ | |
| 2 | Crear período | ☐ | |
| 3.1 | Crear gasto directo | ☐ | |
| 3.2 | Crear gasto común | ☐ | |
| 3.3 | Crear ingreso | ☐ | |
| 4.1 | Campos guardados correctamente | ☐ | |
| 4.2 | Ingreso compensatorio creado | ☐ | |
| 5 | Transiciones de fase | ☐ | |
| 6 | Ediciones funcionan | ☐ | |
| 7 | Eliminaciones funcionan | ☐ | |

---

## 🐛 Registro de Problemas Encontrados

| # | Descripción | Severidad | Reproducción |
|---|-------------|-----------|--------------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

---

## ✅ Conclusión

**Estado General**: ☐ PASS / ☐ FAIL

**Comentarios**:
```
[Añadir observaciones generales aquí]
```

**Fecha de Testing**: _______________
**Tester**: _______________

---

**Issue #23**: Listo para cerrar ☐ / Requiere correcciones ☐
