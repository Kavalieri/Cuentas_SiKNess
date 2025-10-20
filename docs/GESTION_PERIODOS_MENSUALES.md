# Gestión de Períodos Mensuales - CuentasSiK

**Fecha**: 20 Octubre 2025
**Estado**: PROPUESTA - Pendiente de implementación

---

## 🎯 Objetivos

1. **Evitar creación masiva de períodos vacíos** (actualmente tenemos 25 períodos, solo 1 con datos)
2. **Crear períodos bajo demanda** cuando realmente se necesitan
3. **Permitir edición de períodos pasados** para correcciones/ajustes
4. **Gestionar apertura de períodos futuros** de forma controlada

---

## 📊 Situación Actual (Octubre 2025)

### Períodos Existentes

```sql
SELECT COUNT(*), MIN(year || '-' || month), MAX(year || '-' || month)
FROM monthly_periods
WHERE household_id = 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228';

-- Resultado: 25 períodos desde 2024-10 hasta 2026-08
```

### Períodos con Datos

```
Solo 2025-10 tiene 13 transacciones
Todos los demás están vacíos (phase='preparing', 0 transacciones, 0 contribuciones)
```

### Problemas Identificados

1. ✅ **Balance incorrecto**: Resuelto con commit 02e64ce (fix period.phase logic) + este commit
   - Problema: `getHouseholdBalancesOverview` no contaba gastos directos como contribución
   - Solución: Añadido cálculo de gastos directos con lógica `shouldCountDirectAsPaid` basada en `phase`

2. ⚠️ **Períodos fantasma**: 24 períodos sin datos ocupando espacio y confundiendo
   - No sabemos cuándo/cómo se crearon
   - No hay lógica clara de cuándo crear un período nuevo

3. ⚠️ **Sin edición de pasados**: No hay forma de reabrir períodos cerrados para correcciones

---

## 🏗️ Propuesta de Arquitectura

### Ciclo de Vida de un Período (ACTUALIZADO)

```
┌─────────────┐
│   INEXISTENTE│  ← No existe en BD (default)
└──────┬──────┘
       │ Usuario selecciona mes/año → Diálogo confirmación → Crear
       ▼
┌─────────────┐
│  'preparing'│  ← FASE 1: Configuración inicial
│             │    - Configurar ingresos de miembros
│             │    - Seleccionar método de cálculo (proporcional/igual/personalizado)
│             │    - [OPCIONAL] Anular sistema de contribución → Saldar a 0€
│             │    - [OPCIONAL] Solo gastos directos sin contribución obligatoria
└──────┬──────┘
       │ Owner → "Calcular Contribuciones" (avanza a Fase 2)
       │ [Si anulado: Contribuciones = 0€ para todos los miembros]
       ▼
┌─────────────┐
│ 'validation'│  ← FASE 2: Validación de aportaciones
│             │    - Miembros realizan aportaciones (pagos comunes)
│             │    - Gastos directos cuentan como contribución implícita
│             │    - Owner valida que todos hayan aportado su parte
└──────┬──────┘
       │ Owner → "Bloquear Período" (no más cambios de configuración)
       ▼
┌─────────────┐
│   'active'  │  ← FASE 3: Operativa mensual
│             │    - Registro de gastos/ingresos comunes
│             │    - Registro de gastos directos (cuentan automáticamente)
│             │    - Visualización de balances en tiempo real
└──────┬──────┘
       │ Owner → "Cerrar Período" (fin de mes, reconciliación)
       ▼
┌─────────────┐
│  'closing'  │  ← FASE 4: Reconciliación automática
│             │    - Cálculo de balances finales
│             │    - Registro en member_balances (histórico)
│             │    - Generación de créditos/deudas para próximo período
└──────┬──────┘
       │ Automático tras reconciliación exitosa
       ▼
┌─────────────┐
│   'closed'  │  ← FASE 5: Período cerrado (solo lectura)
│             │    - Datos inmutables (excepto reopening)
│             │    - Balance histórico consolidado
└──────┬──────┘
       │ Owner → "Reabrir para Correcciones" (casos excepcionales)
       ▼
┌─────────────┐
│  'reopened' │  ← FASE 6: Editable temporalmente
│             │    - Ajustes excepcionales
│             │    - Recalculo automático tras cambios
└──────┬──────┘
       │ Owner → "Recerrar"
       ▼
    'closed'
```

### FASE 1 ('preparing') - Configuración Inicial - DETALLES

