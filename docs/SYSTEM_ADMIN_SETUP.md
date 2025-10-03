# Guía de Configuración Segura del Admin del Sistema

## 🔒 Seguridad y Privacidad

**IMPORTANTE**: Esta aplicación maneja datos financieros. **NUNCA** incluyas emails personales o información sensible en el código fuente, migraciones o documentación pública.

---

## 📋 Configuración del Admin Permanente

### Paso 1: Configurar Variable de Entorno

Añade la siguiente variable a tu archivo `.env.local`:

```env
NEXT_PUBLIC_SYSTEM_ADMIN_EMAIL=tu-email@example.com
```

**⚠️ IMPORTANTE**: 
- Reemplaza `tu-email@example.com` con tu email real
- NO subas `.env.local` al repositorio
- `.env.local` ya está en `.gitignore`

### Paso 2: Configuración en Vercel (Producción)

1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Añade:
   - **Key**: `NEXT_PUBLIC_SYSTEM_ADMIN_EMAIL`
   - **Value**: `tu-email@example.com`
   - **Environments**: Production, Preview, Development

### Paso 3: Insertar Admin en Supabase

#### Opción A: SQL Editor (Recomendado)

1. Abre Supabase Dashboard → SQL Editor
2. Ejecuta el siguiente código (reemplazando el email):

```sql
-- Insertar admin permanente del sistema
INSERT INTO system_admins (user_id, notes)
SELECT id, 'Administrador permanente del sistema'
FROM auth.users
WHERE email = 'tu-email@example.com'  -- REEMPLAZAR con tu email
ON CONFLICT (user_id) DO NOTHING;
```

3. Verifica que se insertó:

```sql
SELECT 
  sa.user_id,
  u.email,
  sa.created_at,
  sa.notes
FROM system_admins sa
LEFT JOIN auth.users u ON u.id = sa.user_id;
```

#### Opción B: Usando Supabase CLI

```bash
# Asegúrate de estar conectado al proyecto correcto
npx supabase link --project-ref YOUR_PROJECT_ID

# Ejecutar SQL
npx supabase db execute --file db/manual/insert-admin.sql
```

Contenido de `db/manual/insert-admin.sql`:

```sql
-- IMPORTANTE: Reemplazar con tu email antes de ejecutar
INSERT INTO system_admins (user_id, notes)
SELECT id, 'Administrador permanente del sistema'
FROM auth.users
WHERE email = 'TU_EMAIL@example.com'
ON CONFLICT (user_id) DO NOTHING;
```

---

## ✅ Verificación

### 1. Verificar Variable de Entorno

```bash
# En desarrollo
npm run dev

# Abrir navegador y en la consola ejecutar:
console.log(process.env.NEXT_PUBLIC_SYSTEM_ADMIN_EMAIL)
```

### 2. Verificar Admin en DB

```sql
-- Ver todos los admins
SELECT 
  sa.user_id,
  u.email,
  sa.created_at,
  sa.notes
FROM system_admins sa
LEFT JOIN auth.users u ON u.id = sa.user_id;
```

### 3. Probar Acceso

1. Login con tu email
2. Navega a `/app/admin`
3. ✅ Deberías ver el dashboard de administrador
4. Ve a `/app/admin/system-admins`
5. ✅ Tu email debería aparecer con badge "Permanente"

---

## 🛡️ Protecciones Implementadas

### 1. Código TypeScript

**Archivo**: `app/app/admin/actions.ts`

```typescript
// Verificar que no sea un admin permanente
const permanentAdminEmail = process.env.NEXT_PUBLIC_SYSTEM_ADMIN_EMAIL;
if (permanentAdminEmail && targetUser?.email === permanentAdminEmail) {
  return fail('No se puede eliminar al administrador permanente');
}
```

**Archivo**: `app/app/admin/system-admins/page.tsx`

```typescript
{
  email: user?.email ?? 'Email desconocido',
  // Admin permanente configurado en variable de entorno
  is_permanent: user?.email === process.env.NEXT_PUBLIC_SYSTEM_ADMIN_EMAIL,
}
```

### 2. UI

- Badge "Permanente" visible en lista de admins
- Botón "Eliminar" deshabilitado para admin permanente
- Tooltip explicativo sobre protección

### 3. Base de Datos

**Protección ON DELETE CASCADE**:
```sql
-- Si se intenta eliminar el usuario, se mantiene el registro de admin
-- (No se puede eliminar usuarios de auth.users desde la UI de todas formas)
ALTER TABLE system_admins 
ADD CONSTRAINT system_admins_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) 
ON DELETE CASCADE;
```

