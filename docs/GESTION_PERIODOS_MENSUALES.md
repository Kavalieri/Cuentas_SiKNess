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
│  'preparing'│  ← FASE 1: Validación de requisitos (Checklist)
│             │    - Verificar: Todos los miembros indicaron ingresos
│             │    - Verificar: Objetivo común configurado (en Gestión del Hogar)
│             │    - Verificar: Método de cálculo definido (en Gestión del Hogar)
│             │    - [NUEVO] Checkbox: "Ignorar sistema de contribuciones"
│             │    - Botón: "Bloquear para Validación" (sin cambios)
└──────┬──────┘
       │ Owner → "Bloquear para Validación"
       │ [Si normal: Bloquea ingresos/objetivo, avanza a 'validation']
       │ [Si ignorado: NO bloquea, todos saldados a 0€, avanza a 'validation']
       ▼
┌─────────────┐
│ 'validation'│  ← FASE 2: Validación de aportaciones
│             │    - Miembros realizan aportaciones (pagos comunes)
│             │    - Gastos directos cuentan como contribución implícita
│             │    - Owner valida que todos hayan aportado su parte
│             │    [Si ignorado: Todos ya saldados, pasa directamente]
└──────┬──────┘
       │ Owner → "Iniciar Período" (desbloquea operativa)
       ▼
┌─────────────┐
│   'active'  │  ← FASE 3: Operativa mensual
│             │    - Registro de gastos/ingresos comunes
│             │    - Registro de gastos directos
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

### FASE 1 ('preparing') - Validación Inicial - DETALLES

**Tarjeta de Validación (Checklist) - SIN CAMBIOS EN LA LÓGICA EXISTENTE**:

```
┌─────────────────────────────────────────────────────────────┐
│ ✅ Validación del Período: [mes/año]                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ � Checklist de Requisitos                                  │
│                                                              │
│ ✅ Todos los miembros han indicado sus ingresos            │
│    ├─ Oscar: 1,500€                                         │
│    └─ getrecek: 1,150€                                      │
│                                                              │
│ ✅ Objetivo común configurado: 1,200€/mes                   │
│    (Se configura en Menú → Gestión del Hogar)              │
│                                                              │
│ ✅ Método de cálculo definido: Proporcional a ingresos     │
│    (Se configura en Menú → Gestión del Hogar)              │
│                                                              │
│ ⚠️ [NUEVO] Opciones del Período                            │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ ☐ Ignorar sistema de contribuciones                   │  │
│ │                                                        │  │
│ │ Útil para meses pasados donde NO se hizo ingreso     │  │
│ │ común y todo se gestionó con gastos directos.        │  │
│ │                                                        │  │
│ │ ⚠️ Al activar:                                        │  │
│ │ • Se ignora la checklist de contribuciones           │  │
│ │ • Todos los miembros quedan SALDADOS a 0€           │  │
│ │ • Solo se registrarán gastos directos                │  │
│ │ • NO se bloquean ingresos ni objetivo                │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                              │
│ [Bloquear para Validación →]                                │
│ (Sin cambios - botón actual)                                │
└─────────────────────────────────────────────────────────────┘
```

**Comportamiento del botón "Bloquear para Validación"**:

**A) Flujo NORMAL (checkbox NO marcado)**:
1. ✅ Valida que todos los requisitos de checklist estén cumplidos
2. ✅ Bloquea ingresos personales de miembros para este período
3. ✅ Bloquea objetivo común del hogar para este período
4. ✅ Avanza a fase 'validation' (Fase 2)
5. ✅ Contribuciones ya están calculadas según método configurado

**B) Flujo CON "Ignorar contribuciones" (checkbox SÍ marcado)**:
1. ✅ Ignora validación de checklist (no se requieren ingresos/objetivo)
2. ✅ NO bloquea nada (no hay valores que bloquear)
3. ✅ Crea contribuciones con `expected_amount = 0€` para todos
4. ✅ Avanza a fase 'validation' (o directamente a 'active')
5. ✅ Todos aparecen como "Saldado (0€)"

**Campo de BD**:
- `monthly_periods.contribution_disabled = true` cuando checkbox marcado
- Este campo se lee al calcular balances para determinar si gastos directos afectan o no

**Casos de uso para "Ignorar contribuciones"**:
1. **Meses pasados**: Importar gastos de meses previos sin obligación retroactiva
2. **Primer mes**: Hogar nuevo que solo registra gastos sin sistema de aportación aún
3. **Meses excepcionales**: Situaciones donde no aplica el sistema normal de contribución

### Fases y Sus Características (CORREGIDO - Mantiene lógica existente)

| Fase | Crear Trans. | Editar Ingresos | Validar Checklist | Ignorar Contrib. | Descripción |
|------|--------------|-----------------|-------------------|------------------|-------------|
| `preparing` | ❌ No | ✅ Sí | ✅ Sí | ✅ Sí | Validación de requisitos (checklist) + opción ignorar |
| `validation` | ⚠️ Solo Owner | ❌ Bloqueados | ❌ Ya validado | ❌ No | Miembros aportan su parte |
| `active` | ✅ Sí | ❌ Bloqueados | ❌ No aplica | ❌ No | Operativa mensual |
| `closing` | ❌ No | ❌ Bloqueados | ❌ No aplica | ❌ No | Reconciliación automática |
| `closed` | ❌ No | ❌ Bloqueados | ❌ No aplica | ❌ No | Solo lectura |
| `reopened` | ✅ Sí | ⚠️ Limitado | ⚠️ Recalcular | ❌ No | Correcciones excepcionales |

