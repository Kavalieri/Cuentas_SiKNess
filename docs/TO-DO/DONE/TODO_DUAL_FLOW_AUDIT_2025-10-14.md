# TODO Dual-Flow Audit (2025-10-14)

> **Estado:** Parcialmente completado (migrado a DONE el 2025-10-15). El contenido se conserva como referencia histórica.

## Mapa Operativo Doble Flujo

### Pasos Owner (corresponde a RESUMEN 1-7)

| Paso | Objetivo                                                                    | Fuentes actuales                                                                                   | Gap detectado                                                                                      | Acción inmediata                                                                                                                                                                                     |
| ---- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Validar ingresos miembros + objetivo mensual                                | `household_settings`, `app/dual-flow/actions.getHouseholdSettingsAction`, `MonthlyGoalConfigModal` | Falta registro ingresos miembros (solo placeholder `temp-user-id`), no checklist ni bloqueo previo | [COMPLETADO 2025-10-14] tabla `member_monthly_income` y acciones `submitMemberIncome`/`reviewMemberIncome` listas; falta UI con checklist y bloqueo previo                                           |
| 2    | Recopilar gastos directos previos al cálculo                                | `dual_flow_transactions` (tipo directo), `createDualFlowTransaction`                               | No hay estado “periodo en prevalidación”, falta guía visual y bloqueos de tipo                     | Añadir campo `period_phase` en `monthly_periods`, validar server action para permitir solo `gasto_directo` cuando fase = `preparing`, UI con contador por miembro                                    |
| 3    | Calcular y validar % aportación por tipo (igual/proporcional/personalizado) | `contributionTypes.ts`, `calculateMemberContribution` (legacy)                                     | Lógica duplicada Supabase vs. Postgres, no pantalla de revisión previa                             | Centralizar cálculo en `lib/contributions` con inputs `<ingresos, gastos directos, objetivo>`, endpoint `/api/dual-flow/contributions/preview`, UI con tabla editable + botón “Validar aportaciones” |
| 4    | Confirmar aportaciones tras descontar directos                              | `contributions` (sólo parte legacy), `adjustment-actions.ts`                                       | Ajustes confusos, sin estado “aporte recibido”                                                     | Simplificar `contributions` con campos `expected_amount`, `direct_flow_credit`, `paid_amount`, `status`; crear action `confirmContributionReceipt`; UI checklist por miembro                         |
| 5    | Validar aportaciones y abrir periodo operativo                              | `monthly_periods.status`, `lib/periods.ts`                                                         | Estados actuales inconsistentes (`active` único valor)                                             | Redefinir enum `period_status` = `preparing`, `validation`, `active`, `closing`, `closed`; server action `openPeriod`, `lockContributions`; UI banner + CTA “Abrir periodo”                          |
| 6    | Registrar gastos/ingresos durante periodo activo                            | `createDualFlowTransaction`, `approveDualFlowTransaction`                                          | Falta diferenciación clara UI entre flujos, auditoría owner                                        | Rediseñar `TransaccionesPage` como ledger único que combine flujos común/directo con filtros rápidos, badges de estado y alertas de aprobación para owners                                           |
| 7    | Cierre mensual y reporting                                                  | `period_close` scripts (no implementado), `docs/MODELO_DATOS_DUAL_FLOW.md`                         | Sin server action real, sin vistas de resumen final                                                | Implementar procedure `closeMonthlyPeriod`, generar reportes `household_monthly_summary`, UI resumen + descarga CSV                                                                                  |

### Pasos Member (RESUMEN 1-5)

| Paso | Objetivo                          | Fuentes actuales                                                            | Gap detectado                                                  | Acción inmediata                                                                                                      |
| ---- | --------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1    | Informar ingresos propios         | No existe formulario específico (solo placeholders en `DualFlowInicioPage`) | No hay tabla ni action                                         | Reutilizar modelo de ingresos del paso owner 1 con action `submitMemberIncome`, guardado provisional hasta validación |
| 2    | Añadir gastos directos            | `createDualFlowTransaction` con tipo `gasto_directo`                        | Falta wizard guiado, sin explicación doble movimiento          | Crear formulario dedicado con resumen “esto descuenta tu contribución”; mostrar vista previa del asiento doble        |
| 3    | Confirmar aportaciones            | `contributions` (legacy)                                                    | No existe UI para que el miembro marque “aportado”             | Nuevo endpoint `confirmMemberPayment`, UI con barra de progreso y estado por miembro                                  |
| 4    | Registrar gastos comunes/ingresos | `createDualFlowTransaction` tipos `gasto` / `ingreso`                       | Falta gating por estado del periodo, owner aprueba manualmente | Integrar approval flow en ledger unificado con alertas y filtros por estado                                           |
| 5    | Consultar resúmenes               | `DashboardEjecutivo` (en refactor), `AlertsAndGuidance`                     | Métricas incompletas, sin segmentación por rol                 | Rediseñar dashboard con cards “Sigue estos pasos”, vistas filtradas por rol                                           |

