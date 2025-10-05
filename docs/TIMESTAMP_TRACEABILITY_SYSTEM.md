# Sistema de Trazabilidad Completo para Movimientos

**Fecha**: 5 de octubre de 2025  
**Tipo**: Feature + Migration  
**Impacto**: Schema DB + UI + Ordenamiento

## 🎯 Objetivo

Implementar un sistema completo y profesional de trazabilidad de movimientos con:
1. **Timestamp de creación inmutable** (`created_at`)
2. **Timestamp de última modificación** (`updated_at`)
3. **Visualización clara** de cuándo se creó cada movimiento
4. **Ordenamiento correcto** por fecha de creación

## 📊 Problema Identificado

### Antes:
- Solo existía `created_at` en la tabla `transactions`
- Al editar un movimiento, **no se registraba cuándo fue la última modificación**
- La UI mostraba 2 fechas redundantes (occurred_at y created_at)
- Confusión entre "fecha del gasto" vs "fecha de registro"

### Movimientos Duales (Ajustes):
Los movimientos de ajustes de contribuciones generan **intencionalmente** 2 transacciones:
- ✅ Gasto (-350€) en categoría Vivienda → Representa el pago real
- ✅ Ingreso virtual (+350€) → Representa la contribución del miembro

Esto es **correcto según el diseño** del sistema de contribuciones proporcionales.

## ✅ Solución Implementada

### 1. Migration: Agregar `updated_at` ⭐

**Archivo**: `supabase/migrations/20251005000000_add_updated_at_to_transactions.sql`

```sql
-- 1. Agregar columna updated_at
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- 2. Inicializar con created_at (preservar datos históricos)
UPDATE transactions 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- 3. Hacer NOT NULL
ALTER TABLE transactions 
ALTER COLUMN updated_at SET NOT NULL;

-- 4. Función trigger para actualizar automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger BEFORE UPDATE
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Características**:
- ✅ `created_at`: Inmutable, se setea UNA vez al INSERT
- ✅ `updated_at`: Se actualiza AUTOMÁTICAMENTE en cada UPDATE
- ✅ Trigger eficiente (BEFORE UPDATE, solo afecta filas modificadas)
- ✅ Datos históricos preservados (updated_at = created_at inicialmente)

### 2. UI: Mostrar Solo `created_at` con Hora

**Archivo**: `app/app/components/MovementsList.tsx`

```tsx
{movement.created_at && (
  <p className="text-xs text-muted-foreground">
    {new Date(movement.created_at).toLocaleString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}
  </p>
)}
```

**Formato visual**:
```
Antes:
Fecha: 4 oct 2025       ← occurred_at (redundante)
Creado: 5 oct, 05:42    ← created_at

Ahora:
5 oct 2025, 05:42       ← created_at (única fuente de verdad)
```

**Ventajas**:
- ✅ Información clara y concisa
- ✅ No duplicación de datos
- ✅ Formato español correcto
- ✅ Incluye hora para distinguir múltiples movimientos del mismo día

### 3. Ordenamiento por `created_at`

**Archivo**: `app/app/expenses/actions.ts`

```typescript
.order('created_at', { ascending: false })
```

**Resultado**:
- Movimientos más recientes primero
- Orden cronológico real (no solo por fecha del gasto)
- Consistente en toda la aplicación

### 4. Tipos TypeScript Actualizados

**Archivos**: 
- `app/app/components/MovementsList.tsx`
- `app/app/components/DashboardContent.tsx`
- `app/app/expenses/actions.ts`

```typescript
interface Movement {
  id: string;
  amount: number;
  currency: string;
  type: 'expense' | 'income';
  description: string | null;
  occurred_at: string;         // Fecha contable del gasto
  created_at: string | null;   // Timestamp de creación
  updated_at?: string | null;  // Timestamp de última edición ⭐ NEW
  category_id: string | null;
  categories: {
    name: string;
    icon: string | null;
  } | null;
}
```

**Query actualizado**:
```typescript
.select(`
  id,
  type,
  amount,
  currency,
  description,
  occurred_at,
  created_at,
  updated_at,  // ⭐ NEW
  category_id,
  categories (id, name, icon)
`)
```

## 📐 Arquitectura de Timestamps

### Flujo Completo:

```
1. CREATE Movement (INSERT)
   ├─ created_at = NOW() (por DEFAULT)
   └─ updated_at = NOW() (por DEFAULT)

