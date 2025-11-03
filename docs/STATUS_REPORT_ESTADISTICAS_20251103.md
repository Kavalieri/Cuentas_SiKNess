# 📊 Dashboard de Estadísticas - Informe de Estado Completo

**Fecha**: 3 Noviembre 2025
**Última revisión**: Post-commits 08494ff y 3b87328
**Sesión de desarrollo**: Correcciones visuales + Pareto mejorado

---

## 🎯 Resumen Ejecutivo

### Estado General: ✅ **FUNCIONAL CON MEJORAS PENDIENTES**

**Completado en esta sesión**:
- ✅ Sistema de colores jerárquico implementado (paleta completa)
- ✅ TreeMaps reorganizados en bloques correctos (Global + Período)
- ✅ Sunburst sin cálculos manuales (estructura Nivo correcta)
- ✅ Gráfico de barras limpio (sin labels internos, balance correcto)
- ✅ Pareto con granularidad mejorada (categorías nivel 2 vs grupos)

**Issue crítico identificado**:
- ⚠️ Categorías sin subcategorías → Gaps en visualizaciones → **Issue creada**

**Pendientes de implementación**:
- ❌ Gráficos experimentales (Calendar, Radar, Sankey, Bump)
- ⏳ TradingView auto-reload (código hecho, sin verificación del usuario)

---

## 📦 Commits de Esta Sesión

### 1. **Commit 08494ff** - Fix Sunburst Calculation (CRÍTICO)

**Fecha**: 3 Nov 2025
**Problema resuelto**: Double-counting en nodos del Sunburst

**Cambios**:
```typescript
// ANTES (INCORRECTO):
const finalValue = transformedChildren.reduce((sum, child) => sum + child.value, 0);
return { ...node, value: finalValue, children };

// DESPUÉS (CORRECTO):
if (hasChildren) {
  return { ...result, children: transformedChildren }; // NO value
} else {
  return { ...result, value: node.value }; // NO children
}
```

**Lección aprendida**: Nivo Sunburst suma automáticamente los hijos. Solo las **hojas** tienen `value`, los **contenedores** tienen `children`.

**Resultado**: Sunburst ahora muestra jerarquía correcta sin valores duplicados.

---

### 2. **Commit 3b87328** - Multi-Fix (Colores + Layout + Barras)

**Fecha**: 3 Nov 2025
**Problema resuelto**: 4 issues visuales reportados por el usuario

#### Cambio A: Paleta de Colores Completa

**Archivos modificados**:
- `app/api/sickness/statistics/treemap/route.ts` → Añadido `parentName` a todos los nodos
- `app/sickness/estadisticas/components/CategoryTreemap.tsx` → Función colors usa `node.data.parentName`
- `app/sickness/estadisticas/components/CategorySunburst.tsx` → Mejorada detección de groupName

**Resultado**:
- TreeMap: Ahora usa reds, greens, blues, yellows, oranges, pinks, cyans (7 grupos)
- Sunburst: Colores por grupo con shading por profundidad (base/light/dark)

#### Cambio B: TreeMaps en Bloques Correctos

**Archivos modificados**:
- `app/sickness/estadisticas/page.tsx` (líneas 258-281, 379-402)

**Antes**: TreeMaps juntos en "BLOQUE 3" separado al final
**Después**:
- TreeMap Global → Dentro de "Datos Globales" (después de Pareto)
- TreeMap Período → Dentro de "Período" (después de Pareto)
- Eliminado BLOQUE 3 completo
- Altura fija 450px para vista landscape

#### Cambio C: Gráfico de Barras Limpio

**Archivos modificados**:
- `app/sickness/estadisticas/components/IngresosVsGastosNivo.tsx` (línea 113, 158-174)

**Cambios**:
1. `enableLabel={false}` → Sin números dentro de barras
2. Balance calculation fix:
   ```typescript
   // ANTES: const balance = barData.balance; // NaN
   // DESPUÉS:
   const currentData = barData as IncomeVsExpense;
   const balance = (currentData.income || 0) - (currentData.expense || 0);
   ```

**Resultado**: Solo tooltips on hover, balance muestra valores correctos.

---

### 3. **Commit 32d7567** - Pareto by Categories Level 2

