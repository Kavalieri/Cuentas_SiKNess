# Plan de Acción - 4 de Octubre 2025

## 🎯 Objetivos del Día

1. Limpiar repositorio antes de commit/push
2. Deploy en Vercel
3. Testing en preproducción para resolver bug de miembros

---

## 📋 Checklist Paso a Paso

### 1. 🧹 Limpieza del Repositorio (PRE-COMMIT)

#### A. Remover Debug Logs
- [ ] `app/app/household/page.tsx` - Eliminar console.logs:
  ```typescript
  console.log('[HouseholdPage] Members data:', membersData);
  console.log('[HouseholdPage] Enriched members:', members);
  console.log('[HouseholdPage] Contributions:', contributions);
  console.log('[HouseholdPage] Goal amount:', goalAmount);
  ```

- [ ] `lib/adminCheck.ts` - Eliminar console.logs de isSystemAdmin():
  ```typescript
  console.log('[isSystemAdmin] Checking for user:', ...);
  console.log('[isSystemAdmin] Query result:', ...);
  console.log('[isSystemAdmin] User IS admin ✓');
  ```

#### B. Verificar Archivos Obsoletos
- [ ] Revisar si hay componentes no usados en `app/app/categories/` (ya movido a household)
- [ ] Revisar si hay componentes no usados en `app/app/contributions/` (ya movido a household)
- [ ] Verificar que no hay migraciones duplicadas o conflictivas

#### C. Actualizar .gitignore
- [ ] Verificar que `.env.local` está en `.gitignore`
- [ ] Verificar que `types/database.ts` NO está en `.gitignore` (debe subirse)

#### D. Build Final
```bash
npm run build
```
- [ ] Verificar que build pasa sin errores
- [ ] Verificar que lint pasa sin warnings

---

### 2. 🚀 Deploy en Vercel

#### A. Configurar Variables de Entorno en Vercel

**Dashboard de Vercel → Project Settings → Environment Variables**

Agregar las siguientes variables para **Production**, **Preview** y **Development**:

```env
# Públicas (obligatorias)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key_de_supabase>

# Privadas (obligatorias para admin panel)
SUPABASE_SERVICE_ROLE_KEY=<service_role_key_de_supabase>
```

**Cómo obtener las claves**:
1. Ir a Supabase Dashboard
2. Project Settings → API
3. `anon` key → Copiar
4. `service_role` key → Copiar

**⚠️ CRÍTICO**: Sin `SUPABASE_SERVICE_ROLE_KEY` el admin panel fallará con:
```
Error: Missing Supabase environment variables
```

#### B. Configurar Redirect URLs en Supabase

**Supabase Dashboard → Authentication → URL Configuration**

Agregar:
```
https://tu-app.vercel.app/auth/callback
https://tu-app-*.vercel.app/auth/callback  (para previews)
```

#### C. Deploy desde Git

```bash
# Commit todos los cambios
git add .
git commit -m "feat: implement auto categories, admin member management, and critical fixes

- Add automatic category creation for all new households
- Implement admin functions to add/remove members
- Fix household member visibility bug
- Add supabaseAdmin client for admin operations
- Improve household creation with detailed logging
- Update documentation with critical fixes and session summary"

# Push a GitHub
git push origin main
```

Vercel detectará el push automáticamente y empezará el deploy.

#### D. Verificar Deploy
- [ ] Ir a Vercel Dashboard
- [ ] Ver logs del deployment
- [ ] Verificar que build terminó exitosamente
- [ ] Obtener URL de producción

---

### 3. 🧪 Testing en Preproducción

#### A. Problema Actual Conocido

**Error en localhost**:
```
Missing Supabase environment variables. Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
```

**Causa**: Falta configurar `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`

**Solución para desarrollo**:
```bash
# En .env.local (crear si no existe)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<tu_service_role_key>
```

#### B. Bug de Miembros No Visibles

**Síntoma**: Usuario no aparece en household_members, no puede ver contribuciones.

**Plan de Testing**:

1. **Ejecutar Script de Reparación** (una sola vez):
   ```sql
   -- En Supabase SQL Editor
   -- Ejecutar: db/fix_missing_member.sql
   ```

2. **Probar Creación de Household Nuevo**:
   - [ ] Crear cuenta nueva en producción
   - [ ] Crear household con nombre
   - [ ] Verificar en Supabase que se insertó en `household_members`
   - [ ] Verificar que aparecen las 10 categorías automáticamente
   - [ ] Verificar que el usuario ve su household correctamente

3. **Probar Flujo de Contribuciones**:
   - [ ] Ir a /app/household → Tab "General"
   - [ ] Configurar ingreso mensual
   - [ ] Configurar fondo mensual
   - [ ] Verificar que se calcula contribución proporcional
   - [ ] Hacer clic en "Marcar como Aportado"
   - [ ] Verificar cambio de estado a "Aportado"

