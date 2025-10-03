# Dashboard - Estado Actual y Roadmap Consolidado

**Fecha Última Actualización**: 4 de Octubre, 2025  
**Documento Consolidado**: Resume toda la evolución y próximos pasos del Dashboard

---

## 📊 Estado Actual del Dashboard

### ✅ Funcionalidades Implementadas

#### 1. **Resumen Financiero** (3 Tarjetas)
- ✅ **Tarjeta de Ingresos** (verde)
  - Monto total de ingresos del mes
  - Contador de transacciones de ingreso
- ✅ **Tarjeta de Gastos** (roja)
  - Monto total de gastos del mes
  - Contador de transacciones de gasto
- ✅ **Tarjeta de Balance** (verde/rojo dinámico)
  - Muestra superávit (verde) o déficit (rojo)
  - Calcula: Ingresos - Gastos
  - Indica estado financiero del mes

#### 2. **Sistema de Tabs** (Filtrado de Movimientos)
- ✅ **Tab "Todos"**: Muestra todos los movimientos (gastos + ingresos)
- ✅ **Tab "Ingresos"**: Solo transacciones de ingreso
- ✅ **Tab "Gastos"**: Solo transacciones de gasto
- ✅ Filtrado instantáneo sin recarga de página

#### 3. **Lista de Movimientos**
- ✅ Componente reutilizable `MovementsList`
- ✅ Muestra: icono, categoría, nota, fecha, monto
- ✅ Badge de tipo (Ingreso/Gasto)
- ✅ Acciones inline: Editar (✏️) y Eliminar (🗑️)
- ✅ Confirmación antes de eliminar
- ✅ Toast notifications (sonner)
- ✅ Estado vacío con mensaje apropiado
- ✅ Diseño responsive (cards en móvil)

#### 4. **Selector de Mes**
- ✅ Componente `MonthSelector` integrado
- ✅ Navegar entre meses (anterior/siguiente)
- ✅ Selector de mes/año con calendario
- ✅ Recarga automática de datos al cambiar mes

#### 5. **Botón de Añadir Movimiento**
- ✅ Botón "+ Nuevo Movimiento" siempre visible
- ✅ Dialog modal `AddMovementDialog`
- ✅ Formulario con validación Zod
- ✅ Selección de categoría con iconos
- ✅ Tipo (Ingreso/Gasto)
- ✅ Fecha, monto, nota opcional

#### 6. **Navegación Simplificada**
- ✅ Menú principal: Dashboard | Hogar | Perfil | Admin
- ✅ ❌ **Eliminada** pestaña "Movimientos" redundante
- ✅ Todo accesible desde Dashboard

#### 7. **Balance en Header** (Topbar)
- ✅ Muestra balance total visible en todas las páginas
- ✅ Centrado en desktop (layout flex 3-zonas)
- ✅ Oculto en móvil (solo desktop `lg:`)
- ✅ Colores dinámicos (verde/rojo)

---

## ⏳ Elementos Pendientes del Dashboard

### **Según Prompt Original** (`prompt_inicial_del_agente_app_gastos_pareja_next_instructions.md`)

#### Dashboard MVP Original (Especificado):
- ✅ Selector de mes
- ✅ Tarjetas: Total Gasto, Total Ingreso, Balance
- ⏳ **Gráfico por categoría** (barras o donut) 🎯 **PRÓXIMA PRIORIDAD**
- ⏳ **Últimas 10 transacciones** (actualmente muestra TODAS)
- ✅ Botón "+ añadir" (Dialog modal)

### **Elementos Faltantes Identificados**:

1. ⏳ **Gráficos Visuales** (Recharts)
   - Donut chart de gastos por categoría
   - Barra de comparación Ingresos vs Gastos
   - Evolución temporal (línea de tendencia)
   - Distribución porcentual de categorías

2. ⏳ **Top 5 Categorías de Gastos**
   - Ranking de categorías con más gastos
   - Porcentaje sobre total
   - Monto absoluto
   - Comparación con mes anterior (opcional)

3. ⏳ **Limitar Transacciones a 10 Últimas**
   - Actualmente muestra TODAS las transacciones del mes
   - Debería mostrar solo las 10 más recientes
   - Botón "Ver todas" → link a `/app/expenses` (si se mantiene)

4. ⏳ **Indicadores Adicionales**
   - Promedio de gasto diario
   - Días del mes restantes
   - Proyección de gasto mensual
   - Comparación con mes anterior

---

## 📋 Roadmap del Dashboard

### **FASE 1: Gráficos Básicos** ⭐ **PRÓXIMA**

**Prioridad**: ALTA  
**Estimación**: 2-3 horas  
**Herramienta**: Recharts

#### Tareas:
1. ✅ Instalar Recharts (si no está)
   ```bash
   npm install recharts
   ```

2. 🎯 **Crear componente `ExpensesByCategoryChart`**
   - Donut/Pie chart
   - Muestra distribución de gastos por categoría
   - Colores basados en categorías
   - Tooltip con detalles
   - Leyenda con nombres de categorías

