# 🎯 Puntos de Decisión - Refactor Sistema Transacciones

**Fecha**: 5 de octubre de 2025  
**Documento principal**: `MAJOR_REFACTOR_TRANSACTIONS_SYSTEM.md`

---

## ⚡ Resumen Ejecutivo

He analizado el sistema actual usando Supabase MCP y diseñado una refactorización completa que soluciona todos los problemas identificados:

✅ **Ownership robusto**: Campo `paid_by` en lugar de texto en description  
✅ **Estados del ciclo de vida**: draft → pending → confirmed → locked  
✅ **Auditoría completa**: created_by, updated_by, locked_at, locked_by  
✅ **Sistema de cierre mensual**: Función DB que bloquea todo automáticamente  
✅ **Conexiones explícitas**: source_type + source_id bidireccional  
✅ **Nomenclatura unificada**: "transactions" en todos lados  

**Impacto estimado**: 
- 6 migraciones SQL
- 50+ archivos de código modificados
- 7-8 días de desarrollo full-time

**Ver diseño completo en**: `MAJOR_REFACTOR_TRANSACTIONS_SYSTEM.md` (7000+ palabras)

---

## 🔴 Decisiones Críticas (RESPONDE ANTES DE IMPLEMENTAR)

### 1️⃣ Split de Gastos Entre Miembros

**Contexto**: Un gasto de 100€, ¿cómo se divide?

**Opciones**:

**A) Siempre entre TODOS los miembros (SIMPLE)** ⭐ RECOMENDADO
```typescript
// Automático: 2 miembros → 50€ cada uno
// NO requiere UI adicional
// Suficiente para MVP
```

**B) Personalizable por transacción (COMPLEJO)**
```typescript
// Agregar columnas: split_type, split_data JSONB
// UI: Selector "Dividir entre: Todos | Solo algunos | Custom %"
// Ej: Gasto 100€ → 70% Ana, 30% Luis
// Fase 2 (meses después)
```

**❓ ¿Cuál prefieres?** → Responde: **A** o **B**

---

### 2️⃣ Cierre Mensual

**Contexto**: El día 1 de cada mes, ¿quién cierra el mes anterior?

**Opciones**:

**A) Manual (MÁS CONTROL)**
```typescript
// Owner clickea botón "Cerrar Octubre 2025"
// Permite revisar todo antes de bloquear
// Requiere acción humana cada mes
```

**B) Automático (MÁS AUTOMATIZADO)**
```typescript
// Cron job ejecuta cada día 1 automáticamente
// NO permite revisar antes
// Puede cerrar con errores sin detectar
```

**C) Híbrido** ⭐ RECOMENDADO
```typescript
// Opción en settings: "Cierre automático: ON/OFF"
// Si ON → cierra automáticamente día 1
// Si OFF → requiere botón manual
// Mejor de ambos mundos
```

**❓ ¿Cuál prefieres?** → Responde: **A**, **B** o **C**

---

### 3️⃣ Transacciones Bloqueadas (Locked)

**Contexto**: Una vez cerrado el mes, ¿se puede editar una transacción?

**Opciones**:

**A) 100% Read-Only (ESTRICTO)** ⭐ RECOMENDADO
```typescript
// Una vez locked → NUNCA editable
// Correcciones = nueva transacción "Corrección de Oct: +50€"
// Auditoría limpia
// Estándar contable profesional
```

**B) Reapertura Permitida (FLEXIBLE)**
```typescript
// Owner puede "Reabrir Octubre 2025"
// Desbloquea TODAS las transacciones del mes
// Registra en auditoría: "Reabierto por Ana el 5 nov"
// Permite corregir errores
// Auditoría más compleja
```

**❓ ¿Cuál prefieres?** → Responde: **A** o **B**

---

### 4️⃣ Ingresos Adicionales al Objetivo

**Contexto**: Meta 2000€, miembro aporta 2500€. Los 500€ extra...

**Opciones**:

**A) Solo campo calculado (SIMPLE)** ⭐ RECOMENDADO
```typescript
// contributions.overpayment_amount = paid - expected
// Visible en estadísticas
// NO se acumula para meses futuros
// Suficiente para MVP
```

**B) Sistema de créditos/débitos (COMPLEJO)**
```typescript
// Nueva tabla: member_balances
// Acumula excedentes mes a mes
// "Ana tiene +500€ de crédito, puede aportar menos en Nov"
// Requiere lógica compensación
// Fase 2 (meses después)
```

