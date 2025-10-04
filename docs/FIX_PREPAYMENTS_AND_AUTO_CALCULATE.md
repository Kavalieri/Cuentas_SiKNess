# Fix: Pre-pagos y Cálculo Automático de Contribuciones

**Fecha**: 2025-10-04  
**Problema original**: 
1. Error al crear pre-pagos: "column user_id does not exist"
2. Error al calcular contribuciones: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
3. Botón manual para calcular contribuciones (debería ser automático)

## Cambios Realizados

### 1. Actualización de Funciones de Pre-pagos (`20251004030000`)

**Problema**: Las funciones de pre-pagos (`calculate_pre_payment_amount` y `update_contribution_pre_payment_amount`) usaban `user_id` pero las tablas ya habían sido migradas a `profile_id`.

**Solución**: 
- Actualizar `calculate_pre_payment_amount()` para usar `profile_id`
- Actualizar `update_contribution_pre_payment_amount()` para usar `profile_id`

**Archivo**: `supabase/migrations/20251004030000_fix_pre_payments_functions_profile_id.sql`

### 2. Constraint UNIQUE y Cálculo Automático (`20251004031000`)

**Problema 1**: El constraint UNIQUE en `contributions` usaba `user_id` pero la tabla usa `profile_id`.

**Solución**:
```sql
-- Eliminar constraint antiguo
ALTER TABLE contributions DROP CONSTRAINT IF EXISTS contributions_household_user_month_key;

-- Agregar nuevo constraint con profile_id
ALTER TABLE contributions ADD CONSTRAINT contributions_household_profile_month_key 
  UNIQUE (household_id, profile_id, year, month);
```

**Problema 2**: Las contribuciones no se calculaban automáticamente al cambiar ingresos o meta.

**Solución**: Crear función trigger `auto_recalculate_contributions()` que:
- Se dispara cuando cambian ingresos (`member_incomes`)
- Se dispara cuando cambia la meta (`household_settings.monthly_contribution_goal`)
- Calcula y actualiza automáticamente las contribuciones del mes actual
- Maneja errores silenciosamente (ej: configuración incompleta)

**Triggers creados**:
```sql
-- En member_incomes
CREATE TRIGGER trigger_auto_recalc_on_income_change
  AFTER INSERT OR UPDATE OR DELETE ON member_incomes
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_contributions();

-- En household_settings
CREATE TRIGGER trigger_auto_recalc_on_goal_change
  AFTER INSERT OR UPDATE OF monthly_contribution_goal ON household_settings
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_contributions();
```

**Archivo**: `supabase/migrations/20251004031000_auto_calculate_contributions.sql`

### 3. Mejora en Reporte de Errores (actions.ts)

**Cambio**: Actualizar el manejo de errores en `createPrePayment()` para mostrar el mensaje específico de Supabase en lugar de un mensaje genérico.

**Antes**:
```typescript
if (prePaymentError) {
  await supabase.from('transactions').delete().eq('id', movement.id);
  return fail('Error al crear el pre-pago');
}
```

**Después**:
```typescript
if (prePaymentError) {
  console.error('Pre-payment insert error:', prePaymentError);
  await supabase.from('transactions').delete().eq('id', movement.id);
  return fail(`Error al crear el pre-pago: ${prePaymentError.message}`);
}
```

**Archivo**: `app/app/contributions/actions.ts`

## Flujo Automático Resultante

### Escenario 1: Usuario configura/actualiza su ingreso
1. Usuario va a `/app/profile` y actualiza su ingreso mensual
2. **Trigger automático**: `INSERT/UPDATE` en `member_incomes`
3. **Función**: `auto_recalculate_contributions()` se ejecuta
4. **Resultado**: Contribuciones del mes actual se recalculan y actualizan

### Escenario 2: Owner cambia la meta del hogar
1. Owner va a `/app/contributions` y cambia la meta mensual
2. **Trigger automático**: `UPDATE` en `household_settings.monthly_contribution_goal`
3. **Función**: `auto_recalculate_contributions()` se ejecuta
4. **Resultado**: Contribuciones de TODOS los miembros se recalculan

### Escenario 3: Owner crea un pre-pago
1. Owner crea pre-pago para un miembro
2. **INSERT** en `pre_payments` con `profile_id` ✅
3. **Trigger existente**: `update_contribution_pre_payment_amount()` se ejecuta
4. **Resultado**: `contributions.pre_payment_amount` se actualiza automáticamente

## Testing Manual Requerido

- [ ] Configurar ingreso de un miembro → verificar que contribución se calcula automáticamente
- [ ] Cambiar meta mensual → verificar que contribuciones de todos se actualizan
- [ ] Crear pre-pago → verificar que se crea correctamente y se refleja en la contribución
- [ ] Cambiar mes → verificar que contribuciones del mes nuevo se crean al configurar ingresos
- [ ] Eliminar ingreso → verificar que contribuciones se recalculan (puede fallar si no hay ingresos)

## Notas Importantes

1. **Cálculo solo para mes actual**: Los triggers solo calculan contribuciones para el mes actual. Para meses futuros/pasados, usar la acción manual `calculateAndCreateContributions()`.

2. **Manejo de errores silencioso**: Si falta configuración (ej: sin meta o sin ingresos), el trigger NO bloquea la operación, solo registra un NOTICE en los logs.

3. **Componente CalculateButton.tsx**: Existe pero no se usa actualmente. Puede eliminarse o mantenerse para cálculos manuales de meses específicos.

4. **Performance**: Los triggers son ligeros (solo afectan mes actual). En hogares con muchos miembros (>10), considerar optimización.

## Próximos Pasos Opcionales

1. **Eliminar CalculateButton.tsx**: Si no se necesita cálculo manual
2. **Dashboard feedback**: Mostrar toast cuando contribuciones se recalculan automáticamente
3. **Historial de cambios**: Log de cuándo se recalcularon las contribuciones
4. **Cálculo multi-mes**: Opción para recalcular contribuciones de meses pasados (ej: corrección retroactiva)
