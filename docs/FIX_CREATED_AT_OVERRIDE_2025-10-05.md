# Fix: created_at Sobrescrito en INSERT

**Fecha**: 5 de octubre de 2025  
**Problema**: Todos los movimientos mostraban `created_at = 5 oct 2025 05:XX` (fecha actual)  
**Causa**: INSERT explícito de `created_at` y `updated_at` sobrescribe DEFAULT de DB

## 🐛 Problema

### Síntomas
- Todos los movimientos mostraban la misma fecha/hora de creación
- `created_at` coincidía con el momento actual, no con la creación original
- Al editar un movimiento creado días atrás, `created_at` cambiaba a "ahora"

### Causa Raíz

En `app/app/contributions/adjustment-actions.ts`, los INSERT incluían explícitamente:

```typescript
const now = new Date().toISOString();

const expenseData: TransactionInsert = {
  household_id: '...',
  type: 'expense',
  amount: 100,
  currency: 'EUR',
  category_id: '...',
  description: 'Alquiler',
  occurred_at: '2025-10-01',
  created_at: now,  // ❌ INCORRECTO: Sobrescribe DEFAULT de DB
  updated_at: now,  // ❌ INCORRECTO: Sobrescribe DEFAULT de DB
};

await supabase.from('transactions').insert(expenseData);
```

**Problema**: Al incluir `created_at` y `updated_at` explícitamente en el INSERT, se sobrescribe el valor `DEFAULT NOW()` de la base de datos, usando la hora del servidor de aplicación en lugar del timestamp del servidor de DB.

**Consecuencia**: Todos los movimientos creados vía ajustes tenían `created_at` = momento de ejecución del código, no el timestamp real de inserción en DB.

## ✅ Solución

### Fix Aplicado

**Eliminar `created_at` y `updated_at` de los INSERT** para que la base de datos use sus valores DEFAULT:

```typescript
// ✅ CORRECTO
const expenseData = {
  household_id: '...',
  type: 'expense' as const,
  amount: 100,
  currency: 'EUR',
  category_id: '...',
  description: 'Alquiler',
  occurred_at: '2025-10-01',
  // created_at y updated_at se manejan automáticamente por DEFAULT NOW()
};

await supabase
  .from('transactions')
  .insert(expenseData as any) // Cast needed: tipos generados requieren updated_at
  .select('id')
  .single();
```

### Archivos Modificados

**`app/app/contributions/adjustment-actions.ts`**:
- Función `addContributionAdjustment()`: 2 INSERTs (expense + income)
- Función `addExtraIncome()`: 1 INSERT (income)
- Total: 3 lugares corregidos

### Por Qué `as any`?

Los tipos generados por Supabase (`types/database.ts`) marcan `updated_at` como **requerido** porque la columna es `NOT NULL`:

```typescript
// types/database.ts
export type TransactionInsert = {
  household_id: string;
  amount: number;
  // ...
  updated_at: string; // ← Required, no es opcional
}
```

Pero en realidad, `updated_at` tiene `DEFAULT NOW()` en la DB, por lo que **NO** debe incluirse en INSERT. El cast `as any` es temporal hasta que regeneremos los tipos con columnas DEFAULT marcadas como opcionales.

## 🔧 Solución Permanente (TODO)

### Opción 1: Usar `DEFAULT` en INSERT

Postgres permite usar la palabra clave `DEFAULT`:

```typescript
const expenseData = {
  household_id: '...',
  type: 'expense',
  // ...
  created_at: 'DEFAULT', // ← Postgres usará DEFAULT NOW()
  updated_at: 'DEFAULT',
};
```

Pero Supabase JS no soporta esto directamente.

### Opción 2: Mejorar Tipos Generados

Modificar los tipos en `types/database.ts` para marcar columnas con DEFAULT como opcionales:

```typescript
export type TransactionInsert = {
  household_id: string;
  amount: number;
  // ...
  created_at?: string; // ← Opcional porque tiene DEFAULT
  updated_at?: string; // ← Opcional porque tiene DEFAULT
}
```

Pero esto requiere modificar tipos auto-generados (se perderían en próximo gen).

### Opción 3: Type Utility (Implementada Temporalmente)

Crear un tipo helper:

```typescript
type OptionalTimestamps<T> = Omit<T, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
};

const data: OptionalTimestamps<TransactionInsert> = {
  // ...
};
```