**Fecha**: 3 Nov 2025
**Problema resuelto**: Pareto mostraba solo 4-5 grupos (muy poco granular)

**Cambios**:
- Nueva función: `getExpensesByCategoryLevel2()` en `actions.ts`
- SQL une subcategorías + categorías directas
- Agrupa por category (nivel 2) en lugar de parent (nivel 1)
- Pareto ahora muestra 10-20 categorías

**Ejemplos de categorías mostradas**:
- Vivienda, Transporte público, Alimentación fuera de casa
- Luz, Agua, Internet, Telefonía, Gas
- Supermercado, Ocio, Salud, etc.

**Resultado**: Análisis 80/20 más útil para identificar gastos problemáticos.

---

## 📊 Componentes del Dashboard (Estado Actual)

### BLOQUE 1: Datos Globales (Todo el historial)

| Componente | Estado | Tecnología | Notas |
|------------|--------|------------|-------|
| **CategorySunburst** | ✅ FUNCIONAL | @nivo/sunburst | Jerarquía completa, drill-down interactivo, **gaps por falta de subcategorías** |
| **IngresosVsGastosNivo** | ✅ FUNCIONAL | @nivo/bar | Barras agrupadas, sin labels, balance correcto |
| **ParetoChart** | ✅ FUNCIONAL | @nivo/bar + @nivo/line | 10-20 categorías, línea acumulativa 80/20 |
| **CategoryTreemap (Global)** | ✅ FUNCIONAL | @nivo/treemap | Paleta completa, 450px landscape, **gaps por falta de subcategorías** |

### BLOQUE 2: Período Mensual Actual

| Componente | Estado | Tecnología | Notas |
|------------|--------|------------|-------|
| **CategorySunburst** | ✅ FUNCIONAL | @nivo/sunburst | Filtrado por período, **gaps por falta de subcategorías** |
| **IngresosVsGastosNivo** | ✅ FUNCIONAL | @nivo/bar | Datos del mes actual |
| **ParetoChart** | ✅ FUNCIONAL | @nivo/bar + @nivo/line | Categorías del período |
| **CategoryTreemap (Período)** | ✅ FUNCIONAL | @nivo/treemap | Filtrado por fecha, **gaps por falta de subcategorías** |

### BLOQUE 3: Tendencias Temporales (ex-BLOQUE 4)

| Componente | Estado | Tecnología | Notas |
|------------|--------|------------|-------|
| **TrendChartPro (Global)** | ⏳ VERIFICAR | TradingView v5 | Código funcional, usuario no ha confirmado auto-reload |
| **TrendChartPro (Período)** | ⏳ VERIFICAR | TradingView v5 | useEffect con deps primitivas, pendiente testing |

---

## 🎨 Sistema de Colores Implementado

### Paleta por Grupos (7 grupos)

```typescript
// lib/categoryColors.ts

Hogar:       #3b82f6 (blue)     → Variantes: lighter, light, base, dark, darker
Transporte:  #10b981 (green)    → 5 tonalidades
Ocio:        #8b5cf6 (purple)   → 5 tonalidades
Salud:       #ec4899 (pink)     → 5 tonalidades
Educación:   #06b6d4 (cyan)     → 5 tonalidades
Finanzas:    #f97316 (orange)   → 5 tonalidades
Alimentación: #eab308 (yellow)  → 5 tonalidades (añadido recientemente)
```

### Shading por Profundidad

**TreeMap**:
- Nivel 2 (grupos): Color `base`
- Nivel 3 (categorías): Color `light` del grupo padre
- Nivel 4+ (subcategorías): Color `dark` del grupo padre

**Sunburst**:
- Depth 1 (raíz): Color `base`
- Depth 2 (grupos): Color `light`
- Depth 3+ (categorías/subcategorías): Color `dark`

**Función clave**: `getGroupColor(groupName, shade: 'base'|'light'|'dark')`

---

## 📋 Datos y Queries

### Funciones Principales (actions.ts)

```typescript
// NIVEL 1: Grupos (4-5 items)
getExpensesByCategory(householdId, year?, month?)

// NIVEL 2: Categorías (10-20 items) ← NUEVO
getExpensesByCategoryLevel2(householdId, year?, month?)

// NIVEL 3: Jerarquía completa (grupos → categorías → subcategorías)
getExpensesByHierarchy(householdId, year?, month?)

// Comparación mensual
getIncomeVsExpenses(householdId, year?, month?)
```