4. **Probar Admin Panel**:
   - [ ] Ir a /app/admin/users
   - [ ] Verificar que carga listado de usuarios
   - [ ] Verificar que se ven los households de cada usuario
   - [ ] Ir a /app/admin/households
   - [ ] Verificar que se ven todos los households con sus miembros

#### C. Debugging en Producción

Si el problema de miembros persiste:

**Query SQL para verificar**:
```sql
-- Ver si el usuario existe en household_members
SELECT 
  hm.household_id,
  h.name as household_name,
  hm.user_id,
  u.email,
  hm.role,
  hm.created_at
FROM household_members hm
JOIN households h ON h.id = hm.household_id
LEFT JOIN auth.users u ON u.id = hm.user_id
WHERE u.email = 'YOUR_EMAIL@example.com'
ORDER BY hm.created_at DESC;
```

**Ver logs de la función**:
```sql
-- En Supabase Dashboard → Logs
-- Buscar por: [create_household_with_member]
-- Deberías ver logs de cada paso
```

**Posibles causas si sigue fallando**:
1. RLS policy bloqueando INSERT en household_members
2. Función no se está ejecutando correctamente
3. Transaction rollback silencioso

**Soluciones**:
1. Ejecutar `db/fix_missing_member.sql` para insertar manualmente
2. Verificar políticas RLS en tabla `household_members`
3. Revisar logs de Supabase para ver errores

---

### 4. 📊 Verificación Post-Deploy

#### Checklist de Funcionalidades

**Autenticación**:
- [ ] Magic link funciona
- [ ] Redirect después de login funciona
- [ ] Sesión persiste correctamente

**Households**:
- [ ] Creación funciona
- [ ] Usuario aparece como owner
- [ ] Categorías se crean automáticamente (10 total)

**Contribuciones**:
- [ ] Configurar ingreso funciona
- [ ] Configurar fondo funciona
- [ ] Cálculo proporcional correcto
- [ ] Marcar como aportado funciona

**Admin Panel**:
- [ ] /app/admin carga correctamente
- [ ] /app/admin/users muestra usuarios
- [ ] /app/admin/households muestra households
- [ ] System admins se identifican correctamente

**UI/UX**:
- [ ] Tema dark/light funciona
- [ ] Navegación responsive
- [ ] Todos los tabs de household funcionan

---

## 🚨 Problemas Conocidos y Soluciones

### Problema 1: SERVICE_ROLE_KEY Missing

**Error**:
```
Missing Supabase environment variables. Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
```

**Solución**:
- Desarrollo: Agregar a `.env.local`
- Producción: Configurar en Vercel Environment Variables

### Problema 2: Usuario No en household_members

**Error**: Household page muestra vacío, no hay miembros.

**Solución**:
1. Ejecutar `db/fix_missing_member.sql` (one-time fix)
2. Verificar que funciones futuras funcionan con logging
3. Si persiste, revisar RLS policies

### Problema 3: Admin Panel 404 o Access Denied

**Causa**: Usuario no es system admin.

**Solución**:
```sql
-- Agregar usuario como system admin
INSERT INTO system_admins (user_id, granted_by, notes)
VALUES (
  '<user_id_aqui>',
  '<user_id_aqui>',
  'Admin permanente inicial'
);
```

---

## 📝 Comandos Útiles para Mañana

```bash
# Limpiar y verificar
npm run lint
npm run build

# Commit
git add .
git commit -m "feat: [descripción]"
git push origin main

# Regenerar tipos si hay cambios en DB
npm run types:supabase

# Ver logs de Supabase
npx supabase db logs
```

---

## 🎯 Criterios de Éxito

Al final del día mañana, deberías tener:

1. ✅ Repositorio limpio y pusheado a GitHub
2. ✅ Deploy exitoso en Vercel
3. ✅ Variables de entorno configuradas
4. ✅ Admin panel funcionando
5. ✅ Usuario puede crear household y ver miembros
6. ✅ Categorías se crean automáticamente
7. ✅ Sistema de contribuciones funcionando
8. ✅ Testing completo de flujo principal

---

## 📞 Recursos de Referencia

- **Documentación de hoy**: `docs/SESSION_SUMMARY_2025-10-03.md`
- **Fixes críticos**: `docs/CRITICAL_FIXES.md`
- **Sistema de categorías**: `docs/AUTO_CATEGORIES_AND_ADMIN_MANAGEMENT.md`
- **Script de reparación**: `db/fix_missing_member.sql`
- **Vercel deploy guide**: `docs/VERCEL_DEPLOY.md`

---

## ⏰ Tiempo Estimado

- Limpieza del repo: **15 minutos**
- Configuración Vercel: **10 minutos**
- Deploy y espera: **5-10 minutos**
- Testing completo: **30 minutos**
- Debugging si hay issues: **30-60 minutos**

**Total estimado**: 1.5 - 2 horas

---

**Fecha de creación**: 3 de Octubre 2025  
**Estado actual**: Build exitoso, migraciones aplicadas, listo para deploy  
**Próxima acción**: Limpiar logs de debug y commitear