---

## 🔄 Migración desde Email Hardcodeado

Si tu proyecto tiene el email hardcodeado en código viejo:

### 1. Buscar Referencias

```bash
# Buscar en todo el proyecto
grep -r "tu-email-viejo@example.com" .

# O usando PowerShell (Windows)
Select-String -Path . -Pattern "tu-email-viejo@example.com" -Recurse
```

### 2. Reemplazar

#### En Código TypeScript:
```typescript
// ANTES (❌ INSEGURO)
if (user?.email === 'tu-email-viejo@example.com') {

// DESPUÉS (✅ SEGURO)
if (user?.email === process.env.NEXT_PUBLIC_SYSTEM_ADMIN_EMAIL) {
```

#### En Documentación:
```markdown
<!-- ANTES (❌) -->
Email del admin: tu-email-viejo@example.com

<!-- DESPUÉS (✅) -->
Email del admin: Configurado en NEXT_PUBLIC_SYSTEM_ADMIN_EMAIL
```

### 3. Limpiar Historial de Git (si es necesario)

Si accidentalmente commiteaste información sensible:

```bash
# Ver commits con el email
git log --all --full-history -- "*" | grep "tu-email"

# Reescribir historial (¡PELIGROSO! Hacer backup primero)
git filter-branch --tree-filter 'find . -type f -exec sed -i "s/tu-email-viejo@example.com/ADMIN_EMAIL/g" {} \;' HEAD

# Force push (si el repo es privado y solo tuyo)
git push origin --force --all
```

**⚠️ ALTERNATIVA MÁS SEGURA**: Simplemente hacer un nuevo commit limpio y documentar el cambio.

---

## 📝 Buenas Prácticas

### ✅ HACER

- Usar variables de entorno para **TODA** información sensible
- Usar placeholders genéricos en documentación: `YOUR_EMAIL@example.com`
- Revisar diffs antes de commit: `git diff`
- Usar `.env.example` con valores de ejemplo
- Documentar cómo configurar, no hardcodear valores

### ❌ NO HACER

- Hardcodear emails personales en código
- Subir `.env.local` al repositorio
- Incluir información real en ejemplos de documentación
- Compartir screenshots con información sensible
- Commitear datos de producción en migraciones

---

## 🆘 Troubleshooting

### Problema: Admin no tiene acceso

**Síntomas**: Usuario logueado pero ve "No autorizado" en `/app/admin`

**Soluciones**:

1. Verificar que el email en la variable de entorno coincide con el login:
   ```sql
   SELECT email FROM auth.users WHERE email = 'tu-email@example.com';
   ```

2. Verificar que el admin existe en la tabla:
   ```sql
   SELECT * FROM system_admins 
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'tu-email@example.com');
   ```

3. Si no existe, insertar:
   ```sql
   INSERT INTO system_admins (user_id, notes)
   SELECT id, 'Admin manual'
   FROM auth.users
   WHERE email = 'tu-email@example.com';
   ```

### Problema: Variable de entorno no cargada

**Síntomas**: `process.env.NEXT_PUBLIC_SYSTEM_ADMIN_EMAIL` es `undefined`

**Soluciones**:

1. Verificar que existe `.env.local`:
   ```bash
   cat .env.local | grep SYSTEM_ADMIN
   ```

2. Reiniciar servidor de desarrollo:
   ```bash
   npm run dev
   ```

3. En producción (Vercel), verificar en Dashboard → Environment Variables

### Problema: No puedo eliminar admin

**Síntomas**: Botón "Eliminar" deshabilitado

**Esto es correcto** si el admin es el permanente. Para cambiarlo:

1. Actualizar variable de entorno a otro email
2. Reiniciar aplicación
3. El admin anterior ya no estará protegido

---

## 📚 Referencias

- [Supabase Environment Variables](https://supabase.com/docs/guides/cli/local-development#using-environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

## 🔐 Checklist de Seguridad

Antes de hacer deploy o compartir código:

- [ ] `.env.local` está en `.gitignore`
- [ ] No hay emails personales en código
- [ ] No hay emails personales en migraciones
- [ ] No hay emails personales en documentación
- [ ] Variables de entorno configuradas en Vercel
- [ ] Admin insertado manualmente en Supabase
- [ ] Verificado acceso de admin funciona
- [ ] Verificado protección de admin permanente
- [ ] README actualizado con instrucciones genéricas

---

**Última actualización**: 2025-10-03  
**Responsable**: Documentación de seguridad para aplicación financiera
