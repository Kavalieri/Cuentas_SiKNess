# Plan de Testeo End-to-End · Dual-Flow 2025-10

> Objetivo: validar de extremo a extremo el flujo de negocio para la gestión del periodo mensual "virgen" hasta quedar listo para registrar gastos regulares, cubriendo las rutas owner/member, la experiencia UI/UX y los mecanismos de auditoría.

## 1. Preparación del Entorno

1. **Reiniciar datos** (solo DEV)
   - Ejecutar la tarea `📥 Sincronizar PROD → DEV` si se requiere reproducir escenarios reales.
   - Para entorno limpio, ejecutar el flujo de seeding descrito en `database/migrations/applied/20251014_150000_seed.sql` (ver `database/README.md`).
2. **Levantar servidor**
   - Iniciar `🟢 DEV: Iniciar (con archivado de logs)`.
   - Verificar PM2 con `📊 Estado PM2 General`.
3. **Variables de entorno**
   - Confirmar `.env.development.local` con `DATABASE_URL` apuntando a `cuentassik_dev`.
4. **Cuentas de prueba**
   - Propietario: `caballeropomes@gmail.com`.
   - Miembros: `maria.lopez@example.com`, `juan.garcia@example.com`, `ana.martinez@example.com`.
   - Gmail OAuth habilitado (ver `docs/AUTH_GMAIL_SETUP.md`).

## 2. Escenario Base

### 2.1 Registro / Login

1. Acceder a `/auth/login`.
2. Realizar login con Google.
3. Verificar creación automática de perfil (`profiles`) si no existía.
4. Confirmar que se redirige a `/app/app` (dashboard inicial).

**Checks**

- Registro de evento `AUTH_SIGN_IN` en `dual_flow_events`.
- Perfil con `display_name` sincronizado.

### 2.2 Selección / Creación de Hogar

1. Desde el modal inicial seleccionar hogar existente (`Casa Test`) o crear uno nuevo.
2. Para hogar nuevo: completar nombre, confirmar owner.
3. Validar inserción en `households` y `household_members`.
4. Confirmar actualización de `user_active_household`.

**Checks**

- UI muestra banner "Configura tu periodo".
- `lib/HouseholdContext` entrega `householdId` ≠ null.

### 2.3 Invitaciones a Miembros

| Caso               | Pasos                                                      | Validaciones                                                                         |
| ------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Miembro con cuenta | Usar `Invitar miembro` → correo `maria.lopez@example.com`. | Registro en `invitations` con `status=pending`. Email simulado (ver logs).           |
| Miembro sin cuenta | Repetir con `nuevo.usuario@example.com`.                   | Invitación con bandera `requires_signup=true`. Ver flow de registro tras aceptación. |

**Checks**

- Action `sendHouseholdInvitation` responde `ok`.
- UI actualiza checklist "Invitaciones enviadas".

### 2.4 Aceptación de Invitaciones

1. Abrir la URL `/invitations/accept?token=...` para cada invitado.
2. Para usuarios nuevos: completar formulario de alta.
3. Verificar entrada en `household_members` con rol `member`.
4. Confirmar `dual_flow_events` registra `INVITATION_ACCEPTED`.

## 3. Configuración del Periodo "Virgen"

### 3.1 Selección del Periodo Actual

1. Ir a `/app/periods`.
2. Seleccionar mes en curso (debe iniciar sin datos `expected_amount=0`).
3. Confirmar `PeriodProvider` entrega `period_phase=preparing`.

**Checks**

- Tabla `monthly_periods` muestra `status='preparing'`.
- UI sin datos pre-cargados (estado virgen).

### 3.2 Registro de Ingresos de Miembros

1. Owner abre `Ingresos` en checklist.
2. Completar formulario por cada miembro (`submitMemberIncomeAction`).
3. Owner ejecuta `reviewMemberIncomeAction` → estado `validated`.

**Checks**

- Tabla `member_monthly_income` con registros por miembro.
- UI checklist marca paso como completado.

### 3.3 Captura de Gastos Directos Previos

1. Owner cambia a tab `Gastos directos`.
2. Registrar gasto `gasto_directo` para cada miembro.
3. Confirmar que la action solo está disponible con `period_phase=preparing`.

