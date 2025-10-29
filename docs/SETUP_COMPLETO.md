# 🚀 CuentasSiK - Guía de Instalación Completa

**Guía paso a paso para instalar CuentasSiK desde cero en un servidor Linux**

---

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Instalación de PostgreSQL](#instalación-de-postgresql)
3. [Configuración de Roles de Base de Datos](#configuración-de-roles-de-base-datos)
4. [Instalación del Proyecto](#instalación-del-proyecto)
5. [Configuración de Base de Datos DEV](#configuración-de-base-de-datos-dev)
6. [Configuración de Base de Datos PROD](#configuración-de-base-de-datos-prod)
7. [Instalación de PM2](#instalación-de-pm2)
8. [Configuración de Entornos](#configuración-de-entornos)
9. [Deploy Inicial](#deploy-inicial)
10. [Verificación del Sistema](#verificación-del-sistema)
11. [Mantenimiento](#mantenimiento)

---

## 1. Requisitos Previos

### Hardware Mínimo
- CPU: 2 cores
- RAM: 2GB (4GB recomendado)
- Disco: 10GB libres

### Software
- Sistema Operativo: Ubuntu 20.04+ / Debian 11+
- Node.js: 18.x o superior
- PostgreSQL: 15.x o superior
- Git
- npm 9.x o superior

### Usuario del Sistema
- Usuario no-root con privilegios sudo
- Configuración de SSH (recomendado)

---

## 2. Instalación de PostgreSQL

### Instalar PostgreSQL 15

```bash
# Actualizar repositorios
sudo apt update

# Instalar PostgreSQL
sudo apt install -y postgresql-15 postgresql-contrib-15

# Verificar instalación
psql --version
# Debe mostrar: psql (PostgreSQL) 15.x

# Verificar servicio
sudo systemctl status postgresql
# Debe estar activo (running)
```

### Configuración Inicial de PostgreSQL

```bash
# Establecer contraseña para postgres (usuario admin)
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'tu_password_admin_seguro';"

# Verificar conexión
sudo -u postgres psql -c "SELECT version();"
```

---

## 3. Configuración de Roles de Base de Datos

### Crear Roles del Sistema

CuentasSiK usa un sistema de **3 roles** para seguridad y separación de privilegios:

```bash
# Conectar como postgres
sudo -u postgres psql
```

```sql
-- Rol OWNER para DEV (NOLOGIN - solo para crear objetos)
CREATE ROLE cuentassik_dev_owner NOLOGIN;

-- Rol OWNER para PROD (NOLOGIN - solo para crear objetos)
CREATE ROLE cuentassik_prod_owner NOLOGIN;

-- Rol de APLICACIÓN (LOGIN - usado por Next.js)
CREATE ROLE cuentassik_user LOGIN PASSWORD 'tu_password_aplicacion_seguro';

-- Verificar roles
\du
```

**Importante**: Anota las contraseñas en un gestor seguro. Solo necesitas recordar la de `cuentassik_user` para configurar la aplicación.

### Configurar ~/.pgpass para Acceso sin Contraseña (Opcional)

Como usuario `kava` (o tu usuario del sistema):

```bash
# Crear archivo .pgpass
cat > ~/.pgpass << 'EOF'
127.0.0.1:5432:cuentassik_dev:cuentassik_user:tu_password_aplicacion
127.0.0.1:5432:cuentassik_prod:cuentassik_user:tu_password_aplicacion
EOF

# Establecer permisos correctos (OBLIGATORIO)
chmod 600 ~/.pgpass
```

Esto permite conectar sin password:
```bash
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev
```

---

## 4. Instalación del Proyecto

### Clonar Repositorio

```bash
# Crear directorio de proyectos
mkdir -p ~/workspace/proyectos
cd ~/workspace/proyectos

# Clonar desde GitHub
git clone https://github.com/Kavalieri/CuentasSiK.git
cd CuentasSiK

# Verificar branch
git branch
# Debe estar en 'main'
```

### Instalar Dependencias

```bash
# Instalar dependencias EXACTAS desde package-lock.json
npm ci

# Verificar instalación
npm list --depth=0
```

**Nota**: Usar `npm ci` (no `npm install`) garantiza instalación reproducible desde lock file.

---

## 5. Configuración de Base de Datos DEV

### Crear Base de Datos de Desarrollo

```bash
# Terminar conexiones existentes (si las hay)
sudo -u postgres -H bash -lc "cd /tmp && psql -d postgres -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='cuentassik_dev' AND pid <> pg_backend_pid();\""

# Eliminar DB si existe (CUIDADO: elimina todos los datos)
sudo -u postgres -H bash -lc "cd /tmp && dropdb --if-exists cuentassik_dev"

# Crear DB con owner correcto
sudo -u postgres -H bash -lc "cd /tmp && createdb --owner=cuentassik_dev_owner cuentassik_dev"
```

### Aplicar Seed Baseline

```bash
# Copiar seed a ubicación temporal
sudo cp database/migrations/applied/20251014_150000_seed.sql /tmp/cuentassik_seed.sql
sudo chmod 644 /tmp/cuentassik_seed.sql

# Aplicar seed
sudo -u postgres -H bash -lc "cd /tmp && psql -v ON_ERROR_STOP=1 --set=SEED_OWNER=cuentassik_dev_owner -d cuentassik_dev -f /tmp/cuentassik_seed.sql"

# Limpiar archivo temporal
sudo rm /tmp/cuentassik_seed.sql
```

### Verificar Instalación DEV

```bash
# Conectar a la base de datos
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev

# Verificar tablas
\dt

# Debe mostrar 18+ tablas:
# - profiles, households, household_members
# - transactions, categories, contributions
# - monthly_periods, member_incomes
# - etc.

# Verificar datos de ejemplo
SELECT COUNT(*) FROM profiles;
# Debe mostrar al menos 1 perfil

SELECT COUNT(*) FROM categories;
# Debe mostrar ~30 categorías

# Salir
\q
```

---

## 6. Configuración de Base de Datos PROD

### Opción A: Copiar desde DEV (Recomendado para Setup Inicial)

```bash
# Script automatizado de sincronización DEV → PROD
./scripts/sync_dev_to_prod.sh
```

Este script:
1. Hace backup de PROD actual (si existe)
2. Elimina y recrea `cuentassik_prod`
3. Copia TODA la estructura y datos desde DEV
4. Mantiene permisos correctos (owner: `cuentassik_prod_owner`)

### Opción B: Crear PROD desde Seed (Limpia)

```bash
# Terminar conexiones
sudo -u postgres -H bash -lc "cd /tmp && psql -d postgres -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='cuentassik_prod' AND pid <> pg_backend_pid();\""

# Eliminar y recrear
sudo -u postgres -H bash -lc "cd /tmp && dropdb --if-exists cuentassik_prod"
sudo -u postgres -H bash -lc "cd /tmp && createdb --owner=cuentassik_prod_owner cuentassik_prod"

# Aplicar seed
sudo cp database/migrations/applied/20251014_150000_seed.sql /tmp/cuentassik_seed.sql
sudo chmod 644 /tmp/cuentassik_seed.sql
sudo -u postgres -H bash -lc "cd /tmp && psql -v ON_ERROR_STOP=1 --set=SEED_OWNER=cuentassik_prod_owner -d cuentassik_prod -f /tmp/cuentassik_seed.sql"
sudo rm /tmp/cuentassik_seed.sql
```

### Verificar PROD

```bash
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "\dt"
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "SELECT COUNT(*) FROM profiles;"
```

---

## 7. Instalación de PM2

PM2 gestiona los procesos Node.js (DEV y PROD) como daemons persistentes.

### Instalar PM2 Globalmente

```bash
# Instalar PM2
npm install -g pm2

# Verificar instalación
pm2 --version
# Debe mostrar versión 5.x o superior
```

### Configurar Autostart

```bash
# Generar script de inicio del sistema (ejecutar UNA sola vez)
pm2 startup systemd -u $USER --hp $HOME

# Copiar y ejecutar el comando que imprime
# Ejemplo: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u kava --hp /home/kava
```

**Importante**: Solo ejecutar `pm2 startup` UNA vez por usuario. Si ya lo ejecutaste antes, omitir este paso.

---

## 8. Configuración de Entornos

### Crear Variables de Entorno

#### Desarrollo (.env.development.local)

```bash
cat > .env.development.local << 'EOF'
# Base de datos DEV
DATABASE_URL="postgresql://cuentassik_user:tu_password@localhost:5432/cuentassik_dev"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3001"
NODE_ENV="development"

# OAuth Google (opcional para desarrollo)
GOOGLE_CLIENT_ID="tu_client_id"
GOOGLE_CLIENT_SECRET="tu_client_secret"
EOF
```

#### Producción (.env.production.local)

```bash
cat > .env.production.local << 'EOF'
# Base de datos PROD
DATABASE_URL="postgresql://cuentassik_user:tu_password@localhost:5432/cuentassik_prod"

# Next.js
NEXT_PUBLIC_APP_URL="https://tu-dominio.com"
NODE_ENV="production"

# OAuth Google
GOOGLE_CLIENT_ID="tu_client_id_produccion"
GOOGLE_CLIENT_SECRET="tu_client_secret_produccion"

# Email (Nodemailer)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="tu_email@gmail.com"
EMAIL_PASS="tu_app_password"
EOF
```

### Verificar Archivos de Entorno

```bash
# Los archivos .env.*.local NO deben estar en Git
ls -la .env*

# Debe mostrar:
# .env.example (en Git)
# .env.development.local (NO en Git)
# .env.production.local (NO en Git)
```

---

## 9. Deploy Inicial

### Build de Producción

```bash
# Build de Next.js para producción
npm run build

# Verificar que se creó .next/
ls -la .next/
```

### Iniciar Procesos PM2

#### Desarrollo (Puerto 3001)

```bash
# Iniciar DEV con archivado de logs
./scripts/pm2-dev-start.sh

# O usar tarea de VS Code:
# "🟢 DEV: Iniciar (con archivado de logs)"
```

#### Producción (Puerto 3000)

```bash
# Iniciar PROD con archivado de logs
./scripts/pm2-prod-start.sh

# O usar tarea de VS Code:
# "🟢 PROD: Iniciar (con archivado de logs)"
```

### Guardar Configuración PM2

```bash
# Guardar estado actual de PM2 (para autostart)
pm2 save

# Esto crea/actualiza ~/.pm2/dump.pm2
# Los procesos se reiniciarán automáticamente tras reboot
```

---

## 10. Verificación del Sistema

### Verificar Procesos PM2

```bash
# Ver estado de todos los procesos
pm2 status

# Debe mostrar:
# ┌─────┬──────────────────┬─────────┬─────────┬──────────┐
# │ id  │ name             │ status  │ ↺       │ cpu      │
# ├─────┼──────────────────┼─────────┼─────────┼──────────┤
# │ 0   │ cuentassik-dev   │ online  │ 0       │ 0%       │
# │ 1   │ cuentassik-prod  │ online  │ 0       │ 0%       │
# └─────┴──────────────────┴─────────┴─────────┴──────────┘
```

### Verificar Logs

```bash
# Ver logs de DEV (últimas 50 líneas)
pm2 logs cuentassik-dev --lines 50 --nostream

# Ver logs de PROD (últimas 50 líneas)
pm2 logs cuentassik-prod --lines 50 --nostream

# Ver logs en tiempo real
pm2 logs
```

### Probar Conexión HTTP

```bash
# DEV
curl http://localhost:3001
# Debe retornar HTML de la página de login

# PROD
curl http://localhost:3000
# Debe retornar HTML de la página de login
```

### Verificar Base de Datos

```bash
# DEV
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev -c "SELECT COUNT(*) FROM profiles;"

# PROD
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "SELECT COUNT(*) FROM profiles;"
```

---

## 11. Mantenimiento

### Actualizar Código

```bash
# Detener PROD
./scripts/pm2-prod-stop.sh

# Actualizar desde Git
git pull origin main

# Reinstalar dependencias (solo si cambió package-lock.json)
npm ci

# Rebuild
npm run build

# Reiniciar PROD
./scripts/pm2-prod-start.sh
```

### Backup de Base de Datos

```bash
# Backup manual de PROD
pg_dump -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# O usar script automatizado (si existe)
./scripts/backup_prod.sh
```

### Limpiar Logs de PM2

```bash
# Eliminar logs archivados de más de 7 días
./scripts/pm2-clean-logs.sh 7

# O usar tarea de VS Code:
# "🧹 Limpiar Logs PM2 (7 días)"
```

### Verificar Espacio en Disco

```bash
# Ver uso de disco
df -h

# Ver tamaño de logs PM2
du -sh ~/.pm2/logs/

# Ver tamaño de base de datos
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "SELECT pg_size_pretty(pg_database_size('cuentassik_prod'));"
```

---

## 🆘 Troubleshooting

### Problema: PM2 no inicia procesos

```bash
# Ver errores detallados
pm2 logs --err --lines 100

# Reiniciar daemon PM2
pm2 kill
pm2 resurrect

# Si persiste, verificar permisos
ls -la ~/.pm2/
```

### Problema: Error de conexión a base de datos

```bash
# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql

# Verificar conexión manual
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev -c "SELECT 1;"

# Verificar variables de entorno
cat .env.production.local | grep DATABASE_URL
```

### Problema: Puerto ya en uso

```bash
# Ver qué proceso usa el puerto 3000
sudo lsof -i :3000

# Matar proceso si es necesario
sudo kill -9 <PID>

# Reiniciar PM2
pm2 restart cuentassik-prod
```

### Problema: Build falla

```bash
# Limpiar cache de Next.js
rm -rf .next/

# Verificar TypeScript
npm run typecheck

# Verificar ESLint
npm run lint

# Rebuild
npm run build
```

---

## 📚 Referencias

- [Database README](../database/README.md) - Detalles de migraciones y esquema
- [PM2 Sistema Completo](./TO-DO/DONE/PM2_SISTEMA_COMPLETO.md) - Gestión de procesos
- [PostgreSQL Sistema Completo](./TO-DO/DONE/POSTGRESQL_SISTEMA_COMPLETO.md) - Configuración de base de datos
- [AGENTS.md](../AGENTS.md) - Instrucciones para desarrollo

---

## 🔒 Seguridad

### Checklist de Seguridad

- [ ] Contraseñas fuertes en todos los roles de PostgreSQL
- [ ] Archivo `.pgpass` con permisos 600
- [ ] Variables de entorno en archivos `.local` (no en Git)
- [ ] OAuth Google configurado con credenciales de producción
- [ ] Firewall configurado (solo puertos necesarios abiertos)
- [ ] HTTPS configurado con certificado válido (Nginx/Caddy como proxy)
- [ ] Backups automáticos de base de datos configurados
- [ ] Logs de PM2 con rotación configurada

---

**Última actualización**: 29 Octubre 2025
**Versión del proyecto**: 1.1.0
