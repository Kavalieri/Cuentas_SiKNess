# 📝 TODOLIST · SiKNess

**Actualizado:** 17/10/2025

---

## Fase 1 · Shell global y placeholders

- [x] Crear carpetas y rutas principales en `/sickness` (configuración, periodo, balance)
- [x] Añadir páginas mock para perfil, hogar, categorías, periodo y balance
- [x] Implementar menú burguer con navegación a todas las rutas
- [x] Añadir selectores globales de hogar y periodo (componentes y mock)
- [x] Validar navegación y placeholders en DEV ✅ (16/10/2025 - Servidor funcionando correctamente)

## ⚡ FASE 2: Context Global y Selectores (COMPLETADA ✅ 16/10/2025)

**Estado**: ✅ **COMPLETADA** con integración backend completa y UI refinada

### Contexto Unificado

- ✅ Crear `SiKnessContext` con tipos completos (household, period, balance, user)
- ✅ Implementar provider en `/app/sickness/layout.tsx`
- ✅ Auto-inicialización con `useEffect` desde `/api/sickness/init`
- ✅ Persistencia de privacy mode en localStorage

### Selectores Globales

- ✅ Crear `GlobalHouseholdSelector` conectado al contexto
- ✅ Crear `GlobalPeriodSelector` conectado al contexto
- ✅ **Eliminar duplicación de selectores en topbar** (17/10/2025)
- ✅ **Remover balance del topbar** (17/10/2025)
- ✅ Layout final optimizado: hogar (izq) + periodo (centro) + controles (der)

### APIs Backend (Todas creadas y funcionales)

- ✅ `GET /api/sickness/init` - Carga inicial completa (user, households, periods, balance)
- ✅ `POST /api/sickness/household/set-active` - Cambiar hogar activo
- ✅ `POST /api/sickness/period/set-active` - Cambiar periodo activo
- ✅ `POST /api/sickness/balance` - Calcular balance del periodo

### Acciones Contexto → Backend

- ✅ `selectHousehold()` → POST /api/sickness/household/set-active
- ✅ `selectPeriod()` → POST /api/sickness/period/set-active
- ✅ `refreshBalance()` → POST /api/sickness/balance
- ✅ `refreshPeriods()` → re-fetch household data

**Commits**:

- `d534e19` - "feat(sickness): completar Fase 2 - integración completa de contexto con APIs"
- `fecdecb` - "refactor(sickness): eliminar selectores duplicados en topbar"
- `e42c577` - "refactor(sickness): remover balance del topbar"
- `c0b7690` - "fix(sickness): seleccionar periodo actual por defecto"

---

## ⚡ FASE 3 · Dashboard y lógica real (EN PROGRESO 🔄)

### Dashboard de Balance ✅ (16/10/2025)

- ✅ **Crear página `/sickness/dashboard/page.tsx`**
- ✅ **Tarjeta principal de balance destacada** (closing balance prominente)
- ✅ **Cards de balance inicial y final**
- ✅ **Sección de ingresos del periodo** con desglose
- ✅ **Sección de gastos del periodo** con desglose
- ✅ **Gastos directos pendientes** (card especial naranja)
- ✅ **Contribuciones pendientes** (card especial amarilla)
- ✅ **Resumen consolidado del periodo** con cálculo final
- ✅ **Integración completa con privacy mode**
- ✅ **Diseño mobile-first responsive**

### Configuración - Perfil ✅ (17/10/2025)

- ✅ **Página `/sickness/configuracion/perfil/page.tsx` funcional**
- ✅ **Actualización de nombre visible** (server action con validación Zod)
- ✅ **Gestión de ingresos mensuales** (histórico con `member_incomes`)
- ✅ **Bug fix: ORDER BY created_at DESC** para obtener ingreso más reciente
- ✅ **Bug fix: Sincronización de input** tras actualizar ingreso
- ✅ **Información de cuenta** (fecha creación, rol sistema)
- ✅ **Integración con SiKnessContext**


### Configuración - Hogar ✅ (17/10/2025)

