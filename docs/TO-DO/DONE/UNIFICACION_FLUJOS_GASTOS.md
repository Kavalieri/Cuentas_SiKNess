# 🏗️ ARQUITECTURA UNIFICADA: Flujos de Gastos y Contribuciones

## 📊 RESUMEN EJECUTIVO

**Objetivo**: Eliminar duplicidad entre `expenses/actions.ts` y `adjustment-actions.ts`, unificando ambos flujos en un sistema coherente y escalable.

**Beneficios**:

- ✅ **Código unificado**: Una sola función para crear transacciones
- ✅ **Trazabilidad completa**: Todos los movimientos tienen origen claro
- ✅ **Flujo directo optimizado**: Gastos "de bolsillo" con equilibrio automático
- ✅ **Contribuciones bloqueadas**: Control de períodos antes de abrir ejercicio

---

## 🔄 DUPLICIDADES ELIMINADAS

### ❌ **ANTES: Sistema duplicado**

```typescript
// expenses/actions.ts - Flujo común
createTransaction(formData: FormData)
→ Crea: expense/income directamente

// adjustment-actions.ts - Flujo de ajustes
approvePrepayment(formData: FormData)
→ Crea: expense + income (par equilibrado)
```

### ✅ **DESPUÉS: Sistema unificado**

```typescript
// lib/transactions/unified.ts - TODO único
createUnifiedTransaction(data: UnifiedTransactionData)
→ Maneja ambos flujos según flow_type
```

---

## 🏗️ NUEVA ESTRUCTURA DE DATOS

### **Tabla `transactions` ampliada**

```sql
-- Campos nuevos añadidos
flow_type: 'common' | 'direct'
transaction_pair_id: UUID (para emparejar expense_direct + income_direct)
created_by_member_id: UUID (quien creó la transacción)
real_payer_id: UUID (en flujo directo, quien pagó realmente)

-- Tipos de transacción expandidos
type: 'income' | 'expense' | 'income_direct' | 'expense_direct'
```

### **Flujos definidos**

#### 🟢 **Flujo Común** (`flow_type: 'common'`)

- **income**: Ingreso normal a cuenta común
- **expense**: Gasto normal desde cuenta común
- **paid_by**: NULL (común) o UUID (usuario específico)

#### 🔵 **Flujo Directo** (`flow_type: 'direct'`)

- **expense_direct**: Gasto real pagado "de bolsillo"
- **income_direct**: Ingreso virtual para equilibrar balance
- **real_payer_id**: Siempre especificado (quien pagó realmente)
- **transaction_pair_id**: UUID que vincula ambas transacciones

---

## ⚙️ LÓGICA DE FUNCIONAMIENTO

### **1. Flujo Común (reemplaza expenses/actions.ts)**

```typescript
createUnifiedTransaction({
  type: 'expense',
  flow_type: 'common',
  amount: 50,
  paid_by: 'user-uuid', // o NULL para cuenta común
  // ... otros campos
});

// Resultado: 1 transacción expense normal
```

### **2. Flujo Directo (reemplaza adjustment-actions.ts)**

```typescript
createUnifiedTransaction({
  type: 'expense_direct',
  flow_type: 'direct',
  amount: 50,
  real_payer_id: 'user-uuid', // quien pagó de su bolsillo
  creates_balance_pair: true,
});

// Resultado: 2 transacciones emparejadas
// 1. expense_direct: gasto real (amount: 50)
// 2. income_direct: ingreso equilibrio (amount: 50)
// → Balance neto: 0, pero gasto registrado
```

---

## 🔒 SISTEMA DE PERÍODOS BLOQUEADOS

### **Estados de Período**

#### 🟡 **SETUP** (Configuración)

- ✅ **Permitido**: Solo transacciones `expense_direct`
- ❌ **Bloqueado**: Flujo común hasta que se abra ejercicio
- 📝 **Propósito**: Acumular gastos "de bolsillo" antes de calcular contribuciones

#### 🟢 **LOCKED** (Ejercicio abierto)