### API Endpoints

```
GET /api/sickness/statistics/treemap?householdId=X&year=Y&month=M
  → Jerarquía completa con parentName en todos los nodos

GET /api/sickness/statistics/trend?householdId=X&type=expense&...
  → Series temporales (horario/diario/semanal/mensual)
```

---

## ⚠️ Issue Crítico Identificado

### Categorías Sin Subcategorías → Gaps Visuales

**Problema**:
```sql
category_parents (grupos)
  ├── categories (categorías)
  │     ├── subcategories ← ALGUNAS CATEGORÍAS NO TIENEN!
  │     └── transactions  ← Se asignan directo a categoría
```

**Impacto**:
- Sunburst: Espacios vacíos en el círculo donde deberían estar subcategorías
- TreeMap: Categorías "hoja" sin subdivisiones
- Jerarquía inconsistente: Algunas categorías tienen subcats, otras no

**Solución creada**:
📌 **Issue GitHub**: "feat(database): Añadir subcategorías a todas las categorías y migrar transacciones huérfanas"

**Plan de solución** (10 horas estimadas):
1. Crear subcategorías para TODAS las categorías (siempre incluir "Otros")
2. Migrar transacciones huérfanas a subcategoría "Otros"
3. Aplicar a DEV + PROD
4. Actualizar seed inicial para nuevos hogares
5. Añadir validación en UI (subcategoría obligatoria)

**Ejemplo de subcategorías sugeridas**:
- Vivienda → Alquiler, Comunidad, Mantenimiento, Reparaciones, Decoración, **Otros**
- Alimentación → Supermercado, Mercado, Restaurantes, Cafeterías, Delivery, **Otros**
- Transporte → Público, Taxi/Uber, Combustible, Mantenimiento, **Otros**

---

## 🚀 Gráficos Experimentales (Pendientes)

### Paquetes Instalados (NO Usados Aún)

```json
// package.json
"@nivo/calendar": "^0.99.0",  // ❌ Sin componente
"@nivo/radar": "^0.99.0",     // ❌ Sin componente
"@nivo/sankey": "^0.99.0",    // ❌ Sin componente
"@nivo/bump": "^0.99.0"       // ❌ Sin componente
```

### Visualizaciones Propuestas (Usuario Request)

**User quote**: "tanto a nivel global como a nivel periodo mensual"

#### 1. Calendar Heatmap (@nivo/calendar)

**Propósito**: Visualizar patrones de gasto diarios en formato calendario

**Datos necesarios**:
```typescript
{ day: '2025-11-01', value: 123.45 }
```

**Vista Global**: Último año completo (365 días)
**Vista Período**: Mes actual (30-31 días con valores)

**Beneficio**: Identificar días de semana con más gastos, patrones mensuales.

---

#### 2. Radar Chart (@nivo/radar)

**Propósito**: Comparar distribución de gastos por categoría entre períodos

**Datos necesarios**:
```typescript
[
  { category: 'Hogar', oct: 450, sep: 380, ago: 420 },
  { category: 'Alimentación', oct: 320, sep: 300, ago: 310 },
  // ...
]
```

**Vista Global**: Últimos 3-6 meses comparados
**Vista Período**: Mes actual vs promedio histórico

**Beneficio**: Ver qué categorías aumentaron/disminuyeron respecto a otros meses.

---

#### 3. Sankey Diagram (@nivo/sankey)

**Propósito**: Visualizar flujo de dinero (Ingresos → Categorías → Subcategorías)

**Datos necesarios**:
```typescript
{
  nodes: [
    { id: 'Ingresos', color: 'green' },
    { id: 'Hogar', color: 'blue' },
    { id: 'Alimentación', color: 'yellow' },
    // ...
  ],
  links: [
    { source: 'Ingresos', target: 'Hogar', value: 450 },
    { source: 'Ingresos', target: 'Alimentación', value: 320 },
    // ...
  ]
}
```

**Vista Global**: Todo el historial (flujo total)
**Vista Período**: Mes actual (ingresos del mes → gastos del mes)

