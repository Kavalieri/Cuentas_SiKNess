# 🧾 Proyecto: Cuentas SiKNess

**Objetivo:**

- Realizar una UI totalmente NUEVA. Simplificar el entorno actual de la aplicación para construir una base sólida y escalable sobre la que ir añadiendo nuevas funcionalidades.Es importante tratar de reutilizar la mayor cántidad de campos y tablas de la base de datos actual, es robusta y tiene elementos de sobra.
- Es una aplicación para llevar la gestión de los gastos en una cuenta conjunta con aportación calculada para todos los miembros.
- Analizar todo el entorno y tratar de reutilizar todos los elementos posibles, especialmente las tablas y campos y funciones postgres
- Llenar los vacíos en cuanto a la lógica de negocio y estructura sin sumar elementos nuevos que no sean indispensabes.
- Mantener las bases de datos y accesos/funcionamiento de postgresql documentado en `docs/TO-DO/DONE/POSTGRESQL_SISTEMA_COMPLETO.md` y gestion de servicios PM2 en `docs/TO-DO/DONE/PM2_SISTEMA_COMPLETO.md`
- Mantener los AGENTS.md o crear nuevos para mantener el proyecto con instrucciones claras y "nested" por directorios intentando que cada instrucción aplique solo en el lugar que le corresponde.

---

## 1️⃣ Login

- Se mantiene el sistema de login **tal como está actualmente**, sin modificaciones.

---

## 2️⃣ Interfaz

- Interfaz **diseñada prioritariamente para smartphone**, compartiendo estructura con la versión de escritorio.
- **Sin pestañas.**
- Solo dos elementos principales:
  - **Barra superior:** muestra el balance del periodo actual que contenga en alguna esquina **Menú “burguer”:** contiene todas las opciones del sistema, correctamente organizadas.
  - Contenido a visualizar por el usuario
  - Selector de modo oscuro/claro `docs/TO-DO/DONE/DARK_MODE.md`
  - Selector de on/of para el sistema de privacidad. `docs/TO-DO/DONE/PRIVACY_MODE.md`

---

## 3️⃣ Estructura general del sistema con páginas accesibles mediante vínculos directos desde los tutoriales y guias o desde el menu burguer.

### 🏠 a. Selector global de hogar

- Permite elegir el **hogar activo** con el que se trabaja.
- Todas las configuraciones y operaciones se aplican sobre el hogar seleccionado.

---

### 📅 b. Selector global de periodo

- Con sistema complementario de calendario **completo** con selección de:
  - Día
  - Mes
  - Año
- Define el **periodo activo** y sincroniza todo el sistema con él.

---

### ⚙️ c. Configuración

#### 👤 Perfil

- Datos personales del usuario:
  - Nivel de ingresos.
  - Nombre visible.
  - Datos generales del perfil.
- Información necesaria para los cálculos internos del sistema.

#### 🏡 Hogar

- Gestión de miembros:
  - Invitar, expulsar, cambiar roles.
- Configuración general:
  - Nombre del hogar.
  - Objetivo del fondo común.
  - Método de cálculo de la contribución:
    - **Proporcional a los ingresos.**
    - **A partes iguales.**
    - **Personalizado.**
- Vinculado directamente al **selector global de hogar**.

#### 🗂️ Categorías

- Gestión de categorías de ingresos y gastos:
  - Listado general.
  - Modificación de icono o nombre.

---

### 📆 d. Gestión del periodo

Vinculado al periodo activo seleccionado.

- Cabecera con resumen del estado del periodo.
- Guía paso a paso para el usuario.

#### 🧩 Fase 1: Preparación

- Requisitos previos para pasar al siguiente periodo:
  1. Todos los miembros han informado sus ingresos en el perfil.
  2. El hogar tiene un fondo objetivo configurado.

#### ⚖️ Fase 2: Cálculo y gastos previos

- El sistema calcula la **contribución de cada miembro** según el método configurado.
- Muestra:
  - A nivel individual → aportación de cada miembro.
  - A nivel global → resumen total de las contribuciones del hogar por cada miembro, detalle claro.
- Los miembros pueden registrar **gastos previos**:
  - Se genera una **transacción de gasto** con:
    - Categoría seleccionada.
    - Descripción.
    - Timestamp completo.
    - Datos de control.
  - Se genera simultáneamente un **ingreso compensatorio** del mismo importe.
  - Se descuenta automáticamente del total de contribución lo ya gastado.
- Los cálculos se actualizan **en tiempo real**.

#### 🔒 Fase 3: Validación y uso

- El periodo se **bloquea** tras la validación del _owner_.
- Se muestran:
  - Cantidades finales a aportar por cada miembro.
  - Detalle completo de los cálculos.
- Se permite seguir registrando transacciones (ingresos o gastos).

#### Fase finale

