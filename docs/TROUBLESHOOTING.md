# 🛠️ Troubleshooting

Guía breve para resolver incidencias comunes al arrancar o operar CuentasSiK.

## 1) La app no arranca

- Verifica Node y build: Node 18+, `npm run build` sin errores.
- Revisa logs del proceso (systemd/PM2/Docker) para el stacktrace.

## 2) Error de conexión a PostgreSQL

- Comprueba `DATABASE_URL`:
  - `postgresql://cuentassik_user:PASSWORD@HOST:5432/cuentassik_dev|prod`
- Usuario/DB existen: `sudo -u postgres psql -c "\\du"` y `\\l`.
- Puertos: confirma que 5432 está accesible localmente.
- En DEV aplica seed base: `database/seeds/schema_only.sql`.

## 3) JWT_SECRET no definido

- Debe ser una cadena segura y no vacía.
- Genera uno:

```bash
openssl rand -base64 32
```

- Establécelo en el entorno (systemd/PM2 o `.env.production.local`).

## 4) Emails no llegan (SMTP)

- Verifica host/puerto y `SMTP_SECURE` correcto (false→587 TLS, true→465 SSL).
- En Gmail usa “Contraseña de aplicación”.
- Revisa logs y carpeta de spam del receptor.

## 5) Puerto ocupado / Proxy inverso

- DEV: la app corre en 3001 (`npm run dev`).
- PROD: `npm start` (Next.js en 3000 por defecto).
- En Nginx/Apache apunta el proxy al puerto real de la app.

## 6) Variables de entorno no aplican

- systemd: usa `Environment=` o `EnvironmentFile=` y reinicia el servicio.
- PM2: define `env_production` en `ecosystem.config.js` o exporta antes de arrancar.

## 7) Migraciones/datos incoherentes (DEV)

- Usa scripts:
  - `scripts/sync_prod_to_dev.sh` (sincroniza datos desde PROD)
  - `scripts/apply_migrations_dev.sh` (estructura en DEV)

Si persiste, abre un issue con logs y pasos para reproducir.

# 🛠️ Troubleshooting

Guía breve para resolver incidencias comunes al arrancar u operar CuentasSiK.

## 1) La app no arranca

- Verifica Node y build: Node 18+, `npm run build` sin errores.
- Revisa logs del proceso (systemd/PM2) para el stacktrace.

## 2) Error de conexión a PostgreSQL

- Comprueba `DATABASE_URL`:
  - `postgresql://cuentassik_user:PASSWORD@HOST:5432/cuentassik_dev|prod`
- Usuario/DB existen: `sudo -u postgres psql -c "\\du"` y `sudo -u postgres psql -c "\\l"`.
- Puerto 5432 accesible localmente.
- En DEV aplica seed base: `database/seeds/schema_only.sql`.

## 3) JWT_SECRET no definido

- Debe ser una cadena segura y no vacía.
- Genera uno:

```bash
openssl rand -base64 32
```

- Establécelo en el entorno (systemd/PM2 o `.env.production.local`).

## 4) Emails no llegan (SMTP)

- Verifica host/puerto y `SMTP_SECURE` correcto (false→587 TLS, true→465 SSL).
- En Gmail usa “Contraseña de aplicación”.
- Revisa logs y carpeta de spam del receptor.

## 5) Puertos / Proxy inverso

- DEV: la app corre en 3001 (`npm run dev`).
- PROD: `npm start` (Next.js en 3000 por defecto).
- En Nginx/Apache apunta el proxy al puerto real de la app.

## 6) Variables de entorno no aplican

- systemd: usa `Environment=` o `EnvironmentFile=` y reinicia el servicio.
- PM2: define `env_production` en `ecosystem.config.js` o exporta antes de arrancar.

## 7) Migraciones/datos incoherentes (DEV)

- Usa scripts:
  - `scripts/sync_prod_to_dev.sh` (sincroniza datos desde PROD)
  - `scripts/apply_migrations_dev.sh` (estructura en DEV)

Si persiste, abre un issue con logs y pasos para reproducir.
