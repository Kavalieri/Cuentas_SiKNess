<div align="center">

# 💰 Cuentas SiKNess

**Sistema moderno de gestión de gastos compartidos**

[![Version](https://img.shields.io/badge/version-2.0.0-blue?style=flat-square)](https://github.com/Kavalieri/CuentasSiK/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&style=flat-square)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black?logo=next.js&style=flat-square)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue?logo=postgresql&style=flat-square)](https://postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

[🌐 Probar Aplicación](https://cuentas.sikwow.com) · [📖 Documentación](./docs) · [🐛 Issues](https://github.com/Kavalieri/CuentasSiK/issues)

</div>

---

## 🚀 Prueba la Aplicación en Producción

**¿Quieres usar CuentasSiK sin instalar nada?**

Tenemos una instancia de producción completamente funcional y abierta al público:

### 🌐 [**cuentas.sikwow.com**](https://cuentas.sikwow.com)

✨ **Características del entorno de producción:**
- ✅ Totalmente gratuito y funcional
- ✅ Sin necesidad de instalación local
- ✅ Registro simple con email (magic links)
- ✅ Todas las funcionalidades disponibles
- ✅ Entorno seguro y estable
- ✅ Ideal para probar la aplicación antes de desplegar tu propia instancia

**Perfecto para:**
- 👥 Usuarios que solo quieren usar la aplicación
- 🔍 Desarrolladores que quieren probar antes de clonar el proyecto
- 🎓 Evaluación de características y funcionalidad

> 💡 **Nota para desarrolladores**: Si prefieres tener control total sobre tus datos o personalizar la aplicación, consulta la sección de [Instalación](#instalación) para desplegar tu propia instancia.

---

## 📋 Índice

- [Prueba la Aplicación en Producción](#-prueba-la-aplicación-en-producción)
- [¿Qué es CuentasSiK?](#qué-es-cuentassik)
- [Características](#características)
- [Stack Tecnológico](#stack-tecnológico)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [Migraciones de Base de Datos](#migraciones-de-base-de-datos)
- [Despliegue a Producción](#despliegue-a-producción)
- [Documentación](#documentación)
- [Contribuir](#contribuir)
- [Licencia](#licencia)

---

## ¿Qué es CuentasSiK?

CuentasSiK es una aplicación web moderna diseñada para gestionar finanzas compartidas entre parejas o grupos pequeños de manera transparente y equitativa. Ofrece un sistema completo de:

- 💸 **Gestión de contribuciones**: Cálculo automático proporcional según ingresos
- 📊 **Seguimiento de gastos e ingresos**: Por categorías con filtros avanzados
- 💳 **Sistema de créditos**: Manejo automático de sobrepagos y ajustes
- 🏦 **Fondo de ahorro compartido**: Con historial y gráficos evolutivos
- 📈 **Estadísticas y reportes**: Visualización de patrones de gasto
- 📤 **Exportación**: Generación de PDFs y CSVs

---

## ✨ Características

### 🔐 Autenticación Flexible
- **Multi-método**: Google OAuth 2.0 + Magic Links por email
- **Multi-email**: Asocia múltiples direcciones a una misma cuenta
- **Invitaciones**: Sistema seguro con tokens únicos

### 💰 Gestión Financiera
- **Contribuciones inteligentes**: Proporcional a ingresos, partes iguales o personalizado
- **Gastos directos**: Registro de gastos personales antes de aportar al fondo común
- **Sistema dual-flow**: Flujo común + flujo directo con cálculo automático de aportaciones
- **Categorías**: Predefinidas y personalizables con emojis

### 📊 Análisis y Reportes
- **Dashboard en tiempo real**: Balance actual, gráficos y métricas clave
- **Estadísticas avanzadas**: Gasto promedio, por categoría, por miembro, evolución temporal
- **Modo privacidad**: Oculta cantidades con un toggle

### 🏠 Multi-Hogar
- Pertenece a múltiples hogares
- Cambio rápido entre hogares activos
- Roles diferenciados (Owner/Member)

### 🎯 Workflow por Periodos
1. **Preparing**: Registro de ingresos y gastos directos
2. **Validation**: Validación de contribuciones y ajustes
3. **Active**: Registro de movimientos comunes
4. **Closed**: Cierre de periodo y generación de reportes

---

## 🛠 Stack Tecnológico

### Frontend
- **Framework**: Next.js 15 (App Router) con React 18
- **Lenguaje**: TypeScript (strict mode)
- **Estilos**: Tailwind CSS + shadcn/ui + Radix UI
- **Temas**: next-themes (dark/light mode)
- **Formularios**: react-hook-form + zod
- **Gráficos**: recharts

### Backend
- **Runtime**: Node.js 18+
- **API**: Next.js Server Actions
- **Base de datos**: PostgreSQL 15+ (nativo, sin ORMs)
- **Autenticación**: JWT + jose (Google OAuth 2.0 + Magic Links)
- **Email**: Nodemailer

### DevOps & Testing
- **Testing**: Vitest
- **Linting**: ESLint + TypeScript ESLint
- **Git**: Conventional Commits
- **CI/CD**: GitHub Actions (opcional)
- **Gestión de procesos**: Compatible con gestores de procesos estándar (systemd, Docker, etc.)

---

## 📦 Instalación

### Requisitos Previos

- **Node.js**: v18.0.0 o superior
- **npm**: v9.0.0 o superior
- **PostgreSQL**: v15.0 o superior
- **Git**: Para clonar el repositorio

### 1. Clonar el Repositorio

```bash
git clone https://github.com/Kavalieri/CuentasSiK.git
cd CuentasSiK
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar PostgreSQL

#### a) Crear Roles de Base de Datos

```sql
-- Conectar como superusuario (postgres)
psql -U postgres

-- Crear roles
CREATE ROLE cuentassik_dev_owner WITH LOGIN PASSWORD 'tu_password_seguro';
CREATE ROLE cuentassik_prod_owner WITH LOGIN PASSWORD 'tu_password_seguro';
CREATE ROLE cuentassik_user WITH LOGIN PASSWORD 'tu_password_seguro';

-- Otorgar privilegios
ALTER ROLE cuentassik_dev_owner CREATEDB;
ALTER ROLE cuentassik_prod_owner CREATEDB;
```

#### b) Crear Base de Datos de Desarrollo

```bash
createdb -O cuentassik_dev_owner cuentassik_dev
```

#### c) Aplicar Schema y Seed

```bash
# Aplicar migraciones base (schema + seed inicial)
psql -U cuentassik_dev_owner -d cuentassik_dev -f database/migrations/applied/20251014_150000_seed.sql
```

> 📚 **Guía completa de PostgreSQL**: Ver [`docs/POSTGRESQL_SETUP.md`](docs/POSTGRESQL_SETUP.md)

---

## ⚙️ Configuración

### Variables de Entorno

CuentasSiK utiliza **archivos de variables de entorno separados** para desarrollo y producción. Esto es **crítico** para el funcionamiento correcto de la autenticación.

#### Configuración de Desarrollo

Copia el ejemplo y personaliza los valores:

```bash
cp .env.development.example .env.development.local
```

Edita `.env.development.local` con tus valores:

```env
# Base de datos de desarrollo
DATABASE_URL="postgresql://cuentassik_user:tu_password@localhost:5432/cuentassik_dev"

# JWT Secret (genera con: openssl rand -base64 32)
JWT_SECRET="tu_clave_secreta_jwt_desarrollo"

# Google OAuth (desarrollo)
GOOGLE_CLIENT_ID="tu_google_client_id_dev"
GOOGLE_CLIENT_SECRET="tu_google_client_secret_dev"

# SMTP (correo electrónico)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="tu_email@gmail.com"
SMTP_PASS="tu_app_password"

# URL de desarrollo
NEXT_PUBLIC_SITE_URL="http://localhost:3001"
NEXT_PUBLIC_SYSTEM_ADMIN_EMAIL="tu_email_admin@gmail.com"
```

#### Configuración de Producción

Copia el ejemplo de producción:

```bash
cp .env.production.example .env.production.local
```

Edita `.env.production.local` con valores **diferentes y seguros**:

```env
# Base de datos de producción
DATABASE_URL="postgresql://cuentassik_user:PASSWORD_FUERTE@localhost:5432/cuentassik_prod"

# JWT Secret (DIFERENTE al de desarrollo - genera con: openssl rand -base64 32)
JWT_SECRET="SECRET_PRODUCCION_MUY_FUERTE_Y_DIFERENTE"

# Google OAuth (producción - proyecto separado)
GOOGLE_CLIENT_ID="tu_google_client_id_prod"
GOOGLE_CLIENT_SECRET="tu_google_client_secret_prod"

# SMTP configurado para producción
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="produccion@tudominio.com"
SMTP_PASS="app_password_produccion"

# URL pública de producción
NEXT_PUBLIC_SITE_URL="https://tudominio.com"
NEXT_PUBLIC_SYSTEM_ADMIN_EMAIL="admin@tudominio.com"
```

> ⚠️ **IMPORTANTE**:
> - `JWT_SECRET` es **crítico** - si no está configurado correctamente, la autenticación fallará con error 401
> - Usa `JWT_SECRET` **diferentes** en desarrollo y producción
> - `NEXT_PUBLIC_SITE_URL` debe coincidir exactamente con tu dominio (sin trailing slash)
> - Nunca commitees archivos `.env.*.local` al repositorio (están en `.gitignore`)

### Configurar Google OAuth

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google+ / People
4. Crea credenciales OAuth 2.0
5. Configura **Authorized redirect URIs**:
   - Desarrollo: `http://localhost:3001/auth/google/callback`
   - Producción: `https://tu-dominio.com/auth/google/callback`
6. Copia `Client ID` y `Client Secret` a tu `.env.development.local`

> 📚 **Guía detallada de OAuth**: Ver [`docs/OAUTH_SETUP.md`](docs/OAUTH_SETUP.md)

---

## 🚀 Uso

### Modo Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: **http://localhost:3001**

### Build de Producción

```bash
# Instalar dependencias exactas (respetando package-lock.json)
npm ci

# Compilar aplicación
npm run build

# Iniciar servidor de producción
npm start
```

La aplicación estará disponible en: **http://localhost:3000**

### Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia servidor de desarrollo (puerto 3001) |
| `npm run build` | Compila aplicación para producción |
| `npm start` | Inicia servidor de producción (puerto 3000) |
| `npm run lint` | Ejecuta linter (ESLint) |
| `npm run typecheck` | Verifica tipos de TypeScript |
| `npm test` | Ejecuta tests con Vitest |

---

## 🗄 Migraciones de Base de Datos

### Estructura de Migraciones

```
database/migrations/
├── development/       # Migraciones en desarrollo (trabajo local)
├── tested/           # Migraciones validadas (listas para producción)
└── applied/          # Migraciones aplicadas en producción
    └── archive/      # Historial de migraciones antiguas
```

### Workflow de Migraciones

1. **Desarrollo**: Crea migraciones en `development/`
   ```bash
   # Crear nueva migración
   touch database/migrations/development/$(date +%Y%m%d_%H%M%S)_nombre_descriptivo.sql
   ```

2. **Aplicar en DEV**: Ejecuta la migración en entorno de desarrollo
   ```bash
   ./scripts/apply_migrations_dev.sh
   ```

3. **Promover a Tested**: Una vez validada, muévela a `tested/`
   ```bash
   ./scripts/promote_migration.sh
   ```

4. **Aplicar en PROD**: Las migraciones en `tested/` se aplican a producción

> 📚 **Guía completa de migraciones**: Ver [`database/README.md`](database/README.md)

---

## 🌍 Despliegue a Producción

### Preparación

1. **Variables de Entorno**: Crea `.env.production.local` con valores de producción
   ```env
   DATABASE_URL="postgresql://cuentassik_user:password@localhost:5432/cuentassik_prod"
   NEXT_PUBLIC_SITE_URL="https://tu-dominio.com"
   # ... resto de variables
   ```

2. **Base de Datos PROD**: Crea y configura base de datos de producción
   ```bash
   createdb -O cuentassik_prod_owner cuentassik_prod
   psql -U cuentassik_prod_owner -d cuentassik_prod -f database/migrations/applied/20251014_150000_seed.sql
   ```

3. **Build**: Compila la aplicación
   ```bash
   npm ci
   npm run build
   ```

### Opciones de Despliegue

#### Opción 1: Node.js Directo

```bash
# Iniciar en puerto 3000
npm start
```

#### Opción 2: Gestor de procesos

Puedes usar cualquier gestor de procesos para producción (PM2, systemd, Docker, etc.). Ejemplo con configuración personalizada:

```bash
# Ejemplo genérico - adapta según tu entorno
# La aplicación debe iniciarse con: npm start
# Puerto por defecto: 3000
# Variables de entorno: Cargar desde .env.production.local
```

#### Opción 3: Docker

```dockerfile
# Dockerfile de ejemplo (crear en la raíz del proyecto)
FROM node:18-alpine AS base

# Dependencias
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --production

# Builder
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build y ejecutar
docker build -t cuentassik .
docker run -p 3000:3000 --env-file .env.production.local cuentassik
```

#### Opción 4: Servidor Web (Nginx/Apache)

Configura un proxy reverso para servir la aplicación:

```nginx
# Ejemplo Nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

> 📚 **Guía completa de despliegue**: Ver [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

---

## � Troubleshooting

### Error 401 Unauthorized en API

**Síntoma**: Al intentar cambiar periodos o realizar acciones, recibes errores 401 en las peticiones API.

**Causa**: El `JWT_SECRET` no está cargado en las variables de entorno del proceso.

**Solución**:

1. Verifica que `.env.production.local` existe y contiene `JWT_SECRET`
2. Asegúrate de que tu gestor de procesos carga las variables de entorno correctamente
3. Verifica que las variables están disponibles en el entorno:
   ```bash
   # Método depende de tu gestor de procesos
   # Ejemplo genérico: echo $JWT_SECRET
   ```

### Problemas con Google OAuth

**Síntoma**: Error "redirect_uri_mismatch" al intentar login con Google.

**Solución**:
1. Verifica que `GOOGLE_REDIRECT_URI` en tu `.env` coincide exactamente con la URI autorizada en Google Cloud Console
2. Desarrollo: `http://localhost:3001/auth/google/callback`
3. Producción: `https://tudominio.com/auth/google/callback` (debe estar autorizada en Google Cloud)

### Base de Datos no conecta

**Síntoma**: Error de conexión a PostgreSQL.

**Solución**:
1. Verifica que PostgreSQL está ejecutándose: `systemctl status postgresql`
2. Comprueba que `DATABASE_URL` es correcta
3. Verifica credenciales del usuario `cuentassik_user`
4. Asegúrate de que la base de datos existe: `psql -l | grep cuentassik`

### Build Falla en Producción

**Síntoma**: Error "Could not find a production build" al iniciar.

**Solución**:
```bash
# Limpiar y reconstruir
rm -rf .next
npm run build
```

Para más ayuda, consulta la [documentación completa de troubleshooting](docs/TROUBLESHOOTING.md).

---

## �📚 Documentación

### Guías de Usuario
- [🏠 Crear y Gestionar Hogares](docs/guides/HOGARES.md)
- [💰 Sistema de Contribuciones](docs/guides/CONTRIBUCIONES.md)
- [📊 Estadísticas y Reportes](docs/guides/ESTADISTICAS.md)

### Guías Técnicas
- [🗄️ Configuración de PostgreSQL](docs/POSTGRESQL_SETUP.md)
- [🔐 Sistema de Autenticación](docs/AUTH_SYSTEM.md)
- [📤 Exportación de Datos](docs/EXPORT_SYSTEM.md)
- [🔧 Troubleshooting](docs/TROUBLESHOOTING.md)

### Documentación Completa
Ver el directorio [`docs/`](docs/) para documentación detallada.

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios usando [Conventional Commits](https://www.conventionalcommits.org/)
   ```bash
   git commit -m "feat(scope): add amazing feature"
   ```
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Conventional Commits

Este proyecto usa Conventional Commits para generar automáticamente el CHANGELOG:

- `feat`: Nueva característica
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Formateo de código
- `refactor`: Refactorización sin cambios funcionales
- `test`: Añadir o modificar tests
- `chore`: Tareas de mantenimiento

Ver [CONTRIBUTING.md](CONTRIBUTING.md) para más detalles.

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más información.

---

## 👥 Autores

- **Equipo CuentasSiK** - *Desarrollo inicial* - [GitHub](https://github.com/Kavalieri)

---

## 🙏 Agradecimientos

- [Next.js](https://nextjs.org/) por el framework increíble
- [shadcn/ui](https://ui.shadcn.com/) por los componentes UI
- [Vercel](https://vercel.com) por la plataforma de desarrollo
- Comunidad open source por las herramientas utilizadas

---

<div align="center">

**¿Te gusta CuentasSiK?** Dale una ⭐ al proyecto!

[⬆ Volver arriba](#-cuentassik)

</div>
