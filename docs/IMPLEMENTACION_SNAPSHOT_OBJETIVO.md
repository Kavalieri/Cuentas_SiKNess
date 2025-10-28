# Implementación: Snapshot de Objetivo de Contribución + Eliminar Período

**Fecha**: 18 de Enero 2025
**Estado**: ✅ **IMPLEMENTADO** (Pendiente de aplicar migración en DEV)

---

## 📋 Resumen

Se ha implementado la **Opción 1** del análisis de objetivo de contribución histórico:
- Añadida columna `snapshot_contribution_goal` a `monthly_periods`
- Modificado `lockPeriod()` para guardar snapshot al bloquear
- Actualizados **6 lugares** en el código para usar snapshot vs valor actual
- **BONUS**: Añadida funcionalidad de eliminar período con confirmación estricta

---

## ✅ Cambios Implementados

### 1. Migración de Base de Datos

**Archivo**: `database/migrations/development/20250118_snapshot_contribution_goal.sql`

```sql
-- Añade columna snapshot_contribution_goal NUMERIC(10,2) DEFAULT NULL
-- Pobla períodos bloqueados existentes con valor actual de household_settings
-- Validaciones post-migración
```

**Columna añadida**:
- `monthly_periods.snapshot_contribution_goal` (NUMERIC(10,2), NULL permitido)
- NULL = período en "preparing" (usa valor actual)
- NOT NULL = período bloqueado (usa snapshot histórico)

---

### 2. Server Actions Modificadas

#### `app/sickness/periodo/actions.ts`

**`lockPeriod()` modificado:**
```typescript
// Flujo con contribuciones deshabilitadas: snapshot = NULL explícito
if (contributionDisabled) {
  await query(
    `UPDATE monthly_periods
     SET contribution_disabled = TRUE,
         phase = 'validation',
         snapshot_contribution_goal = NULL,  // ← NUEVO
         updated_at = NOW()
     WHERE id = $1 AND household_id = $2`,
    [periodId, householdId],
  );
}

// Flujo normal: guardar snapshot ANTES de bloquear
const settingsRes = await query(
  `SELECT monthly_contribution_goal FROM household_settings WHERE household_id = $1`,
  [householdId],
);
const snapshotGoal = Number(settingsRes.rows[0]?.monthly_contribution_goal ?? 0);

await query(
  `UPDATE monthly_periods
   SET snapshot_contribution_goal = $1, updated_at = NOW()
   WHERE id = $2 AND household_id = $3`,
  [snapshotGoal, periodId, householdId],
);
```

**`deletePeriod()` creada (NUEVA):**
```typescript
export async function deletePeriod(
  periodId: string,
  confirmationText: string,
): Promise<Result<{ deletedPeriodInfo: string }>>
```

**Validaciones de `deletePeriod()`:**
- Usuario autenticado ✅
- Período pertenece al hogar del usuario ✅
- Confirmación texto exacto: `YYYY-MM` (ej: `2025-09`) ✅
- No se puede eliminar período en fase `active` ✅

**Eliminación en cascada:**
1. `contribution_adjustments` (si existen)
2. `transactions` (WHERE period_id = X)
3. `contributions` (WHERE year + month)
4. `monthly_periods` (registro principal)

**Preserva:**
- Logs de auditoría ✅
- Journals ✅
- Registros de debug/control ✅

---

### 3. Queries de Lectura Actualizadas (6 lugares)

**Patrón aplicado:**
```typescript
// ANTES:
const settingsRes = await query(
  `SELECT monthly_contribution_goal FROM household_settings WHERE household_id = $1`,
  [householdId]
);
const monthlyGoal = Number(settingsRes.rows[0]?.monthly_contribution_goal);

// DESPUÉS:
const goalRes = await query(
  `SELECT
     COALESCE(mp.snapshot_contribution_goal, hs.monthly_contribution_goal) as monthly_goal
   FROM monthly_periods mp
   LEFT JOIN household_settings hs ON hs.household_id = mp.household_id
   WHERE mp.id = $1`,
  [periodId]
);
const monthlyGoal = Number(goalRes.rows[0]?.monthly_goal);
```

**Archivos modificados:**

1. ✅ **`lib/contributions/periods.ts`** (línea 176-215)
   - `calculateContributionsWithDirectExpenses()`
   - Obtiene período primero, usa snapshot si existe

2. ✅ **`app/api/periods/checklist/route.ts`** (línea 66-83)
   - Checklist de preparación de período
   - Query condicional: si hay period.id usa JOIN, sino solo settings

3. ✅ **`app/api/periods/contributions/route.ts`** (línea 57-75)
   - API que devuelve contribuciones del período
   - JOIN con monthly_periods para obtener snapshot

4. ✅ **`app/sickness/credito-deuda/actions.ts`** (línea 113-125)
   - `getMemberBalanceStatus()` - Cálculo de expected si no hay registro
   - JOIN con monthly_periods usando period.id