- ✅ **Página `/sickness/configuracion/hogar/page.tsx` funcional**
- ✅ **Actualización de nombre y objetivo mensual**
- ✅ **Selector de tipo de cálculo** (igual/proporcional/personalizado)
- ✅ **Gestión de miembros del hogar** (listado con roles)
- ✅ **Sistema de invitaciones** (crear, listar, copiar link)
- ✅ **Integración con SiKnessContext**

### Balance y Transacciones ⚠️ (17/10/2025 - REQUIERE REFACTOR)

- ✅ **Página `/sickness/balance/page.tsx` funcional**
- ✅ **ContributionsDisplay** cuando período locked
- ✅ **Filtros de transacciones** (tipo, categoría, miembro)
- ✅ **Visualización de pares de transacciones** (gastos directos)
- ⚠️ **BUG CRÍTICO**: Detección de estado del período inconsistente
- ⚠️ **UX**: Información del período en lugar equivocado (debería estar en Gestión)
- ⚠️ **UI**: Falta diseño moderno con Cards coherentes

### Gestión de Periodo ⚠️ (17/10/2025 - REQUIERE REFACTOR)

- ✅ **Página `/sickness/periodo/page.tsx` funcional**
- ✅ **Acciones de periodo** (bloquear, abrir, iniciar cierre, cerrar)
- ✅ **Checklist básico** de tareas
- ⚠️ **BUG CRÍTICO**: Feedback poco claro en acciones (bloquear/abrir)
- ⚠️ **UX**: Guía de fases no intuitiva (texto plano)
- ⚠️ **UI**: Falta información financiera del período
- ⚠️ **UI**: Necesita Cards visuales por fase

---

## 🔥 FASE 3.5 · REFACTOR CRÍTICO - Periodo y Balance (PLANIFICADO 18/10/2025)

**Estado**: 📋 Planificado para inicio inmediato
**Prioridad**: 🚨 CRÍTICA
**Duración estimada**: 1 día (8 horas)

### Problemas Identificados

1. ❌ **Balance no detecta fase correctamente** → ContributionsDisplay no aparece, CTAs incorrectos
2. ❌ **Bloqueo/apertura sin feedback claro** → Usuarios no entienden qué hace
3. ❌ **Guía de fases no intuitiva** → Texto plano sin visualización de progreso
4. ❌ **Info financiera mal ubicada** → Debe estar en Gestión de Periodo, no Balance

### Plan de Refactor (6 Fases)

#### FASE 1: Fix Crítico - Detección de Estado (30 min) 🔥
- [ ] Normalizar comparación de status en Balance (`.toLowerCase().trim()`)
- [ ] Verificar SiKnessContext devuelve status consistente
- [ ] Testing: ContributionsDisplay aparece cuando locked
- **Archivo**: `app/sickness/balance/page.tsx:59`

#### FASE 2: Componente PhaseCard (1h) 🎨
- [ ] Crear `components/periodo/PhaseCard.tsx`
- [ ] Props: phase, title, icon, status, description, checklist, actions
- [ ] Estados visuales: completed (verde), active (azul+pulse), pending (gris), locked (amarillo)
- [ ] Responsive y accesible (ARIA labels)

#### FASE 3: Rediseñar Gestión de Periodo (2h) 🏗️
- [ ] Header con período actual y barra de progreso
- [ ] Card de resumen financiero del período
- [ ] PhaseCard para cada fase (4 cards):
  * Fase 1: Configuración inicial (Settings icon)
  * Fase 2: Validación de contribuciones (CheckSquare icon)
  * Fase 3: Registro de movimientos (Activity icon)
  * Fase 4: Cierre de período (Lock icon)
- [ ] Información financiera visible (balance, ingresos, gastos)
- **Archivo**: `app/sickness/periodo/page.tsx`

#### FASE 4: ConfirmDialog para Acciones Críticas (45 min) 🔔
- [ ] Crear `components/shared/ConfirmDialog.tsx`
- [ ] Props: title, description, consequences[], confirmLabel, onConfirm
- [ ] Usar en: bloquear, abrir, iniciar cierre, cerrar período
- [ ] Explicaciones claras de cada acción y sus consecuencias

