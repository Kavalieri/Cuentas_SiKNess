# Corrección de Problemas Críticos - Household Members y Admin Panel

## Fecha: 2025-01-05

## Problemas Identificados

### 1. Usuario No Aparece como Miembro del Hogar

**Síntoma**: `get_household_members()` retorna `null`, usuario no aparece en listado de miembros.

**Causa Raíz**: 
- La función `create_household_with_member()` no insertó al usuario en `household_members`
- O la inserción fue bloqueada por políticas RLS
- La función `get_household_members()` tiene una guard clause que lanza excepción si el usuario no es miembro

**Solución**: Ejecutar script SQL manual para insertar usuario como owner

#### Pasos para Corregir

1. **Ir a Supabase Dashboard → SQL Editor**

2. **Ejecutar el script**: `db/fix_missing_member.sql`
   ```sql
   -- Este script busca el usuario por email
   -- Encuentra su household más reciente
   -- Lo inserta como owner en household_members
   -- Verifica que ahora puede acceder a get_household_members()
   ```

3. **Verificar resultado**:
   ```sql
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
   WHERE u.email = 'caballeropomes@gmail.com'
   ORDER BY hm.created_at DESC;
   ```

4. **Refrescar la aplicación** - Deberías ver:
   - Tu nombre en la lista de miembros
   - Tu contribución calculada para el mes actual
   - Botón "Marcar como Aportado"

### 2. Admin Panel Error: "User not allowed"

**Síntoma**: Panel de administración de usuarios muestra error al cargar.

**Causa Raíz**:
- `supabase.auth.admin.listUsers()` requiere **SERVICE_ROLE_KEY**
- Estábamos usando `ANON_KEY` que tiene RLS habilitado
- Las operaciones `auth.admin.*` solo funcionan con privilegios de administrador

**Solución Implementada**:

1. **Creado `lib/supabaseAdmin.ts`**: Cliente Supabase con SERVICE_ROLE_KEY
   - ⚠️ Bypasea RLS - solo usar con verificación previa de isSystemAdmin()
   - ⚠️ NUNCA exponer al navegador
   - Solo para Server Components/Actions

2. **Actualizado `app/app/admin/users/page.tsx`**:
   - Primero verifica que usuario actual es system_admin
   - Luego usa `supabaseAdmin()` para operaciones de administración
   - Usa adminClient para queries a household_members y system_admins

3. **Agregado variable de entorno**: `SUPABASE_SERVICE_ROLE_KEY`

#### Configuración Requerida

**`.env.local`** (NO subir al repo):
```env
NEXT_PUBLIC_SUPABASE_URL=https://fizxvvtakvmmeflmbwud.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu_anon_key>

# Admin Panel - Service Role Key (bypasea RLS)
SUPABASE_SERVICE_ROLE_KEY=<tu_service_role_key>
```

**Obtener SERVICE_ROLE_KEY**:
1. Supabase Dashboard → Project Settings
2. API → service_role (secret)
3. Copiar y pegar en `.env.local`

**Vercel (Producción)**:
1. Vercel Dashboard → Project Settings
2. Environment Variables → Add New
3. `SUPABASE_SERVICE_ROLE_KEY` = `<tu_service_role_key>`
4. Scope: Production, Preview, Development

## Archivos Modificados

### Nuevos Archivos
- ✅ `lib/supabaseAdmin.ts` - Cliente admin con SERVICE_ROLE_KEY
- ✅ `db/fix_missing_member.sql` - Script para insertar usuario como member

### Archivos Actualizados
- ✅ `.env.example` - Documentada variable SUPABASE_SERVICE_ROLE_KEY
- ✅ `app/app/admin/users/page.tsx` - Usa supabaseAdmin() y verifica isSystemAdmin
- ✅ Documentación: Este archivo (CRITICAL_FIXES.md)

## Verificación Post-Corrección