**Tarjeta UI de Configuración**:

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Configuración del Período: [mes/año]                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 👥 Ingresos de Miembros                                     │
│ ├─ Oscar: 1,500€ [Editar]                                   │
│ └─ getrecek: 1,150€ [Editar]                                │
│                                                              │
│ 🧮 Método de Cálculo de Contribuciones                      │
│ ○ Proporcional a ingresos (recomendado)                    │
│ ○ Iguales para todos                                        │
│ ○ Personalizado                                             │
│                                                              │
│ ⚙️ Opciones Avanzadas                                       │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ ☑️ Anular sistema de contribución obligatoria         │  │
│ │                                                        │  │
│ │ ⚠️ Al activar esta opción:                            │  │
│ │ • NO se calcularán contribuciones esperadas           │  │
│ │ • Todos los miembros quedarán SALDADOS a 0€          │  │
│ │ • Solo se registrarán gastos directos                 │  │
│ │ • Útil para meses pasados sin cálculo de contribución│  │
│ │                                                        │  │
│ │ Caso de uso: Importar gastos de meses previos        │  │
│ │ sin obligación de contribución retroactiva            │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                              │
│ [Guardar Configuración]  [Calcular Contribuciones →]       │
└─────────────────────────────────────────────────────────────┘
```

**Comportamiento con "Anular contribución"**:
- ✅ Checkbox activo → `contribution_disabled = true` en `monthly_periods`
- ✅ Al calcular contribuciones:
  - Si `contribution_disabled = true` → Crear registros en `contributions` con `expected_amount = 0`
  - Todos los miembros aparecen como "Saldado (0€)"
- ✅ Gastos directos se registran normalmente, pero NO afectan balance de contribución
- ✅ Ideal para meses pasados con gastos pero sin obligación de contribución

**Casos de uso**:
1. **Importar datos históricos**: Meses pasados con gastos pero sin contribución calculada
2. **Meses de transición**: Primer mes del hogar, solo registro de gastos sin obligación
3. **Meses excepcionales**: Vacaciones, mudanzas, etc. donde no aplica contribución normal

### Fases y Sus Características (ACTUALIZADO)

| Fase | Crear Trans. | Editar Config. | Calcular Contrib. | Anular Contrib. | Descripción |
|------|--------------|----------------|-------------------|-----------------|-------------|
| `preparing` | ❌ No | ✅ Sí | ❌ No (pendiente) | ✅ Sí | Solo configuración inicial + opción anular |
| `validation` | ⚠️ Solo Owner | ⚠️ Solo ingresos | ✅ Sí (ya calculadas) | ❌ No | Miembros aportan su parte |
| `active` | ✅ Sí | ❌ No | ❌ No | ❌ No | Operativa mensual |
| `closing` | ❌ No | ❌ No | ❌ No | ❌ No | Reconciliación automática |
| `closed` | ❌ No | ❌ No | ❌ No | ❌ No | Solo lectura |
| `reopened` | ✅ Sí | ⚠️ Limitado | ⚠️ Recalcular | ⚠️ Limitado | Correcciones excepcionales |

**Notas importantes**:
- **Anular contribución**: Solo disponible en fase `'preparing'` antes de calcular
- **Gastos directos sin contribución**: Cuando `contribution_disabled = true`, gastos directos se registran pero NO afectan balance
- **Meses pasados**: Pueden crearse con contribución anulada para importar datos históricos sin obligación retroactiva

---

## 🎬 Estrategia de Creación (CONFIRMADA)

### Creación Bajo Demanda con Diálogo de Confirmación

**Cuándo crear**: Solo cuando el usuario selecciona un mes/año que no existe

**Flujo UX**:

```
Usuario selecciona mes/año en selector superior
        ↓
Sistema busca período correspondiente
        ↓
    ¿Existe?
    ↙     ↘
  SÍ       NO
  ↓        ↓
Cargar   Mostrar diálogo:
datos    "No existe período para [mes/año]"
         "¿Deseas crear un nuevo período?"
         [Crear Período] [Cancelar]
              ↓              ↓
         Crear período    Mantener
         fase 'preparing' mes actual
         + categorías base
              ↓
         Recargar UI
         con nuevo período
