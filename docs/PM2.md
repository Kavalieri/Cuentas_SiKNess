# PM2 - Gestión de Entornos DEV y PROD

Este proyecto usa PM2 para mantener dos procesos Node.js corriendo en paralelo:

- Producción: `cuentassik-prod` (puerto 3000)
- Desarrollo: `cuentassik-dev` (puerto 3001)

IMPORTANTE: PM2 se ejecuta con el usuario del sistema `www-data`. Si ejecutas `pm2 status` con tu usuario normal, podrías ver una lista vacía.

## Usuario correcto

Siempre ejecuta PM2 como `www-data`:

```bash
sudo -u www-data pm2 status
sudo -u www-data pm2 logs cuentassik-prod --lines 50 --nostream
```

## Arranque de procesos

- Producción (usa `npm start`):

```bash
sudo -u www-data pm2 start npm --name "cuentassik-prod" -- start -- --port 3000
```

- Desarrollo (usa `npm run dev` en puerto 3001):

```bash
sudo -u www-data pm2 start npm --name "cuentassik-dev" -- run dev -- --port 3001
```

Ambos procesos pueden convivir en paralelo (3000 PROD, 3001 DEV).

## Reinicio y parada

```bash
# Reiniciar PROD
sudo -u www-data pm2 restart cuentassik-prod

# Reiniciar DEV
sudo -u www-data pm2 restart cuentassik-dev

# Parar procesos
sudo -u www-data pm2 stop cuentassik-prod
sudo -u www-data pm2 stop cuentassik-dev
```

## Logs

```bash
sudo -u www-data pm2 logs cuentassik-prod --lines 50 --nostream
sudo -u www-data pm2 logs cuentassik-dev --lines 50 --nostream
```

## Persistencia

Para asegurar que PM2 restaura procesos tras reinicio del servidor:

```bash
sudo -u www-data pm2 save
sudo -u www-data pm2 startup systemd -u www-data --hp /var/www
```

## ecosystem.config.js

Existe un `ecosystem.config.js` para PROD. Revisa que el `cwd` y variables estén correctas y evita secretos en el repo. Para DEV podemos añadir una app similar si se desea.

## Notas

- El usuario `www-data` es el ejecutor de PM2, pero la app se conecta a PostgreSQL usando el usuario `cuentassik_user` (DATABASE_URL en .env).
- No lances tareas peligrosas post-migración sin revisar.