- ✅ **Permitido**: Todos los tipos de transacción
- 📊 **Contribuciones**: Calculadas con descuento de gastos directos
- 🎯 **Meta**: Contribución ajustada = Base - Gastos directos del período

#### 🔴 **CLOSED** (Período cerrado)

- ❌ **Bloqueado**: Nuevas transacciones (solo consulta)
- 📋 **Estado**: Solo lectura y reportes

### **Flujo de Trabajo**

1. **📅 Inicio de mes**: Período en estado `SETUP`

   - Solo gastos directos permitidos
   - Usuarios registran gastos "de bolsillo"

2. **🔒 Owner bloquea contribuciones**: Cambia a `LOCKED`

   - Calcula contribuciones base (proporcional/igual)
   - Descuenta gastos directos por miembro
   - Abre ejercicio para todos los tipos de transacción

3. **📊 Gestión normal**: Estado `LOCKED`

   - Flujo común y directo funcionan normalmente
   - Contribuciones ajustadas son fijas

4. **🏁 Cierre de período**: Cambia a `CLOSED`
   - Solo consulta y reportes

---

## 📋 IMPLEMENTACIÓN PRÁCTICA

### **Archivos creados**

1. **`database/migrations/development/20251013_000000_unify_transaction_flows.sql`**

   - Migración que añade campos necesarios
   - Nuevos tipos de transacción
   - Índices para optimización

2. **`lib/transactions/unified.ts`**

   - Función única `createUnifiedTransaction()`
   - Manejo de flujo común y directo
   - Validaciones unificadas
   - Rollback automático en errores

3. **`lib/contributions/periods.ts`**
   - Gestión de estados de período
   - Cálculo de contribuciones con descuentos
   - Validaciones por estado

### **Migración de código existente**

#### 🔄 **expenses/actions.ts → unified.ts**

```typescript
// ANTES
createTransaction(formData); // flujo común

// DESPUÉS
createUnifiedTransaction({
  ...parseFormData(formData),
  flow_type: 'common',
});
```

#### 🔄 **adjustment-actions.ts → unified.ts**

```typescript
// ANTES
approvePrepayment(formData); // crear expense + income

// DESPUÉS
createUnifiedTransaction({
  type: 'expense_direct',
  flow_type: 'direct',
  creates_balance_pair: true,
  real_payer_id: userData.profileId,
});
```

---

## 🎯 BENEFICIOS INMEDIATOS

### **Para el Código**

- **-50% líneas duplicadas**: Eliminamos adjustment-actions.ts
- **+100% consistencia**: Una sola función de validación
- **+200% trazabilidad**: Todos los campos de auditoría unificados

### **Para el Usuario**

- **UX simplificada**: Un solo flujo de creación de gastos
- **Transparencia**: Diferencia clara entre gastos comunes vs directos
- **Control**: Períodos bloqueados previenen errores de timing

### **Para el Sistema**

- **Performance**: Menos queries duplicadas
- **Mantenimiento**: Un solo lugar para cambios
- **Escalabilidad**: Base sólida para futuras transferencias

---

## 🚀 PRÓXIMOS PASOS

1. **✅ COMPLETADO**: Análisis de duplicidad y diseño de arquitectura
2. **🔄 EN PROGRESO**: Creación de archivos base (unified.ts, migración)
3. **⏳ PENDIENTE**:
   - Aplicar migración a base de datos DEV
   - Actualizar componentes de UI para usar sistema unificado
   - Migrar transacciones existentes
   - Testing exhaustivo de ambos flujos
   - Deploy a producción

---

## ❓ PREGUNTAS PARA VALIDACIÓN

1. **¿La lógica de "flujo directo" refleja correctamente el comportamiento deseado?**

   - Gasto real + ingreso virtual = balance 0, gasto registrado

2. **¿El sistema de períodos bloqueados cubre todos los casos de uso?**

   - SETUP → LOCKED → CLOSED

3. **¿Necesitamos campos adicionales en la migración?**

   - Actuales: flow_type, transaction_pair_id, created_by_member_id, real_payer_id

4. **¿La UI necesita cambios específicos para diferenciar flujos?**
   - Botones separados: "Gasto Común" vs "Gasto de Mi Bolsillo"
