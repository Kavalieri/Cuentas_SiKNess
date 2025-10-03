# 🔧 Configuración del Entorno

## Variables de Entorno Requeridas

### Desarrollo Local (`.env.local`)

Crear archivo `.env.local` en la raíz del proyecto:

```bash
# Public (required)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Private (required for admin panel)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Obtener las Claves

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. **Project Settings** → **API**
3. Copia las siguientes claves:
   - **URL**: Campo `URL`
   - **anon key**: Campo `anon` bajo "Project API keys"
   - **service_role key**: Campo `service_role` bajo "Project API keys"

⚠️ **IMPORTANTE**: 
- `.env.local` NUNCA se sube al repositorio (está en `.gitignore`)
- `service_role` key tiene permisos de administrador - mantenerla privada

### Producción (Vercel)

Configurar las mismas variables en:
**Vercel Dashboard** → **Project Settings** → **Environment Variables**

Agregar para **Production**, **Preview** y **Development**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Redirect URLs en Supabase

Configurar en **Supabase Dashboard** → **Authentication** → **URL Configuration**:

```
http://localhost:3000/auth/callback
https://your-app.vercel.app/auth/callback
https://your-app-*.vercel.app/auth/callback
```

## Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Regenerar tipos de Supabase
npm run types:supabase
```

## Verificación

Para verificar que todo está configurado correctamente:

1. Iniciar servidor: `npm run dev`
2. Visitar: `http://localhost:3000`
3. Intentar login con magic link
4. Si funciona, la configuración es correcta ✅