## 📊 Comportamiento Correcto

### Ciclo de Vida de un Movimiento

```sql
-- 1. INSERT (primera vez)
INSERT INTO transactions (household_id, type, amount, occurred_at)
VALUES ('...', 'expense', 100, '2025-10-01');
-- ↓ Postgres ejecuta:
-- created_at = NOW()  (ej: 2025-10-01 15:30:45)
-- updated_at = NOW()  (ej: 2025-10-01 15:30:45)

-- 2. UPDATE (edición posterior)
UPDATE transactions 
SET amount = 150, description = 'Alquiler actualizado'
WHERE id = '...';
-- ↓ Trigger update_transactions_updated_at ejecuta:
-- updated_at = NOW()  (ej: 2025-10-03 10:20:15)
-- created_at NO CAMBIA (sigue siendo 2025-10-01 15:30:45)
```

### Valores Correctos

```typescript
{
  id: 'abc-123',
  household_id: '...',
  type: 'expense',
  amount: 100,
  occurred_at: '2025-10-01',        // Fecha contable (usuario elige)
  created_at: '2025-10-01T15:30:45Z', // Timestamp real de creación (inmutable)
  updated_at: '2025-10-03T10:20:15Z', // Timestamp última edición (mutable)
}
```

## 🧪 Testing

### Verificar Fix

1. **Crear nuevo ajuste**:
   ```
   - Ir a /app/contributions
   - Crear ajuste con categoría
   - Verificar movimientos creados
   ```

2. **Verificar timestamps**:
   ```sql
   SELECT 
     id,
     description,
     occurred_at,
     created_at,
     updated_at,
     updated_at - created_at as edit_delay
   FROM transactions
   ORDER BY created_at DESC
   LIMIT 10;
   ```

3. **Editar movimiento**:
   - Editar descripción o monto
   - `created_at` NO debe cambiar
   - `updated_at` debe actualizarse

### Resultado Esperado

```
Movimiento 1 (Supermercado):
  occurred_at: 2025-10-05
  created_at:  2025-10-05 05:42:36  ← Hora real de creación
  updated_at:  2025-10-05 05:42:36  ← Igual (sin ediciones)

Movimiento 2 (Alquiler - editado):
  occurred_at: 2025-10-01
  created_at:  2025-10-01 10:15:22  ← Hora original (NO cambia)
  updated_at:  2025-10-05 07:30:10  ← Hora de última edición
```

## 📝 Reglas de Oro

### INSERTs

❌ **NUNCA** incluir `created_at` o `updated_at` en INSERT:
```typescript
const data = {
  household_id: '...',
  amount: 100,
  created_at: new Date().toISOString(), // ❌ MAL
  updated_at: new Date().toISOString(), // ❌ MAL
};
```

✅ **SIEMPRE** dejar que la DB use DEFAULT:
```typescript
const data = {
  household_id: '...',
  amount: 100,
  // created_at y updated_at automáticos
};
```

### UPDATEs

❌ **NUNCA** incluir `created_at` en UPDATE:
```typescript
await supabase
  .from('transactions')
  .update({
    amount: 150,
    created_at: new Date().toISOString(), // ❌ MAL: Cambiaría timestamp original
  });
```

❌ **NUNCA** incluir `updated_at` en UPDATE (lo hace el trigger):
```typescript
await supabase
  .from('transactions')
  .update({
    amount: 150,
    updated_at: new Date().toISOString(), // ❌ REDUNDANTE: Trigger lo hace
  });
```

✅ **CORRECTO** - Solo campos de negocio:
```typescript
await supabase
  .from('transactions')
  .update({
    amount: 150,
    description: 'Actualizado',
    category_id: '...',
  });
// ↓ Trigger update_transactions_updated_at automáticamente:
// SET updated_at = NOW()
```

## 🔗 Referencias

- Migración: `supabase/migrations/20251005000000_add_updated_at_to_transactions.sql`
- Trigger: `update_transactions_updated_at` → `update_updated_at_column()`
- Docs: `TIMESTAMP_TRACEABILITY_SYSTEM.md`
- Tipos: `types/database.ts` (auto-generados)

## ⚠️ Breaking Changes

Ninguno. Este fix **corrige** el comportamiento para que coincida con el diseño original del sistema.

---

**Status**: ✅ Fixed  
**Deploy**: Pendiente commit + push
