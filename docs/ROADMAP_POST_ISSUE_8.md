# 🗺️ Roadmap Post Issue #8: Sistema de Types y Query Layer

**Fecha**: 1 Noviembre 2025
**Autor**: AI Assistant + Kavalieri
**Contexto**: Plan de acción tras completar Issue #8 (Auto-generación de types)

---

## 📊 Estado Actual (Baseline)

### ✅ Completado: Issue #8

**Sistema de auto-generación de types implementado:**
- ✅ Herramienta: `kysely-codegen`
- ✅ Archivo generado: `types/database.generated.ts` (1,013 líneas, 43 tablas)
- ✅ Scripts npm: `types:generate:dev` y `types:generate:prod`
- ✅ Generación ultra-rápida: ~50ms
- ✅ Types sincronizados con PostgreSQL (source of truth)

**Beneficios inmediatos:**
- Eliminación de mantenimiento manual de 1,951 líneas
- Sincronización perfecta database ↔ TypeScript
- Ahorro estimado: 2-3 horas/mes

---

## 🎯 Próximos Pasos: 3 Issues Creados

### Issue #10: Integrar auto-generación en workflow de migraciones 🔴 ALTA PRIORIDAD

**URL**: https://github.com/Kavalieri/Cuentas_SiKNess/issues/10

**Objetivo**: Hacer la regeneración de types **automática e invisible** tras cada migración.

**Problema actual:**
```bash
# Workflow actual (manual)
./scripts/apply_migration.sh dev 20251101_add_refunds.sql
# ✅ Migración aplicada
# ❌ Compilación TypeScript rota (types obsoletos)
# 😓 "Ah, olvidé regenerar types"
npm run types:generate:dev
# ✅ Compilación OK
```

**Solución:**
```bash
# Workflow mejorado (automático)
./scripts/apply_migration.sh dev 20251101_add_refunds.sql
# ✅ Migración aplicada
# ✨ Types regenerados automáticamente
# ✅ Compilación OK
# 🚀 Continuar desarrollando
```

**Implementación:**
1. Modificar `scripts/apply_migration.sh` (15 min)
2. Añadir tareas VS Code para regeneración manual (5 min)
3. Actualizar documentación en `database/README.md` (5 min)
4. Testing con migración de prueba (5 min)