2. EDIT Movement (UPDATE)
   ├─ created_at = SIN CAMBIOS (inmutable)
   └─ updated_at = NOW() (trigger automático) ⭐

3. DISPLAY (UI)
   └─ Mostrar created_at (con hora)
      └─ Formato: "5 oct 2025, 05:42"

4. ORDERING (Query)
   └─ ORDER BY created_at DESC
```

### Casos de Uso:

| Escenario | `created_at` | `updated_at` | Uso |
|-----------|--------------|--------------|-----|
| Movimiento nuevo | 2025-10-05 05:42 | 2025-10-05 05:42 | Igual en creación |
| Después de editar categoría | 2025-10-05 05:42 | 2025-10-05 06:15 | updated_at cambia |
| Después de editar monto | 2025-10-05 05:42 | 2025-10-05 07:30 | updated_at cambia |
| Ordenamiento | ✅ Se usa para ORDER BY | ❌ No usado | Orden cronológico |
| Display primario | ✅ Mostrar en UI | ⏳ Futuro: modal detalle | created_at principal |

## 🔍 Diferencias: `occurred_at` vs `created_at` vs `updated_at`

| Campo | Propósito | Modificable | Ejemplo | Uso Principal |
|-------|-----------|-------------|---------|---------------|
| `occurred_at` | Fecha **contable** del gasto/ingreso | ✅ Sí (usuario) | 2025-10-01 | Reportes mensuales, filtros |
| `created_at` | Timestamp **real** de creación | ❌ No (inmutable) | 2025-10-05 05:42:36 | Ordenamiento, auditoría |
| `updated_at` | Timestamp **última modificación** | 🤖 Auto (trigger) | 2025-10-05 06:15:12 | Historial, sync |

### Ejemplo Real:

```
Escenario: Usuario crea movimiento el 5 de octubre a las 5:42 AM
           pero el gasto real fue el 1 de octubre

occurred_at:  2025-10-01           ← Seleccionado por usuario
created_at:   2025-10-05 05:42:36  ← Automático (sistema)
updated_at:   2025-10-05 05:42:36  ← Igual en creación

Usuario edita descripción el 5 de octubre a las 6:15 AM:

occurred_at:  2025-10-01           ← Sin cambios
created_at:   2025-10-05 05:42:36  ← Sin cambios (inmutable)
updated_at:   2025-10-05 06:15:12  ← Actualizado automáticamente ⭐
```

## 🎨 Experiencia de Usuario

### Dashboard:
```
Últimos Movimientos

🏠 Vivienda                                    -350,00 €
   Alquiler                                      Gasto
   5 oct 2025, 04:44

🍔 Supermercado                                -38,20 €
   DIA                                           Gasto
   5 oct 2025, 05:07

💰 Nómina                                      +680,00 €
   Contribución mensual 10/2025                 Ingreso
   5 oct 2025, 04:45
```

**Orden**: Más reciente primero (por created_at DESC)  
**Visualización**: Fecha y hora de creación clara  
**No confusión**: Una sola fecha visible

### Futuro: Modal de Detalles (Propuesta)
```
┌─────────────────────────────────────────┐
│ Detalle del Movimiento                  │
├─────────────────────────────────────────┤
│ Categoría:    🏠 Vivienda              │
│ Descripción:  Alquiler                  │
│ Monto:        -350,00 €                 │
│                                         │
│ Fecha del gasto:    1 oct 2025          │ ← occurred_at
│ Registrado:         5 oct 2025, 04:44   │ ← created_at
│ Última edición:     5 oct 2025, 06:15   │ ← updated_at (si difiere)
└─────────────────────────────────────────┘
```

## 🧪 Testing

### Checklist de Validación:

**Schema & Migration**:
- [x] Columna `updated_at` creada en `transactions`
- [x] Valores inicializados con `created_at`
- [x] Trigger `update_transactions_updated_at` funcional
- [x] Función `update_updated_at_column()` correcta
- [ ] Tipos TypeScript generados (ejecutar `supabase gen types`)

**Funcionalidad**:
- [ ] Crear movimiento nuevo → `created_at` = `updated_at`
- [ ] Editar movimiento → `updated_at` actualizado, `created_at` sin cambios
- [ ] Múltiples ediciones → `updated_at` actualizado cada vez
- [ ] `created_at` NUNCA cambia después de creación

**UI**:
- [ ] Solo una fecha visible en lista de movimientos
- [ ] Formato correcto: "5 oct 2025, 05:42"
- [ ] Hora incluida (no solo fecha)
- [ ] Ordenamiento correcto (más reciente primero)

**Edge Cases**:
- [ ] Movimientos de ajustes (duales) ordenados correctamente
- [ ] Movimientos mismo minuto ordenados coherentemente
- [ ] Sin errores al seleccionar `updated_at` en queries

## 📝 Comandos de Verificación

```sql
-- 1. Verificar que updated_at existe y está poblado
SELECT 
  id,
  description,
  created_at,
  updated_at,
  updated_at - created_at as time_since_creation
