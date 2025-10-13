# CuentasSiK - Sistema PM2: Documentación Completa

**Fecha**: Octubre 2025
**Autor**: AI Assistant
**Proyecto**: CuentasSiK

---

## 🚨 REGLA FUNDAMENTAL: UN SOLO DAEMON PM2

**PROHIBIDO** crear daemons PM2 "fantasma" en homes ajenos.

### ❌ Anti-patrones PROHIBIDOS

```bash
# NUNCA hacer esto:
sudo pm2 ...
sudo -u www-data pm2 ...
sudo --preserve-env pm2 ...
sudo env PM2_HOME=/opt/pm2 pm2 ...
PM2_HOME=/var/www/.pm2 pm2 ...
sudo pm2 startup ... # (sin especificar -u kava --hp /home/kava)
sudo pm2 save / sudo pm2 resurrect
```

### ✅ Enfoque CORRECTO

```bash
# Siempre ejecutar como kava:
pm2 status
pm2 start ...
pm2 save
pm2 reload ...

# Verificar usuario correcto:
echo "$USER"        # => kava
echo "${PM2_HOME}"  # vacío o /home/kava/.pm2
```

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### Daemon Único

- **Usuario**: `kava`
- **Home PM2**: `/home/kava/.pm2/`
- **Daemon**: `PM2 v6.0.13: God Daemon (/home/kava/.pm2)`

### Procesos Gestionados

1. **cuentassik-dev** (Desarrollo)

   - Puerto: 3001
   - Comando: `npm run dev`
   - Logs: `/home/kava/.pm2/logs/cuentassik-dev-*.log`

2. **cuentassik-prod** (Producción)
   - Puerto: 3000
   - Comando: `npm start`
   - Logs: `/home/kava/.pm2/logs/cuentassik-prod-*.log`

---

## 📁 SISTEMA DE LOGS CON ARCHIVADO

### Estructura de Directorios

```
/home/kava/.pm2/logs/
├── cuentassik-dev-out.log         # Logs actuales DEV
├── cuentassik-dev-error.log
├── cuentassik-prod-out.log        # Logs actuales PROD
├── cuentassik-prod-error.log
└── archive/                       # Logs archivados
    ├── cuentassik-dev-out_20251013_143022.log
    ├── cuentassik-dev-error_20251013_143022.log
    ├── cuentassik-prod-out_20251013_140515.log
    └── cuentassik-prod-error_20251013_140515.log
```

### Archivado Automático

- **Cuándo**: Al iniciar cualquier proceso (start scripts)
- **Formato**: `{proceso}_{tipo}_{YYYYMMDD_HHMMSS}.log`
- **Limpieza**: Scripts disponibles (7 días / 30 días)

---

## 🔧 SCRIPTS DISPONIBLES

### Gestión de Procesos

| Script              | Función           | Descripción                         |
| ------------------- | ----------------- | ----------------------------------- |
| `pm2-dev-start.sh`  | 🟢 Iniciar DEV    | Archiva logs + inicia desarrollo    |
| `pm2-dev-stop.sh`   | 🔴 Detener DEV    | Detiene y elimina proceso dev       |
| `pm2-prod-start.sh` | 🟢 Iniciar PROD   | Archiva logs + inicia producción    |
| `pm2-prod-stop.sh`  | 🔴 Detener PROD   | Detiene y elimina proceso prod      |
| `pm2-status.sh`     | 📊 Estado General | Muestra estado completo del sistema |
| `pm2-clean-logs.sh` | 🧹 Limpiar Logs   | Elimina logs archivados antiguos    |

### Funcionalidades de Scripts

**Inicio de Procesos (`*-start.sh`)**:

1. Archiva logs existentes con timestamp
2. Verifica si el proceso ya está ejecutándose
3. Carga variables de entorno (.env.\*.local)
4. Inicia proceso PM2 específico
5. Verifica inicio exitoso
6. Muestra información de acceso

**Detención de Procesos (`*-stop.sh`)**:

1. Verifica si el proceso existe
2. Muestra estado actual
3. Detiene proceso gradualmente
4. Elimina proceso de PM2
5. Confirma detención

**Estado del Sistema (`pm2-status.sh`)**:

1. Muestra procesos PM2 activos
2. Lista logs activos
3. Información de logs archivados
4. URLs disponibles

---

## 🎮 TAREAS DE VSCODE

### Gestión de Procesos PM2

