# Migración Dual-Flow Optimizada

## Resumen ejecutivo

Tras la refactorización del shell Dual-Flow y la adopción del nuevo `PeriodProvider`, confirmamos que el modelo de datos definitivo debe consolidarse sobre la tabla `transactions` enriquecida con la columna `flow_type`. Este documento formaliza la decisión, describe el plan de transición y establece los pasos para retirar gradualmente `dual_flow_transactions`, evitando fuentes duplicadas y simplificando el ledger unificado.

## Decisión

- **Fuente de verdad**: `transactions` (con `flow_type`, `transaction_pair_id`, `real_payer_id`, `performed_*`).
- **Tabla heredada**: `dual_flow_transactions` se mantendrá únicamente como staging temporal para funcionalidades que aún dependen de sus triggers (auto-pairing y estados enriquecidos).
- **Objetivo a corto plazo**: portar triggers/procedimientos (`find_pairing_candidates`, `execute_auto_pairing`, `trigger_dual_flow_auto_pairing`) a la capa común de `transactions`.
- **Objetivo a mediano plazo**: deprecación completa de `dual_flow_transactions`, conservándola como vista o tabla histórica hasta finalizar la migración.

## Motivaciones

1. **Reducción de duplicidad**: los endpoints recientes (`/api/dual-flow/ledger/get`, `/api/dual-flow/periods/load`) ya agregan datos desde `transactions`; mantener dos tablas genera riesgo de inconsistencias.
2. **Compatibilidad App Router**: la UI dual-flow consume un único ledger. Consolidar simplifica validaciones y componentes (`WorkflowManager`, `TransaccionesPage`).
3. **Auditoría unificada**: `transactions` ya incorpora campos auditables; duplicar auditoría en `dual_flow_transactions` implica triggers redundantes.
4. **Mantenibilidad**: migraciones futuras serán más simples si solo evoluciona una tabla.

## Plan de transición

1. **Corto plazo (Oct 2025)**

   - Añadir a `transactions` cualquier campo que aún falte para cubrir estado (`dual_flow_status`) y pairing manual.
   - Replicar lógica de auto-pairing mediante funciones que operen sobre `transactions` filtrando por `flow_type = 'direct'` y `transaction_pair_id`.
   - Ajustar `lib/dualFlow.ts` para escribir/leer solo desde `transactions`, manteniendo wrappers que aún respondan a la API actual.

2. **Mediano plazo**

   - Convertir `dual_flow_transactions` en **vista materializada** o tabla sombra alimentada por `transactions` (solo lectura para reportes históricos).
   - Actualizar stored procedures (`find_pairing_candidates`, `execute_auto_pairing`) para apuntar a `transactions`.
   - Depurar triggers en `dual_flow_transactions` e introducir equivalentes en `transactions`.

3. **Largo plazo**
   - Retirar escritura directa sobre `dual_flow_transactions` desde código.
   - Migrar datos residuales al nuevo esquema.
   - Documentar proceso de eliminación definitiva (o mantener únicamente como vista de compatibilidad).

## Consideraciones operativas

- **Backups**: realizar snapshot de ambas tablas antes de cada paso relevante (especialmente al mover triggers).
- **Scripts**: actualizar `scripts/apply_migrations_dev.sh` para incluir migraciones que toquen triggers y vistas nuevas.
- **Monitoreo**: instrumentar métricas (`trackDualFlowEvent`) para detectar errores al registrar movimientos directos.

## Política de refresco de vistas dual-flow

- **Disparador automático**: cada vez que una server action inserta, aprueba, rechaza o empareja transacciones dual-flow se invoca `refreshDualFlowMaterializedViews()`, que delega en `refresh_critical_matviews()` para mantener sincronizadas `mv_household_balances`, `mv_member_pending_contributions` y `household_stats`.
- **Ejecución controlada**: el refresco se ejecuta de forma síncrona dentro de la acción y captura errores de manera segura para no bloquear la operación principal; las rutas se revalidan solo después de completar el refresco.
- **Job manual**: ante operaciones masivas (p. ej. importaciones) puede invocarse la misma función desde scripts administrativos o consola (`SELECT refresh_critical_matviews();`) para forzar el snapshot.
- **Buenas prácticas**: evitar disparar refrescos en bucles; si se aplican lotes grandes de mutaciones, agruparlos y lanzar un único refresco manual al final.

## Próximos pasos inmediatos

1. Elaborar migración en `database/migrations/development/` que añada los campos faltantes a `transactions` (si procede) y cree vistas auxiliares.
2. Refactorizar `lib/dualFlow.ts` para que `createDualFlowTransaction` inserte en `transactions` usando `flow_type` y `type` extendidos.
3. Ajustar tests/unitarios (cuando existan) para validar el nuevo flujo.
4. Documentar en `POSTGRESQL_SISTEMA_COMPLETO.md` el cambio una vez desplegado.

## Diseño de conversión de `dual_flow_transactions`

Con la lógica de auto-pairing ya ejecutándose sobre `transactions`, el siguiente paso es convertir `dual_flow_transactions` en una vista (o tabla sombra) que delegue la lectura al nuevo origen sin mantener escritura activa. El diseño propuesto se ejecutará en una migración dedicada con los pasos siguientes:

1. **Congelar escritura**: revocar permisos `INSERT/UPDATE/DELETE` en `dual_flow_transactions` para todos los roles excepto el owner, evitando nuevas inserciones durante la transición.
2. **Renombrar tabla actual**: `ALTER TABLE dual_flow_transactions RENAME TO dual_flow_transactions_legacy;` para preservar los datos históricos.
3. **Crear vista compatible**: definir `CREATE VIEW dual_flow_transactions AS SELECT * FROM v_dual_flow_transactions_unified;` asegurando el mismo orden de columnas que consumen los reportes existentes.
4. **Backfill opcional**: si se requiere conservar registros legacy, ejecutar `INSERT INTO transactions (...) SELECT ... FROM dual_flow_transactions_legacy WHERE transaction_pair_id IS NULL;` adaptando campos que no existan.
5. **Triggers de lectura**: como ahora la vista se alimenta del ledger principal, eliminar triggers restantes en la tabla renombrada (`dual_flow_transactions_legacy`) y documentar que solo se usa para auditoría.
6. **Compatibilidad temporal**: mantener la tabla legacy durante al menos un ciclo mensual; pasado ese tiempo, evaluar si basta con un respaldo CSV y eliminarla definitivamente.

Se incluirá en la migración la creación de una vista materializada opcional (`mv_dual_flow_ledger`) para escenarios de reporting que requieran snapshots y se añadirá la actualización de permisos (`GRANT SELECT`) sobre la nueva vista. Este diseño permitirá retirar gradualmente dependencias directas de la tabla legacy sin romper integraciones existentes.