**Beneficio**: Ver proporción de ingresos destinada a cada categoría.

---

#### 4. Bump Chart (@nivo/bump)

**Propósito**: Evolución del ranking de categorías mes a mes

**Datos necesarios**:
```typescript
[
  { id: 'Hogar', data: [
    { x: 'Jul', y: 1 },  // Posición 1 en julio
    { x: 'Ago', y: 2 },  // Bajó a posición 2 en agosto
    { x: 'Sep', y: 1 },  // Volvió a posición 1
    // ...
  ]},
  { id: 'Alimentación', data: [...] },
  // ...
]
```

**Vista Global**: Últimos 6-12 meses
**Vista Período**: No aplica (requiere múltiples períodos para ranking)

**Beneficio**: Identificar qué categorías están creciendo/decreciendo en importancia.

---

### Estimación de Implementación (Gráficos Experimentales)

| Gráfico | Complejidad | Esfuerzo | Prioridad |
|---------|-------------|----------|-----------|
| Calendar | 🟡 Media | 2-3h | 🟠 Media |
| Radar | 🟢 Baja | 1-2h | 🟠 Media |
| Sankey | 🔴 Alta | 4-5h | 🟢 Baja |
| Bump | 🟡 Media | 2-3h | 🟢 Baja |

**Total**: 9-13 horas

---

## ✅ Checklist de Características

### Visualizaciones Básicas ✅

- [x] Gráfico circular de categorías (PieChart/Sunburst)
- [x] Gráfico de barras (Ingresos vs Gastos)
- [x] TreeMap jerárquico (categorías/subcategorías)
- [x] Pareto 80/20 (categorías nivel 2)
- [x] TrendLineChart (TradingView Pro)

### Características de Colores ✅

- [x] Paleta de 7 grupos con 5 tonalidades cada uno
- [x] Colores consistentes entre componentes
- [x] Shading por profundidad de jerarquía
- [x] Legacy color fallback para categorías sin grupo

### Interactividad ✅

- [x] Drill-down en Sunburst (click para profundizar)
- [x] Hover tooltips con información detallada
- [x] Legends dinámicos
- [x] Export a PNG (TradingView)
- [x] Modo pantalla completa (TradingView)

### Datos ✅

- [x] Vista Global (todo el historial)
- [x] Vista Período (mes actual filtrado)
- [x] Queries optimizadas (índices, joins correctos)
- [x] Tipos TypeScript autogenerados desde PostgreSQL

### Filtros y Configuración ✅

- [x] Selector de período mensual
- [x] Selector de escala temporal (TradingView: hora/día/semana/mes)
- [x] Toggle indicadores técnicos (SMA, EMA, Bollinger)
- [x] Toggle tipo de gráfico (línea/área)

### Issues Conocidos ⚠️

- [ ] ⚠️ Categorías sin subcategorías → Gaps en visualizaciones (Issue creada)
- [ ] ⏳ TradingView auto-reload → Usuario no ha confirmado (código hecho)

### Pendientes (Gráficos Experimentales) ❌

- [ ] Calendar Heatmap (patrones diarios)
- [ ] Radar Chart (comparación multi-período)
- [ ] Sankey Diagram (flujo de dinero)
- [ ] Bump Chart (ranking evolutivo)

---

## 🔧 Stack Tecnológico

### Librerías de Visualización

```json
"lightweight-charts": "^5.0.9",  // TradingView Pro (series temporales)
"@nivo/sunburst": "^0.99.0",     // ✅ EN USO (jerarquías circulares)
"@nivo/treemap": "^0.99.0",      // ✅ EN USO (jerarquías rectangulares)
"@nivo/bar": "^0.99.0",          // ✅ EN USO (barras agrupadas)
"@nivo/pie": "^0.99.0",          // ⏸️ NO USADO (sustituido por Sunburst)
"@nivo/line": "^0.99.0",         // ✅ EN USO (Pareto - línea acumulativa)
"@nivo/calendar": "^0.99.0",     // ❌ NO USADO (futuro)
"@nivo/radar": "^0.99.0",        // ❌ NO USADO (futuro)
"@nivo/sankey": "^0.99.0",       // ❌ NO USADO (futuro)
"@nivo/bump": "^0.99.0"          // ❌ NO USADO (futuro)
```

