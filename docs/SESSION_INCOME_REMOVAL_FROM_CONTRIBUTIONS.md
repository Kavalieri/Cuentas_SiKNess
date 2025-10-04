# Sesión: Eliminación de Configuración de Ingresos de Contribuciones

**Fecha**: 2025-01-04  
**Estado**: ✅ Completado

## Resumen Ejecutivo

Eliminada la duplicación de configuración de ingresos mensuales que aparecía tanto en la página de **Perfil** como en **Contribuciones**. Según el diseño del sistema, el ingreso es una **característica personal del usuario** (no específica del hogar), por lo que debe configurarse únicamente en `/app/profile`.

## Cambios Realizados

### 1. ConfigurationSection.tsx (Contribuciones)

**Archivo**: `app/app/contributions/components/ConfigurationSection.tsx`

**Cambios**:
- ❌ Eliminado prop `userId: string`
- ❌ Eliminado prop `currentIncome: number`
- ❌ Eliminado formulario de configuración de ingreso personal (30+ líneas)
- ❌ Eliminada función `handleUpdateIncome()`
- ❌ Eliminado import de `setMemberIncome` action
- ✅ Mantenida configuración del hogar:
  - Meta mensual (`monthly_contribution_goal`)
  - Tipo de cálculo (`calculation_type`)

**Props Antes** (7 props):
```typescript
type ConfigurationSectionProps = {
  householdId: string;
  userId: string;           // ❌ REMOVIDO
  currentGoal: number;
  currentIncome: number;    // ❌ REMOVIDO
  currentCalculationType: CalculationType;
  isOwner: boolean;
  currency?: string;
};
```

**Props Después** (5 props):
```typescript
type ConfigurationSectionProps = {
  householdId: string;
  currentGoal: number;
  currentCalculationType: CalculationType;
  isOwner: boolean;
  currency?: string;
};
```

### 2. ContributionsContent.tsx (Componente Padre)

**Archivo**: `app/app/contributions/components/ContributionsContent.tsx`

**Cambios**:
- Actualizada llamada a `<ConfigurationSection />`:
  - ❌ Eliminado `userId={userId}`
  - ❌ Eliminado `currentIncome={currentUserIncome}`

**Antes**:
```typescript
<ConfigurationSection
  householdId={householdId}
  userId={userId}              // ❌ REMOVIDO
  currentGoal={monthlyGoal}
  currentIncome={currentUserIncome}  // ❌ REMOVIDO
  currentCalculationType={calculationType}
  isOwner={isOwner}
  currency={currency}
/>
```

**Después**:
```typescript
<ConfigurationSection
  householdId={householdId}
  currentGoal={monthlyGoal}
  currentCalculationType={calculationType}
  isOwner={isOwner}
  currency={currency}
/>
```

**Nota**: Los props `userId` y `currentUserIncome` siguen existiendo en `ContributionsContent` porque son usados por otros componentes como `HeroContribution` y `PrePaymentsSection`.

## Componente de Ingresos en Perfil (Ya Existente)

### IncomeForm.tsx

**Archivo**: `app/app/profile/components/IncomeForm.tsx`

**Estado**: ✅ Ya estaba correctamente implementado

**Características**:
- Usa `profile_id` (no `user_id`) ✅
- Llama a `setMemberIncome` action con datos correctos ✅
- Muestra ingreso actual formateado ✅
- Deshabilita botón si no hay cambios ✅

**Props**:
```typescript
interface IncomeFormProps {
  householdId: string;
  profileId: string;     // ✅ Usa profile_id
  currentIncome: number;
}
```

### Profile Page

**Archivo**: `app/app/profile/page.tsx`

**Estado**: ✅ Ya estaba correctamente implementado

**Características**:
- Obtiene `profile_id` del usuario actual ✅
- Llama a RPC `get_member_income()` con `profile_id` ✅
- Solo muestra sección de ingresos si hay hogar activo ✅
- Pasa `profileId` correcto a `IncomeForm` ✅

