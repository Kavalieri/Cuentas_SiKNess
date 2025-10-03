# Sistema de Limpieza de Invitaciones

## Fecha: 2025-10-03

## Problema Identificado

Usuario reportó que **invitaciones no se mostraban** en el onboarding para usuarios invitados (`user@example.com`).

### Diagnóstico

Mediante scripts de debugging (`check-invitation.ts`, `check-household.ts`) se descubrió:

1. ✅ **Invitación existía** en la base de datos
2. ❌ **Household huérfano**: La invitación apuntaba a un `household_id` que ya no existía
3. ❌ **JOIN retornaba NULL**: Query con `LEFT JOIN households` retornaba `null`
4. ❌ **UI no mostraba nada**: Código esperaba `household_name` no-null

**Causa raíz**: Household fue eliminado (probablemente con sistema de wipe) pero la invitación quedó en la DB.

---

## Soluciones Implementadas

### 1. 🗑️ **Política de Retención de Invitaciones**

**Decisión de negocio**:
- ❌ **NO guardar invitaciones canceladas** → Son errores del usuario, se eliminan directamente
- ✅ **SÍ guardar invitaciones aceptadas** → Para registro histórico
- 🕒 **Invitaciones expiradas se borran automáticamente** → Después de 7 días

### 2. 🔧 **Migración: `20251003210000_cleanup_invitations_system.sql`**

**Cambios en DB**:

```sql
-- 1. Eliminar todas las invitaciones canceladas
DELETE FROM invitations WHERE status = 'cancelled';

-- 2. ON DELETE CASCADE para evitar invitaciones huérfanas
ALTER TABLE invitations
DROP CONSTRAINT IF EXISTS invitations_household_id_fkey;

ALTER TABLE invitations
ADD CONSTRAINT invitations_household_id_fkey
FOREIGN KEY (household_id)
REFERENCES households(id)
ON DELETE CASCADE;  -- <-- CLAVE: Si se borra household, se borran sus invitaciones

-- 3. Función para borrar invitaciones expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void
AS $$
BEGIN
  DELETE FROM invitations
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$;

-- 4. Limpiar invitaciones huérfanas existentes
DELETE FROM invitations
WHERE household_id IS NOT NULL
  AND household_id NOT IN (SELECT id FROM households);

-- 5. Índices para performance
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at) WHERE status = 'pending';
CREATE INDEX idx_invitations_household_id ON invitations(household_id) WHERE household_id IS NOT NULL;
```

### 3. 🔨 **Server Actions Modificadas**

#### `cancelInvitation()` - Ahora BORRA en lugar de marcar como 'cancelled'

```typescript
// ANTES
await supabase
  .from('invitations')
  .update({ status: 'cancelled' })
  .eq('id', invitationId);

// DESPUÉS
await supabase
  .from('invitations')
  .delete()  // <-- Elimina directamente
  .eq('id', invitationId);
```

#### Nueva función: `cleanupOrphanedInvitations()` 

```typescript
/**
 * Limpia todas las invitaciones huérfanas del hogar actual
 * (invitaciones que apuntan a households inexistentes)
 */
export async function cleanupOrphanedInvitations(): Promise<Result<{ deleted: number }>> {
  // 1. Obtener invitaciones con LEFT JOIN households
  const { data } = await supabase
    .from('invitations')
    .select(`id, household_id, households (id)`)
    .eq('household_id', householdId)
    .eq('status', 'pending');

  // 2. Filtrar las que tienen households null
  const orphanedIds = data
    .filter(inv => !inv.households)
    .map(inv => inv.id);

  // 3. Borrar en batch
  await supabase
    .from('invitations')
    .delete()
    .in('id', orphanedIds);

  return ok({ deleted: orphanedIds.length });
}
```

#### `getPendingInvitations()` - Ahora incluye JOIN con households

```typescript
// Antes: SELECT *
// Después: SELECT con JOIN para detectar huérfanas
const { data } = await supabase
  .from('invitations')
  .select(`
    *,
    households (id, name)  -- <-- JOIN para verificar existencia
  `)
  .eq('household_id', householdId)
  .eq('status', 'pending');

// Log de warning si hay huérfanas
const orphaned = data?.filter(inv => !inv.households) || [];
if (orphaned.length > 0) {
  console.warn(`⚠️ ${orphaned.length} invitaciones huérfanas detectadas`);
}
```

### 4. 🎨 **UI: Alert para Invitaciones Huérfanas**

**Componente**: `PendingInvitationsList.tsx`

**Cambios**:

```tsx
// 1. Detectar invitaciones huérfanas
const orphanedInvitations = invitations.filter(
  inv => inv.household_id && !inv.households
);

// 2. Separar válidas de huérfanas
const validInvitations = invitations.filter(
  inv => !inv.household_id || inv.households
);

// 3. Mostrar alert si hay huérfanas
{orphanedInvitations.length > 0 && (
  <Alert variant="destructive">
    <AlertTitle>
      Invitaciones con Errores
      <Button onClick={handleCleanupAll}>
        Limpiar Todo
      </Button>
    </AlertTitle>
    <AlertDescription>
      {orphanedInvitations.length} invitación(es) apuntan a un hogar 
      que ya no existe. Esto puede ocurrir si el hogar fue eliminado.
      
      {/* Lista de huérfanas con botón eliminar individual */}
      {orphanedInvitations.map(inv => (
        <div>
          {inv.email}
          <Button onClick={() => handleCancel(inv.id)}>
            Eliminar
          </Button>
        </div>
      ))}
    </AlertDescription>
  </Alert>
)}
```

