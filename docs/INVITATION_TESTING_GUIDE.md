# Testing del Sistema de Invitaciones

**Fecha**: 3 de octubre de 2025

## Preparación

Asegúrate de haber aplicado la migración:
```bash
npx supabase db push --include-all
```

## Test 1: Constraint de Invitaciones - Recrear Después de Cancelar

### Objetivo
Verificar que se puede crear una nueva invitación después de cancelar una existente para el mismo email.

### Pasos

1. **Como Owner, crear invitación inicial**
   ```
   - Ir a /app/household → Tab "Miembros"
   - Click "Invitar Miembro"
   - Email: test@example.com
   - Click "Crear Invitación"
   - ✅ Debe mostrar link de invitación
   - Copiar link
   ```

2. **Cancelar invitación**
   ```
   - En lista de invitaciones pendientes
   - Click "Cancelar" en la invitación de test@example.com
   - ✅ Status debe cambiar a "Cancelada"
   ```

3. **Crear NUEVA invitación para mismo email (ANTES FALLABA)**
   ```
   - Click "Invitar Miembro"
   - Email: test@example.com (mismo que antes)
   - Click "Crear Invitación"
   - ✅ DEBE FUNCIONAR sin error "duplicate key"
   - ✅ Debe generar nuevo token/link
   ```

### Resultado Esperado
- ✅ Segunda invitación se crea exitosamente
- ✅ En la tabla `invitations` hay 2 filas:
  * (household_id, test@example.com, 'cancelled')
  * (household_id, test@example.com, 'pending')
- ✅ Ambas coexisten sin conflicto

### Si Falla
- ❌ Error: "duplicate key value violates unique constraint"
- → Verificar que migración se aplicó correctamente
- → Revisar constraints en Supabase Dashboard

---

## Test 2: Cookie de Invitación - Limpieza Después de Aceptar

### Objetivo
Verificar que la cookie se limpia automáticamente después de aceptar una invitación.

### Pasos

1. **Crear invitación como owner**
   ```
   - Ir a /app/household → "Miembros"
   - Crear invitación para nuevo-usuario@example.com
   - Copiar link de invitación
   ```

2. **Usar invitación en incógnito**
   ```
   - Abrir ventana incógnito
   - Pegar link de invitación
   - Middleware captura token → guarda en cookie
   - Redirige a /login
   ```

3. **Login y aceptar invitación**
   ```
   - Ingresar email: nuevo-usuario@example.com
   - Recibir magic link → click
   - Redirige a /app/invite?token=xxx
   - Click "Aceptar y Unirme"
   - ✅ Toast: "¡Te has unido al hogar correctamente!"
   - Redirige a /app (dashboard)
   ```

4. **Verificar limpieza de cookie**
   ```
   - Abrir DevTools → Application → Cookies
   - Buscar cookie "invitation_token"
   - ✅ NO debe existir (fue eliminada después de aceptar)
   
   - En dashboard, NO debe aparecer:
     * Alerta de "invitación pendiente"
     * DashboardOnboarding component
   - ✅ Debe mostrar dashboard normal con datos del hogar
   ```

### Resultado Esperado
- ✅ Cookie `invitation_token` eliminada automáticamente
- ✅ Dashboard muestra datos del hogar (no onboarding)
- ✅ No hay alertas de invitación pendiente

### Si Falla
- ❌ Cookie todavía existe después de aceptar
- ❌ Dashboard muestra alerta de invitación pendiente
- → Verificar que cambios en `acceptInvitation()` se aplicaron

---

## Test 3: Cookie de Invitación - Limpieza Si Es Inválida

### Objetivo
Verificar que la cookie se limpia si la invitación está expirada/cancelada/usada.

### Pasos

1. **Crear invitación**
   ```
   - Como owner, crear invitación para test@example.com
   - Copiar link
   ```

2. **Usuario abre link pero NO acepta todavía**
   ```
   - Incógnito → pegar link
   - Login con test@example.com
   - Llega a /app/invite
   - NO hacer click en "Aceptar"
   - Navegar manualmente a /app (dashboard)
   - ✅ Debe mostrar DashboardOnboarding con alerta de invitación
   ```