```

**Características clave**:
- ✅ **NO creación automática** en ninguna acción (transacciones, configuración, etc.)
- ✅ **NO botón dedicado** "Crear Período"
- ✅ **Diálogo de confirmación** obligatorio antes de crear
- ✅ **Creación retroactiva/futura** permitida (meses pasados o futuros)
- ✅ **Categorías base** incluidas automáticamente en nuevo período
- ✅ **Fase inicial**: Siempre `'preparing'` (Configuración Inicial)

**Ventajas**:
- ✅ Sin períodos fantasma
- ✅ Control total del usuario
- ✅ Creación explícita y consciente
- ✅ Flexibilidad para meses pasados/futuros

**Implementación en selector**:
- Evento `onChange` del selector mes/año
- Verificación async de existencia de período
- Diálogo modal con confirmación
- Recarga completa de datos tras confirmación

---

## 📝 Implementación Propuesta

### 1. Modificación de Schema

**Añadir columna `contribution_disabled` a `monthly_periods`:**

```sql
-- Migración: database/migrations/development/YYYYMMDD_HHMMSS_add_contribution_disabled.sql
ALTER TABLE monthly_periods
ADD COLUMN contribution_disabled BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN monthly_periods.contribution_disabled IS
'Si TRUE, no se calculan contribuciones obligatorias para este período. Útil para meses pasados sin obligación de aportación.';
```

### 2. Función de Creación con Confirmación

```typescript
// app/sickness/periodos/actions.ts

export async function checkPeriodExists(
  householdId: string,
  year: number,
  month: number
): Promise<Result<{ exists: boolean; period?: MonthlyPeriod }>> {
  const result = await query<MonthlyPeriod>(
    `SELECT * FROM monthly_periods
     WHERE household_id = $1 AND year = $2 AND month = $3`,
    [householdId, year, month]
  );

  return ok({
    exists: result.rows.length > 0,
    period: result.rows[0]
  });
}

export async function createPeriodWithCategories(
  householdId: string,
  year: number,
  month: number,
  options?: {
    contribution_disabled?: boolean;
  }
): Promise<Result<{ period_id: string }>> {
  // 1. Crear período en fase 'preparing'
  const periodResult = await query<{ id: string }>(
    `INSERT INTO monthly_periods (
      household_id, year, month, 
      status, phase, 
      opening_balance, closing_balance,
      contribution_disabled
    )
    VALUES ($1, $2, $3, 'open', 'preparing', 0, 0, $4)
    RETURNING id`,
    [householdId, year, month, options?.contribution_disabled || false]
  );

  const periodId = periodResult.rows[0].id;

  // 2. Copiar categorías base del hogar (si no existen)
  await query(
    `INSERT INTO categories (household_id, name, icon, type, created_by_profile_id)
     SELECT $1, name, icon, type, created_by_profile_id
     FROM categories
     WHERE household_id = $1
     ON CONFLICT DO NOTHING`,
    [householdId]
  );

  return ok({ period_id: periodId });
}
```

### 3. Componente de Selector con Diálogo

```typescript
// app/sickness/components/PeriodSelector.tsx

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { checkPeriodExists, createPeriodWithCategories } from '../periodos/actions';

