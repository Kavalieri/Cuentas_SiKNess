# Ajustes Post-Auditoría user_id

## ✅ Fixes Completados

### 1. Auditoría y corrección de referencias `user_id`

**Archivos corregidos** (commit `6189039`):

1. **`app/app/settings/page.tsx`** - Añadido lookup de profile_id antes de query household_members
2. **`app/app/contributions/actions.ts`** - Dos funciones corregidas:
   - `createPrePayment()` - línea ~520
   - `deletePrePayment()` - línea ~660
3. **`app/app/expenses/actions.ts`** - `createMovement()` ahora usa profile_id en transactions

**Verificado**:
- ✅ `system_admins` - Correctamente usa `user_id` (referencia directa a auth.users)
- ✅ `profiles` - Correctamente usa `auth_user_id`
- ✅ Build exitoso (24 routes)

---

## 🔧 Ajustes Pendientes

### 1. Mover Configuración de Ingresos al Perfil de Usuario

**Situación actual**:
- Los ingresos se configuran en `/app/contributions` (pestaña de Hogar → Contribuciones)
- Tabla: `member_incomes` con campos `profile_id`, `household_id`, `monthly_income`

**Cambio requerido**:
- Mover configuración a `/app/profile` (pestaña de Perfil de Usuario)
- El ingreso es **personal** del usuario, no específico del hogar
- Justificación: Un usuario puede tener el mismo ingreso en múltiples hogares

**Tareas**:
1. Crear campo `monthly_income` en tabla `profiles` (o crear tabla `user_incomes` separada)
2. Migrar datos de `member_incomes` a la nueva estructura
3. Actualizar UI en `/app/profile` para configurar ingreso
4. Eliminar formulario de ingreso de `/app/contributions`
5. Actualizar función `calculate_monthly_contributions()` para leer de profiles

**Schema propuesto**:
```sql
-- Opción A: Campo directo en profiles
ALTER TABLE profiles ADD COLUMN monthly_income NUMERIC(12,2) DEFAULT 0;

-- Opción B: Tabla separada con historial (RECOMENDADO)
CREATE TABLE user_incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  monthly_income NUMERIC(12,2) NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(profile_id, effective_from)
);

CREATE INDEX idx_user_incomes_profile_id ON user_incomes(profile_id);
```

**Ventajas de Opción B**:
- Mantiene historial de cambios de ingreso
- Permite ver evolución temporal
- No rompe member_incomes existentes (se puede hacer gradualmente)

---

### 2. Fix RLS en `household_settings`

**Error reportado**:
```
new row violates row-level security policy for table "household_settings"
```

**Contexto**:
- Usuario intenta configurar la meta mensual del hogar
- La operación es `INSERT` o `UPDATE` en `household_settings`

**Diagnóstico necesario**:
1. Verificar políticas RLS actuales en `household_settings`
2. Verificar si la política valida correctamente que el usuario es miembro del hogar
3. Probable causa: Política RLS aún usa `user_id` en lugar de `profile_id`

**Pasos de investigación**:
```sql
-- Ver políticas actuales
SELECT 
  schemaname, tablename, policyname, 
  permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'household_settings';

-- Verificar estructura de household_settings
\d household_settings
```

**Fix probable**:
```sql
-- Política actual (probablemente incorrecta)
CREATE POLICY "Users can update household settings" ON household_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_settings.household_id
        AND hm.user_id = auth.uid()  -- ❌ user_id no existe
    )
  );

-- Política correcta
DROP POLICY IF EXISTS "Users can update household settings" ON household_settings;

CREATE POLICY "Members can manage household settings" ON household_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      JOIN profiles p ON p.id = hm.profile_id
      WHERE hm.household_id = household_settings.household_id
        AND p.auth_user_id = auth.uid()  -- ✅ Correcto
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm
      JOIN profiles p ON p.id = hm.profile_id
      WHERE hm.household_id = household_settings.household_id
        AND p.auth_user_id = auth.uid()
        AND hm.role = 'owner'  -- Solo owner puede crear/modificar
    )
  );
```

---

### 3. Session 3: Contributions Professional UI

**Integración con Ajuste #1**:
- Después de mover ingresos al perfil, rediseñar UI de Contributions
- Mostrar ingresos como "read-only" con link a perfil
- Focus en visualización de contribuciones y pagos

**Componentes a crear**:
1. **ContributionProgressCard** - Barra de progreso por miembro
2. **ContributionSummaryCard** - Total esperado vs pagado del mes
3. **ContributionHistoryTable** - Historial de meses anteriores
4. **QuickPayButton** - Registrar pago rápido

**Mejoras UX**:
- Colores semánticos: verde (pagado), amarillo (pendiente), rojo (atrasado)
- Animaciones de progreso con framer-motion
- Tooltips explicativos
- Mobile-first responsive design

---

## 🔍 Investigación: Usuario `fumetas.sik`