**Esfuerzo**: 30 minutos
**Prioridad**: 🔴 ALTA (complementa Issue #8)
**Riesgo**: ✅ MUY BAJO

**Motivo para hacerlo:**
- ✅ Elimina pasos manuales propensos a olvidos
- ✅ Developer Experience mejorada (compilación siempre limpia)
- ✅ Commits atómicos (migración + types en un solo commit)
- ✅ Cero fricción en el workflow

---

### Issue #11: Migración gradual database.ts → database.generated.ts 🟢 BAJA PRIORIDAD

**URL**: https://github.com/Kavalieri/Cuentas_SiKNess/issues/11

**Objetivo**: Migrar gradualmente código de formato Supabase legacy → Kysely auto-generado.

**Problema actual:**

Tenemos **DOS sistemas de types coexistiendo:**

| Archivo | Formato | Líneas | Mantenimiento |
|---------|---------|--------|---------------|
| `types/database.ts` | Supabase (Row/Insert/Update) | 1,951 | ❌ Manual |
| `types/database.generated.ts` | Kysely (Interfaces) | 1,013 | ✅ Auto |

**Consecuencias:**
- ❌ Confusión: ¿Cuál usar?
- ❌ Drift: `database.ts` puede quedar obsoleto
- ❌ Overhead: Mantener 1,951 líneas sin beneficio

**Solución: Migración "Touch-and-Migrate"**

```
Regla: "Si tocas un archivo que usa database.ts, migrarlo a database.generated.ts"
```

**Ejemplo de migración:**

```typescript
// ❌ ANTES (database.ts - Supabase format)
import type { Database } from '@/types/database';
type Transaction = Database['public']['Tables']['transactions']['Row'];

// ✅ DESPUÉS (database.generated.ts - Kysely format)
import type { Transactions } from '@/types/database.generated';
```

**Estrategia:**
1. **NO hacer big-bang migration** (50+ archivos de golpe)
2. **SI hacer migración oportunista** (1-2 archivos por sesión)
3. **Tracking en** `docs/MIGRATION_TYPES_PROGRESS.md`
4. **Sin deadline artificial** (puede tomar semanas/meses)

**Esfuerzo estimado**:
- Preparación: 2 horas
- Migración de ~50 archivos: 20-30 horas (distribuidas en tiempo)
- Finalización: 1 hora

**Prioridad**: 🟢 BAJA (no urgente, no bloqueante)
**Riesgo**: ✅ MUY BAJO (incremental, testing constante)

**Motivos para hacerlo:**
- ✅ Eliminación de dual maintenance
- ✅ Source of truth único: PostgreSQL
- ✅ Formato más limpio y simple
- ✅ Compatible con Issue #9 (si adoptamos Kysely)

**Motivos para NO apresurarse:**
- ✅ Código actual funciona perfectamente
- ✅ No hay presión de tiempo
- ✅ Migración natural durante desarrollo

---

### Issue #9: Evaluar Kysely Query Builder (PoC) 🟡 MEDIA PRIORIDAD

**URL**: https://github.com/Kavalieri/Cuentas_SiKNess/issues/9

**Objetivo**: Evaluar Kysely query builder para mejorar DX sin comprometer arquitectura.

**Contexto:**

**Kysely NO es un ORM** (como Prisma), es un **query builder type-safe**:
- ✅ Mantiene SQL transparente (debugging fácil)
- ✅ Type safety en compile-time
- ✅ Compatible con funciones PostgreSQL custom
- ✅ Sin sistema de migraciones (usa el nuestro)
- ✅ Permite fallback a raw SQL cuando sea necesario

**Relacionado**: Issue #7 - Evaluación Prisma (Kysely propuesto como alternativa ligera)

**Proof of Concept (3 fases):**

#### Fase 1: Setup (1 día)
```bash
npm install kysely

# Crear lib/kysely.ts
import { Kysely, PostgresDialect } from 'kysely';
import { getPool } from './db';
import type { Database } from '@/types/database.generated'; // ✨ Usa types auto-generados

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool: getPool() })
});
```

#### Fase 2: Migrar 2-3 Queries Simples (2-3 días)

**Ejemplo de conversión:**

```typescript
// ANTES (SQL manual)
const result = await query<Transaction>(
  `SELECT * FROM transactions
   WHERE household_id = $1
   AND occurred_at BETWEEN $2 AND $3
   ORDER BY occurred_at DESC`,
  [householdId, startDate, endDate]
);

// DESPUÉS (Kysely - más legible y type-safe)
const transactions = await db
  .selectFrom('transactions')
  .where('household_id', '=', householdId)
  .where('occurred_at', '>=', startDate)
  .where('occurred_at', '<=', endDate)
  .selectAll()
  .orderBy('occurred_at', 'desc')
  .execute();
```

**Beneficios:**
- ✅ Autocomplete en IDE (household_id, occurred_at)
- ✅ Type safety (no typos en nombres de columnas)
- ✅ Refactoring seguro (renombrar columnas)
- ✅ Más legible que SQL strings

#### Fase 3: Evaluar Funciones Custom (1 día)

```typescript
// Funciones SECURITY DEFINER pueden seguir usando raw SQL
const result = await query(
  `SELECT ensure_monthly_period($1, $2, $3) as period_id`,
  [householdId, month, year]
);

// O integrar con Kysely si tiene sentido
const period = await db
  .selectFrom(sql`ensure_monthly_period(${householdId}, ${month}, ${year})`.as('period'))
  .executeTakeFirst();
```

**Criterios de Éxito:**

**PoC es exitoso si:**
- ✅ Code es más legible que SQL strings
- ✅ Type safety funciona correctamente
- ✅ Performance igual o mejor (benchmarks)
- ✅ Debugging sigue siendo transparente (SQL log)
- ✅ Compatible con funciones SECURITY DEFINER
- ✅ No introduce complejidad excesiva

**PoC falla si:**
- ❌ Performance es peor
- ❌ Debugging se vuelve opaco
- ❌ Funciones custom son difíciles de integrar
- ❌ Abstracción añade más problemas que soluciones

**Decisión Post-PoC:**

**Opción A: ADOPTAR Kysely** (si PoC exitoso)
- Migrar gradualmente queries CRUD simples (80% casos)
- Mantener raw SQL para funciones y queries complejas (20%)
- Documentar patrones y best practices

**Opción B: MANTENER Sistema Actual** (si PoC falla)
- Kysely no aporta valor suficiente
- SQL directo es más simple para equipo pequeño
- Enfocarse solo en auto-generación de types (Issue #8)

**Esfuerzo PoC**: 4-5 días
**Prioridad**: 🟡 MEDIA (evaluar después de Issue #10)
**Riesgo**: ✅ BAJO (solo PoC, fácil revertir)

**Motivos para hacerlo:**
- ✅ Mejora potencial de Developer Experience
- ✅ Type safety en queries (prevención de bugs)
- ✅ Autocomplete y refactoring mejorado
- ✅ Sin comprometer arquitectura actual

**Motivos para evaluar con calma:**
- ⚠️ SQL directo ya funciona bien
- ⚠️ Equipo pequeño (puede no justificar abstracción)
- ⚠️ Learning curve para nuevos desarrolladores
- ⚠️ Necesita PoC real para decidir (no teoría)

---

## 🗓️ Orden Recomendado de Ejecución

### Secuencia Lógica

```
1️⃣ Issue #10 (30 min) 🔴 HACER PRIMERO
   ↓
   Integrar auto-generación en migraciones
   ↓
2️⃣ Issue #9 (4-5 días) 🟡 HACER CUANDO QUIERAS EVALUAR KYSELY
   ↓
   PoC Kysely query builder
   ↓
   ┌─────────────┬─────────────┐
   │ PoC Exitoso │ PoC Fallido │
   └─────────────┴─────────────┘
         ↓               ↓
   Adoptar Kysely   Mantener SQL directo
         ↓               ↓
3️⃣ Issue #11 (semanas) 🟢 HACER GRADUALMENTE
   ↓
   Migración gradual de types
   ↓
   ✅ Sistema optimizado y consolidado
```

### Timeline Sugerido

**Semana 1:**
- ✅ Completar Issue #10 (30 min)
- ✅ Testing del workflow automático

**Semana 2-3 (Opcional - cuando decidas):**
- 🔄 Issue #9: PoC Kysely (4-5 días)
- 🔄 Decisión: adoptar o descartar

**Meses siguientes:**
- 🔄 Issue #11: Migración gradual de types (oportunista)
- 🔄 1-2 archivos por sesión de desarrollo
- 🔄 Sin presión de tiempo

---

## 📊 Comparativa de Prioridades

| Issue | Prioridad | Esfuerzo | Riesgo | Urgente | Bloqueante |
|-------|-----------|----------|--------|---------|------------|
| **#10** | 🔴 ALTA | 30 min | Muy Bajo | ✅ Sí | ⚠️ Bloquea DX óptima |
| **#9** | 🟡 MEDIA | 4-5 días | Bajo | ❌ No | ❌ No bloquea nada |
| **#11** | 🟢 BAJA | 20-30h (distribuidas) | Muy Bajo | ❌ No | ❌ No bloquea nada |

---

## 🎯 Beneficios Acumulados

### Tras Issue #10 (Integración en migraciones)
```
✅ Issue #8: Auto-generación de types (COMPLETADO)
✅ Issue #10: Integración automática (COMPLETADO)

Beneficio:
- Types siempre actualizados tras migraciones ✨
- Cero fricción en el workflow ✨
- Compilación siempre limpia ✨
```

### Tras Issue #9 (Si se adopta Kysely)
```
✅ Issue #8: Auto-generación de types
✅ Issue #10: Integración automática
✅ Issue #9: Kysely query builder (ADOPTADO)

Beneficio adicional:
- Type-safe queries con autocomplete ✨
- Refactoring seguro de columnas ✨
- Debugging transparente ✨
- SQL directo sigue disponible para casos complejos ✨
```

### Tras Issue #11 (Migración de types completa)
```
✅ Issue #8: Auto-generación de types
✅ Issue #10: Integración automática
✅ Issue #9: Kysely query builder (ADOPTADO o DESCARTADO)
✅ Issue #11: Migración gradual completa

Beneficio final:
- Source of truth único: PostgreSQL ✨
- Cero mantenimiento manual de types ✨
- Sistema consolidado y optimizado ✨
```

---

## 🚫 Lo Que NO Hacer

### ❌ Anti-patrones a Evitar

**1. Big-Bang Approach**
```bash
# NO hacer esto:
git checkout -b "refactor/all-kysely-at-once"
# [Migrar 50+ archivos]
# [Commit masivo]
# [PR gigante]
```
**Motivo**: Alto riesgo, difícil de revisar, bloquea desarrollo.

**2. Presión Artificial**
```
# NO crear deadlines artificiales:
"Tenemos que migrar todo a database.generated.ts esta semana"
"Tenemos que adoptar Kysely antes de [fecha]"
```
**Motivo**: No hay urgencia real, crear presión es contraproducente.

**3. Ignorar Resultados de PoC**
```
# NO adoptar Kysely si PoC falla:
- Performance peor → NO adoptar
- Debugging opaco → NO adoptar
- Complejidad excesiva → NO adoptar
```
**Motivo**: El objetivo es mejorar, no cambiar por cambiar.

---

## ✅ Filosofía de Este Roadmap

### Principios Guía

**1. Mejora Incremental**
> "Pequeños pasos constantes > grandes saltos arriesgados"

**2. Evaluación Basada en Evidencia**
> "Decisiones con PoC real, no con teoría"

**3. Sin Presión Artificial**
> "Funciona cuando convenga, no cuando 'debería'"

**4. Developer Experience Primero**
> "Si no mejora DX, no vale la pena"

**5. Arquitectura Sin Compromisos**
> "Optimizar sin romper lo que funciona"

---

## 🎓 Lecciones del Issue #8

### Lo Que Aprendimos

**✅ Éxitos:**
1. **kysely-codegen > @databases**: La herramienta correcta es crucial
2. **Pivot rápido**: 6 intentos fallidos → Cambiar de herramienta = éxito
3. **Documentación exhaustiva**: Permite retomar trabajo en cualquier momento
4. **ROI claro**: 2h implementación → Ahorro de 2-3h/mes

**❌ Errores evitados:**
1. No perseverar con herramienta rota (@databases)
2. No hacer big-bang migration
3. No crear deadlines artificiales

### Aplicar al Roadmap

**Para Issue #10:**
- ✅ Integración simple y no invasiva
- ✅ Testing exhaustivo antes de commit
- ✅ Documentación clara del workflow

**Para Issue #9:**
- ✅ PoC riguroso antes de decisión
- ✅ Benchmarks de performance
- ✅ Evaluación honesta (adoptar O descartar)

**Para Issue #11:**
- ✅ Migración gradual y oportunista
- ✅ Sin presión de tiempo
- ✅ Testing incremental

---

## 🎯 Objetivo Final

### Estado Deseado (3-6 meses)

```typescript
// 🎯 Source of truth único: PostgreSQL
// 🎯 Types auto-generados y sincronizados
// 🎯 Workflow de migraciones optimizado
// 🎯 Query layer (Kysely o SQL directo) según lo que funcione mejor

import type { Transactions, Categories } from '@/types/database.generated';

// Si se adopta Kysely:
const transactions = await db
  .selectFrom('transactions')
  .where('household_id', '=', householdId)
  .selectAll()
  .execute();

// Si se mantiene SQL directo:
const result = await query<Transactions>(
  `SELECT * FROM transactions WHERE household_id = $1`,
  [householdId]
);

// Ambos enfoques son válidos según contexto
```

**Beneficios finales:**
- ✅ Developer Experience optimizada
- ✅ Type safety end-to-end
- ✅ Mantenimiento mínimo
- ✅ Arquitectura sólida y flexible
- ✅ Decisiones basadas en evidencia

---

**📅 ÚLTIMA ACTUALIZACIÓN**: 1 Noviembre 2025
**📊 ESTADO**: Issue #8 completado, Issues #10, #9, #11 creados y priorizados
**🎯 SIGUIENTE PASO**: Completar Issue #10 (30 minutos)

---

**🎉 Excelente trabajo en Issue #8 - Sistema de types optimizado**
**🚀 Siguiente: Hacer el workflow perfecto con Issue #10**