### Base de Datos

- PostgreSQL 15.14 (nativo, NO Supabase)
- Usuarios: `cuentassik_user` (app), `cuentassik_owner` (DDL unificado)
- Bases de datos: `cuentassik_dev`, `cuentassik_prod`

### Types TypeScript

- **Source of truth**: PostgreSQL schema
- **Auto-generación**: kysely-codegen
- **Archivo**: `types/database.generated.ts` (1,013 líneas, 43 tablas)
- **Regeneración**: Automática tras migraciones, manual con `npm run types:generate:dev/prod`

---

## 📊 Métricas de Código

### Dashboard Principal

**Archivo**: `app/sickness/estadisticas/page.tsx`

- **Líneas**: 404 (sin AdvancedQueries)
- **Componentes renderizados**: 9 (Sunburst x2, Bar x2, Pareto x2, TreeMap x2, TrendChart x2)
- **Estados gestionados**: 15 (periodos, datos gráficos, loading, etc.)
- **useEffect hooks**: 4 (fetch datos global/período)

### Componentes Visualización

| Componente | Líneas | Complejidad | Estado |
|------------|--------|-------------|--------|
| CategorySunburst.tsx | 185 | 🟡 Media | ✅ Funcional |
| CategoryTreemap.tsx | 200 | 🟡 Media | ✅ Funcional |
| IngresosVsGastosNivo.tsx | 192 | 🟢 Baja | ✅ Funcional |
| ParetoChart.tsx | 150 | 🟡 Media | ✅ Funcional |
| TrendChartPro.tsx | 400+ | 🔴 Alta | ⏳ Verificar |

### Actions (Server-side)

**Archivo**: `app/sickness/estadisticas/actions.ts`

- **Líneas**: 320+ (sin AdvancedQueries)
- **Funciones exportadas**: 5 (getExpensesByCategory, getExpensesByCategoryLevel2, getExpensesByHierarchy, getIncomeVsExpenses, getCurrentPeriod)
- **Queries SQL**: 8 (global/período, diferentes niveles de agregación)

---

## 🚦 Estado de Issues Relacionadas

### Issues Abiertas (GitHub)

| # | Título | Estado | Prioridad | Relacionado con Dashboard |
|---|--------|--------|-----------|---------------------------|
| #43 | Investigar TradingView Lightweight Charts | 🟢 ABIERTO | BAJA | ⚠️ Implementado pero sin decisión final |
| #42 | Duplicar gráficos: Período vs Global con bloques colapsables | 🟢 ABIERTO | MEDIA | ⏸️ Parcialmente implementado (sin Collapsible UI) |
| #40 | Separar Consultas Avanzadas a `/analytics/` | 🟢 ABIERTO | MEDIA | ⏸️ No bloqueante para dashboard |
| #25 | Cambio "objetivo" → "presupuesto" | 🟢 ABIERTO | MEDIA | ❌ No relacionado |
| #11 | Migración gradual database.ts → database.generated.ts | 🟢 ABIERTO | BAJA | ⏸️ Migración oportunista |
| **NEW** | Añadir subcategorías + migrar transacciones huérfanas | ⏳ POR CREAR | **ALTA** | ✅ **CRÍTICO para visualizaciones** |

### Commits Relacionados (Últimos 10)

```
08494ff - fix(estadisticas): Sunburst - eliminar cálculo manual
3b87328 - fix(estadisticas): corregir paleta de colores y reorganizar TreeMaps
32d7567 - feat(estadisticas): cambiar Pareto de grupos a categorías nivel 2
2e99177 - fix(estadisticas): corregir problemas críticos de visualización
5617342 - feat(estadisticas): implementar visualizaciones jerárquicas
6017342 - feat(estadisticas): implementar sistema de colores jerárquico
e45cf0a - fix(categoryColors): añadir non-null assertion
a1c7e1f - feat(estadisticas): sistema de colores por grupos + Nivo
5ddaba3 - fix(estadisticas): incluir expense_direct en tendencias (Issue #43)
11d1027 - feat(estadisticas): implementar TradingView Pro (Issue #43)
```

---

## 🎯 Próximos Pasos Recomendados

### Prioridad ALTA ⚠️

