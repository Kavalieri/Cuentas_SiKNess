# Plan de Trabajo - Issues #12-#16

**Fecha**: 1 Noviembre 2025
**Estado**: 🚀 **LISTO PARA EJECUTAR**
**Documentación actualizada**: ✅ COMPLETA

---

## 📊 Resumen de Issues Abiertos

| # | Título | Prioridad | Complejidad | Tiempo | Estado |
|---|--------|-----------|-------------|--------|--------|
| **#13** | Tarjetas "últimos movimientos" en /balance | 🔴 CRÍTICO | 🟡 Media | 4-6h | 📋 TODO |
| **#12** | Formularios de edición movimientos | 🔴 CRÍTICO | 🟡 Media | 3-4h | 📋 TODO |
| **#14** | Validación de formularios transacciones | 🔴 CRÍTICO | 🟢 Baja | 1-2h | 📋 TODO |
| **#16** | Migración al nuevo sistema de categorías | 🟡 IMPORTANTE | 🔴 Alta | 6-8h | 📋 TODO |
| **#15** | Formulario nuevo movimiento Balance | 🟡 IMPORTANTE | 🟢 Baja | 1-2h | 📋 TODO |
| **#11** | Migración gradual database.ts → database.generated.ts | 🟢 BAJA | Variable | Continuo | ⏸️ ONGOING |

**Total estimado Fase Crítica (13-14-12)**: 8-12 horas
**Total estimado Fase Completa (13-16)**: 15-22 horas

---

## 🎯 Estrategia de Ejecución

### Fase 1: 🔴 CRÍTICO - Arreglar lo Roto (8-12h)

**Objetivo**: Resolver problemas que impactan UX móvil y funcionalidad básica

