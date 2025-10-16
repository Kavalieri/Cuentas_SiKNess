# CuentasSiK - Wireframes Fase 0.4

**Fecha**: Octubre 2025
**Autor**: AI Assistant
**Proyecto**: CuentasSiK - Rediseño UI Mobile-First

---

## 🎯 Objetivo

Crear diseños rápidos (wireframes) de la topbar + menú burguer para validar la interacción antes de implementar.

---

## 📱 Wireframe 1: Topbar Principal

```
┌─────────────────────────────────────────────────┐
│ [🍔]  CuentasSiK                    [🌙] [👁️] │
│                                                 │
│ Balance: €1,234.56                    ▼         │
│ Hogar: Casa Familiar                 ▼         │
│ Período: Octubre 2025                ▼         │
└─────────────────────────────────────────────────┘
```

**Elementos:**

- **Burger Menu** (🍔): Abre menú lateral
- **Logo/Título**: "CuentasSiK" centrado
- **Toggles**: Dark mode (🌙) y Privacy (👁️) en esquina superior derecha
- **Balance**: Monto total visible
- **Selectores**: Hogar y Período como dropdowns

---

## 📱 Wireframe 2: Menú Burger Abierto

```
┌─────────────────┬─────────────────────────────────┐
│                 │ Balance: €1,234.56             │
│ [🍔] CuentasSiK │                                 │
│                 │ Hogar: Casa Familiar           │
│ 🏠 INICIO       │ Período: Octubre 2025          │
│ 💰 BALANCE      │                                 │
│ 📊 REPORTES     │ [🌙] [👁️]                       │
│ ⚙️  AJUSTES     │                                 │
│                 │ ────────────────────────────── │
│                 │ 🏠 Hogar Actual                 │
│                 │ ➕ Nuevo Hogar                  │
│                 │ ────────────────────────────── │
│                 │ 📅 Período Actual              │
│                 │ ➕ Nuevo Período                │
└─────────────────┴─────────────────────────────────┘
```

**Estructura del Menú:**

- **Sección Superior**: Navegación principal (Inicio, Balance, Reportes, Ajustes)
- **Sección Media**: Información del contexto actual (Balance, Hogar, Período)
- **Sección Inferior**: Gestión de hogar y periodo

---

## 📱 Wireframe 3: Selector de Hogar Expandido

```
┌─────────────────────────────────────────────────┐
│ [🍔]  CuentasSiK                    [🌙] [👁️] │
│                                                 │
│ Balance: €1,234.56                    ▼         │
│ ┌────────────────────────────────────▼─────────┐ │
│ │ 🏠 Casa Familiar (Owner)           ✓         │ │
│ │ 👤 Miembro: Ana García                      │ │
│ │ 👤 Miembro: Carlos López                    │ │
│ │ ──────────────────────────────────────────── │ │
│ │ ➕ Unirse a otro hogar                      │ │
│ │ ➕ Crear nuevo hogar                        │ │
│ └─────────────────────────────────────────────┘ │
│ Período: Octubre 2025                ▼         │
└─────────────────────────────────────────────────┘
```

**Funcionalidad:**

- Mostrar hogar actual con rol del usuario
- Listar miembros del hogar
- Opciones para unirse/crear nuevos hogares

---

## 📱 Wireframe 4: Selector de Período Expandido