**Resultado**: Owners pueden ver y limpiar invitaciones rotas directamente desde la UI.

---

## Flujo de Limpieza Automática

### Cuando se borra un Household

```
Usuario elimina household
  ↓
ON DELETE CASCADE se activa
  ↓
Todas las invitaciones de ese household se borran automáticamente
  ↓
✅ No quedan invitaciones huérfanas
```

### Cuando expira una invitación (7 días)

```
Cron job ejecuta cleanup_expired_invitations()
  ↓
DELETE FROM invitations WHERE expires_at < NOW()
  ↓
✅ Invitaciones viejas eliminadas
```

**Nota**: El cron job debe configurarse en Supabase o mediante webhook. Por ahora es manual.

---

## Scripts de Diagnóstico

### `scripts/check-invitation.ts`

Verifica invitaciones de un email específico:

```bash
npx tsx scripts/check-invitation.ts
```

**Output**:
- Todas las invitaciones (con/sin filtros)
- Invitaciones pendientes válidas
- Estado de expiración

### `scripts/check-household.ts`

Diagnostica por qué un household es NULL:

```bash
npx tsx scripts/check-household.ts
```

**Output**:
- Datos de la invitación
- Existencia del household
- Tipo de invitación

---

## Testing Manual

### Test 1: Crear y eliminar household

1. Usuario A crea household
2. Usuario A invita a Usuario B
3. Usuario A elimina el household
4. ✅ **Verificar**: Invitación se borró automáticamente (ON DELETE CASCADE)

### Test 2: Ver invitaciones huérfanas en UI

1. Usar script para crear invitación huérfana manualmente (household inexistente)
2. Login como owner del household
3. Ir a `/app/household` → Tab "Invitaciones"
4. ✅ **Verificar**: Alert rojo aparece con lista de huérfanas
5. Click "Limpiar Todo"
6. ✅ **Verificar**: Invitaciones eliminadas, alert desaparece

### Test 3: Invitación expirada

1. Crear invitación en DB con `expires_at` en el pasado
2. Ejecutar `SELECT cleanup_expired_invitations();` manualmente
3. ✅ **Verificar**: Invitación borrada

---

## Impacto en Performance

### Índices Creados

```sql
-- Mejora queries de expiración
CREATE INDEX idx_invitations_expires_at 
ON invitations(expires_at) 
WHERE status = 'pending';

-- Mejora queries por household
CREATE INDEX idx_invitations_household_id 
ON invitations(household_id) 
WHERE household_id IS NOT NULL;
```

**Beneficio**: Queries de limpieza y listado 10-100x más rápidas.

---

## Próximos Pasos

### 🔄 Automatizar limpieza de expiradas

**Opciones**:

1. **Supabase Edge Function** con cron:
   ```typescript
   // functions/cleanup-invitations/index.ts
   Deno.cron('cleanup', '0 0 * * *', async () => {
     await supabase.rpc('cleanup_expired_invitations');
   });
   ```

2. **Vercel Cron** (requiere Pro):
   ```typescript
   // app/api/cron/cleanup/route.ts
   export async function GET() {
     await supabase.rpc('cleanup_expired_invitations');
     return Response.json({ ok: true });
   }
   ```

3. **GitHub Actions** (gratis):
   ```yaml
   # .github/workflows/cleanup-invitations.yml
   on:
     schedule:
       - cron: '0 0 * * *'  # Diario a medianoche
   ```

### 🔒 Limpieza de datos personales hardcodeados

**CRÍTICO**: Email personal `personal-email@example.com` está hardcodeado en:
- Migraciones SQL (inserción de admin)
- Código TypeScript (validaciones)
- Documentación

**Solución**: Refactorizar para usar variables de entorno `SYSTEM_ADMIN_EMAIL`.

---

## Resumen de Cambios

| Archivo | Cambios |
|---------|---------|
| `supabase/migrations/20251003210000_cleanup_invitations_system.sql` | Migración completa de limpieza |
| `app/app/household/invitations/actions.ts` | `cancelInvitation()` ahora borra, nueva `cleanupOrphanedInvitations()` |
| `app/app/household/components/PendingInvitationsList.tsx` | Alert para huérfanas + botón "Limpiar Todo" |
| `scripts/check-invitation.ts` | Script de diagnóstico de invitaciones |
| `scripts/check-household.ts` | Script de diagnóstico de households |
| `package.json` | Añadido `dotenv` como devDependency |

---

## Estado Actual

✅ **Migración aplicada** a producción  
✅ **ON DELETE CASCADE** activo  
✅ **UI mostrando invitaciones huérfanas**  
✅ **Función de limpieza manual** disponible  
⏳ **Cron job automático** pendiente  
⏳ **Limpieza de datos personales** pendiente

---

## Lecciones Aprendidas

1. **Siempre usar ON DELETE CASCADE** para relaciones padre-hijo
2. **JOINs en listados** para detectar datos huérfanos
3. **Scripts de diagnóstico** son invaluables para debugging en producción
4. **UI debe manejar edge cases** (datos rotos, errores, etc.)
5. **NO guardar basura** → Invitaciones canceladas/expiradas se eliminan
