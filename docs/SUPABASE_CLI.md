# Guía de Supabase CLI

## Instalación y Setup

### Ya instalado ✅
Verificar versión:
```bash
supabase --version
```

### Inicializar Supabase en el Proyecto

```bash
# Desde la raíz del proyecto
supabase init
```

Esto creará:
- `supabase/config.toml`: Configuración del proyecto
- `supabase/migrations/`: Carpeta para migraciones

## Vincular con tu Proyecto de Supabase

```bash
# Login a Supabase
supabase login

# Vincular con proyecto existente
supabase link --project-ref fizxvvtakvmmeflmbwud
```

Te pedirá tu **database password** (la que configuraste cuando creaste el proyecto).

## Gestión de Migraciones

### 1. Crear una Nueva Migración

```bash
# Crear migración vacía
supabase migration new nombre_descriptivo

# Ejemplo: agregar columna a una tabla
supabase migration new add_contribution_column
```

Esto creará un archivo en `supabase/migrations/` con timestamp.

### 2. Aplicar Migraciones Localmente (con Supabase Local)

```bash
# Iniciar Supabase local con Docker
supabase start

# Aplicar migraciones
supabase db reset
```

### 3. Aplicar Migraciones a Producción

```bash
# Push todas las migraciones pendientes
supabase db push
```

⚠️ **CUIDADO**: Esto aplicará cambios directamente a producción.

### 4. Generar Migración desde Cambios en la UI

Si hiciste cambios en la UI de Supabase (Table Editor, SQL Editor):

```bash
# Generar migración basada en diferencias
supabase db diff -f nombre_de_migracion

# Ejemplo: después de crear tablas en UI
supabase db diff -f create_contribution_tables
```

Esto creará un archivo SQL con los cambios.

### 5. Ver Estado de Migraciones

```bash
# Ver migraciones aplicadas
supabase migration list

# Ver diferencias con remoto
supabase db diff
```

## Gestión de Tipos TypeScript

### Generar Tipos desde la Base de Datos

```bash
# Generar types/database.ts
supabase gen types typescript --local > types/database.ts

# O directamente desde producción
supabase gen types typescript --project-id fizxvvtakvmmeflmbwud > types/database.ts
```

⚠️ **Importante**: Ejecuta esto cada vez que cambies el schema.

### Automatizar con npm script

Agrega a `package.json`:

```json
{
  "scripts": {
    "types:supabase": "supabase gen types typescript --project-id fizxvvtakvmmeflmbwud > types/database.ts"
  }
}
```

Luego:
```bash
npm run types:supabase
```

## Workflow Recomendado

### Para Desarrollo Local

1. **Cambios en Schema**:
   ```bash
   # Opción A: Crear migración manual
   supabase migration new add_new_feature
   # Editar el archivo SQL generado
   
   # Opción B: Cambios en Supabase UI + generar diff
   # Hacer cambios en https://supabase.com/dashboard
   supabase db diff -f add_new_feature
   ```

2. **Regenerar Tipos**:
   ```bash
   npm run types:supabase
   ```

3. **Commit**:
   ```bash
   git add supabase/migrations types/database.ts
   git commit -m "feat: add contribution tables"
   ```

### Para Aplicar a Producción

```bash
# Verificar migraciones pendientes
supabase migration list

# Aplicar
supabase db push

# Regenerar tipos de producción
npm run types:supabase
```

## Comandos Útiles

### Base de Datos

```bash
# Ver status del proyecto
supabase status

# Ejecutar SQL directamente
supabase db query "SELECT * FROM households"

# Resetear DB local (con Docker)
supabase db reset

# Dump de schema
supabase db dump --schema public > db/schema_backup.sql

# Dump de datos
supabase db dump --data-only > db/data_backup.sql
```

### Funciones Edge (Futuro)

```bash
# Crear función edge
supabase functions new my-function

# Desplegar función
supabase functions deploy my-function

# Ver logs
supabase functions logs my-function
```

### Secrets

```bash
# Listar secrets
supabase secrets list

# Agregar secret
supabase secrets set MY_SECRET=value

# Eliminar secret
supabase secrets unset MY_SECRET
```

## Integración con CI/CD

### GitHub Actions para Migraciones

Crear `.github/workflows/supabase-migrations.yml`:

```yaml
name: Supabase Migrations

on:
  push:
    branches: [main]
    paths:
      - 'supabase/migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        
      - name: Push migrations
        run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
```

Configurar secrets en GitHub:
- `SUPABASE_ACCESS_TOKEN`: Personal access token de Supabase
- `SUPABASE_DB_PASSWORD`: Password de la DB

## Ejemplo: Aplicar el Fix de RLS

```bash
# 1. Crear migración desde archivo existente
supabase migration new fix_rls_policies

# 2. Copiar contenido de db/fix-rls-policies.sql
#    al archivo generado en supabase/migrations/

# 3. Aplicar a producción
supabase db push

# 4. Verificar
supabase db query "SELECT * FROM pg_policies WHERE tablename = 'household_members'"
```

## Troubleshooting

### Error: "Could not connect to local database"

Asegúrate de tener Docker corriendo:
```bash
docker ps
supabase start
```

### Error: "Project not linked"

```bash
supabase link --project-ref fizxvvtakvmmeflmbwud
```

### Error: "Migration already exists"

Verifica:
```bash
supabase migration list
```

Si hay conflicto, renombra o elimina la migración duplicada.

### Regenerar Tipos con Errores

Si `gen types` falla:
```bash
# Verificar conexión
supabase db query "SELECT 1"

# Regenerar forzando
supabase gen types typescript --project-id fizxvvtakvmmeflmbwud --schema public > types/database.ts
```

## Supabase Local Development (Opcional)

Para desarrollo completamente offline:

```bash
# Iniciar stack completo (Postgres, Auth, Storage, etc.)
supabase start

# Ver URLs locales
supabase status

# Detener
supabase stop
```

Esto requiere Docker y es útil para:
- Desarrollo offline
- Tests de integración
- CI/CD pipelines

Para este proyecto, es **opcional**. Puedes trabajar directamente con la DB remota.

## Recursos

- [Docs oficiales de Supabase CLI](https://supabase.com/docs/guides/cli)
- [Guía de migraciones](https://supabase.com/docs/guides/cli/local-development)
- [TypeScript types](https://supabase.com/docs/guides/api/generating-types)

## Próximos Pasos

1. ✅ Instalar CLI (ya hecho)
2. ⏳ `supabase init` en el proyecto
3. ⏳ `supabase link --project-ref fizxvvtakvmmeflmbwud`
4. ⏳ Convertir `db/fix-rls-policies.sql` en migración
5. ⏳ Aplicar con `supabase db push`
6. ✅ Agregar script `types:supabase` a package.json