### Checklist Household Members
- [ ] Script SQL ejecutado exitosamente
- [ ] Usuario aparece en query de verificación
- [ ] Al recargar /app/household, ves tu nombre en "Miembros"
- [ ] Ves tu contribución calculada (ej: "750€ de 2000€")
- [ ] Aparece botón "Marcar como Aportado" para ti en mes actual
- [ ] Estado muestra "Pendiente" con ícono Circle

### Checklist Admin Panel
- [ ] Variable `SUPABASE_SERVICE_ROLE_KEY` configurada en `.env.local`
- [ ] Servidor reiniciado (`npm run dev`)
- [ ] Al acceder a `/app/admin/users`, carga sin errores
- [ ] Ves listado de todos los usuarios registrados
- [ ] Tu usuario tiene badge "System Admin" verde
- [ ] Se muestra correctamente el household al que perteneces

## Notas Importantes

### Seguridad
- ⚠️ **SERVICE_ROLE_KEY** bypasea Row Level Security
- ⚠️ **NUNCA** exponer esta clave al navegador
- ⚠️ Solo usar en Server Components con verificación previa de admin
- ✅ Patrón implementado:
  ```typescript
  // 1. Verificar auth con cliente normal
  const supabase = await supabaseServer();
  const { data: isAdmin } = await supabase
    .from('system_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single();
  
  if (!isAdmin) return <div>Acceso denegado</div>;
  
  // 2. Solo entonces usar cliente admin
  const adminClient = supabaseAdmin();
  const { data: users } = await adminClient.auth.admin.listUsers();
  ```

### Por Qué No Funcionó la Inserción Original

La función `create_household_with_member()` tiene `SECURITY DEFINER`, pero:
1. Puede haber fallado silenciosamente por constraint violation
2. O la política RLS de INSERT en household_members la bloqueó
3. O hubo un rollback de transacción no logueado

**Solución a largo plazo**: 
- Agregar logging explícito en la función
- Retornar errores detallados
- Considerar usar `INSERT ... RETURNING *` para verificar inserción

### Guard Clause en get_household_members

Actualmente la función tiene:
```sql
if not exists (
  select 1 from household_members
  where household_id = p_household_id
  and user_id = auth.uid()
) then
  raise exception 'No tienes acceso a este household';
end if;
```

**Problema**: Si un usuario no es miembro, no puede ver la lista (chicken-egg).

**Alternativas**:
1. ✅ **Actual**: Insertar manualmente con script
2. ⚠️ Cambiar a `RETURN QUERY SELECT ... WHERE EXISTS(...)` (retorna array vacío en lugar de exception)
3. ⚠️ Hacer que owners/admins puedan ver todos los households

Por ahora, la inserción manual es suficiente. Si el problema persiste, considerar refactorizar la función.

## Próximos Pasos

1. **Ejecutar script SQL** en Supabase Dashboard
2. **Configurar SERVICE_ROLE_KEY** en `.env.local`
3. **Reiniciar servidor** de desarrollo
4. **Verificar ambas funcionalidades**:
   - Household members visible
   - Admin panel carga usuarios
5. **Probar flujo completo**:
   - Configurar ingreso mensual
   - Configurar fondo mensual del hogar
   - Ver contribución calculada
   - Marcar como aportado
   - Verificar cambio de estado a "Aportado"
6. **Testing adicional**:
   - Invitar segundo miembro
   - Verificar distribución proporcional
   - Probar con gastos/ingresos
7. **Deploy a Vercel**:
   - Configurar SERVICE_ROLE_KEY en Vercel
   - Ejecutar script SQL en producción (si aplica)
   - Verificar funcionamiento en prod

## Referencias

- Supabase Auth Admin API: https://supabase.com/docs/reference/javascript/auth-admin-listusers
- Row Level Security: https://supabase.com/docs/guides/auth/row-level-security
- Security Definer Functions: https://www.postgresql.org/docs/current/sql-createfunction.html
