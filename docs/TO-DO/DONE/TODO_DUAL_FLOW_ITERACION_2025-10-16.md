# TODO Dual-Flow · Iteración 2025-10-16

## Objetivo del día

Consolidar el ciclo completo del doble flujo (periodos → contribuciones → operativa → reporting) con datos reales, dejando lista la experiencia para owners y members y asegurando observabilidad básica.

## Tareas priorizadas

- [x] **Cerrar el lifecycle de periodos y contribuciones**

  - Normalizar `monthly_periods` al modelo definitivo (`phase`, `status`, fechas derivadas) y ajustar migraciones.
  - Implementar stored procedures y server actions para `lockContributions`, `openPeriod`, `closeMonthlyPeriod`, incluyendo revalidaciones y eventos de auditoría.
  - Sustituir placeholders (`temp-user-id`, `lastSyncTime`) por datos reales en `app/dual-flow/actions.ts` y forzar gating por fase en cada acción relevante.

- [x] **Fortalecer la capa de datos dual-flow**

  - Refactorizar `lib/dualFlow.ts` para operar exclusivamente sobre `transactions` + `flow_type`, conservando compatibilidad con llamadas actuales.
  - Publicar endpoints para operaciones de workflow (bloqueo de aportaciones, cierre, auto-pairing manual) exponiendo responses consistentes.
  - Añadir refresco controlado de `mv_household_balances` y `mv_member_pending_contributions` (trigger async + job manual) documentando la política de uso.

- [x] **Activar checklists y guías en la experiencia inicial**

  - [x] Conectar `DualFlowInicioPage` a datos reales (ingresos, checklist owner/member, progreso por fase) y eliminar placeholders.
  - [x] Incorporar timeline, badges y alerts contextuales en `AlertsAndGuidance`, sincronizados con el estado del periodo.
  - [x] Crear wizard de gasto directo para members con vista previa del asiento doble y messaging sobre impacto en contribución.

- [x] **Completar la shell y configuraciones dual-flow**

  - [x] Terminar la top bar (selector hogar/periodo, avatar, accesos rápidos) y añadir menú hamburguesa con opciones de perfil/salida.
  - [x] Revisar la bottom bar para consumir datos reales (badges, estados) y asegurar accesibilidad/estados vacíos.
  - [x] Reparar `dual-flow/configuracion` y vistas de hogar para que todas las acciones críticas funcionen con las nuevas server actions.

- [ ] **Madurar el ledger operativo**

  - Finalizar `TransaccionesPage` como ledger unificado: filtros por flujo, chips de estado, agrupaciones rápidas y panel de approvals.
  - Permitir pairing/aprobación manual desde el ledger (incluyendo feedback de servidor) y alinear nomenclatura camelCase ↔ snake_case.
  - Exponer resumen consolidado (ingresos, gastos, aportes directos) reutilizable en Operativa y Reportes.

- [ ] **Actualizar dashboards y selectores de periodo**

  - Renovar `DashboardEjecutivo`/`dual-flow/periodos` para consumir vistas/materialized views reales y retirar números fijos.
  - Integrar `PeriodSelector` con state global + prefetch SSR, evitando flashes y usando el `householdId` inicial del layout.
  - Alinear KPIs de Reportes con la nueva capa de datos y resaltar pendientes por rol.

- [ ] **Instrumentación y documentación operativa**
  - Definir `trackDualFlowEvent` (esquema + destino) e instrumentar eventos clave (ingreso validado, periodo bloqueado, cierre exitoso).
  - Documentar el flujo de despliegue dual-flow en PM2 (scripts, reinicios, logs) y actualizar `POSTGRESQL_SISTEMA_COMPLETO.md` con la transición a `transactions` como fuente única.
  - Registrar en `MIGRACION_DUAL_FLOW_OPTIMIZADA.md` la política de refresco de vistas y los nuevos procedimientos almacenados.
