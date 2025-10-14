# scripts/AGENTS.md

> Scripts operativos: PM2, migraciones, sincronización. NO builds de prod salvo petición.

## Reglas clave

- Usa siempre las Tareas de VS Code (Tasks) para ejecutar scripts. No ejecutes comandos manuales.
- DEV y PROD se reinician exclusivamente mediante tareas:
  - DEV: "🟢 DEV: Iniciar", "🔄 DEV: Reiniciar", "🔴 DEV: Detener"
  - PROD: "🟢/🔴/🔄" equivalentes
- No aplicar migraciones desde la app. Usa scripts dedicados y el usuario adecuado.
- No hacer build en producción salvo instrucción explícita.

## Tareas relevantes

- PM2: estado, logs, iniciar/detener/reiniciar
- Migraciones: crear, aplicar en DEV, promover a tested, desplegar a PROD
- Sincronización: PROD → DEV (solo datos)

## Seguridad

- Ejecuta scripts con los usuarios correctos (p. ej., `sudo -u postgres` cuando corresponda).
- No almacenes secretos en scripts; usa `.env.*.local` y carga con `load-env.js` si aplica.
- Migraciones: aplica cambios de estructura conectando como `postgres` y usando `SET ROLE cuentassik_[env]_owner;` según entorno (DEV/PROD).