```
┌─────────────────────────────────────────────────┐
│ [🍔]  CuentasSiK                    [🌙] [👁️] │
│                                                 │
│ Balance: €1,234.56                    ▼         │
│ Hogar: Casa Familiar                 ▼         │
│ ┌────────────────────────────────────▼─────────┐ │
│ │ 📅 Octubre 2025 (Activo)            ✓         │ │
│ │ 📅 Septiembre 2025 (Cerrado)                 │ │
│ │ 📅 Agosto 2025 (Cerrado)                    │ │
│ │ ──────────────────────────────────────────── │ │
│ │ ➕ Crear nuevo período                       │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Funcionalidad:**

- Mostrar período actual con estado
- Historial de períodos anteriores
- Opción para crear nuevos períodos

---

## 📱 Wireframe 5: Pantalla de Balance (Vista Principal)

```
┌─────────────────────────────────────────────────┐
│ [🍔]  CuentasSiK                    [🌙] [👁️] │
│                                                 │
│ Balance: €1,234.56                    ▼         │
│ Hogar: Casa Familiar                 ▼         │
│ Período: Octubre 2025                ▼         │
├─────────────────────────────────────────────────┤
│                                                 │
│ BALANCE TOTAL                                   │
│                                                 │
│ €1,234.56                                       │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 💰 Ingresos: €2,500.00                     │ │
│ │ 💸 Gastos: €1,265.44                       │ │
│ │ 📊 Contribuciones: €1,000.00               │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ÚLTIMAS TRANSACCIONES                           │
│                                                 │
│ 🛒 Supermercado -€45.67  Hoy                   │
│ 🍽️ Restaurante -€32.50  Ayer                  │
│ 💼 Nómina +€1,200.00  15 Oct                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Elementos:**

- **Balance destacado** en la parte superior
- **Resumen por categorías** (Ingresos, Gastos, Contribuciones)
- **Lista de últimas transacciones** con iconos y fechas

---

## 📱 Wireframe 6: Navegación por Secciones

```
┌─────────────────┬─────────────────────────────────┐
│                 │ 💰 BALANCE                       │
│ [🍔] CuentasSiK │                                 │
│                 │ Balance Total: €1,234.56        │
│ 🏠 INICIO       │                                 │
│ 💰 BALANCE      │ ┌─────────────────────────────┐ │
│ 📊 REPORTES     │ │ 💰 Ingresos: €2,500.00      │ │
│ ⚙️  AJUSTES     │ │ 💸 Gastos: €1,265.44        │ │
│                 │ │ 📊 Contribuciones: €1,000.00│ │
│                 │ └─────────────────────────────┘ │
│                 │                                 │
│                 │ 📱 Ver todas las transacciones  │
│                 │                                 │
└─────────────────┴─────────────────────────────────┘
```

**Navegación:**

- Menú lateral siempre visible
- Contenido principal ocupa el espacio restante
- Navegación intuitiva entre secciones

---

## 🎨 Decisiones de Diseño

### 1. **Topbar Fija**

- Altura: 120px (3 líneas)
- Siempre visible al hacer scroll
- Información crítica siempre accesible

### 2. **Menú Burger**

- Ancho: 280px
- Overlay semitransparente
- Animación slide desde izquierda

### 3. **Selectores Globales**

- Dropdowns integrados en topbar
- Información contextual siempre visible
- Acceso rápido a cambio de contexto

### 4. **Balance Prominente**

- Tipografía grande y destacada
- Color verde/rojo según saldo
- Siempre visible en topbar

---

## ✅ Validación de Interacción

### Flujo 1: Cambio de Hogar

1. Usuario toca selector de hogar
2. Se expande dropdown con hogares disponibles
3. Selecciona nuevo hogar
4. Topbar se actualiza con nuevo balance/hogar
5. Contenido se recarga con datos del nuevo hogar

### Flujo 2: Cambio de Período

1. Usuario toca selector de período
2. Se expande calendario con períodos
3. Selecciona nuevo período
4. Topbar se actualiza con nuevo período
5. Contenido se filtra por nuevo período

### Flujo 3: Navegación por Menú

1. Usuario abre menú burger
2. Selecciona sección deseada
3. Menú se cierra automáticamente
4. Navegación a nueva sección
5. URL se actualiza correctamente

---

## 📋 Próximos Pasos

Con estos wireframes validados, proceder a:

**Fase 1.1**: Ampliar HouseholdContext o crear ActiveContextProvider
**Fase 1.2**: Implementar GlobalHouseholdSelector
**Fase 1.3**: Añadir ActivePeriodSelector
**Fase 1.4**: Crear Topbar.tsx

---

**✅ WIREFRAMES COMPLETADOS - LISTOS PARA IMPLEMENTACIÓN**