- Llega el último día del mes y se insta a cerrar el periodo del mes anterior e iniciar el siguiente periodo.
- Al cerrar el periodo se bloquea toda adición de información y se registra la snapshot o foto fija con el balance de ese mes, que pasará a ser el balance inicial del periodo siguiente.

---

### 📊 e. Balance

- Cabecera con **tarjetas resumen** del periodo.
- Listado completo de todas las transacciones:
  - Ingresos.
  - Gastos.

---

## 🗂️ Backlog operativo sugerido

### Fase 0 · Preparativos

- Inventariar componentes y rutas actuales con tabs (`app/app/**`) para identificar dependencias que deban migrarse al nuevo shell móvil.
- Revisar helpers existentes (`lib/periods.ts`, `lib/dualFlow.ts`, `lib/result.ts`) y confirmar compatibilidad de tipos en `types/**`.
- Documentar en `docs/TO-DO/DONE/DARK_MODE.md` y `docs/TO-DO/DONE/PRIVACY_MODE.md` cualquier ajuste requerido por los nuevos toggles.
- Crear diseños rápidos (wireframes) de la topbar + menú burguer para validar interacción.

### Fase 1 · Shell global y estado compartido

- **Contexto global:** Ampliar `contexts/HouseholdContext.tsx` o crear `ActiveContextProvider` que gestione hogar y periodo activos.
- **Selector de hogar:** Implementar componente en `app/app/hogar/components/GlobalHouseholdSelector.tsx` consumiendo `getUserHouseholds_optimized`.
- **Selector de periodo:** Añadir hook y UI en `app/app/periodos/components/ActivePeriodSelector.tsx` con calendario completo (día/mes/año) basado en `monthly_periods`.
- **Topbar móvil:** Crear en `components/shared/layout/Topbar.tsx` mostrando balance del periodo, toggle dark/light y toggle privacidad.
- **Menú burguer:** Implementar drawer responsive en `components/shared/layout/BurgerMenu.tsx` con enlaces a cada sección definida en este plan.
- **Layout raíz:** Reemplazar tabs en `app/app/layout.tsx` para usar el nuevo shell (topbar + contenido + menú).
- **Onboarding para usuarios sin hogares:** Revisar flujo actual y adaptar a nuevo shell, asegurando la correcta gestión si no hay hogar activo.

### Fase 2 · Configuración

- **Perfil (`app/app/profile`)**
  - Revisar server actions para actualizar nombre visible e ingresos (`member_incomes`, `profiles`).
  - Añadir validaciones con Zod y actualizaciones en tiempo real del contexto.
- **Hogar (`app/app/household`)**
  - Reorganizar gestión de miembros (invitar, cambiar rol, expulsar) con vistas móviles.
  - Exponer configuración de objetivo de fondo y método de cálculo (proporcional, igualitario, personalizado) reutilizando `household_settings` y `contributions`.
- **Categorías (`app/app/categories`)**
  - Diseñar listado editable (icono/nombre) reutilizando API existente (`categories`).
  - Garantizar que cambios disparen `revalidatePath` relevante.

### Fase 3 · Gestión del periodo (App router `app/app/periodos`)

- **Resumen cabecera:** Mostrar estado del periodo activo (fases, balances, fechas) consumiendo `monthly_periods`.
- **Fase 1 – Preparación**
  - Checklist de requisitos: ingresos reportados por cada miembro, fondo objetivo configurado.
  - Alertas accionables que abran vistas de perfil/hogar según faltantes.
- **Fase 2 – Cálculo y gastos previos**
  - Mostrar cálculo de aportaciones por miembro según método seleccionado (usa `contributions` y vistas materializadas).
  - Formulario de gasto previo que cree par gasto/ingreso directo (función `create_direct_expense_pair`).
  - Refrescar balances en tiempo real tras registrar movimientos.
- **Fase 3 – Validación y uso**
  - Acción owner para bloquear periodo (`ensure_monthly_period`, transición de estado).
  - Vista detallada de aportaciones finales y movimientos.
- **Cierre**
  - Flujo para snapshot y apertura del siguiente mes heredando `closing_balance`.
  - Automatizar notificación de cierre pendiente.

### Fase 4 · Balance y transacciones (`app/app/balance`)

- Crear dashboard con tarjetas resumen basadas en `mv_household_balances` y `mv_member_pending_contributions`.
- Listado de transacciones común/directo con filtros (fecha, tipo, categoría) usando `transactions` y `dual_flow_transactions`.
- Opcional: agrupar por día o categoría para lectura rápida móvil.

### Fase 5 · Experiencia transversal

- Integrar modo privacidad (ocultar cantidades hasta toggle) en componentes sensibles.
- Asegurar accesibilidad (navegación teclado, labels) en topbar y menú.
- Añadir tests prioritarios: hooks de contexto, server actions críticas y componentes del nuevo shell (Vitest + Testing Library).
- Actualizar documentación pertinente (`docs/` y `AGENTS.md` específicos) con nuevas rutas y responsabilidades.

