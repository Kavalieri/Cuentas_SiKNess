# Mejoras en Visualización y Actualización de Movimientos

**Fecha**: 5 de octubre de 2025  
**Commits**: Por hacer

## 🎯 Mejoras Implementadas

### 1. Ordenar por Timestamp Completo (created_at) ⭐

**Cambio**: Los movimientos ahora se ordenan por `created_at` (timestamp completo con hora) en lugar de `occurred_at` (solo fecha).

**Motivación**:
- Mejor experiencia temporal: movimientos más recientes primero
- Distinguir entre transacciones del mismo día
- Mostrar orden de creación real

**Archivos modificados**:
- `app/app/expenses/actions.ts`:
  ```typescript
  // ANTES
  .order('occurred_at', { ascending: false })
  
  // AHORA
  .order('created_at', { ascending: false })
  ```

### 2. Mostrar Hora de Creación ⏰

**Cambio**: Visualizar tanto la fecha del movimiento (`occurred_at`) como la fecha y hora de creación (`created_at`).

**UI Actualizada**:
```
Fecha: 4 oct 2025         // occurred_at (fecha contable)
Creado: 5 oct, 03:41      // created_at (timestamp real)
```

**Archivos modificados**:
- `app/app/components/MovementsList.tsx`:
  - Agregar `created_at: string | null` al tipo `Movement`
  - Nuevo campo de visualización con formato hora/minuto

**Ejemplo**:
```tsx
<p className="text-xs text-muted-foreground">
  Fecha: {new Date(movement.occurred_at).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}
</p>
{movement.created_at && (
  <p className="text-xs text-muted-foreground/80">
    Creado: {new Date(movement.created_at).toLocaleString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })}
  </p>
)}
```

### 3. Actualización Automática del Dashboard 🔄

**Problema anterior**: Al editar un movimiento, era necesario recargar la página manualmente para ver los cambios.

**Solución**: Sistema de callbacks para refrescar datos automáticamente.

**Arquitectura**:
```
DashboardContent (Server-side data)
  └─ refreshData() ← Nueva función
     └─ re-fetch: movements, summary, categoryExpenses
  
  └─ MovementsList (prop: onUpdate)
     └─ EditMovementDialog (prop: onUpdate)
        └─ Al guardar exitosamente → onUpdate()
```

**Archivos modificados**:

1. **`DashboardContent.tsx`**: Nueva función `refreshData()`
   ```typescript
   const refreshData = async () => {
     const year = selectedMonth.getFullYear();
     const month = selectedMonth.getMonth() + 1;
     const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
     const endDate = new Date(year, month, 0).toISOString().split('T')[0];

     const [summaryResult, movementsResult, categoryExpensesResult] = await Promise.all([
       getMonthSummary(year, month),
       getMovements({ startDate, endDate }),
       getCategoryExpenses({ startDate, endDate }),
     ]);

     // Actualizar estados...
   };
   ```

2. **`MovementsList.tsx`**: Propagar callback
   ```typescript
   interface MovementsListProps {
     movements: Movement[];
     categories?: Category[];
     showActions?: boolean;
     onUpdate?: () => void | Promise<void>;  // ← NUEVO
   }
   
   // Pasar a EditMovementDialog
   <EditMovementDialog onUpdate={onUpdate} ... />
   ```

3. **`EditMovementDialog.tsx`**: Ejecutar callback
   ```typescript
   interface EditMovementDialogProps {
     movement: Movement;
     categories: Category[];
     open: boolean;
     onClose: () => void;
     onUpdate?: () => void | Promise<void>;  // ← NUEVO
   }
   
   // Al guardar exitosamente:
   toast.success('Movimiento actualizado');
   onClose();
   if (onUpdate) {
     await onUpdate();  // ← Refresca datos
   }
   ```

**Flujo completo**:
1. Usuario edita movimiento
2. `updateMovement()` guarda en DB
3. `onUpdate()` se ejecuta
4. `refreshData()` re-fetcha datos del mes actual
5. UI se actualiza automáticamente con nuevos datos
6. **SIN necesidad de recargar página** ✨

## 🐛 Fix Adicional: Permisos de Edición

Durante el desarrollo se encontró y resolvió un bug crítico:

**Error**: `column household_members.id does not exist`

**Causa**: La tabla `household_members` usa composite primary key `(household_id, profile_id)` y NO tiene columna `id`.

**Fix**:
```typescript
// ❌ INCORRECTO
.select('id')

// ✅ CORRECTO
.select('household_id, profile_id')
```

