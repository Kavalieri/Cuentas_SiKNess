# Resumen de Sesión - 5 de Octubre 2025

## Problemas Resueltos

### 1. ✅ Ajustes Pending Afectaban Cálculos (CRÍTICO)

**Problema**: Los ajustes con status `pending` restaban de la contribución esperada cuando NO deberían hacerlo hasta ser aprobados.

**Causa Raíz**: 
- Trigger `update_contribution_adjustments_total()` NO filtraba por `status = 'approved'`
- Sumaba TODOS los ajustes (pending + approved + rejected)

**Solución**:
```sql
-- Añadido filtro en trigger
SELECT COALESCE(SUM(amount), 0)
FROM contribution_adjustments
WHERE contribution_id = v_contribution_id
  AND status = 'approved';  -- ⭐ FILTRO CRÍTICO
```

**Archivos**:
- `db/FIX_ALL_ADJUSTMENTS.sql` - Script completo para Supabase
- `supabase/migrations/20251005004313_fix_adjustments_approved_only.sql`
- Endpoint temporal `/api/dev/fix-contributions` para recalcular datos

### 2. ✅ Owners No Podían Aprobar Ajustes (CRÍTICO)

**Problema**: Al aprobar un pre-pago, mostraba "aprobado correctamente" pero el status NO cambiaba a `approved`. Los movimientos SÍ se creaban.

**Causa Raíz**:
- Políticas RLS usaban `auth.uid()` para verificar ownership
- Pero `approved_by`, `rejected_by` apuntan a `profiles.id`
- Mismatch entre auth.users.id y profiles.id

**Solución**:
```sql
-- Función helper
CREATE OR REPLACE FUNCTION get_profile_id_from_auth()
RETURNS UUID AS $$
  SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Actualizar políticas RLS
CREATE POLICY "Owners can approve/reject adjustments"
  ON contribution_adjustments
  FOR UPDATE
  USING (
    contribution_id IN (
      SELECT c.id 
      FROM contributions c
      JOIN household_members hm ON c.household_id = hm.household_id
      WHERE hm.profile_id = get_profile_id_from_auth() 
        AND hm.role = 'owner'
    )
  );
```

**Archivos**:
- `db/FIX_ALL_ADJUSTMENTS.sql` (incluye este fix)
- `db/FIX_ADJUSTMENTS_RLS.sql` (solo RLS)

### 3. ✅ UI con Colores Hardcodeados

**Problema**: 
- Modal de aprobación usaba `bg-red-50`, `bg-green-50` (no funcionan en dark mode)
- Pantalla de magic link usaba `bg-gray-50`, `text-gray-600`
- No coherente con el sistema de tema

**Solución**:
- Modal: `bg-destructive/10 border-destructive/20` y `bg-green-500/10 border-green-500/20`
- Magic link: `bg-muted/30` y `text-muted-foreground`
- Todos tokens semánticos que funcionan en dark/light mode

**Archivos**:
- `app/app/contributions/components/MyAdjustmentsPanel.tsx`
- `app/login/page.tsx`

### 4. ✅ Fondo Mensual Duplicado

**Problema**: Bloque "Resumen del Hogar" aparecía tanto en:
- Tab "Resumen" (OverviewTab)
- Tab "Contribución" (ContributionsContent)

**Solución**: 
- Eliminado `HouseholdSummary` de `ContributionsContent`
- Tab "Resumen" sigue mostrando la info completa con selector de mes
- Tab "Contribución" se centra en detalle personal + ajustes

**Archivos**:
- `app/app/contributions/components/ContributionsContent.tsx`
- Eliminado import y prop `totalPaid`

## Instrucciones para el Usuario

### 🚨 CRÍTICO - Ejecutar en Supabase (OBLIGATORIO)

**Archivo**: `db/FIX_ALL_ADJUSTMENTS.sql`

**Pasos**:
1. Abre: https://supabase.com/dashboard/project/fizxvvtakvmmeflmbwud/sql/new
2. Copia TODO el contenido de `db/FIX_ALL_ADJUSTMENTS.sql`
3. Pega en SQL Editor
4. Haz clic en **Run** ▶️
5. Debe mostrar "Success"

