# TODO Dual-Flow Audit (2025-10-14)

## Mapa Operativo Doble Flujo

### Pasos Owner (corresponde a RESUMEN 1-7)

| Paso | Objetivo                                                                    | Fuentes actuales                                                                                   | Gap detectado                                                                                      | Acción inmediata                                                                                                                                                                                     |
| ---- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Validar ingresos miembros + objetivo mensual                                | `household_settings`, `app/dual-flow/actions.getHouseholdSettingsAction`, `MonthlyGoalConfigModal` | Falta registro ingresos miembros (solo placeholder `temp-user-id`), no checklist ni bloqueo previo | [COMPLETADO 2025-10-14] tabla `member_monthly_income` y acciones `submitMemberIncome`/`reviewMemberIncome` listas; falta UI con checklist y bloqueo previo                                           |
| 2    | Recopilar gastos directos previos al cálculo                                | `dual_flow_transactions` (tipo directo), `createDualFlowTransaction`                               | No hay estado “periodo en prevalidación”, falta guía visual y bloqueos de tipo                     | Añadir campo `period_phase` en `monthly_periods`, validar server action para permitir solo `gasto_directo` cuando fase = `preparing`, UI con contador por miembro                                    |
| 3    | Calcular y validar % aportación por tipo (igual/proporcional/personalizado) | `contributionTypes.ts`, `calculateMemberContribution` (legacy)                                     | Lógica duplicada Supabase vs. Postgres, no pantalla de revisión previa                             | Centralizar cálculo en `lib/contributions` con inputs `<ingresos, gastos directos, objetivo>`, endpoint `/api/dual-flow/contributions/preview`, UI con tabla editable + botón “Validar aportaciones” |
| 4    | Confirmar aportaciones tras descontar directos                              | `contributions` (sólo parte legacy), `adjustment-actions.ts`                                       | Ajustes confusos, sin estado “aporte recibido”                                                     | Simplificar `contributions` con campos `expected_amount`, `direct_flow_credit`, `paid_amount`, `status`; crear action `confirmContributionReceipt`; UI checklist por miembro                         |
| 5    | Validar aportaciones y abrir periodo operativo                              | `monthly_periods.status`, `lib/periods.ts`                                                         | Estados actuales inconsistentes (`active` único valor)                                             | Redefinir enum `period_status` = `preparing`, `validation`, `active`, `closing`, `closed`; server action `openPeriod`, `lockContributions`; UI banner + CTA “Abrir periodo”                          |
| 6    | Registrar gastos/ingresos durante periodo activo                            | `createDualFlowTransaction`, `approveDualFlowTransaction`                                          | Falta diferenciación clara UI entre flujos, auditoría owner                                        | Rediseñar `TransaccionesPage` con tabs `Cuenta común`, `Gastos directos`, `Pendiente aprobación`; alerts para owner                                                                                  |
| 7    | Cierre mensual y reporting                                                  | `period_close` scripts (no implementado), `docs/MODELO_DATOS_DUAL_FLOW.md`                         | Sin server action real, sin vistas de resumen final                                                | Implementar procedure `closeMonthlyPeriod`, generar reportes `household_monthly_summary`, UI resumen + descarga CSV                                                                                  |

### Pasos Member (RESUMEN 1-5)

| Paso | Objetivo                          | Fuentes actuales                                                            | Gap detectado                                                  | Acción inmediata                                                                                                      |
| ---- | --------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1    | Informar ingresos propios         | No existe formulario específico (solo placeholders en `DualFlowInicioPage`) | No hay tabla ni action                                         | Reutilizar modelo de ingresos del paso owner 1 con action `submitMemberIncome`, guardado provisional hasta validación |
| 2    | Añadir gastos directos            | `createDualFlowTransaction` con tipo `gasto_directo`                        | Falta wizard guiado, sin explicación doble movimiento          | Crear formulario dedicado con resumen “esto descuenta tu contribución”; mostrar vista previa del asiento doble        |
| 3    | Confirmar aportaciones            | `contributions` (legacy)                                                    | No existe UI para que el miembro marque “aportado”             | Nuevo endpoint `confirmMemberPayment`, UI con barra de progreso y estado por miembro                                  |
| 4    | Registrar gastos comunes/ingresos | `createDualFlowTransaction` tipos `gasto` / `ingreso`                       | Falta gating por estado del periodo, owner aprueba manualmente | Integrar approval flow con alertas y filtros por estado                                                               |
| 5    | Consultar resúmenes               | `DashboardEjecutivo` (en refactor), `AlertsAndGuidance`                     | Métricas incompletas, sin segmentación por rol                 | Rediseñar dashboard con cards “Sigue estos pasos”, vistas filtradas por rol                                           |