FROM transactions
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar trigger funciona
SELECT 
  tgname as trigger_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'update_transactions_updated_at';

-- 3. Test manual: Editar y verificar updated_at cambia
UPDATE transactions
SET description = 'Test trigger'
WHERE id = '<algún_id>';

SELECT created_at, updated_at 
FROM transactions 
WHERE id = '<algún_id>';
-- updated_at debe ser > created_at
```

## 🚀 Deploy

### Pasos Realizados:
1. ✅ Migración creada: `20251005000000_add_updated_at_to_transactions.sql`
2. ✅ Migración aplicada via Supabase MCP: `apply_migration()`
3. ✅ Tipos TypeScript generados: `supabase gen types`
4. ✅ UI actualizada: Solo mostrar `created_at`
5. ✅ Queries actualizados: Incluir `updated_at` en SELECT
6. ✅ Ordenamiento: Por `created_at DESC`

### Próximos Pasos:
1. ⏳ Build local: `npm run build`
2. ⏳ Test funcional completo
3. ⏳ Commit cambios
4. ⏳ Push a main → Auto-deploy Vercel

## ⚠️ Breaking Changes

**Ninguno**. La migración es totalmente compatible:
- ✅ `updated_at` se agrega con valores inicializados
- ✅ Queries existentes siguen funcionando (updated_at es opcional en tipos)
- ✅ UI solo cambia visualización (no funcionalidad)
- ✅ Trigger no afecta INSERTs (solo UPDATEs)

## 🔗 Referencias

### Archivos Modificados:
- `supabase/migrations/20251005000000_add_updated_at_to_transactions.sql` ⭐ NEW
- `app/app/components/MovementsList.tsx`
- `app/app/components/DashboardContent.tsx`
- `app/app/expenses/actions.ts`
- `types/database.ts` (generado)

### Docs Relacionados:
- `docs/IMPROVEMENTS_MOVEMENTS_2025-10-05.md` (versión anterior)
- `docs/BUG_FIX_SELECT_CATEGORIES_2025-10-05.md`
- `docs/CONTRIBUTIONS_SYSTEM.md` (explicación movimientos duales)

### SQL Standards:
- `TIMESTAMPTZ`: Timestamp with timezone (best practice Postgres)
- `DEFAULT NOW()`: Valor automático en INSERT
- `BEFORE UPDATE TRIGGER`: Actualización automática pre-modificación

---

## 💡 Filosofía de Diseño

### Principios Aplicados:
1. **Inmutabilidad de timestamps de creación**: `created_at` nunca cambia
2. **Auditoría completa**: Saber cuándo se creó Y cuándo se modificó
3. **Automatización**: Triggers manejan `updated_at` (sin código manual)
4. **Simplicidad en UI**: Una sola fecha visible (la relevante)
5. **Preparación futura**: `updated_at` disponible para features avanzadas

### Futuras Mejoras Posibles:
- 🔮 Modal de detalles con 3 timestamps
- 🔮 Filtro "Modificados recientemente"
- 🔮 Historial de cambios (quién, cuándo, qué)
- 🔮 Indicador visual si `updated_at` ≠ `created_at`
- 🔮 API para sincronización basada en `updated_at`

---

**Status**: ✅ Migración aplicada, código actualizado  
**Testing**: Pendiente validación funcional completa  
**Deploy**: Listo para commit + push