**Observación**:
> Durante la migración se ha creado de nuevo en profiles el usuario fumetas.sik que por lo que sea, no hemos dado de alta ni hecho el onboarding ni invitado.

**Posibles causas**:
1. **Auto-creación por trigger**: El trigger `sync_auth_user_to_profile()` crea automáticamente un profile cuando se registra un usuario en `auth.users`
2. **Usuario en auth.users sin onboarding**: Puede existir en Supabase Auth sin haber completado el flujo de onboarding
3. **Migración manual**: Pudo ser insertado directamente en auth.users (por script o manualmente)

**Verificación necesaria**:
```sql
-- Ver usuarios en auth.users
SELECT id, email, created_at, last_sign_in_at, 
       raw_user_meta_data, confirmed_at
FROM auth.users
WHERE email LIKE '%fumetas%';

-- Ver profile correspondiente
SELECT p.id, p.auth_user_id, p.email, p.display_name, p.created_at,
       (SELECT COUNT(*) FROM household_members WHERE profile_id = p.id) as household_count
FROM profiles p
WHERE p.email LIKE '%fumetas%';

-- Ver si tiene household_members
SELECT hm.*, h.name as household_name
FROM household_members hm
JOIN households h ON h.id = hm.household_id
JOIN profiles p ON p.id = hm.profile_id
WHERE p.email LIKE '%fumetas%';

-- Ver si tiene invitaciones pendientes
SELECT * FROM invitations
WHERE email LIKE '%fumetas%'
ORDER BY created_at DESC;
```

**Robustez del sistema**:

**Actual** (trigger automático):
```sql
-- Este trigger se ejecuta en auth.users INSERT
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_auth_user_to_profile();
```

**Problema**: 
- Si alguien crea un usuario en auth (por cualquier medio), automáticamente se crea profile
- No hay validación de que el usuario haya completado onboarding
- Pueden existir "perfiles zombie" sin household

**Mejoras sugeridas**:

1. **Validación en el trigger**:
```sql
CREATE OR REPLACE FUNCTION sync_auth_user_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo crear profile si el usuario confirmó su email
  IF NEW.confirmed_at IS NOT NULL THEN
    INSERT INTO profiles (auth_user_id, display_name, email)
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        SPLIT_PART(NEW.email, '@', 1)
      ),
      NEW.email
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;
```

2. **Flag de onboarding completado**:
```sql
ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN onboarding_completed_at TIMESTAMPTZ;

-- Crear índice para queries
CREATE INDEX idx_profiles_onboarding_completed 
  ON profiles(onboarding_completed) 
  WHERE onboarding_completed = FALSE;
```

3. **Query de "perfiles huérfanos"**:
```sql
-- Perfiles sin household
SELECT p.id, p.email, p.display_name, p.created_at,
       p.onboarding_completed,
       au.last_sign_in_at
FROM profiles p
JOIN auth.users au ON au.id = p.auth_user_id
WHERE NOT EXISTS (
  SELECT 1 FROM household_members hm WHERE hm.profile_id = p.id
)
ORDER BY p.created_at DESC;
```

4. **Cleanup job periódico** (opcional):
```sql
-- Eliminar perfiles sin household y sin actividad en 30 días
CREATE OR REPLACE FUNCTION cleanup_orphan_profiles()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM profiles
  WHERE id IN (
    SELECT p.id
    FROM profiles p
    JOIN auth.users au ON au.id = p.auth_user_id
    WHERE NOT EXISTS (
      SELECT 1 FROM household_members hm WHERE hm.profile_id = p.id
    )
    AND p.onboarding_completed = FALSE
    AND p.created_at < NOW() - INTERVAL '30 days'
    AND (au.last_sign_in_at IS NULL OR au.last_sign_in_at < NOW() - INTERVAL '30 days')
  );
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;
```

---

## 📋 Plan de Acción Inmediato

### Prioridad 1: Fix RLS household_settings ⚠️

1. Verificar políticas RLS actuales
2. Actualizar política para usar profile_id pattern
3. Probar creación/edición de meta mensual
4. Documentar fix

### Prioridad 2: Investigar usuario fumetas.sik

1. Ejecutar queries de verificación
2. Determinar origen del usuario
3. Decidir: ¿eliminar o completar onboarding?
4. Implementar mejoras de robustez (flag onboarding_completed)

### Prioridad 3: Mover ingresos a perfil

1. Decidir: ¿Campo en profiles o tabla user_incomes?
2. Crear migración
3. Migrar datos existentes
4. Actualizar UI en /app/profile
5. Eliminar de /app/contributions
6. Actualizar calculate_monthly_contributions()

### Prioridad 4: Session 3 UI Profesional

1. Diseñar nuevos componentes
2. Implementar con Recharts + Framer Motion
3. Integrar con sistema actualizado (ingresos en perfil)
4. Testing completo

---

**Status**: Auditoría completa ✅ | Fixes aplicados ✅ | Ajustes pendientes 🔧  
**Siguiente**: Investigar RLS household_settings y usuario fumetas.sik