3. **Owner cancela invitación mientras usuario está logueado**
   ```
   - En ventana del owner: ir a /app/household → Miembros
   - Cancelar invitación de test@example.com
   ```

4. **Usuario refresca dashboard**
   ```
   - En ventana del usuario: F5 para refrescar /app
   - Dashboard detecta cookie → intenta validar token
   - getInvitationDetails() retorna error (status='cancelled')
   - ✅ Cookie debe ser eliminada automáticamente
   - ✅ Dashboard debe mostrar DashboardOnboarding SIN alerta
   ```

### Resultado Esperado
- ✅ Cookie eliminada cuando invitación es inválida
- ✅ Dashboard muestra onboarding sin invitación pendiente
- ✅ No hay loops infinitos de validación

### Si Falla
- ❌ Cookie persiste después de invalidación
- ❌ Dashboard sigue mostrando alerta de invitación
- → Verificar lógica en `app/app/page.tsx`

---

## Test 4: Múltiples Invitaciones al Mismo Email (Diferentes Estados)

### Objetivo
Verificar que el sistema permite tener múltiples invitaciones al mismo email con diferentes estados.

### Pasos

1. **Crear y aceptar primera invitación**
   ```
   - Crear invitación para test@example.com
   - Aceptar invitación (status='accepted')
   ```

2. **Crear segunda invitación (owner quiere re-invitar)**
   ```
   - Crear nueva invitación para test@example.com
   - ✅ DEBE FUNCIONAR (hay una 'accepted', nueva será 'pending')
   ```

3. **Verificar en base de datos**
   ```sql
   SELECT status, created_at, token 
   FROM invitations 
   WHERE email = 'test@example.com'
   ORDER BY created_at;
   
   -- Resultado esperado:
   -- status='accepted', created_at=<fecha1>, token=<token1>
   -- status='pending',  created_at=<fecha2>, token=<token2>
   ```

### Resultado Esperado
- ✅ Múltiples invitaciones coexisten con diferentes status
- ✅ Solo 1 invitación puede tener status='pending'
- ✅ Historial completo se mantiene

---

## Test 5: Intentar Duplicar Invitación Pendiente (Debe Fallar)

### Objetivo
Verificar que NO se puede crear segunda invitación pendiente para mismo email en mismo hogar.

### Pasos

1. **Crear invitación inicial**
   ```
   - Crear invitación para test@example.com
   - ✅ Debe funcionar (status='pending')
   ```

2. **Intentar crear segunda sin cancelar primera**
   ```
   - Sin cancelar la primera, intentar crear otra para test@example.com
   - ❌ DEBE FALLAR con mensaje claro
   - ✅ Mensaje: "Ya existe una invitación pendiente para este email en este hogar. Cancela la anterior antes de crear una nueva."
   ```

### Resultado Esperado
- ❌ Segunda invitación rechazada
- ✅ Mensaje de error claro y útil
- ✅ Primera invitación sigue activa

---

## Checklist Final

Antes de dar por cerrado el testing:

- [ ] Test 1: Crear después de cancelar ✅
- [ ] Test 2: Cookie se limpia después de aceptar ✅
- [ ] Test 3: Cookie se limpia si invitación es inválida ✅
- [ ] Test 4: Múltiples invitaciones con diferentes estados ✅
- [ ] Test 5: No permite duplicar invitación pendiente ✅

---

## Troubleshooting

### Problema: Migración no se aplicó
```bash
# Verificar estado de migraciones
npx supabase db remote list

# Si no aparece, aplicar manualmente
npx supabase db push --include-all
```

### Problema: Cookie no se limpia
```bash
# Verificar que cambios en código se compilaron
npm run build

# Reiniciar servidor de desarrollo
npm run dev
```

### Problema: Error "duplicate key" persiste
```sql
-- En Supabase SQL Editor, verificar constraints
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'invitations'::regclass;

-- Debe aparecer:
-- invitations_household_email_pending_unique (partial unique index)
-- NO debe aparecer:
-- invitations_household_email_pending_key (constraint completo)
```

---

**Status**: Tests pendientes de ejecución manual  
**Prerequisito**: Migración aplicada ✅  
**Cambios en código**: Compilados ✅