**❓ ¿Cuál prefieres?** → Responde: **A** o **B**

---

### 5️⃣ Permisos de Edición

**Contexto**: Household con Ana (owner) y Luis (member).

**Pregunta crítica**: ¿Qué puede editar Luis?

**Opciones**:

**A) Solo sus transacciones** ⭐ RECOMENDADO
```typescript
// Luis puede:
//   ✅ Editar transacciones donde paid_by = Luis
//   ✅ Editar ajustes que él creó (created_by = Luis)
//   ❌ NO editar transacciones de Ana
//   ❌ NO editar ajustes creados por Ana

// Ana (owner) puede:
//   ✅ Editar TODO (transacciones + ajustes de todos)
```

**B) TODO en el household**
```typescript
// Luis puede:
//   ✅ Editar CUALQUIER transacción del household
//   ✅ Editar CUALQUIER ajuste del household
//   ⚠️ Menos control, más caos

// Ana (owner) puede:
//   ✅ Editar TODO también
//   ⭐ Único beneficio: Cerrar meses
```

**❓ ¿Cuál prefieres?** → Responde: **A** o **B**

---

### 6️⃣ Ajustes: ¿Qué hacer al editar?

**Contexto**: Ajuste prepago 350€ → genera 2 movimientos (expense + income).  
Usuario edita ajuste a 300€. ¿Qué pasa con los movimientos?

**Opciones**:

**A) Actualizar movimientos existentes** ⭐ RECOMENDADO
```typescript
// UPDATE transactions SET amount = 300 WHERE source_id = ajuste_id
// Mantiene created_at original
// Trigger actualiza updated_at
// Historial auditoría registra cambio
```

**B) Eliminar y recrear movimientos**
```typescript
// DELETE transactions WHERE source_id = ajuste_id
// INSERT nuevos movimientos con amount = 300
// Pierde created_at original
// Más simple en lógica
```

**❓ ¿Cuál prefieres?** → Responde: **A** o **B**

---

## 📊 Estado Actual (5 oct 2025)

**Datos existentes** (serán eliminados en wipe):
```
✅ 7 transactions
✅ 1 contribution_adjustment (prepago)
✅ 2 contributions (1 por miembro)
✅ 2 usuarios: caballeropomes@gmail.com + fumetas.sik@gmail.com
✅ 1 household: "Casa SiK"
✅ 13 categorías
```

**Wipe preservará**:
- ✅ auth.users (ambos usuarios)
- ✅ profiles (display_name, email)
- ✅ households (nombre, estructura)
- ✅ household_members (relaciones)
- ❌ transactions (se borrarán)
- ❌ contributions (se borrarán)
- ❌ adjustments (se borrarán)
- ❌ categories (se recrearán con seed)

---

## ✅ Próximos Pasos

### 1️⃣ Responde las 6 preguntas arriba

Formato simple:
```
1. A
2. C
3. A
4. A
5. A
6. A
```

### 2️⃣ Confirmo y empiezo implementación

**Orden**:
1. Crear 6 migraciones SQL
2. Aplicar con `mcp_supabase_apply_migration()` (sin CLI!)
3. Verificar con `mcp_supabase_list_tables()`
4. Generar tipos: `npx supabase gen types`
5. Renombrar movements → transactions (50+ archivos)
6. Actualizar Server Actions
7. Actualizar UI (selector paid_by, badges, tabs dashboard)
8. Testing completo
9. Wipe datos + seed nuevos
10. Commit masivo + deploy

**Tiempo estimado**: 7-8 días full-time

---

## 🎯 Contexto Adicional

**Por qué es necesario**:
- Problema escalabilidad: email en description
- Problema auditoría: falta tracking completo
- Problema integridad: ajustes sin conexión clara
- Problema UX: estados no claros, permisos ambiguos
- Problema nomenclatura: movements vs transactions confuso

**Beneficios tras refactor**:
- ✅ Queries eficientes: `WHERE paid_by = X`
- ✅ Estadísticas precisas por miembro
- ✅ Auditoría completa (quién, qué, cuándo)
- ✅ Cierre mensual automático/manual
- ✅ Integridad referencial fuerte
- ✅ Código mantenible y escalable
- ✅ UX profesional con estados claros

---

**Documento creado**: 5 de octubre de 2025, 04:40 UTC  
**Última actualización**: 5 de octubre de 2025, 04:40 UTC  
**Estado**: ⏳ Esperando respuestas del usuario