### Fase 6 · Revisión y despliegue

- Pasar checklist QA en entorno DEV; validar cálculos con datos reales (Escenario 1 sincronizado).
- Ejecutar pruebas de regresión sobre login y flujos críticos.
- Preparar migraciones si aparecen ajustes imprescindibles (solo estructura, mantener compatibilidad).
- Documentar cambios en `/docs` y preparar despliegue vía tareas PM2.

---

## 4️⃣ Avances recientes (17/10/2025)

### Fase 1 - Completada ✅

- Shell global implementado en `/app/sickness/`
- Topbar con balance, selectores globales y menú burguer
- Menú burguer con navegación completa a todas las rutas
- Páginas placeholder creadas para todas las secciones principales
- Navegación validada en DEV (servidor funcionando correctamente)

### Fase 2 - Completada ✅ (17/10/2025)

- **SiKnessContext unificado** ✅

  - Gestión de estado global: hogar activo, periodo activo, balance, usuario
  - Modo privacidad integrado con persistencia en localStorage
  - Carga inicial automática desde API `/api/sickness/init`
  - Hooks para actualización y sincronización de datos
  - Acciones conectadas a APIs: `selectHousehold`, `selectPeriod`, `refreshBalance`, `refreshPeriods`

- **Selectores globales (UI refinada)** ✅

  - Layout optimizado en una sola línea del topbar:
    - **Izquierda**: Menú burguer + GlobalHouseholdSelector
    - **Centro**: GlobalPeriodSelector (sin balance, se mostrará en dashboard)
    - **Derecha**: Privacy toggle + Theme toggle
  - **Eliminada duplicación** de selectores (segunda línea redundante removida)
  - **Removido balance del topbar** (mejora visual, balance se mostrará en dashboard)
  - Diseño compacto mobile-first en `h-14` (56px)

- **Sistema de APIs completo** ✅

  - `/api/sickness/init` (GET) - Carga inicial de datos del usuario
    - Hogares disponibles con metadata (miembros, owners)
    - Hogar activo actual con settings
    - Periodos del hogar (últimos 12 + futuros 3 meses)
    - Periodo activo actual
    - Balance del periodo activo
    - Datos del usuario (email, displayName, avatarUrl)
  - `/api/sickness/balance` (POST) - Balance del periodo actual
    - Opening/closing balance del periodo
    - Ingresos y gastos del periodo
    - Gastos directos pendientes
    - Contribuciones pendientes
  - `/api/sickness/household/set-active` (POST) - Cambio de hogar activo
    - Valida membership del usuario
    - Actualiza tabla `user_active_household`
    - Retorna periodos del nuevo hogar + periodo actual
  - `/api/sickness/period/set-active` (POST) - Cambio de periodo activo
    - Valida acceso al hogar
    - Retorna datos del periodo seleccionado

- **Toggles UI** ✅
  - Dark/Light mode con next-themes (botón sol/luna en topbar)
  - Modo privacidad (botón ojo/ojo tachado en topbar)

### Fase 3 - En Progreso 🔄 (17/10/2025)

- **Dashboard de Balance** ✅ (16/10/2025)

  - Página `/sickness/dashboard/page.tsx` completa
  - Tarjetas de resumen (opening, closing, income, expenses)
  - Gastos directos y contribuciones pendientes destacados
  - Integración completa con privacy mode
  - Diseño mobile-first responsive

- **Configuración - Perfil** ✅ (17/10/2025)
  - Página `/sickness/configuracion/perfil/page.tsx` funcional
  - Actualización de nombre visible (server action con Zod)
  - Gestión de ingresos mensuales (histórico con `member_incomes`)
  - Bug fixes: ORDER BY created_at DESC + sincronización de input
  - Información de cuenta completa
  - Integración con SiKnessContext

### Próximos pasos (Fase 3 - Continuación)

- **CRUD Categorías** ✅ (17/10/2025)

  - Página `/sickness/configuracion/categorias/page.tsx` completa (~482 líneas)
  - Server actions ya existían en `actions.ts`: getHouseholdCategories, createCategory, updateCategory, deleteCategory
  - UI features:
    - Listado agrupado por tipo (income/expense) con 33 iconos emoji
    - Dialog crear categoría con selector de iconos y validación
    - Dialog editar categoría con misma funcionalidad
    - Confirmación de eliminación con AlertDialog
    - Permisos owner-only para operaciones de escritura
    - Toast notifications con sonner (success/error)
    - Recarga automática tras mutaciones
  - Mobile-first responsive design
  - Sin errores de compilación TypeScript
  - Commit: f0e902f

- **CRUD Hogar** - Gestión de miembros, invitaciones, objetivo de fondo (PENDIENTE)
- **Workflow de periodos** - Fases 1-2-3 + cierre de periodo (PENDIENTE)
- **Lista de transacciones** - Filtros, búsqueda, paginación (PENDIENTE)

---
