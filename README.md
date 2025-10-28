<div align="center">

# 💰 CuentasSiK

Sistema profesional de gestión de gastos compartidos para parejas

[![Version](https://img.shields.io/badge/version-1.1.0-blue?style=flat-square)](https://github.com/Kavalieri/CuentasSiK/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&style=flat-square)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black?logo=next.js&style=flat-square)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue?logo=postgresql&style=flat-square)](https://postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

[📖 Documentación](./docs) · [🐛 Issues](https://github.com/Kavalieri/CuentasSiK/issues)

</div>

---

## ¿Qué es CuentasSiK?

Aplicación web moderna para gestionar finanzas compartidas en pareja de forma transparente y equitativa. Calcula contribuciones proporcionales según ingresos, registra gastos/ingresos por categorías, gestiona créditos por sobrepagos y permite un fondo de ahorro común.

### Características clave

- **Autenticación multi-email**: Comparte tu cuenta con múltiples direcciones de email (OAuth Google + Magic Link)
- **Contribuciones proporcionales**: Cálculo automático según ingresos, partes iguales o personalizado
- **Gestión de gastos/ingresos**: Categorías predefinidas, filtros avanzados y búsqueda
- **Créditos automáticos**: Sistema de sobrepagos con decisiones mensuales (aplicar, transferir a ahorro, mantener activo)
- **Fondo de ahorro compartido**: Historial completo, gráficos evolutivos y gestión de metas
- **Multi-hogar**: Un usuario puede pertenecer a múltiples hogares con cambio rápido
- **Invitaciones seguras**: URLs de invitación con tokens únicos y validación de ownership
- **Dashboard inteligente**: Balance en tiempo real, reportes y estadísticas visuales
- **Modo privacidad**: Oculta todas las cantidades con un toggle
- **Exportación**: Genera PDFs y CSVs de transacciones y reportes

---

## Stack

- Next.js 15 (App Router, Server Actions) con React 18
- TypeScript estricto
- UI: Tailwind CSS + shadcn/ui + next-themes
- Base de datos: PostgreSQL nativo (NO Supabase)
- Infra: Servidor web propio (Node.js con `next start`; gestor de procesos opcional: systemd/PM2)
- Testing: Vitest

---

## Quick Start (DEV)

### Requisitos

- Node.js 18+ y npm
- PostgreSQL 15+
- Git

### 1) Clonar e instalar

```bash
git clone https://github.com/Kavalieri/CuentasSiK.git
cd CuentasSiK
npm install
```

### 2) Base de datos (seed incluida)

Si es la primera vez, crea los roles descritos en `docs/TO-DO/DONE/POSTGRESQL_SISTEMA_COMPLETO.md` (`cuentassik_dev_owner`, `cuentassik_prod_owner`, `cuentassik_user`).

Para levantar un entorno limpio de desarrollo ejecuta:

```bash
sudo -u postgres -H bash -lc "cd /tmp && psql -d postgres -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='cuentassik_dev' AND pid <> pg_backend_pid();\""
sudo -u postgres -H bash -lc "cd /tmp && dropdb --if-exists cuentassik_dev"
sudo -u postgres -H bash -lc "cd /tmp && createdb --owner=cuentassik_dev_owner cuentassik_dev"
sudo cp database/migrations/applied/20251014_150000_seed.sql /tmp/cuentassik_seed.sql
sudo chmod 644 /tmp/cuentassik_seed.sql
sudo -u postgres -H bash -lc "cd /tmp && psql -v ON_ERROR_STOP=1 --set=SEED_OWNER=cuentassik_dev_owner -d cuentassik_dev -f /tmp/cuentassik_seed.sql"
```

_(Opcional)_ elimina la copia temporal cuando termine:

```bash
sudo rm /tmp/cuentassik_seed.sql
```

### 3) Variables de entorno

Crea `.env.development.local` en la raíz con:

```env
DATABASE_URL="postgresql://cuentassik_user:tu_password@localhost:5432/cuentassik_dev"
```

### 4) Ejecutar en desarrollo

```bash
npm run dev
```

Abre http://localhost:3001

---

## Migraciones y datos

Estructura de migraciones en `database/migrations`:

- `development/` → trabajo local
- `tested/` → validadas en DEV (listas para PROD)
- `applied/` → aplicadas en PROD

Scripts disponibles en `scripts/` (también como tareas VSCode):

- Sincronizar PROD → DEV: `scripts/sync_prod_to_dev.sh`
- Aplicar migraciones en DEV: `scripts/apply_migrations_dev.sh`
- Promover a tested: `scripts/promote_migration.sh`

Ver guía completa en `database/README.md`.

---

## Despliegue (PROD)

1. Build de producción

```bash
npm run build
```

2. Configurar variables de entorno mínimas

Puedes definirlas en el entorno del sistema o en el servicio (systemd/PM2). Variables clave:

```env
# Base de datos
DATABASE_URL="postgresql://cuentassik_user:PASSWORD@HOST:5432/cuentassik_prod"

# Seguridad
JWT_SECRET="cambia-esto-en-produccion"  # openssl rand -base64 32

# SMTP (opcional, para emails)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="user@example.com"
SMTP_PASS="app-password"
SMTP_FROM="noreply@cuentassik.com"
# 💰 Cuentas SiK
# App
NEXT_PUBLIC_SITE_URL="https://tu-dominio.com"
NEXT_PUBLIC_SYSTEM_ADMIN_EMAIL="admin@tu-dominio.com"
```

3. Arrancar la app

Arranque estándar de Next.js en producción:

```bash
[🛠 Troubleshooting](./docs/TROUBLESHOOTING.md) · [🔐 JWT](./docs/JWT.md)
npm start  # equivale a: next start
```

- Opción A: systemd (servicio del SO)
- Opción B: PM2 (opcional, ver `docs/PM2.md`)

Ejemplo mínimo con systemd (opcional):

Type=simple
Environment=NODE_ENV=production
Environment=DATABASE_URL=postgresql://...
Environment=JWT_SECRET=...

---

## Documentación

### Guías Principales
- **Visión general**: `./docs/README.md`
- **Base de datos y migraciones**: `./database/README.md`
- **Sistema multi-email**: `./docs/MULTI_EMAIL_SYSTEM.md` ⭐ NUEVO
- **Instrucciones para agentes/IA**: `.github/copilot-instructions.md`

### Documentación Técnica
- [🛠 Troubleshooting](./docs/TROUBLESHOOTING.md)
- [🔐 JWT y Autenticación](./docs/JWT.md)
- [📦 Sistema PM2](./docs/TO-DO/DONE/PM2_SISTEMA_COMPLETO.md)
- [🗄️ PostgreSQL Setup](./docs/TO-DO/DONE/POSTGRESQL_SISTEMA_COMPLETO.md)

---

## Contribuir

Las contribuciones son bienvenidas. Revisa [CONTRIBUTING.md](./CONTRIBUTING.md) y abre un issue/PR siguiendo Conventional Commits.

---

## Licencia

MIT © 2025 CuentasSiK Contributors. Ver [LICENSE](./LICENSE).

---

## Contacto

soporte@cuentassik.com · [Issues](https://github.com/Kavalieri/CuentasSiK/issues)