### Cross-Cutting Keys

- `flow_type` obligatorio en cada transacción (`common`, `direct`), con helper único en `lib/dualFlow.ts`.
- `period_phase` gobierna qué server actions están disponibles (gating central en `PeriodService`).
- Eventos de auditoría (`dual_flow_events`) para registrar aprobaciones, bloqueos, cierres.
- Ledger único de transacciones (mezcla flujos común/directo) con filtros visuales, resaltados y agrupaciones por fase para owners y members.
- UI basada en “timeline” y alertas contextuales (`AlertsAndGuidance`) sincronizadas con `period_phase` y rol.
- Dual-flow como experiencia por defecto tras login: eliminar flags/beta y deshabilitar la UI legacy en dev/prod.
- Documentar onboarding transaccional: creación de hogar + miembros + settings + savings en `lib/onboarding.ts` usando `transaction()` de `lib/db`.

## Avances 2025-10-14

- [x] Fundaciones de esquema (`member_monthly_income`, `period_phase`, columnas en `contributions` y `transactions`), migración promovida a `tested/`.
- [x] Nuevas server actions para ingresos y fases de período (`submitMemberIncomeAction`, `reviewMemberIncomeAction`, `transitionPeriodPhaseAction`) con eventos de auditoría.
- [x] Shell dual-flow reorganizada: `layout` precarga `PeriodProvider`, `BottomNavDualFlow` ofrece tabs (`Inicio`, `Operativa`, `Aportaciones`, `Reportes`, `Configuración`) y se añadieron scaffolds SSR/cliente para las páginas nuevas con redirecciones desde rutas legacy.
- [x] API `POST /api/dual-flow/ledger/get` disponible y Operativa consume el ledger unificado vía `WorkflowManager` con estados de carga/errores.
- [x] Página `dual-flow/aportaciones` conectada a Postgres (ingresos, contribuciones y fase del período) con compatibilidad hacia tablas legacy.
- [ ] Integrar UI (checklists, alerts y gating) con las nuevas acciones y fases del período.

## Avances 2025-10-15

- [x] Página `dual-flow/reportes` ahora consume datos reales de Postgres (balance dual-flow, vistas materializadas opcionales y pendientes por miembro) con compatibilidad legacy y formato de moneda respetando la configuración del hogar.

## Prioridad inmediata (Octubre 2025)

- [x] Eliminar flags `ENABLE_DUAL_FLOW` y `DUAL_FLOW_BETA_USERS`, ajustando layouts y middleware para redirigir a `/dual-flow` tras login.
- [x] Retirar navegación legacy (views `app/app` antiguas) y exponer la nueva shell principal con tabs (`Inicio`, `Operativa`, `Aportaciones`, `Reportes`, `Configuración`).
- [ ] Conectar el contenido de `operativa`, `aportaciones` y `reportes` a datos reales (ledger unificado, contribuciones, KPIs) y retirar los placeholders previos.
  - [x] Operativa ya muestra ledger real y resumen automático.
  - [x] `Aportaciones` conectado a Postgres (ingresos, contribuciones, fase del período) con compatibilidad legacy.
  - [x] `Reportes` conectado a Postgres (balance, KPIs, vistas opcionales) con detección de capacidades.
- [x] Revisar onboarding para forzar creación/selección de hogar desde flujo dual-flow y sincronizar `PeriodProvider`. (2025-10-16) Botones redirigen a `/dual-flow/hogar/create` y aceptación de invitaciones envía al shell dual-flow con revalidaciones asociadas.
- [x] Ajustar middleware para respetar rutas de onboarding heredadas y evitar redirecciones sobre APIs (`/api`, `/app/api`). (2025-10-16)
- [x] Validar despliegue en DEV (scripts PM2) asegurando que no queden rutas huérfanas. (2025-10-15) Middleware ahora protege rutas `/dual-flow/*` además de `/app`, evitando accesos anónimos y confirmando redirecciones correctas tras el arranque dev.

## Database & Schema