#### FASE 5: Reorganizar Balance (1.5h) 📊
- [ ] Remover información del período (ya está en Gestión)
- [ ] Saldo actual ultra-prominente (Card especial)
- [ ] CTA "Nuevo Movimiento" en Card separada (condicional por estado)
- [ ] Filtros en Card colapsable
- [ ] Transacciones en Card con scroll
- [ ] Mantener ContributionsDisplay cuando locked
- **Archivo**: `app/sickness/balance/page.tsx`

#### FASE 6: API Financial Summary (30 min) 🔌
- [ ] Crear `GET /api/periods/financial-summary`
- [ ] Response: openingBalance, totalIncome, totalExpenses, closingBalance, contributionsPending, directExpenses
- [ ] Integrar en Gestión de Periodo
- **Archivo**: `app/api/periods/financial-summary/route.ts`

### Testing E2E Completo
- [ ] Login como owner
- [ ] Verificar fase 1 (setup) con checklist visual
- [ ] Configurar objetivo e ingresos
- [ ] Bloquear → Ver dialog de confirmación → Verificar fase 2 activa
- [ ] Ver Balance → Verificar ContributionsDisplay aparece
- [ ] Abrir período → Dialog → Verificar fase 3
- [ ] Crear movimiento desde Balance
- [ ] Iniciar cierre → Dialog → Verificar fase 4
- [ ] Cerrar período → Dialog → Verificar todas las fases completadas

### Criterios de Éxito Global
- [ ] Usuario entiende fase actual sin leer documentación
- [ ] Feedback claro antes y después de cada acción
- [ ] Info financiera visible en Gestión de Periodo
- [ ] Balance enfocado en transacciones y saldo
- [ ] UI moderna, visual, coherente (mobile-first)
- [ ] Lint + typecheck passing
- [ ] Sin bugs de detección de estado

**Documentación completa**:
- 📋 Plan detallado: `docs/TO-DO/PLAN_REFACTOR_PERIODO_BALANCE.md`
- 📖 Guía operativa: `docs/TO-DO/GUÍA_GESTIÓN_PERIODO_BALANCE.md`
- 📝 Resumen ejecutivo: `docs/TO-DO/RESUMEN_REFACTOR.md`

---

### Fase 3 · Avance actual (Continuará después del refactor)

- [x] **CRUD Categorías** - Listado, crear, editar, eliminar (completado 17/10/2025)
- [x] **CRUD Hogar** - Gestión de miembros, invitaciones, objetivo, tipo de cálculo (completado 17/10/2025)
- [x] **Balance inicial** - Página funcional con filtros y transacciones (requiere refactor 18/10)
- [x] **Gestión de periodo inicial** - Página funcional con acciones básicas (requiere refactor 18/10)
- [ ] **Lista de transacciones mejorada** - Después del refactor
- [ ] **Workflow de periodo refinado** - Después del refactor

**Documentación y dependencias:**
- Se actualiza el checklist y la documentación en `Cuentas_SiKNess.md`, `ANALISIS_REFACTOR_SIKNESS.md` y `GUÍA_GESTIÓN_PERIODO_BALANCE.md` tras cada avance.
- Las acciones y server actions deben validar con el contexto global (`SiKnessContext`).
- Toda migración relevante se documenta y se aplica siguiendo las reglas del proyecto.

## Fase 4 · Depuración y migración

- [ ] Deprecar legacy y experimental (redirects)
- [ ] Eliminar tablas BD redundantes (migración)
- [ ] Testing y QA
- [ ] Actualizar documentación y AGENTS.md

---

**Notas rápidas:**

- Documentar cada avance en `docs/TO-DO/Cuentas_SiKNess.md` y `ANALISIS_REFACTOR_SIKNESS.md`
- Validar navegación y experiencia móvil en cada iteración
- Mantener consistencia visual y de UX