```
🟢 DEV: Iniciar (con archivado de logs)
🔴 DEV: Detener
🔄 DEV: Reiniciar (Stop + Start con logs limpios)
🟢 PROD: Iniciar (con archivado de logs)
🔴 PROD: Detener
🔄 PROD: Reiniciar (Stop + Start con logs limpios)
🏗️ PROD: Build + Deploy + Reiniciar
```

### Monitoreo y Logs

```
📊 Estado PM2 General
📋 DEV: Ver Logs (últimas 20 líneas)
📋 DEV: Ver Logs (tiempo real)
📋 PROD: Ver Logs (últimas 20 líneas)
📋 PROD: Ver Logs (tiempo real)
```

### Mantenimiento

```
🧹 Limpiar Logs PM2 (7 días)
🧹 Limpiar Logs PM2 (30 días)
```

**Acceso**: `Ctrl+Shift+P` → `Tasks: Run Task`

---

## 🔄 WORKFLOW DE DESARROLLO

### 1. Desarrollo Local

```bash
# Iniciar desarrollo
./scripts/pm2-dev-start.sh
# O usar tarea VSCode: "🟢 DEV: Iniciar"

# Verificar estado
./scripts/pm2-status.sh

# Acceder: http://localhost:3001
```

### 2. Deployment a Producción

```bash
# 1. Build
npm run build

# 2. Deploy
./scripts/pm2-prod-start.sh
# O usar tarea: "🏗️ PROD: Build + Deploy + Reiniciar"

# Acceder: http://localhost:3000
```

### 3. Mantenimiento

```bash
# Limpiar logs antiguos (30 días)
./scripts/pm2-clean-logs.sh 30

# Ver estado completo
./scripts/pm2-status.sh
```

---

## 🛡️ VERIFICACIONES DE SEGURIDAD

### Antes de Cualquier Deploy

```bash
# 1. Verificar que solo hay UN daemon PM2
ps -eo user,cmd | grep -i 'PM2 v.*God Daemon' | grep -v grep
# Resultado esperado: solo kava ... (/home/kava/.pm2)

# 2. Verificar usuario actual
echo "$USER"        # Debe ser: kava
echo "${PM2_HOME}"  # Debe estar vacío o ser /home/kava/.pm2
```

### Configuración Opcional ~/.bashrc

```bash
# Guardarraíles para prevenir daemons fantasma
export PM2_HOME=/home/kava/.pm2
alias pm2='test "$USER" = kava || { echo "Usa PM2 solo con kava"; exit 1; }; command pm2'
```

---

## 🚀 CONFIGURACIÓN INICIAL (Una sola vez)

### Setup de Autostart

```bash
# Solo ejecutar UNA vez como kava
pm2 startup systemd -u kava --hp /home/kava
# Ejecutar el comando sudo que imprime (una sola vez)

# Guardar configuración actual
pm2 save
```

---

## 🔍 TROUBLESHOOTING

### Problema: Múltiples Daemons PM2

```bash
# Identificar daemons
ps -eo user,cmd | grep -i 'PM2 v.*God Daemon' | grep -v grep

# Matar daemons fantasma
sudo killall PM2  # Solo si es necesario
pm2 kill          # Como kava para limpiar

# Reiniciar limpio
pm2 start ecosystem.config.js --only cuentassik-dev
```

### Problema: Permisos de Logs

```bash
# Verificar ownership
ls -la /home/kava/.pm2/logs/

# Corregir si es necesario
chown -R kava:kava /home/kava/.pm2/
```

### Problema: Procesos No Inician

```bash
# Ver logs detallados
pm2 logs cuentassik-dev --lines 50

# Verificar build (para prod)
ls -la .next/

# Verificar variables de entorno
cat .env.development.local  # o .env.production.local
```

---

## 📊 COMANDOS DE REFERENCIA RÁPIDA

```bash
# Estado general
pm2 status

# Logs en tiempo real
pm2 logs

# Reiniciar proceso específico
pm2 restart cuentassik-dev

# Información detallada
pm2 info cuentassik-prod

# Matar daemon (emergencia)
pm2 kill

# Guardar configuración
pm2 save
```

---

**✅ SISTEMA PROBADO Y FUNCIONAL**
**🔒 SIN DAEMONS FANTASMA GARANTIZADO**
**📁 ARCHIVADO AUTOMÁTICO DE LOGS**
**🎮 INTEGRACIÓN COMPLETA CON VSCODE**
