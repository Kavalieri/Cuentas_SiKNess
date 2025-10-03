# Guía de Setup del Entorno de Desarrollo

## Requisitos

- Node.js 20.x o superior
- npm 10.x o superior
- Git
- Editor de código (VS Code recomendado)
- Cuenta en Supabase (gratuita)

## Pasos de Instalación

### 1. Clonar y Configurar

```bash
# Clonar el repositorio
git clone https://github.com/Kavalieri/CuentasSiK.git
cd CuentasSiK

# Instalar dependencias
npm install
```

### 2. Configurar Supabase

#### Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión o crea una cuenta
3. Haz clic en "New Project"
4. Completa los datos:
   - Name: CuentasSiK
   - Database Password: (guarda esta contraseña de forma segura)
   - Region: Selecciona la más cercana (Europe West recomendada)
5. Haz clic en "Create new project"

#### Ejecutar el Schema SQL

1. En tu proyecto de Supabase, ve a **SQL Editor** en la barra lateral
2. Haz clic en "New query"
3. Copia y pega el contenido completo de `db/schema.sql`
4. Haz clic en "Run" (botón inferior derecho)
5. Verifica que todas las tablas se crearon correctamente

#### Ejecutar el Seed SQL (Opcional)

1. Crea una nueva query en el SQL Editor
2. Copia y pega el contenido de `db/seed.sql`
3. Haz clic en "Run"

#### Configurar Auth

1. Ve a **Authentication** → **Providers** en Supabase
2. Asegúrate de que **Email** esté habilitado
3. Ve a **Email Templates** y personaliza (opcional):
   - Confirm signup
   - Magic Link (este es el que usamos)
   - Reset Password

#### Obtener Credenciales

1. Ve a **Settings** → **API**
2. Copia:
   - **Project URL** (ejemplo: `https://xxxxx.supabase.co`)
   - **anon public** key (la clave pública, NO la service_role)

### 3. Configurar Variables de Entorno

```bash
# Copiar el ejemplo de .env
cp .env.example .env.local

# Editar .env.local con tus credenciales
# Usa tu editor favorito o:
code .env.local  # VS Code
nano .env.local  # Terminal
```

Contenido de `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-aqui
```

### 4. Ejecutar en Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# El servidor arrancará en http://localhost:3000
```

### 5. Verificar que Todo Funciona

1. Abre http://localhost:3000
2. Deberías ver la landing page
3. Haz clic en "Iniciar Sesión"
4. Introduce tu email
5. Revisa tu correo para el magic link
6. Haz clic en el enlace del email
7. Deberías ser redirigido a `/app` (dashboard)

## Problemas Comunes

### Error: "Cannot find module"

```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Error: "Invalid API key"

- Verifica que copiaste la clave **anon public** (no la service_role)
- Asegúrate de que `.env.local` existe y tiene las claves correctas
- Reinicia el servidor de desarrollo

### Error: "No se puede conectar a Supabase"

- Verifica que el proyecto de Supabase esté activo
- Comprueba que la URL es correcta (debe incluir `https://`)
- Verifica tu conexión a internet

### El magic link no llega

- Revisa la carpeta de spam
- Verifica que el email esté bien escrito
- En Supabase, ve a Authentication → Logs para ver errores
- Asegúrate de que el email provider esté habilitado

### Error de CORS

- Esto NO debería ocurrir con Supabase
- Si ocurre, verifica que uses `NEXT_PUBLIC_` en el prefijo de las variables

## Comandos Útiles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo
npm run build            # Build de producción
npm run start            # Servidor de producción local

# Calidad de código
npm run lint             # Ejecutar ESLint
npm run lint -- --fix    # Arreglar problemas automáticamente
npm run typecheck        # Verificar tipos TypeScript

# Testing
npm test                 # Ejecutar tests una vez
npm run test:watch       # Tests en modo watch

# Base de datos (en Supabase SQL Editor)
# 1. Ejecutar db/schema.sql
# 2. Ejecutar db/seed.sql (opcional)
```

## Extensiones de VS Code Recomendadas

- ESLint
- Prettier - Code formatter
- Tailwind CSS IntelliSense
- PostCSS Language Support
- TypeScript Vue Plugin (Volar)

## Configuración de VS Code

Crea `.vscode/settings.json` con:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

## Siguientes Pasos

1. Familiarízate con la estructura del proyecto (ver README.md)
2. Lee las convenciones de código en `.github/copilot-instructions.md`
3. Explora los ejemplos de código en `app/` y `lib/`
4. Comienza a desarrollar siguiendo las convenciones establecidas

## Recursos

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Supabase](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Hook Form](https://react-hook-form.com)
- [Zod](https://zod.dev)
