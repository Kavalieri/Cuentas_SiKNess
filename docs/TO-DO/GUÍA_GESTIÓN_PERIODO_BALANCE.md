# Guía Operativa y Visual: Gestión de Periodo y Balance

---

## ⚠️ NOTA: REFACTOR EN PROGRESO

**Fecha**: 17 Octubre 2025
**Estado**: Planificado para 18 Octubre 2025

Esta guía describe el **estado objetivo** después del refactor planificado. El estado actual tiene problemas conocidos:

- ❌ Balance no detecta correctamente la fase del período (status inconsistente)
- ❌ Bloqueo/apertura de período sin feedback claro
- ❌ Guía de fases no intuitiva (texto plano, sin visualización)
- ❌ Información financiera mal ubicada (debería estar en Gestión de Periodo)

**Plan completo**: Ver `docs/TO-DO/PLAN_REFACTOR_PERIODO_BALANCE.md`

**Cambios principales planificados**:
1. ✨ Componente `PhaseCard` para visualización moderna de fases
2. ✨ Componente `ConfirmDialog` para acciones críticas con explicaciones
3. 🔧 Reorganización de Balance (solo saldo + transacciones + CTA)
4. 🔧 Gestión de Periodo con información financiera de la contribución por miembro actual y mediante, y estado de saldado que marca el cambio de fase.
5. 🔧 Fix crítico: normalización de detección de estado
6. 📊 API `/api/periods/financial-summary` para métricas del período

---

## 1. Gestión de Periodo (app/sickness/periodo/page.tsx)

### Objetivo
Página centralizada para el workflow mensual del periodo activo, con fases guiadas, acciones por rol y feedback visual.

### Estructura y Elementos Clave
- **Resumen del periodo**: mes/año, estado actual, balance de apertura/cierre.
- **Checklist de tareas**: visualización de pasos completados y pendientes (por rol: owner/member).
- **Acciones disponibles**:
  - Owner: bloquear periodo, abrir periodo, iniciar cierre, cerrar periodo.
  - Member: informar ingresos, gastos directos, confirmar aportación.
- **Visualización de miembros**: lista con estado de aportación, saldos y deudas.
- **Feedback visual**: toasts, loaders, estados deshabilitados según fase.
- **Indicaciones contextuales**: mensajes claros sobre qué debe hacer cada usuario para avanzar.

### Fases del Workflow
1. **SETUP**: solo gastos directos, owner configura objetivo y miembros informan ingresos/gastos.
2. **LOCKED**: cálculo de aportaciones, miembros confirman pagos.
3. **CLOSING**: owner valida y cierra el periodo, se muestran saldos finales.
4. **CLOSED**: periodo cerrado, solo consulta.

### Principios UI/UX
- Acciones agrupadas y deshabilitadas según estado.
- Mensajes claros y diferenciados por rol.
- Visualización de progreso (checklist, badges, colores).
- Accesibilidad y feedback inmediato.

---

## 2. Balance y Transacciones (app/sickness/balance/page.tsx)

### Objetivo
Página para gestión y consulta de todas las transacciones del periodo, con filtros, resumen y acciones contextuales.

### Estructura y Elementos Clave
- **Resumen de balance**: ingresos, gastos, saldo, aportaciones, gastos directos.
- **Listado de transacciones**: tabla o tarjetas, con filtros por tipo, miembro, categoría, fecha.
- **Acciones disponibles**:
  - Añadir gasto/ingreso (común o directo).
  - Editar/eliminar (según permisos y estado).
- **Visualización de pares de transacciones**: gastos directos emparejados con ingresos automáticos.
- **Indicadores de estado**: badges, colores, iconos para tipo y estado de cada transacción.
- **Exportar/descargar**: CSV, PDF (opcional).

### Principios UI/UX
- Filtros rápidos y claros.
- Acciones accesibles y seguras.
- Feedback visual para cambios y errores.
- Consistencia con la página de periodo.

---

## Referencias
- Server Actions: app/sickness/periodo/actions.ts
- API: /api/periods/checklist, /api/periods/{lock|open|start-closing|close}
- Legacy: components/contributions/PersonalBalanceCard.tsx
- Contexto: SiKnessContext

---

**Actualizado: 17/10/2025**