3. 🎯 **Crear componente `IncomeVsExpensesChart`**
   - Bar chart simple
   - 2 barras: Ingresos (verde) vs Gastos (rojo)
   - Balance mostrado como línea o texto

4. 🎯 **Integrar en Dashboard**
   - Agregar sección de gráficos después de las 3 tarjetas
   - Layout: 2 columnas en desktop, 1 en móvil
   - Cargar datos del mes actual
   - Responsive y con skeleton loading

**Resultado esperado**:
```tsx
<div className="grid gap-4 md:grid-cols-2 mt-8">
  <Card>
    <CardHeader>
      <CardTitle>Gastos por Categoría</CardTitle>
    </CardHeader>
    <CardContent>
      <ExpensesByCategoryChart data={categoryData} />
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Ingresos vs Gastos</CardTitle>
    </CardHeader>
    <CardContent>
      <IncomeVsExpensesChart 
        income={summary.income}
        expenses={summary.expenses}
      />
    </CardContent>
  </Card>
</div>
```

---

### **FASE 2: Top Categorías y Optimizaciones**

**Prioridad**: MEDIA  
**Estimación**: 1-2 horas

#### Tareas:
1. 🎯 **Top 5 Categorías Card**
   - Componente `TopCategoriesCard`
   - Lista ordenada por monto de gasto
   - Muestra: nombre, monto, % del total
   - Progress bar visual
   - Icono de categoría

2. 🎯 **Limitar movimientos a 10**
   - Modificar `DashboardContent` para mostrar solo 10 últimas
   - Agregar link "Ver todas las transacciones"
   - Opcional: paginación básica

3. 🎯 **Indicadores adicionales**
   - Promedio de gasto diario: `totalGastos / díasDelMes`
   - Días restantes del mes
   - Proyección: `(gastoActual / díasCorridos) * díasTotales`

**Resultado esperado**:
```tsx
<div className="grid gap-4 md:grid-cols-3 mt-8">
  <Card>
    <CardHeader>
      <CardTitle>Top 5 Categorías</CardTitle>
    </CardHeader>
    <CardContent>
      <TopCategoriesList categories={topCategories} />
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Estadísticas</CardTitle>
    </CardHeader>
    <CardContent>
      <DailyStats 
        average={dailyAverage}
        daysLeft={daysLeft}
        projection={projection}
      />
    </CardContent>
  </Card>
</div>
```

---

### **FASE 3: Mobile Experience**

**Prioridad**: MEDIA  
**Estimación**: 2 horas

#### Tareas:
1. 🎯 **Menú hamburger para móvil**
   - Sheet de shadcn/ui
   - Lista de navegación en drawer
   - Cierra automáticamente al seleccionar opción

2. 🎯 **Optimizar gráficos para móvil**
   - Reducir tamaño de textos
   - Hacer gráficos más compactos
   - Touch-friendly tooltips

3. 🎯 **Mejorar cards en móvil**
   - Ajustar padding
   - Font sizes responsivos
   - Evitar overflow horizontal

---

### **FASE 4: Comparación Temporal** (Opcional)

**Prioridad**: BAJA  
**Estimación**: 3-4 horas

#### Tareas:
1. 🎯 **Comparación con mes anterior**
   - Agregar queries para obtener datos del mes anterior
   - Mostrar diferencia % en tarjetas
   - Flechas arriba/abajo con color

2. 🎯 **Gráfico de evolución**
   - Line chart con últimos 6 meses
   - Líneas separadas para ingresos y gastos
   - Marca el mes actual

3. 🎯 **Insights automáticos**
   - "Gastaste 15% más este mes"
   - "Categoría con mayor aumento: Supermercado"
   - "Estás en camino de ahorrar €200"

---

## 🗂️ Archivos Relacionados

### Documentación Existente:
- ✅ `docs/DASHBOARD_INTEGRATION.md` - Integración de movimientos
- ✅ `docs/SESSION_SUMMARY_UI_IMPROVEMENTS.md` - Mejoras UI recientes
- ✅ `docs/CONTRIBUTIONS_REFACTOR_PLAN.md` - Plan de refactorización
- ✅ `prompt_inicial_del_agente_app_gastos_pareja_next_instructions.md` - Especificación original

### Código del Dashboard:
- `app/app/page.tsx` - Dashboard principal (Server Component)
- `app/app/components/DashboardContent.tsx` - Contenido del dashboard (Client Component)
- `app/app/components/MovementsList.tsx` - Lista de movimientos
- `app/app/expenses/components/AddMovementDialog.tsx` - Dialog de añadir
- `components/shared/MonthSelector.tsx` - Selector de mes
- `components/shared/BalanceDisplay.tsx` - Display de balance (topbar)
- `app/app/layout.tsx` - Layout con header

### Actions:
- `app/app/expenses/actions.ts` - CRUD de movimientos, `getMonthSummary()`
- `app/app/categories/actions.ts` - CRUD de categorías

---