#### Issue #13: Tarjetas móvil rotas ⭐ PRIMERO
- **Por qué primero**: "Una de nuestras prioridades de diseño" (palabras textuales)
- **Problema**: Diseño roto en smartphone vertical (caso de uso #1)
- **Tareas**:
  1. Analizar componentes de tarjeta actuales
  2. Identificar breakpoints problemáticos
  3. Diseñar vista resumida vs expandible
  4. Implementar diseño responsive con Tailwind
  5. Migrar a nuevo árbol de categorías
  6. Testing en Chrome DevTools (móvil)
- **Entregable**: Tarjetas fluidas en móvil vertical con expand/collapse

#### Issue #12: Formularios de edición rotos
- **Por qué segundo**: Bug funcional + relacionado con #13 (categorías)
- **Problema**: No cargan categorías, no permiten cambiar pagador
- **Tareas**:
  1. Auditar formularios de edición (común + directo)
  2. Arreglar carga de grupo/categoría/subcategoría
  3. Añadir selector de pagador en gastos directos
  4. Validar con nuevo árbol de categorías
  5. Testing funcional completo
- **Entregable**: Formularios de edición 100% funcionales

#### Issue #14: Validación de inputs
- **Por qué tercero**: Rápido (1-2h) + complementa #12
- **Problema**: Campo cantidad acepta no-numéricos, teclado incorrecto
- **Tareas**:
  1. Añadir `type="number"` + `inputMode="decimal"` a campos cantidad
  2. Validación Zod para números positivos
  3. Pattern HTML5 para forzar formato
  4. Testing en móvil real
- **Entregable**: Inputs numéricos con teclado correcto en móvil

---

### Fase 2: 🟡 IMPORTANTE - Datos Limpios (6-8h)

#### Issue #16: Migración categorías
- **Por qué después**: Necesita formularios funcionando (#12) para validar
- **Problema**: Datos actuales usan sistema viejo de categorías
- **Tareas**:
  1. Analizar descripciones de transacciones existentes
  2. Crear script de migración de datos (NO migración SQL permanente)
  3. Mapeo descripción → subcategoría (reglas o NLP básico)
  4. Dry-run en DEV
  5. Aplicar a datos reales
  6. Validación manual de asignaciones
- **Entregable**: Todas las transacciones con nuevo sistema de categorías

---

### Fase 3: 🟡 IMPORTANTE - Mejoras UX (1-2h)

#### Issue #15: Encadenamiento formulario
- **Por qué último de fase activa**: Nice-to-have, no bloqueante
- **Problema**: Formulario no recuerda grupo/categoría/vivienda
- **Tareas**:
  1. Implementar localStorage para últimos valores
  2. Pre-poblar formulario con valores guardados
  3. UI para clear valores guardados
  4. Testing flujo completo
- **Entregable**: Formulario que recuerda últimas selecciones

---

### Ongoing: 🟢 BAJA - Refactoring Gradual

#### Issue #11: Migración types
- **Estrategia**: Touch-and-migrate (oportunista)
- **NO iniciar explícitamente**: Ocurre naturalmente al tocar archivos
- **Tracking**: `docs/MIGRATION_TYPES_PROGRESS.md` (crear cuando sea relevante)

---

## 📋 Orden de Ejecución Detallado

```
┌─────────────────────────────────────────────────────────────┐
│ FASE 1: CRÍTICO - Arreglar lo Roto (Prioridad Máxima)      │
├─────────────────────────────────────────────────────────────┤
│ 1️⃣ Issue #13: Tarjetas móvil (4-6h)                         │
│    ├─ Analizar componentes actuales                         │
│    ├─ Diseñar vista resumida/expandible                     │
│    ├─ Implementar responsive Tailwind                       │
│    ├─ Migrar a nuevo árbol categorías                       │
│    └─ Testing móvil Chrome DevTools                         │
│                                                              │
│ 2️⃣ Issue #12: Formularios edición (3-4h)                    │
│    ├─ Auditar EditCommonMovementButton                      │
│    ├─ Auditar EditDirectExpenseButton                       │
│    ├─ Arreglar carga categorías (grupo/cat/subcat)         │
│    ├─ Añadir selector pagador en directos                   │
│    └─ Testing funcional completo                            │
│                                                              │
│ 3️⃣ Issue #14: Validación inputs (1-2h)                      │
│    ├─ type="number" + inputMode="decimal"                   │
│    ├─ Validación Zod (positivos, decimales)                 │
│    ├─ Pattern HTML5                                         │
│    └─ Testing móvil                                         │
│                                                              │
│ ✅ MILESTONE: UX móvil fluida + Funcionalidad básica OK     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ FASE 2: IMPORTANTE - Datos Limpios                          │
├─────────────────────────────────────────────────────────────┤
│ 4️⃣ Issue #16: Migración categorías (6-8h)                   │
│    ├─ Analizar descripciones transacciones                  │
│    ├─ Crear script migración datos                          │
│    ├─ Mapeo descripción → subcategoría                      │
│    ├─ Dry-run DEV                                           │
│    ├─ Aplicar a datos reales                                │
│    └─ Validación manual                                     │
│                                                              │
│ ✅ MILESTONE: Datos históricos limpios                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ FASE 3: MEJORAS UX                                          │
├─────────────────────────────────────────────────────────────┤
│ 5️⃣ Issue #15: Encadenamiento formulario (1-2h)             │
│    ├─ localStorage últimos valores                          │
│    ├─ Pre-poblar formulario                                 │
│    ├─ UI clear valores                                      │
│    └─ Testing flujo                                         │
│                                                              │
│ ✅ MILESTONE: UX pulida, workflow fluido                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ONGOING: Refactoring Gradual                                │
├─────────────────────────────────────────────────────────────┤
│ 🔄 Issue #11: Migración types (continuo)                    │
│    └─ Touch-and-migrate cuando se toquen archivos           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Rationale de Priorización

### ¿Por qué Issue #13 PRIMERO?

1. **Impacto visual inmediato**: Usuario ve tarjetas rotas cada vez que entra
2. **Prioridad de diseño #1**: Smartphone vertical (palabras del issue)
3. **Bloqueo perceptual**: Rompe confianza en la app
4. **Quick win visual**: Gran mejora perceptible al arreglarlo

### ¿Por qué Issue #12 SEGUNDO?

1. **Funcionalidad CRUD básica**: Editar movimientos es operación fundamental
2. **Relacionado con #13**: Ambos usan nuevo árbol de categorías
3. **Prerequisito para #16**: Validar migración datos necesita formularios OK
4. **Bug bloqueante**: Imposible editar correctamente sin arreglo

### ¿Por qué Issue #14 TERCERO?

1. **Rápido (1-2h)**: Mantiene momentum después de #12-#13
2. **Complementario a #12**: Validación de forms que acabamos de arreglar
3. **UX móvil crítica**: Teclado numérico esencial en smartphone
4. **Bajo riesgo**: Cambios pequeños, alta recompensa

### ¿Por qué Issue #16 DESPUÉS?

1. **Dependencia funcional**: Necesita #12 (formularios OK) para validar
2. **Script sobre funcionalidad estable**: Datos limpios sobre base sólida
3. **Validación manual**: Requiere UI funcionando para verificar asignaciones

### ¿Por qué Issue #15 AL FINAL?

1. **Nice-to-have**: Mejora UX pero no bloqueante
2. **Polish final**: Después de arreglar lo crítico
3. **Trivial**: localStorage es implementación simple

### ¿Por qué Issue #11 EN BACKGROUND?

1. **Completamente documentado**: No requiere planificación adicional
2. **Sin deadline**: Ocurre naturalmente durante desarrollo
3. **Sin presión**: Oportunista, tomar o dejar

---

## 📊 Métricas de Éxito

### Fase 1 (Crítico)
- ✅ Tarjetas móvil fluidas sin ruptura visual
- ✅ Formularios edición cargan correctamente
- ✅ Inputs numéricos con teclado correcto en móvil
- ✅ Cero regresiones funcionales

### Fase 2 (Datos)
- ✅ 100% transacciones con nuevo sistema categorías
- ✅ Asignaciones validadas manualmente
- ✅ Script de migración documentado y reutilizable

### Fase 3 (UX)
- ✅ Formulario recuerda últimas selecciones
- ✅ Workflow de entrada rápida mejorado

---

## 🚀 Siguiente Acción

**INICIAR**: Issue #13 - Tarjetas "últimos movimientos" en /balance

**Archivos a revisar**:
- `/app/sickness/balance/page.tsx`
- `/app/sickness/balance/_components/` (si existe)
- Componentes de tarjeta de transacciones
- Nuevo árbol de categorías (tablas `category_groups`, `categories`, `subcategories`)

**Comando para empezar**:
```bash
# Buscar componentes de tarjeta
grep -r "últimos movimientos\|recent\|transaction.*card" app/sickness/balance --include="*.tsx"

# Ver estructura actual
ls -la app/sickness/balance/
```

---

**✅ DOCUMENTACIÓN ACTUALIZADA**
**✅ PLAN ESTABLECIDO**
**✅ LISTO PARA EJECUTAR**

**¿Procedemos con Issue #13?** 🚀