**Checks**

- `dual_flow_transactions` almacena movimientos `flow_type=direct`.
- UI muestra desglose y contador por miembro.

### 3.4 Cálculo y Validación de Aportaciones

1. Owner abre `Calcular aportaciones`.
2. Solicitar preview (`/api/dual-flow/contributions/preview`).
3. Revisar tabla editable; ajustar si procede.
4. Confirmar con `Validar aportaciones` → `transitionPeriodPhaseAction` a `validation`.

**Checks**

- Tabla `contributions` con columnas `expected_amount`, `direct_flow_credit`, `status=pending`.
- Evento `CONTRIBUTIONS_VALIDATED` registrado.

### 3.5 Confirmación de Aportaciones por Miembro

1. Cada miembro inicia sesión.
2. Navegar a `Mis aportaciones` → marcar `He realizado mi aportación`.
3. UI debe reflejar progreso (barra 0% → 100%).

**Checks**

- `contributions.paid_amount` actualizado.
- Evento `CONTRIBUTION_CONFIRMED` por miembro.

### 3.6 Apertura del Periodo Operativo

1. Owner ejecuta `Abrir periodo`.
2. `period_phase` cambia a `active`.
3. UI desbloquea pestañas de gastos comunes.

**Checks**

- `monthly_periods.status='active'`.
- Checklist marca etapa completa.

## 4. Operativa Durante el Periodo

### 4.1 Registro de Gastos Comunes

1. Miembros crean transacción `gasto` dentro de `Transacciones`.
2. Owner aprueba desde tab `Pendiente aprobación`.

**Checks**

- Transacción replicada en `transactions` con `flow_type=common`.
- Evento `TRANSACTION_APPROVED`.

### 4.2 Ingresos Directos Posteriores

1. Introducir `ingreso_directo` tras periodo activo.
2. Verificar que el doble asiento se registra correctamente.

**Checks**

- `dual_flow_transactions` + `transactions` sincronizados.
- UI muestra nota "aplica a cierre del periodo".

## 5. Preparación de Cierre

### 5.1 Revisión de KPI en Dashboard

1. Acceder a `/app/dashboard`.
2. Revisar cards: pendientes, aportaciones, gastos directos.
3. Validar que los números provienen de queries reales (no hardcode).

### 5.2 Bloqueo de Contribuciones

1. Owner ejecuta acción "Bloquear aportaciones".
2. `period_phase` cambia a `closing`.
3. UI deshabilita nuevos aportes directos.

**Checks**

- `contributions.status` → `locked`.
- Evento `CONTRIBUTIONS_LOCKED`.

### 5.3 Reporte de Pre-Cierre

1. Generar CSV desde resumen.
2. Verificar archivo contiene datos reales (montos por miembro, variaciones).

## 6. Validación Final

1. Confirmar logs PM2 sin errores (`📋 DEV: Ver Logs`).
2. Ejecutar pruebas unitarias relevantes (`npm run test --lib=dualFlow`).
3. Documentar hallazgos en `docs/TO-DO/TODO_DUAL_FLOW_AUDIT_2025-10-14.md`.
4. Capturar métricas `trackDualFlowEvent` en analytics.

## 7. Criterios de Aprobación

- Owner completa checklist hasta estado `closing` sin errores.
- Miembros realizan aportaciones y registran gastos con gating correcto.
- UI sin placeholders; mensajes claros.
- Eventos auditan todas las acciones críticas.
- Periodo listo para cierre (`closing`) con datos reconciliados.

## 8. Observaciones de UX/UI

- Pestaña "Periodos" debe mostrar timeline y CTA coherentes; señalar mejoras si persiste utilidad limitada.
- Validar accesibilidad mínima (labels, foco, mensajes).
- Verificar modo oscuro en todas las pantallas del flujo.

## 9. Seguimiento y Retroalimentación

- Registrar issues encontrados en `docs/TO-DO/TODO_DUAL_FLOW_AUDIT_2025-10-14.md`.
- Para bugs críticos, abrir issue en GitHub (`Kavalieri/CuentasSiK`).
- Planificar sesión de retroalimentación con equipo de producto para decidir despliegue a beta.