**Notas importantes**:
- **Bloqueo de valores**: Al pasar de 'preparing' a 'validation', se bloquean ingresos personales y objetivo del hogar PARA ESE PERÍODO
- **Ignorar contribución**: Solo disponible en fase `'preparing'`, marcando checkbox ANTES de "Bloquear para Validación"
- **Checklist**: La tarjeta de validación verifica que los datos existen en Gestión del Hogar (NO los crea ni los edita)
- **Método y objetivo**: Se configuran en Menú → Gestión del Hogar, NO en la tarjeta del período

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

### 4. Lógica de "Bloquear para Validación" (Sin cambios en botón/lógica existente)

```typescript
// app/sickness/periodos/actions.ts

export async function blockPeriodForValidation(
  periodId: string,
  options?: {
    ignore_contributions?: boolean; // NUEVO: Checkbox "Ignorar contribuciones"
  }
): Promise<Result> {
  // 1. Obtener período
  const periodResult = await query<{ household_id: string; year: number; month: number }>(
    `SELECT household_id, year, month FROM monthly_periods WHERE id = $1`,
    [periodId]
  );

  if (!periodResult.rows[0]) {
    return fail('Período no encontrado');
  }

  const { household_id, year, month } = periodResult.rows[0];

  if (options?.ignore_contributions) {
    // FLUJO B: Ignorar sistema de contribuciones
    // NO se valida checklist, NO se bloquean valores

    // 1. Marcar período como contribution_disabled
    await query(
      `UPDATE monthly_periods
       SET contribution_disabled = true, phase = 'validation'
       WHERE id = $1`,
      [periodId]
    );

    // 2. Crear contribuciones con expected_amount = 0 para todos
    const members = await getHouseholdMembers(household_id);
    for (const member of members) {
      await query(
        `INSERT INTO contributions (
          household_id, profile_id, year, month,
          expected_amount, paid_amount, status
        )
        VALUES ($1, $2, $3, $4, 0, 0, 'completed')
        ON CONFLICT (household_id, profile_id, year, month)
        DO UPDATE SET expected_amount = 0, status = 'completed'`,
        [household_id, member.profile_id, year, month]
      );
    }

    return ok({ message: 'Período configurado sin sistema de contribuciones' });

  } else {
    // FLUJO A: Validación NORMAL (lógica existente, sin cambios)

    // 1. Validar checklist
    const validation = await validatePeriodRequirements(household_id, year, month);
    if (!validation.ok) {
      return fail('Checklist incompleta: ' + validation.message);
    }

    // 2. Bloquear ingresos personales para este período
    const members = await getHouseholdMembers(household_id);
    for (const member of members) {
      const income = await getCurrentIncome(household_id, member.profile_id);
      await query(
        `INSERT INTO member_incomes_snapshot (
          household_id, profile_id, period_id, year, month, income_amount
        )
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [household_id, member.profile_id, periodId, year, month, income]
      );
    }

    // 3. Bloquear objetivo común para este período
    const settings = await getHouseholdSettings(household_id);
    await query(
      `INSERT INTO household_goal_snapshot (
        household_id, period_id, year, month, goal_amount, calculation_type
      )
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [household_id, periodId, year, month, settings.monthly_contribution_goal, settings.calculation_type]
    );

    // 4. Calcular contribuciones según método configurado
    await calculateContributions(household_id, year, month);

    // 5. Avanzar a fase 'validation'
    await query(
      `UPDATE monthly_periods SET phase = 'validation' WHERE id = $1`,
      [periodId]
    );

    return ok({ message: 'Período bloqueado y listo para validación' });
  }
}

// Función de validación de checklist (sin cambios)
async function validatePeriodRequirements(
  householdId: string,
  year: number,
  month: number
): Promise<Result> {
  // Verificar que todos los miembros tienen ingresos indicados
  const membersWithoutIncome = await query(
    `SELECT COUNT(*) as count
     FROM household_members hm
     LEFT JOIN member_incomes mi ON mi.profile_id = hm.profile_id AND mi.household_id = hm.household_id
     WHERE hm.household_id = $1 AND mi.income_amount IS NULL`,
    [householdId]
  );

  if (membersWithoutIncome.rows[0].count > 0) {
    return fail('Todos los miembros deben indicar sus ingresos');
  }

  // Verificar que existe objetivo común configurado
  const settings = await getHouseholdSettings(householdId);
  if (!settings.monthly_contribution_goal || settings.monthly_contribution_goal <= 0) {
    return fail('Debe configurar el objetivo común en Gestión del Hogar');
  }

  // Verificar que existe método de cálculo definido
  if (!settings.calculation_type) {
    return fail('Debe definir el método de cálculo en Gestión del Hogar');
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

### Fase 4: UI de Validación - Fase 'preparing' 🔧
- [ ] **MANTENER** tarjeta actual de validación (checklist)
- [ ] **AÑADIR** checkbox "☐ Ignorar sistema de contribuciones"
- [ ] **AÑADIR** texto explicativo bajo checkbox (caso de uso meses pasados)
- [ ] **MANTENER** botón "Bloquear para Validación" (sin cambios)
- [ ] **MODIFICAR** lógica del botón para soportar opción ignorar:
  - Sin checkbox: Valida checklist → Bloquea valores → Calcula → Avanza
  - Con checkbox: Ignora checklist → NO bloquea → Contribuciones = 0€ → Avanza
- [ ] Validación: Solo owner puede acceder y bloquear

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
- [ ] ✅ Checkbox de "Ignorar contribuciones" funcional en fase `'preparing'`
- [ ] ✅ Botón "Bloquear para Validación" mantiene nombre y comportamiento base
- [ ] ✅ Flujo normal (sin checkbox): Valida checklist → Bloquea ingresos/objetivo → Calcula contribuciones
- [ ] ✅ Flujo ignorar (con checkbox): Salta validación → NO bloquea → Contribuciones = 0€
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