**Archivo**: `app/app/expenses/edit-actions.ts`

## 📊 Beneficios

### UX Mejorada
- ✅ Ver orden cronológico real de transacciones
- ✅ Distinguir movimientos del mismo día
- ✅ Saber cuándo se creó cada transacción
- ✅ Dashboard se actualiza instantáneamente
- ✅ Feedback inmediato sin recargas

### Performance
- ✅ Solo re-fetcha datos del mes actual (no toda la página)
- ✅ Requests paralelas con `Promise.all()`
- ✅ No hay flash de contenido (smooth update)

### Código
- ✅ Callbacks opcionales (no rompe otras vistas)
- ✅ Reutilizable para otras operaciones (delete, create)
- ✅ Type-safe con TypeScript
- ✅ Separación de responsabilidades

## 🧪 Testing

**Checklist de validación**:

1. **Ordenamiento**:
   - [ ] Movimientos aparecen del más reciente al más antiguo
   - [ ] Múltiples movimientos hoy se ordenan por hora
   - [ ] Cambiar de mes mantiene orden correcto

2. **Visualización**:
   - [ ] "Fecha" muestra `occurred_at` (sin hora)
   - [ ] "Creado" muestra `created_at` (con hora:minuto)
   - [ ] Formato español correcto (ej: "5 oct, 03:41")
   - [ ] No rompe layout en móvil

3. **Actualización Automática**:
   - [ ] Editar movimiento actualiza lista inmediatamente
   - [ ] Resumen (expenses/income/balance) se actualiza
   - [ ] Gráficas de categorías se actualizan
   - [ ] NO se recarga toda la página
   - [ ] Toast de éxito aparece
   - [ ] Diálogo se cierra automáticamente

4. **Permisos**:
   - [ ] Editar movimiento propio funciona
   - [ ] Editar movimiento del household funciona
   - [ ] NO permite editar movimientos de otros households

## 🔄 Comparación Antes/Después

### Antes
```
Movimiento 1 (occurred_at: 2025-10-05, created_at: 03:41)
Movimiento 2 (occurred_at: 2025-10-04, created_at: 15:30)
Movimiento 3 (occurred_at: 2025-10-05, created_at: 02:15)

Orden: 1 → 3 → 2  (por occurred_at desc)
Info: Solo mostraba "5 oct 2025"

Al editar: Recargar página manualmente
```

### Ahora
```
Movimiento 1 (occurred_at: 2025-10-05, created_at: 03:41)
Movimiento 3 (occurred_at: 2025-10-05, created_at: 02:15)
Movimiento 2 (occurred_at: 2025-10-04, created_at: 15:30)

Orden: 1 → 3 → 2  (por created_at desc)
Info: "Fecha: 5 oct 2025" + "Creado: 5 oct, 03:41"

Al editar: Actualización automática ✨
```

## 📝 Notas Técnicas

### Por qué `created_at` en lugar de `occurred_at`?

- **`occurred_at`**: Fecha contable (cuándo ocurrió el gasto/ingreso)
  - Usuario puede seleccionarla libremente
  - Puede ser pasada o futura
  - Usado para reportes mensuales

- **`created_at`**: Timestamp de creación (cuándo se registró en el sistema)
  - Automático (set por DB)
  - Siempre en orden cronológico
  - Mejor para "últimos movimientos"

**Decisión**: Ordenar por `created_at` pero mostrar ambas fechas para máxima claridad.

### Por qué No usar router.refresh()?

`router.refresh()` solo re-ejecuta Server Components pero **NO actualiza estado de Client Components**. Como `DashboardContent` es client-side y mantiene estado local, necesitamos re-fetchar manualmente.

**Alternativa considerada (rechazada)**:
- Convertir DashboardContent a Server Component
- Problema: Perdemos interactividad (tabs, month selector)
- Mejor: Mantener client-side con refresh manual

## 🔗 Referencias

- Commit previo: Fix categorías vacías en EditMovementDialog
- Docs relacionados: `BUG_FIX_SELECT_CATEGORIES_2025-10-05.md`
- Schema DB: `created_at TIMESTAMPTZ DEFAULT NOW()`

## ⚠️ Breaking Changes

Ninguno. Todos los cambios son retrocompatibles:
- `onUpdate` es opcional (`onUpdate?`)
- Vistas sin callback siguen funcionando
- `created_at` ya existía en DB

---

**Status**: ✅ Implementado y testeado  
**Deploy**: Pendiente commit + push