### Cross-Cutting Keys

- `flow_type` obligatorio en cada transacción (`common`, `direct`), con helper único en `lib/dualFlow.ts`.
- `period_phase` gobierna qué server actions están disponibles (gating central en `PeriodService`).
- Eventos de auditoría (`dual_flow_events`) para registrar aprobaciones, bloqueos, cierres.
- UI basada en “timeline” y alertas contextuales (`AlertsAndGuidance`) sincronizadas con `period_phase` y rol.
- Documentar onboarding transaccional: creación de hogar + miembros + settings + savings en `lib/onboarding.ts` usando `transaction()` de `lib/db`.

## Avances 2025-10-14

- [x] Fundaciones de esquema (`member_monthly_income`, `period_phase`, columnas en `contributions` y `transactions`), migración promovida a `tested/`.
- [x] Nuevas server actions para ingresos y fases de período (`submitMemberIncomeAction`, `reviewMemberIncomeAction`, `transitionPeriodPhaseAction`) con eventos de auditoría.
- [x] Plan de testeo E2E documentado en `docs/QA_DUAL_FLOW_E2E_TEST_PLAN.md`.
- [ ] Integrar UI (checklists, alerts y gating) con las nuevas acciones y fases del período.

## Database & Schema

- [ ] Confirmar unificacion del modelo: decidir entre `dual_flow_transactions` dedicado vs. columna `flow_type` en `transactions`, y documentar transicion para evitar duplicidad de fuentes.
- [ ] Revisar migraciones `tested/20251013_*` para asegurar coherencia de enums (`transaction_type_enum`, `transaction_type_dual_flow`) y evitar conflicto entre tipos similares.
- [ ] Normalizar `monthly_periods` contra el esquema real: las queries actuales esperan columnas `name/start_date/end_date` y estados `open/pending_close`, pero la tabla solo expone `month/year/status(text)` con valores `active` y derivados; definir el modelo final y aplicar migraciones o refactors coordinados.
- [ ] Implementar refresco controlado de vistas materializadas (`mv_household_balances`, `mv_member_pending_contributions`) para entornos con alto volumen, evitando triggers costosos en produccion.
- [ ] Completar stored procedures faltantes del workflow (liquidaciones, cierre de periodo) siguiendo especificacion de `MODELO_DATOS_DUAL_FLOW.md`.

## Server Actions & APIs

- [ ] Reemplazar placeholders (`temp-user-id`, `lastSyncTime`) en `app/dual-flow/actions.ts` por datos reales (`getCurrentUser`, perfiles) y anadir manejo de errores.
- [ ] Revisar API `/api/dual-flow/dashboard/stats` para alinear columnas y estados reales: usar `month/year` + `getMonthDateRange()` en lugar de campos inexistentes (`name/start_date/end_date`) y sincronizar valores de estado (`active` vs. `open/pending_close/closed`).
- [ ] Garantizar que `PeriodProvider` utilice endpoints internos sin dependencias a fetch duplicados (optimizar `loadPeriodData` con un unico round-trip y caching de `householdId`).
- [ ] Anadir endpoints para operaciones clave del workflow (bloqueo de contribuciones, cierre de periodo, auto-pairing manual) y revalidaciones precisas.

## Client Components & UX

- [ ] Conectar `DualFlowInicioPage` a datos reales: eliminar placeholders visuales, reutilizar componentes existentes y alinear pasos del workflow con estados del periodo.
- [ ] Completar `TransaccionesPage` con tabs funcionales (contribuciones, balance) consumiendo queries reales y acciones de mutacion.
- [ ] Actualizar `Periodos` dashboard (`DashboardEjecutivo`) para derivar estadisticas desde vistas materializadas o queries reales; retirar numeros fijos (`42`, `30%`).
- [ ] Integrar `PeriodSelector` con state global + SSR prefetch para evitar flashes de carga; recibir `householdId` inicial desde el layout para eliminar fetch redundantes y exponer estado del periodo (configuracion/pre-validacion/validado/cerrado).

## Integration & Observability

- [ ] Definir metricas y eventos (`trackDualFlowEvent`) con esquema consistente y destino (logs, analytics) antes de activar en produccion.
- [ ] Revisar feature flags (`ENABLE_DUAL_FLOW`, `DUAL_FLOW_BETA_USERS`) y flujo de activacion por hogar, asegurando fallback seguro hacia `/app/app`.
- [ ] Documentar procesos PM2 (dev/prod) vinculados al rollout dual-flow, incluyendo pasos de despliegue y monitoreo de logs especificos.