- [x] Confirmar unificacion del modelo: decidir entre `dual_flow_transactions` dedicado vs. columna `flow_type` en `transactions`, y documentar transicion para evitar duplicidad de fuentes. (2025-10-15) Decisión registrada: `transactions` + `flow_type` será la fuente única, con plan de transición capturado en `docs/MIGRACION_DUAL_FLOW_OPTIMIZADA.md`.
- [x] Preparar migración en `database/migrations/development/` para extender `transactions` (campos de estado/pairing) y generar vistas auxiliares conforme al plan de `MIGRACION_DUAL_FLOW_OPTIMIZADA.md`. (2025-10-16) `20251015_015950_extend_transactions_dual_flow.sql` añade columnas dual-flow y vista `v_dual_flow_transactions_unified`.
- [x] Portar triggers y stored procedures de auto-pairing (`find_pairing_candidates`, `execute_auto_pairing`, `trigger_dual_flow_auto_pairing`) para que operen sobre `transactions`. (2025-10-16) Migración `20251015_015950_extend_transactions_dual_flow.sql` recrea funciones y trigger en `transactions` y elimina el hook sobre `dual_flow_transactions`.
- [x] Diseñar conversión de `dual_flow_transactions` en vista materializada o tabla sombra alimentada por `transactions`, con cronograma de deprecación. (2025-10-16) Ver sección "Diseño de conversión de dual_flow_transactions" en `docs/MIGRACION_DUAL_FLOW_OPTIMIZADA.md`.
- [ ] Normalizar `monthly_periods` contra el esquema real: las queries actuales esperan columnas `name/start_date/end_date` y estados `open/pending_close`, pero la tabla solo expone `month/year/status(text)` con valores `active` y derivados; definir el modelo final y aplicar migraciones o refactors coordinados.
- [ ] Implementar refresco controlado de vistas materializadas (`mv_household_balances`, `mv_member_pending_contributions`) para entornos con alto volumen, evitando triggers costosos en produccion.
- [ ] Completar stored procedures faltantes del workflow (liquidaciones, cierre de periodo) siguiendo especificacion de `MODELO_DATOS_DUAL_FLOW.md`.

## Server Actions & APIs

- [ ] Reemplazar placeholders (`temp-user-id`, `lastSyncTime`) en `app/dual-flow/actions.ts` por datos reales (`getCurrentUser`, perfiles) y anadir manejo de errores.
- [x] Revisar API `/api/dual-flow/dashboard/stats` para alinear columnas y estados reales: usar `month/year` + `getMonthDateRange()` en lugar de campos inexistentes (`name/start_date/end_date`) y sincronizar valores de estado (`active` vs. `open/pending_close/closed`). (2025-10-17) La respuesta ahora incluye metadatos normalizados de fase/estado y el dashboard cliente consume el badge derivado.
- [x] Garantizar que `PeriodProvider` utilice endpoints internos sin dependencias a fetch duplicados (optimizar `loadPeriodData` con un unico round-trip y caching de `householdId`). (2025-10-15) Endpoint `/api/dual-flow/periods/load` unifica ensure+get y `PeriodProvider` ahora lo consume.
- [ ] Anadir endpoints para operaciones clave del workflow (bloqueo de contribuciones, cierre de periodo, auto-pairing manual) y revalidaciones precisas.
- [ ] Refactorizar `lib/dualFlow.ts` para que inserte/lea directamente de `transactions` usando `flow_type` y conserve compatibilidad con la API actual.

## Client Components & UX

- [ ] Conectar `DualFlowInicioPage` a datos reales: eliminar placeholders visuales, reutilizar componentes existentes y alinear pasos del workflow con estados del periodo.
- [ ] Construir `DualFlowShell` con top bar (selector de hogar/periodo, avatar, acciones rápidas) y bottom bar con 5 pestañas (`Inicio`, `Operativa`, `Aportaciones`, `Reportes`, `Configuración`) alimentadas por datos reales (scaffolding inicial listo, falta wiring de datos, accesibilidad y estados vacíos).
- [ ] Reparar la página de configuración (`dual-flow/configuracion`) y asegurar que las acciones críticas funcionen. (`dual-flow/hogar`)
- [ ] Completar `TransaccionesPage` como ledger combinado con filtros dinámicos, chips de flujo, gráficos ligeros y secciones destacadas para approvals y avisos.
- [ ] Actualizar `Periodos` dashboard (`DashboardEjecutivo`) para derivar estadisticas desde vistas materializadas o queries reales; retirar numeros fijos (`42`, `30%`).
- [ ] Integrar `PeriodSelector` con state global + SSR prefetch para evitar flashes de carga; recibir `householdId` inicial desde el layout para eliminar fetch redundantes y exponer estado del periodo (configuracion/pre-validacion/validado/cerrado).
- [ ] Añadir botón hamburguesa (menú de 3 líneas) en la barra superior que despliegue opciones de perfil, logout y accesos rápidos.
- [ ] Incorporar componentes visuales (badges, indicadores de progreso, timeline interactiva) para guiar a owners y members durante el checklist mensual.
- [ ] Consolidar el ledger de `operativa` usando `WorkflowManager` con datos reales y ajustar la nomenclatura snake_case/camelCase compartida.
  - [x] Wiring inicial completado (fetch, estados vacíos, `WorkflowManager`).
  - [x] Acciones de aprobación/rechazo listas con feedback en `WorkflowManager`.

## Integration & Observability

- [ ] Definir metricas y eventos (`trackDualFlowEvent`) con esquema consistente y destino (logs, analytics) antes de activar en produccion.
- [ ] Documentar procesos PM2 (dev) vinculados al rollout dual-flow, incluyendo pasos de despliegue y monitoreo de logs especificos.
- [ ] Actualizar `POSTGRESQL_SISTEMA_COMPLETO.md` con la transición a `transactions` como fuente única una vez desplegada.
