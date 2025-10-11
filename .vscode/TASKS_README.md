# 🛠️ VS Code Tasks para CuentasSiK (Linux)

## 📋 Acceso Rápido

Presiona `Ctrl+Shift+P` → **"Tasks: Run Task"** para ver todas las tareas.

---

## 🚀 Desarrollo

### 🚀 Dev Server
- **Comando**: `npm run dev`
- Inicia servidor de desarrollo en http://localhost:3001
- Background task con hot-reload automático

### 🛑 Stop Dev Server
- **Comando**: `lsof -ti:3001 | xargs kill -9`
- Libera puerto 3001 si quedó bloqueado

### 🧹 Clear All Caches
- **Comando**: `rm -rf .next node_modules/.cache tsconfig.tsbuildinfo`
- Limpia cachés de Next.js y TypeScript

---

## 🗄️ Base de Datos

### 📥 Sincronizar PROD → DEV
- **Script**: `scripts/sync_prod_to_dev.sh`
- Copia datos de producción a desarrollo
- ⚠️ **Cuidado**: Sobrescribe base de datos local

### ➕ Crear Nueva Migración
- **Comando**: Crea archivo `YYYYMMDD_HHMMSS_nueva_migracion.sql`
- Ubicación: `database/migrations/development/`
- Template incluido con formato estándar

### 🔄 Aplicar Migraciones a DEV
- **Script**: `scripts/apply_migrations_dev.sh`
- Aplica migraciones pendientes en desarrollo
- Registra en tabla `schema_migrations`

### ⬆️ Promover Migración (dev → tested)
- **Script**: `scripts/promote_migration.sh`
- Mueve migración validada de `development/` a `tested/`
- Lista para aplicar en producción

### 📊 Ver Estado Migraciones
- Muestra contador de migraciones por carpeta:
  - 📊 development/ (WIP)
  - ✅ tested/ (Validadas)
  - 📦 applied/ (Aplicadas en PROD)
  - 🗄️ applied/archive/ (Históricas)

---

## 🚀 Producción

### 🏗️ Build Producción
- **Comando**: `NODE_ENV=production npm run build`
- Construye aplicación para producción
- Verifica `required-server-files.json`

### 🚀 Desplegar a PRODUCCIÓN
- **Script**: `scripts/deploy_to_prod.sh`
- Workflow completo:
  1. Backup de base de datos
  2. Build de aplicación
  3. Aplicar migraciones
  4. Reiniciar PM2
  5. Verificación

### 🔄 Reiniciar PM2 (Producción)
- **Comando**: `sudo -u www-data pm2 restart cuentassik-prod`
- Reinicia aplicación en PM2
- Muestra estado después de reiniciar

### 📊 Ver Logs PM2
- **Comando**: `sudo -u www-data pm2 logs cuentassik-prod --lines 50`
- Últimas 50 líneas de logs de producción

### 📊 Estado PM2
- **Comando**: `sudo -u www-data pm2 status` + info detallado
- Estado completo de PM2 y la aplicación

---

## 🧪 Testing & Quality

### 🧪 Run Tests
- **Comando**: `npm test`
- Ejecuta suite de tests con Vitest

### 🔍 Lint
- **Comando**: `npm run lint`
- ESLint sobre todo el proyecto

### 🔍 Type Check
- **Comando**: `npm run typecheck`
- Verifica tipos TypeScript sin compilar

---

## 📊 Monitoring

### 📊 Estado Servicios Críticos
- Muestra estado de:
  - Apache2 (web)
  - MySQL (database)
  - SSH (acceso)
  - PM2 (app)
- Últimos logs de PM2

### 🔐 Ver Puertos Abiertos
- **Comando**: `sudo netstat -tulpn | grep LISTEN`
- Todos los puertos en escucha

### 📦 Espacio en Disco
- **Comando**: `df -h` + `du -sh` directorios principales
- Uso de disco general y por directorio

---

## 📝 Notas Importantes

### Permisos
Algunas tasks requieren `sudo`. El usuario `kava` debe estar en sudoers.

### Scripts
Las tasks ejecutan scripts en `scripts/`. Asegúrate de que tengan permisos de ejecución:
```bash
chmod +x scripts/*.sh
```

### Variables de Entorno
- DEV: `.env.development.local`
- PROD: `.env.production.local` (en servidor)

### Base de Datos
- DEV: `cuentassik_dev` (PostgreSQL local)
- PROD: `cuentassik_prod` (PostgreSQL servidor)

---

## 🔄 Workflow Típico

### Desarrollo de Feature
1. `📥 Sincronizar PROD → DEV` (datos frescos)
2. `🚀 Dev Server` (iniciar desarrollo)
3. `➕ Crear Nueva Migración` (si necesitas cambios en DB)
4. `🔄 Aplicar Migraciones a DEV` (probar cambios)
5. `🧪 Run Tests` + `🔍 Lint` + `🔍 Type Check`
6. `⬆️ Promover Migración` (cuando esté validada)
7. Commit y push

### Deploy a Producción
1. `🧪 Run Tests` + `🔍 Type Check` (pre-flight)
2. `🚀 Desplegar a PRODUCCIÓN` (script completo)
3. `📊 Estado Servicios Críticos` (verificación)
4. `📊 Ver Logs PM2` (revisar errores)

---

**Última actualización**: 11 Octubre 2025
**Versión**: 1.0.0 (Linux)