export function PeriodSelector({ currentPeriod, onPeriodChange }) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<{ year: number; month: number } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleDateSelect = async (year: number, month: number) => {
    const result = await checkPeriodExists(householdId, year, month);

    if (!result.ok) {
      toast.error('Error al verificar período');
      return;
    }

    if (result.data.exists) {
      // Período existe, cargar datos
      onPeriodChange(result.data.period);
    } else {
      // Período NO existe, mostrar diálogo
      setSelectedDate({ year, month });
      setShowDialog(true);
    }
  };

  const handleCreatePeriod = async () => {
    if (!selectedDate) return;

    setIsCreating(true);
    const result = await createPeriodWithCategories(
      householdId,
      selectedDate.year,
      selectedDate.month
    );

    if (result.ok) {
      toast.success(`Período ${selectedDate.month}/${selectedDate.year} creado`);
      setShowDialog(false);
      // Recargar datos del nuevo período
      const newPeriod = await checkPeriodExists(householdId, selectedDate.year, selectedDate.month);
      if (newPeriod.ok && newPeriod.data.period) {
        onPeriodChange(newPeriod.data.period);
      }
    } else {
      toast.error(result.message);
    }

    setIsCreating(false);
  };

  return (
    <>
      {/* Selector de mes/año */}
      <select onChange={(e) => {
        const [year, month] = e.target.value.split('-').map(Number);
        handleDateSelect(year, month);
      }}>
        {/* Opciones de meses/años */}
      </select>

      {/* Diálogo de confirmación */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Período</DialogTitle>
          </DialogHeader>
          
          <p>
            No existe un período para <strong>{selectedDate?.month}/{selectedDate?.year}</strong>.
          </p>
          <p className="text-sm text-muted-foreground">
            ¿Deseas crear un nuevo período? Se creará en fase de configuración inicial
            con todas las categorías base del hogar.
          </p>

          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                setSelectedDate(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreatePeriod}
              disabled={isCreating}
            >
              {isCreating ? 'Creando...' : 'Crear Período'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### 4. Cálculo de Contribuciones con Anulación

```typescript
// lib/contributions/calculate.ts

export async function calculateContributions(
  householdId: string,
  year: number,
  month: number
): Promise<Result> {
  // 1. Verificar si el período tiene contribución anulada
  const periodResult = await query<{ contribution_disabled: boolean }>(
    `SELECT contribution_disabled FROM monthly_periods
     WHERE household_id = $1 AND year = $2 AND month = $3`,
    [householdId, year, month]
  );

  if (!periodResult.rows[0]) {
    return fail('Período no encontrado');
  }

  const contributionDisabled = periodResult.rows[0].contribution_disabled;

  // 2. Obtener configuración del hogar
  const settings = await getHouseholdSettings(householdId);
  const members = await getHouseholdMembers(householdId);

  // 3. Calcular contribuciones
  for (const member of members) {
    let expectedAmount = 0;

    if (!contributionDisabled) {
      // Cálculo normal según método configurado
      if (settings.calculation_type === 'proportional') {
        const memberIncome = await getMemberIncome(householdId, member.profile_id);
        const totalIncome = members.reduce((sum, m) => sum + m.income, 0);
        expectedAmount = (settings.monthly_contribution_goal * memberIncome) / totalIncome;
      } else if (settings.calculation_type === 'equal') {
        expectedAmount = settings.monthly_contribution_goal / members.length;
      }
      // ... otros métodos
    }
    // Si contributionDisabled = true, expectedAmount queda en 0

    // 4. Insertar/actualizar contribución
    await query(
      `INSERT INTO contributions (
        household_id, profile_id, year, month,
        expected_amount, paid_amount, status
      )
      VALUES ($1, $2, $3, $4, $5, 0, 'pending')
      ON CONFLICT (household_id, profile_id, year, month)
      DO UPDATE SET expected_amount = $5`,
      [householdId, member.profile_id, year, month, expectedAmount]
    );
  }

  return ok();
}
```

### 5. Mejora del Selector Superior

**Asegurar recarga completa tras selección:**

```typescript
// Añadir key para forzar re-render completo
<div key={`period-${currentPeriod.id}`}>
  {/* Contenido de la página */}
</div>

// O usar router.refresh() tras cambio de período
import { useRouter } from 'next/navigation';

const router = useRouter();

const handlePeriodChange = (newPeriod) => {
  setCurrentPeriod(newPeriod);
  router.refresh(); // Fuerza recarga de Server Components
};
```

---

## 🧹 Limpieza Inmediata

### Script de Limpieza de Períodos Vacíos

```sql
-- 1. Identificar períodos vacíos (excepto mes actual)
SELECT
  id,
  household_id,
  year || '-' || LPAD(month::text, 2, '0') as periodo,
  phase
FROM monthly_periods mp
WHERE NOT EXISTS (
  SELECT 1 FROM transactions t WHERE t.period_id = mp.id
)
AND NOT EXISTS (
  SELECT 1 FROM contributions c
  WHERE c.household_id = mp.household_id
    AND c.year = mp.year
    AND c.month = mp.month
)
AND (mp.year != EXTRACT(YEAR FROM CURRENT_DATE) OR mp.month != EXTRACT(MONTH FROM CURRENT_DATE))
ORDER BY mp.year, mp.month;

-- 2. Eliminar períodos vacíos confirmados
DELETE FROM monthly_periods
WHERE id IN (
  SELECT mp.id
  FROM monthly_periods mp
  WHERE NOT EXISTS (
    SELECT 1 FROM transactions t WHERE t.period_id = mp.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM contributions c
    WHERE c.household_id = mp.household_id
      AND c.year = mp.year
      AND c.month = mp.month
  )
  AND (mp.year != EXTRACT(YEAR FROM CURRENT_DATE) OR mp.month != EXTRACT(MONTH FROM CURRENT_DATE))
);
```

---

## 🎯 Plan de Implementación (ACTUALIZADO)

### Fase 1: Schema y Migración ✅
- [x] ~~Identificar períodos vacíos~~
- [x] ~~Eliminar períodos vacíos (24 de 25)~~
- [ ] **Migración**: Añadir columna `contribution_disabled` a `monthly_periods`
- [ ] **Migración**: Índices para optimizar queries de existencia de período

### Fase 2: Backend - Creación con Confirmación 🚧
- [ ] Implementar `checkPeriodExists()` en `app/sickness/periodos/actions.ts`
- [ ] Implementar `createPeriodWithCategories()` con copia de categorías base
- [ ] Modificar `calculateContributions()` para soportar contribución anulada
- [ ] Tests unitarios para creación de períodos con/sin contribución

### Fase 3: Frontend - Selector con Diálogo 🎨
- [ ] Crear componente `PeriodSelector` con diálogo de confirmación
- [ ] Integrar en `/app/sickness/credito-deuda/page.tsx`
- [ ] Asegurar recarga completa de UI tras cambio de período (key o router.refresh())
- [ ] Añadir indicadores visuales de fase del período en selector

### Fase 4: UI de Configuración - Fase 'preparing' 🔧
- [ ] Crear página `/app/sickness/periodos/[id]/configurar`
- [ ] Tarjeta de configuración de ingresos de miembros
- [ ] Selector de método de cálculo (proporcional/igual/personalizado)
- [ ] **Checkbox "Anular contribución obligatoria"** con explicación
- [ ] Botón "Calcular Contribuciones" → Avanza a fase 'validation'
- [ ] Validación: Solo owner puede acceder y configurar

### Fase 5: Testing y Documentación 📚
- [ ] Tests E2E del flujo completo:
  - Seleccionar mes sin período → Diálogo → Crear → Recargar
  - Configurar período con contribución normal
  - Configurar período con contribución anulada
  - Verificar balance con contribución anulada = 0€
- [ ] Actualizar AGENTS.md con nuevas reglas de períodos
- [ ] Documentación de usuario sobre anulación de contribución

### Fase 6: Casos de Uso Especiales 🔄
- [ ] Importación de datos históricos (meses pasados con contribución anulada)
- [ ] Migración de períodos existentes a nuevo sistema
- [ ] Herramientas de administración para corrección masiva

---

## 📋 Checklist de Validación

**Antes de considerar completa la implementación:**

- [ ] ✅ Período se crea SOLO con confirmación del usuario
- [ ] ✅ Diálogo muestra información clara del mes/año a crear
- [ ] ✅ Todos los períodos nuevos se crean en fase `'preparing'`
- [ ] ✅ Categorías base se copian automáticamente al crear período
- [ ] ✅ Selector recarga UI completamente tras crear período
- [ ] ✅ Checkbox de anulación de contribución funcional en fase `'preparing'`
- [ ] ✅ Contribuciones con `expected_amount = 0` cuando anuladas
- [ ] ✅ Balance muestra "Saldado (0€)" para todos con contribución anulada
- [ ] ✅ Gastos directos se registran normalmente incluso con contribución anulada
- [ ] ✅ NO se pueden anular contribuciones después de fase `'preparing'`
- [ ] ✅ Meses pasados pueden crearse con contribución anulada
- [ ] ✅ Tests cubren casos de uso normales + anulación

---

## 🔒 Reglas de Validación

### Al Crear Período

1. ✅ No puede haber 2 períodos para el mismo household/year/month
2. ✅ Solo períodos pasados pueden crearse en fase 'closed'
3. ✅ Período actual debe crearse en fase 'active'
4. ✅ Períodos futuros deben crearse en fase 'preparing'

### Al Reabrir Período

1. ⚠️ Solo períodos en fase 'closed' pueden reabrirse
2. ⚠️ Requiere confirmación del Owner
3. ⚠️ Se registra en audit log (quién, cuándo, por qué)
4. ⚠️ Recalcula balances tras cambios

### Al Eliminar Período

1. ❌ Solo períodos sin transacciones ni contribuciones
2. ❌ No se puede eliminar período actual
3. ❌ Requiere confirmación del Owner

---

## 📊 Métricas de Éxito

### Antes (Estado Actual)
- 25 períodos totales
- 1 período con datos (4%)
- 24 períodos vacíos (96%)
- Sin estrategia de creación

### Después (Objetivo)
- N períodos = meses con actividad real + 1 (próximo mes)
- ~100% períodos con datos
- Crecimiento orgánico según uso
- Creación automática bajo demanda

---

## 🚀 Próximos Pasos Inmediatos

1. **AHORA**: Ejecutar limpieza de períodos vacíos (excepto Oct 2025)
   ```bash
   psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev -f scripts/cleanup_empty_periods.sql
   ```

2. **HOY**: Implementar `ensureMonthlyPeriod()` helper

3. **MAÑANA**: Integrar helper en acciones de transacciones

4. **ESTA SEMANA**: Configurar cron job

5. **PRÓXIMA SEMANA**: UI de gestión de períodos

---

**Última actualización**: 20 Octubre 2025
**Estado del fix de balance**: ✅ Implementado (incluyendo gastos directos en getHouseholdBalancesOverview)