**Código clave**:
```typescript
// Obtener profile_id
const { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('auth_user_id', user.id)
  .single();

// Obtener ingreso actual usando profile_id
if (householdId) {
  const { data: income } = await supabase.rpc('get_member_income', {
    p_household_id: householdId,
    p_profile_id: profile.id,  // ✅ Usa profile_id
    p_date: new Date().toISOString().split('T')[0],
  });
  currentIncome = (income as number) ?? 0;
}

// Renderizar solo si hay hogar activo
{householdId && (
  <Card>
    <CardHeader>
      <CardTitle>💰 Ingresos Mensuales</CardTitle>
    </CardHeader>
    <CardContent>
      <IncomeForm
        householdId={householdId}
        profileId={profile.id}     // ✅ Pasa profile_id
        currentIncome={currentIncome}
      />
    </CardContent>
  </Card>
)}
```

## Verificaciones de Base de Datos

### RPC Function: `get_member_income()`

**Archivo**: `supabase/migrations/20251003235000_update_rpc_functions_use_profile_id.sql`

**Estado**: ✅ Ya usa `profile_id` correctamente

```sql
CREATE OR REPLACE FUNCTION get_member_income(
  p_household_id UUID,
  p_profile_id UUID,      -- ✅ Usa profile_id
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_income NUMERIC;
BEGIN
  SELECT monthly_income
  INTO v_income
  FROM member_incomes
  WHERE household_id = p_household_id
    AND profile_id = p_profile_id    -- ✅ Usa profile_id
    AND effective_from <= p_date
  ORDER BY effective_from DESC
  LIMIT 1;
  
  RETURN COALESCE(v_income, 0);
END;
$$;
```

### Action: `setMemberIncome()`

**Archivo**: `app/app/contributions/actions.ts`

**Estado**: ✅ Ya actualizado en sesión anterior

**Cambio clave** (línea ~290-305):
```typescript
export async function setMemberIncome(formData: FormData): Promise<Result> {
  const supabase = await supabaseServer();
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  // STEP 1: Get profile_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) return fail('Perfil no encontrado');

  // ... validación ...

  // STEP 2: Verificar membresía con profile_id
  const { data: memberData } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', householdId)
    .eq('profile_id', profile.id)    // ✅ Usa profile_id
    .single();

  // ... resto de lógica ...

  // STEP 3: INSERT con profile_id
  const { error: insertError } = await supabase
    .from('member_incomes')
    .insert({
      household_id: householdId,
      profile_id: profile.id,         // ✅ Usa profile_id
      monthly_income: monthlyIncome,
      currency,
      effective_from: effectiveFrom,
    });

  // ...
}
```

## Componentes Legacy Identificados

### IncomesSection.tsx

**Archivo**: `app/app/contributions/components/IncomesSection.tsx`

**Estado**: ⚠️ Legacy - No se usa actualmente

**Problema**: 
- Todavía usa `user_id` en lugar de `profile_id`
- No se importa en ningún archivo activo

**Recomendación**: 
- Eliminar archivo si no se planea usar
- O actualizar a `profile_id` si se necesita en el futuro

**Uso actual**: Ninguno (grep search sin resultados)

## Impacto y Beneficios

### ✅ Ventajas

