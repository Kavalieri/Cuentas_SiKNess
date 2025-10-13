# PM2 - Gestión de Procesos y Variables de Entorno

## ✅ Problema Resuelto

**Estado anterior**: PM2 tenía credenciales hardcodeadas expuestas en `ecosystem.config.js`, causando problemas de seguridad y configuración.

**Estado actual**: Sistema seguro con variables de entorno cargadas dinámicamente desde archivos `.env`.

## 🏗️ Arquitectura Final

### Usuarios del Sistema

- **`www-data`**: Ejecuta procesos de producción (PM2 daemon)
- **`kava`**: Ejecuta procesos de desarrollo (usuario del sistema)

### Bases de Datos

- **`cuentassik_prod`**: Producción (puerto 5432)
- **`cuentassik_dev`**: Desarrollo (puerto 5432)

### Procesos PM2

- **`cuentassik-prod`**: Puerto 3000, ejecuta como `www-data`
- **`cuentassik-dev`**: Puerto 3001, ejecuta como `kava`

## 🔧 Configuración PM2

### ecosystem.config.js

```javascript
module.exports = {
  apps: [
    {
      name: 'cuentassik-prod',
      script: 'npm',
      args: 'start',
      cwd: '/home/kava/workspace/proyectos/CuentasSiK/repo',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        // ... otras variables
      },
      error_file: '/var/www/.pm2/logs/cuentassik-prod-error.log',
      out_file: '/var/www/.pm2/logs/cuentassik-prod-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
    // ... configuración desarrollo
  ],
};
```

## 📁 Scripts de Gestión

### Inicio Individual

```bash
# Producción
./scripts/pm2-start.sh prod

# Desarrollo
./scripts/pm2-start.sh dev
```

### Inicio Masivo

```bash
./scripts/pm2-start-all.sh
```

### Detención

```bash
# Todos los procesos
./scripts/pm2-stop-all.sh

# Individual
./scripts/pm2-stop.sh prod
./scripts/pm2-stop.sh dev
```

## 🔐 Variables de Entorno

### Archivos .env

- **`.env.development.local`**: Variables para desarrollo
- **`.env.production.local`**: Variables para producción

### Formato Requerido

```bash
# Base de datos
DATABASE_URL="postgresql://cuentassik_user:PASSWORD@localhost:5432/cuentassik_prod"

# JWT
JWT_SECRET="your-super-secret-jwt-key"

# SMTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="email@example.com"
SMTP_PASS="app-password"
SMTP_FROM="noreply@example.com"

# URLs
NEXT_PUBLIC_SITE_URL="https://tu-dominio.com"
NEXT_PUBLIC_SYSTEM_ADMIN_EMAIL="admin@example.com"
```

## 🚀 Auto-Restart y Monitoreo

### Configuración de Auto-Restart

- **Producción**: Reinicio automático hasta 10 veces, memoria máxima 500M
- **Desarrollo**: Reinicio automático hasta 20 veces, memoria máxima 300M, hot-reload activado

### 📁 Gestión de Logs Mejorada

#### Archivado Automático de Logs

Cada vez que inicias un proceso con `./scripts/pm2-start.sh`, los logs anteriores se archivan automáticamente:

```bash
# Los logs se mueven a logs/archive/ con timestamp
logs/archive/cuentassik-dev-error_20251013_164714.log
logs/archive/cuentassik-dev-out_20251013_164714.log
```

#### Limpieza de Logs Archivados

```bash
# Limpiar logs más antiguos que 7 días (por defecto)
./scripts/pm2-clean-logs.sh

# Mantener logs de 30 días
./scripts/pm2-clean-logs.sh 30

# Ver estadísticas de logs archivados
./scripts/pm2-clean-logs.sh 0  # No elimina nada, solo muestra stats
```

### Logs con Timestamp

```
0|cuentassik-prod|2025-10-12 02:11:22 +02:00: [mensaje]
```

### Comandos de Monitoreo

```bash
# Estado de procesos
sudo -u www-data pm2 status

# Logs en tiempo real (limpios desde el último reinicio)
sudo -u www-data pm2 logs cuentassik-prod

# Logs con límite de líneas
sudo -u www-data pm2 logs cuentassik-prod --lines 20 --nostream

# Monitoreo de recursos
sudo -u www-data pm2 monit

# Ver logs archivados
ls -lah logs/archive/
```

## 🛡️ Seguridad Implementada

### ✅ Medidas de Seguridad

- ❌ **Eliminadas**: Credenciales hardcodeadas en código
- ✅ **Implementadas**: Variables de entorno desde archivos `.env`
- ✅ **Aisladas**: Producción ejecuta como `www-data`
- ✅ **Protegidas**: Archivos `.env` no versionados

### 🔒 Permisos de Archivos

```bash
# Variables de entorno
-rw------- 1 kava kava .env.production.local
-rw------- 1 kava kava .env.development.local

# Directorio build
drwxr-s--- 6 kava daemon .next/
```

## 📋 Checklist de Verificación

- [x] PM2 inicia correctamente ambos entornos
- [x] Variables de entorno cargadas desde archivos `.env`
- [x] Producción responde en puerto 3000
- [x] Desarrollo responde en puerto 3001
- [x] Auto-restart configurado correctamente
- [x] Logs con timestamp funcionando
- [x] No hay credenciales expuestas en código
- [x] Scripts de gestión funcionan correctamente

## 🎯 Próximos Pasos

Con PM2 y variables de entorno funcionando correctamente, podemos proceder con:

1. **Auth por Gmail**: Implementar autenticación OAuth con Gmail
2. **Centralizar lógica auth**: Unificar validación y creación de usuarios
3. **Separar onboarding**: Mover flujo de nuevos usuarios
4. **Sistema de invitaciones**: Implementar códigos UUID

---

**✅ Punto crítico #1 completado exitosamente**