## 🎯 Próximos Pasos Inmediatos

### **Ahora Mismo** (Sesión Actual):
1. ✅ Documentación consolidada creada (este archivo)
2. ⏳ **Probar todo el flujo** end-to-end
   - Login → Crear hogar → Agregar movimientos → Ver dashboard
3. ⏳ **Verificar responsive** en móvil/tablet/desktop
4. ⏳ **Testar configuración de ingresos** en perfil

### **Próxima Sesión** (FASE 1: Gráficos):
1. 🎯 Instalar Recharts
2. 🎯 Crear `ExpensesByCategoryChart` component
3. 🎯 Crear `IncomeVsExpensesChart` component
4. 🎯 Integrar ambos gráficos en Dashboard
5. 🎯 Testing y ajustes responsive

### **Sesión Posterior** (FASE 2: Top Categorías):
1. 🎯 Implementar `TopCategoriesCard`
2. 🎯 Limitar movimientos a 10 + link "Ver todas"
3. 🎯 Agregar estadísticas (promedio diario, proyección)

---

## 📊 Comparación: Antes vs Ahora vs Objetivo

### **Prompt Original** (Especificado):
```
Dashboard:
- Selector de mes ✅
- Tarjetas: Total Gasto, Total Ingreso, Balance ✅
- Gráfico por categoría (barras o donut) ⏳
- Últimas 10 transacciones ⏳
- Botón "+ añadir" ✅
```

### **Estado Actual** (Implementado):
```
Dashboard:
- ✅ Selector de mes (con navegación)
- ✅ 3 Tarjetas (Ingresos, Gastos, Balance)
- ✅ Sistema de tabs (Todos/Ingresos/Gastos)
- ✅ Lista completa de movimientos (NO limitada a 10)
- ✅ Botón "+ Nuevo Movimiento"
- ✅ Acciones inline (editar/eliminar)
- ✅ Balance en topbar (siempre visible)
- ❌ Sin gráficos visuales
- ❌ Sin top categorías
```

### **Objetivo Final** (Después de FASE 1 y 2):
```
Dashboard:
- ✅ Selector de mes
- ✅ 3 Tarjetas con indicadores mejorados
- ✅ Gráfico donut de gastos por categoría
- ✅ Gráfico bar de Ingresos vs Gastos
- ✅ Top 5 categorías de gastos
- ✅ Últimas 10 transacciones + link "Ver todas"
- ✅ Estadísticas adicionales (promedio, proyección)
- ✅ Sistema de tabs
- ✅ Balance en topbar
- ✅ Mobile menu (hamburger)
```

---

## 🔗 Referencias a Otras Funcionalidades

### **Integración con Contribuciones**:
- El dashboard NO muestra contribuciones proporcionales
- Eso está en `/app/household` (tab Contribuciones)
- Ver: `docs/CONTRIBUTIONS_REFACTOR_PLAN.md`

### **Integración con Múltiples Hogares**:
- Balance mostrado es del hogar ACTIVO
- Selector de hogar en topbar (si tiene múltiples)
- Ver: `docs/MULTI_HOUSEHOLD_IMPLEMENTATION_COMPLETE.md`

### **Navegación**:
- Dashboard es la página principal tras login
- Si no tiene hogar → Onboarding
- Si tiene invitaciones pendientes → Card en dashboard
- Ver: `docs/INVITATION_SYSTEM_SUMMARY.md`

---

## ✅ Checklist de Completitud

### Dashboard MVP (según prompt original):
- ✅ Selector de mes
- ✅ Tarjetas resumen (3 en lugar de 2)
- ⏳ Gráfico por categoría **← FALTA**
- ⏳ Últimas 10 transacciones **← FALTA (muestra todas)**
- ✅ Botón añadir
- ✅ EXTRA: Sistema de tabs
- ✅ EXTRA: Balance en topbar
- ✅ EXTRA: Acciones inline
- ✅ EXTRA: Múltiples hogares

**Porcentaje de completitud**: **~70%** del MVP original

**Para alcanzar 100%**: Implementar FASE 1 (gráficos) + limitar a 10 transacciones

---

## 📝 Notas Técnicas

### Performance:
- Carga paralela con `Promise.all()` ✅
- Server Components para data fetching ✅
- Client Components solo donde necesario ✅
- Revalidación con `revalidatePath()` ✅

### Responsive:
- Mobile-first approach ✅
- Breakpoints: `sm:` `md:` `lg:` ✅
- Cards se apilan en móvil ✅
- Balance oculto en móvil ✅

### Accesibilidad:
- Labels correctos ✅
- ARIA attributes ✅
- Focus visible ✅
- Keyboard navigation ✅

### Dark Mode:
- next-themes integrado ✅
- Tokens semánticos ✅
- Gráficos adaptados (cuando se implementen) ⏳

---

**Última actualización**: 4 de Octubre, 2025  
**Autor**: GitHub Copilot Agent  
**Estado**: ✅ Build Passing | ⏳ Gráficos Pendientes | 🚀 Listo para FASE 1