5. ✅ **`app/sickness/credito-deuda/actions.ts`** (línea 349-362)
   - `getMemberBalancesByHousehold()` - Cálculo similar
   - JOIN con monthly_periods usando period.id

**NOTA**: `app/sickness/configuracion/hogar/page.tsx` NO se modificó porque debe usar valor actual (es la configuración global).

---

### 4. UI: Eliminar Período en Selector

**Archivo**: `app/sickness/_components/GlobalPeriodSelector.tsx`

**Nuevos imports:**
```typescript
import { deletePeriod } from '@/app/sickness/periodo/actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
```

**Nuevos estados:**
```typescript
const [showDeleteDialog, setShowDeleteDialog] = useState(false);
const [periodToDelete, setPeriodToDelete] = useState<{ id: string; year: number; month: number } | null>(null);
const [deleteConfirmation, setDeleteConfirmation] = useState('');
const [isDeleting, setIsDeleting] = useState(false);
```

**Botón en dropdown** (después del grid de meses):
```tsx
{selectedPeriod && (
  <>
    <DropdownMenuSeparator />
    <div className="p-3">
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDeleteClick}
        className="w-full gap-2"
      >
        <Trash2 className="h-4 w-4" />
        Eliminar período seleccionado
      </Button>
    </div>
  </>
)}
```

**AlertDialog de confirmación:**
- Título: "⚠️ Eliminar Período"
- Muestra período a eliminar (ej: "Septiembre 2025")
- Lista de elementos que se eliminarán
- Campo de texto para confirmación: debe escribir `YYYY-MM` exacto
- Botón "Eliminar período" deshabilitado si confirmación incorrecta
- Color rojo (destructive) para advertencia clara

**Comportamiento post-eliminación:**
- Refresca lista de períodos
- Si el eliminado era el seleccionado, selecciona el más reciente disponible (con timeout para esperar refresh)
- Toast con info: "Período eliminado: YYYY-MM (X transacciones, Y contribuciones)"

---

## 🔍 Testing Necesario

### Escenarios a Probar

#### 1. Crear período nuevo
```
1. Seleccionar mes que no existe (ej: Septiembre 2025)
2. Ver diálogo "Crear nuevo período"
3. Confirmar creación
4. Verificar que snapshot_contribution_goal = NULL
```

#### 2. Bloquear período (guardar snapshot)
```
1. Ir a Período → Fase 1
2. Verificar objetivo actual (ej: 1200€)
3. Bloquear período (pasar a Validación)
4. Verificar en DB: snapshot_contribution_goal = 1200
```

#### 3. Cambiar objetivo global (no afecta bloqueados)
```
1. Ir a Configuración → Hogar
2. Cambiar objetivo a 1100€
3. Verificar que período bloqueado muestra 1200€ (snapshot)
4. Verificar que período nuevo en preparing muestra 1100€ (actual)
```

#### 4. Eliminar período
```
1. Seleccionar período (NO activo)
2. Click en "Eliminar período seleccionado"
3. Ver advertencia clara con lista de elementos
4. Escribir confirmación YYYY-MM incorrecta → botón disabled
5. Escribir confirmación correcta → botón enabled
6. Confirmar eliminación
7. Verificar toast de éxito
8. Verificar período desaparecido de lista
```

#### 5. Validaciones de eliminación
```
1. Intentar eliminar período activo → Error: "No puedes eliminar el período activo"
2. Escribir confirmación incorrecta → Botón disabled
3. Cancelar diálogo → Nada se elimina
```

---

## 📊 SQL para Verificar Migración

### Verificar columna creada
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'monthly_periods'
  AND column_name = 'snapshot_contribution_goal';
```

**Resultado esperado:**
```
column_name                  | data_type | is_nullable
-----------------------------+-----------+-------------
snapshot_contribution_goal   | numeric   | YES
```

### Verificar períodos poblados
```sql
SELECT
  id,
  year,
  month,
  phase,
  snapshot_contribution_goal,
  contribution_disabled
FROM monthly_periods
ORDER BY year DESC, month DESC;
```

**Resultado esperado:**
- Períodos en `validation`, `active`, `closing`, `closed`: snapshot NOT NULL (valor actual)
- Períodos en `preparing`: snapshot NULL
- Períodos con `contribution_disabled = TRUE`: snapshot NULL

### Verificar household_settings
```sql
SELECT
  household_id,
  monthly_contribution_goal,
  calculation_type