1. **UX más clara**: Un solo lugar para configurar ingresos (perfil)
2. **Lógica correcta**: Ingresos son personales, no específicos del hogar
3. **Mantenibilidad**: Menos duplicación de código
4. **Consistencia**: Sigue el principio DRY (Don't Repeat Yourself)

### 📊 Métricas

- **Líneas eliminadas**: ~53 líneas
- **Props reducidas**: De 7 a 5 en ConfigurationSection
- **Archivos modificados**: 2
- **Build status**: ✅ Compila sin errores
- **Tests**: N/A (sin tests para componentes UI)

## Testing Manual Requerido

### ✅ Escenario 1: Usuario con Hogar Activo

1. Login como usuario existente
2. Navegar a `/app/profile`
3. Verificar que aparece sección "💰 Ingresos Mensuales"
4. Actualizar ingreso mensual
5. Verificar toast de éxito
6. Navegar a `/app/contributions`
7. Verificar que NO aparece formulario de ingreso
8. Verificar que solo aparece configuración del hogar (meta mensual)

### ✅ Escenario 2: Usuario sin Hogar Activo

1. Login como nuevo usuario sin hogar
2. Navegar a `/app/profile`
3. Verificar que NO aparece sección de ingresos
4. Crear un hogar
5. Recargar `/app/profile`
6. Verificar que ahora sí aparece sección de ingresos

### ✅ Escenario 3: Owner vs Member

**Como Owner**:
1. Navegar a `/app/contributions`
2. Verificar que aparece formulario editable de:
   - Método de cálculo (dropdown)
   - Meta mensual (input + botón actualizar)

**Como Member**:
1. Navegar a `/app/contributions`
2. Verificar que aparece versión solo-lectura de:
   - Método de cálculo actual
   - Meta mensual actual
   - Mensaje: "Solo el propietario del hogar puede modificar estos valores"

## Commits

### Commit 1: Refactor Income Config

```
commit 1e70d0a
Author: <usuario>
Date: 2025-01-04

refactor: remove income config from contributions (belongs in profile)

- Eliminado formulario de ingreso de ConfigurationSection.tsx
- Eliminados props userId y currentIncome
- Actualizada llamada en ContributionsContent.tsx
- Ingreso solo configurable en /app/profile (diseño correcto)
- Reducidas 53 líneas de código duplicado
```

## Próximos Pasos Recomendados

### 🔄 Corto Plazo (Esta Sesión)

1. ✅ **Testing manual** de los 3 escenarios descritos arriba
2. ⏳ **Decidir sobre IncomesSection.tsx**: ¿Eliminar o actualizar?
3. ⏳ **Verificar cálculos de contribuciones**: ¿Siguen leyendo ingresos correctamente?

### 📋 Medio Plazo (Próxima Sesión)

1. **Tests unitarios** para `IncomeForm` component
2. **Tests de integración** para flujo de configuración de ingresos
3. **Limpieza**: Eliminar imports no usados en ContributionsContent
4. **Documentación**: Actualizar README con ubicación de configuración de ingresos

### 🚀 Largo Plazo (Backlog)

1. **Historial de ingresos**: UI para ver cambios de ingreso a lo largo del tiempo
2. **Validaciones**: Límites mínimos/máximos para ingresos
3. **Multi-moneda**: Soporte para ingresos en diferentes divisas
4. **Alertas**: Notificar al hogar cuando un miembro actualiza su ingreso

## Referencias

### Documentos Relacionados

- `docs/USER_ID_AUDIT_AND_FIXES.md` - Auditoría de user_id → profile_id
- `docs/POST_AUDIT_ADJUSTMENTS.md` - Plan de acción post-auditoría
- `docs/SESSION_FIXES_USER_ID_TO_PROFILE_ID.md` - Resumen de fixes anteriores
- `docs/CONTRIBUTIONS_SYSTEM.md` - Sistema de contribuciones (spec original)

### Archivos Modificados

- `app/app/contributions/components/ConfigurationSection.tsx`
- `app/app/contributions/components/ContributionsContent.tsx`

### Archivos Referenciados (Sin Cambios)

- `app/app/profile/page.tsx`
- `app/app/profile/components/IncomeForm.tsx`
- `app/app/contributions/actions.ts` (setMemberIncome)
- `supabase/migrations/20251003235000_update_rpc_functions_use_profile_id.sql` (get_member_income RPC)

### Archivos Legacy Identificados

- `app/app/contributions/components/IncomesSection.tsx` (⚠️ No usado, todavía usa user_id)

---

**Conclusión**: La configuración de ingresos ahora está correctamente ubicada solo en el perfil del usuario (`/app/profile`), eliminando la duplicación que existía en la página de contribuciones. El sistema ahora refleja correctamente que el ingreso es una característica personal del usuario, no específica del hogar.