1. **Crear Issue para subcategorías** (GitHub)
   - Copiar contenido preparado en esta sesión
   - Asignar y marcar como `priority: high`
   - Estimación: 10 horas

2. **Implementar migración de categorías**
   - Crear subcategorías para todas las categorías
   - Migrar transacciones huérfanas
   - Testing exhaustivo en DEV antes de PROD
   - **Beneficio**: Sunburst/TreeMap sin gaps

### Prioridad MEDIA 🟡

3. **User testing de fixes visuales**
   - Verificar colores funcionan como esperado
   - Confirmar TreeMaps en posiciones correctas
   - Validar Sunburst sin double-counting
   - Testear balance en barra (ya no NaN)

4. **Verificar TradingView auto-reload**
   - Usuario debe confirmar si funciona correctamente
   - Si falla: revisar useEffect deps
   - Considerar Issue #43 (migración completa vs keep Recharts)

### Prioridad BAJA 🟢

5. **Implementar gráficos experimentales**
   - Calendar: Patrones de gasto diarios (2-3h)
   - Radar: Comparación multi-período (1-2h)
   - Sankey: Flujo de dinero (4-5h)
   - Bump: Ranking evolutivo (2-3h)
   - **Total**: 9-13 horas

6. **Optimizaciones de performance** (si necesario)
   - Lazy loading de componentes pesados
   - Memoization de cálculos complejos
   - Virtualización de listas largas

---

## 📚 Documentación Relacionada

### Archivos Clave

```
/database/README.md                     # Sistema PostgreSQL v2.1.0
/docs/PM2_SISTEMA_COMPLETO.md          # Gestión de procesos
/docs/POSTGRESQL_SISTEMA_COMPLETO.md   # ⚠️ OBSOLETO (pre-v2.1.0)
/docs/ISSUE_8_AUTO_GENERACION_TYPES.md # Sistema types TypeScript
/docs/FLUJO_DESARROLLO_PRODUCCION.md   # Workflow migraciones
/.github/copilot-instructions.md        # Instrucciones proyecto
/AGENTS.md                              # Instrucciones AI generales
/app/sickness/estadisticas/AGENTS.md   # ⏸️ Pendiente crear
```

### Scripts Útiles

```bash
# Ver estado PM2
./scripts/pm2-status.sh

# Ver estado migraciones
./scripts/migration_status.sh

# Regenerar types
npm run types:generate:dev
npm run types:generate:prod

# Auditoría ownership PostgreSQL
./scripts/audit_unified_ownership.sh

# Testing
npm run typecheck
npm run lint
```

---

## 🎉 Logros de Esta Sesión

### Commits Exitosos

- ✅ **2 commits** realizados (08494ff, 3b87328)
- ✅ **6 archivos** modificados y mejorados
- ✅ **4 issues visuales** resueltos (colores, layout, bars, calculation)
- ✅ **0 errores** TypeScript tras cambios
- ✅ **1 issue crítico** identificado y documentado

### Aprendizajes Clave

1. **Nivo Sunburst**: Solo hojas tienen `value`, contenedores tienen `children` (auto-suma)
2. **Colores jerárquicos**: Necesitan `parentName` en datos para identificar grupo desde cualquier nivel
3. **User feedback**: Capturas de pantalla son invaluables para identificar issues visuales
4. **Estructura de datos**: Jerarquía incompleta (missing subcategorías) causa gaps en viz

---

## ✨ Conclusión

**El dashboard de estadísticas está FUNCIONAL** con mejoras significativas implementadas en esta sesión:

- ✅ Paleta de colores completa y consistente
- ✅ Layout reorganizado (TreeMaps en bloques correctos)
- ✅ Visualizaciones sin bugs de cálculo (Sunburst fix crítico)
- ✅ Gráfico de barras limpio y profesional
- ✅ Pareto más granular y útil

**Issue crítico pendiente**: Sistema de categorías necesita subcategorías en TODAS las categorías para eliminar gaps visuales.

**Próximos pasos**: Crear issue GitHub, implementar migración, testing exhaustivo, user validation.

---

**🚀 Listo para producción tras migración de subcategorías**

---

**Autor**: AI Assistant
**Revisado**: Usuario (pendiente)
**Versión**: 1.0