FROM household_settings;
```

**Verificar que objetivo actual sea 1200** (restaurado por usuario).

---

## 🚀 Pasos de Despliegue

### DEV

1. ✅ Migración creada: `database/migrations/development/20250118_snapshot_contribution_goal.sql`
2. ⏳ **PENDIENTE**: Ejecutar `./scripts/apply_migrations_dev.sh`
3. ⏳ **PENDIENTE**: Verificar columna con SQL de arriba
4. ⏳ **PENDIENTE**: Testing manual (escenarios 1-5)
5. ⏳ **PENDIENTE**: Verificar logs del servidor DEV

### PROD

1. ⏳ Promover migración: `./scripts/promote_migration.sh`
2. ⏳ Mover de `development/` a `tested/`
3. ⏳ Build de producción (NO hacer ahora, solo cuando usuario apruebe)
4. ⏳ Aplicar migración en PROD
5. ⏳ Restart PROD
6. ⏳ Monitorear logs

---

## ⚠️ Advertencias y Limitaciones

### Datos Históricos No Recuperables

**Períodos bloqueados ANTES de esta migración tienen snapshot con valor aproximado:**

```
Ejemplo:
- Período Octubre 2024 bloqueado cuando goal era 1200€
- Usuario cambió goal a 1100€ en Enero 2025
- Migración pobla snapshot con 1100€ (valor actual, no 1200€ histórico)
```

**Solución manual** (si usuario recuerda valores):
```sql
-- Corregir snapshot de períodos históricos
UPDATE monthly_periods
SET snapshot_contribution_goal = 1200  -- Valor real histórico
WHERE household_id = 'tu_household_id'
  AND year = 2024
  AND month IN (10, 11, 12)
  AND phase != 'preparing';
```

### Validación de Eliminación

**No se puede eliminar:**
- Período en fase `active` (debe cerrarse primero)

**Sí se puede eliminar:**
- Períodos en `preparing` (recién creados)
- Períodos en `validation` (bloqueados pero no abiertos)
- Períodos en `closing` o `closed` (históricos)

**Recomendación**: Solo eliminar períodos futuros creados por error o períodos muy antiguos que no aportan valor.

---

## 📝 Checklist de Implementación

- [x] Crear migración SQL (`20250118_snapshot_contribution_goal.sql`)
- [x] Modificar `lockPeriod()` para guardar snapshot
- [x] Crear `deletePeriod()` con validación estricta
- [x] Modificar `lib/contributions/periods.ts` (calculateContributionsWithDirectExpenses)
- [x] Modificar `app/api/periods/checklist/route.ts`
- [x] Modificar `app/api/periods/contributions/route.ts`
- [x] Modificar `app/sickness/credito-deuda/actions.ts` (2 lugares)
- [x] Añadir UI de eliminar en `GlobalPeriodSelector.tsx`
- [x] Verificar TypeScript (no errores)
- [ ] **PENDIENTE**: Aplicar migración a DEV
- [ ] **PENDIENTE**: Testing en DEV (escenarios 1-5)
- [ ] **PENDIENTE**: Documentar cambios en CHANGELOG.md
- [ ] **PENDIENTE**: Promover migración a `tested/`
- [ ] **PENDIENTE**: Aplicar a PRODUCCIÓN

---

## 🔗 Archivos Modificados

### Nuevos
- `database/migrations/development/20250118_snapshot_contribution_goal.sql`

### Editados
1. `app/sickness/periodo/actions.ts` (+120 líneas)
   - `lockPeriod()`: guardar snapshot
   - `deletePeriod()`: nueva función

2. `lib/contributions/periods.ts` (+15 líneas)
   - `calculateContributionsWithDirectExpenses()`: usar snapshot

3. `app/api/periods/checklist/route.ts` (+15 líneas)
   - Query condicional para snapshot

4. `app/api/periods/contributions/route.ts` (+10 líneas)
   - JOIN con monthly_periods

5. `app/sickness/credito-deuda/actions.ts` (+20 líneas, 2 lugares)
   - Ambas funciones usan snapshot

6. `app/sickness/_components/GlobalPeriodSelector.tsx` (+80 líneas)
   - State para delete
   - Botón eliminar
   - AlertDialog de confirmación

### Documentación
- `docs/ANALISIS_OBJETIVO_CONTRIBUCION_HISTORICO.md` (análisis completo)
- `docs/IMPLEMENTACION_SNAPSHOT_OBJETIVO.md` (este archivo)

---

## 💬 Notas Finales

### Usuario debe:
1. ✅ Revisar este documento de implementación
2. ⏳ Decidir si aplicar migración ahora o después
3. ⏳ Probar funcionalidad en DEV antes de PROD
4. ⏳ Confirmar si desea corregir snapshots de períodos históricos manualmente

### Próximos pasos sugeridos:
1. Aplicar migración en DEV
2. Testing exhaustivo
3. Si OK → Promover a tested
4. Si OK en tested → Aplicar en PROD
5. Monitorear logs post-deploy

---

**Estado actual**: ✅ Código implementado y compilando sin errores
**Bloqueadores**: Ninguno, listo para aplicar migración
**Siguiente acción**: `./scripts/apply_migrations_dev.sh`