**Este script hace**:
- ✅ Crea función `get_profile_id_from_auth()`
- ✅ Actualiza trigger con filtro `status = 'approved'`
- ✅ Actualiza políticas RLS para owners

### 🧪 Verificación Post-Fix

1. **Refresca la página** de Contribuciones
2. **Verifica que**:
   - Ajustes pending NO aparecen en "Ajustes"
   - "Total esperado" muestra monto correcto
3. **Aprueba un ajuste pending**:
   - El modal ahora tiene colores correctos
   - Al aprobar, el status SÍ cambia a `approved`
   - Se crean 2 movimientos automáticamente
   - El "Total esperado" se actualiza

### 🎨 Cambios de UI Aplicados

- **Modal de Aprobación**: Colores adaptativos (funcionan en dark/light)
- **Login**: Pantalla de "Revisa tu correo" con tema coherente
- **Tab Resumen**: Mantiene "Fondo Mensual" completo
- **Tab Contribución**: Solo muestra tu contribución personal + ajustes

## Commits

1. `5b79c51` - Solo ajustes approved afectan cálculo + eliminar duplicado Resumen
2. `fc8f3f5` - Endpoint temporal recalculo + scripts SQL simplificados
3. `8d4f470` - Fix RLS policies + UI tema coherente ⭐ ACTUAL

## Archivos Creados

**Scripts SQL** (para ejecutar en Supabase):
- `db/FIX_ALL_ADJUSTMENTS.sql` - Script completo (trigger + RLS) ⭐ USAR ESTE
- `db/FIX_TRIGGER_ONLY.sql` - Solo trigger (deprecated)
- `db/FIX_ADJUSTMENTS_RLS.sql` - Solo RLS (deprecated)
- `db/RESET_AND_FIX_CONTRIBUTIONS.sql` - Reset completo con recalculo
- `db/EXECUTE_IN_SUPABASE_fix_adjustments.sql` - Versión anterior

**Herramientas de Desarrollo**:
- `app/api/dev/fix-contributions/route.ts` - Endpoint temporal para recalcular
- `scripts/execute-sql.js` - Script Node (no usado finalmente)

## Estado Actual

✅ **Build**: Exitoso (5.6s, sin errores)  
✅ **Lint**: Pasando  
✅ **TypeScript**: Sin errores  
✅ **Push**: Exitoso a GitHub  
⚠️ **Supabase**: Falta ejecutar `FIX_ALL_ADJUSTMENTS.sql`  

## Próximos Pasos

1. **Ejecutar** `db/FIX_ALL_ADJUSTMENTS.sql` en Supabase SQL Editor
2. **Verificar** que aprobación de ajustes funciona correctamente
3. **Eliminar** endpoint temporal `/api/dev/fix-contributions` (ya no necesario)
4. **Probar** flujo completo:
   - Crear pre-pago como member
   - Ver que NO afecta "Total esperado"
   - Aprobar como owner
   - Verificar que AHORA SÍ afecta + movimientos creados

## Filosofía Validada

> "Los cálculos deben ser siempre sobre los movimientos reales. La contribución no está realizada hasta que no existen los movimientos."

✅ **Implementado correctamente**:
- Ajustes pending = "propuestas" (NO afectan cálculo)
- Ajustes approved = movimientos creados (SÍ afectan cálculo)
- Trigger filtra solo approved
- RLS permite a owners aprobar/rechazar

## Notas Técnicas

**Por qué el endpoint `/api/dev/fix-contributions`**:
- Supabase CLI tenía problemas de sincronización de migraciones
- psql no estaba instalado localmente
- Endpoint temporal permitió recalcular datos sin acceso directo a DB
- Ejecutó: `resetCount=1, recalcCount=0`

**Por qué get_profile_id_from_auth()**:
- RLS usa `auth.uid()` (auth.users.id)
- Pero FKs usan `profiles.id`
- Función helper hace el puente
- Marcada como STABLE SECURITY DEFINER para performance

**Tokens Semánticos Usados**:
- `bg-muted/30` - Fondo suave
- `text-muted-foreground` - Texto secundario
- `bg-destructive/10` - Fondo de error/gasto (rojo suave)
- `bg-green-500/10` - Fondo de éxito/ingreso (verde suave)
- Todos funcionan automáticamente en dark/light mode
