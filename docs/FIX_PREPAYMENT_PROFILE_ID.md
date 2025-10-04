# Fix: Pre-pagos - user_id → profile_id

**Fecha**: 2025-01-04  
**Commit**: `ac9f28d`

## Problema

Al intentar crear un pre-pago desde la cuenta owner para un usuario miembro, el sistema mostraba el error "Datos inválidos".

## Causa Raíz

El componente `PrePaymentsSection.tsx` estaba enviando el campo `user_id` en el FormData, pero el schema de validación `PrePaymentSchema` espera el campo `profile_id`.

Este era un residuo del gran refactoring `user_id` → `profile_id` que no fue capturado en la auditoría inicial.

## Solución

**Archivo**: `app/app/contributions/components/PrePaymentsSection.tsx`

**Línea 79**:

```typescript
// ANTES (❌ Incorrecto)
formData.append('user_id', selectedMember);

// DESPUÉS (✅ Correcto)
formData.append('profile_id', selectedMember);
```

## Validación del Schema

El schema espera estos campos:

```typescript
const PrePaymentSchema = z.object({
  household_id: z.string().uuid(),
  profile_id: z.string().uuid(),        // ⭐ Debe ser profile_id
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020),
  amount: z.coerce.number().positive(),
  category_id: z.string().uuid(),
  description: z.string().min(3),
});
```

## Testing

**Pasos para verificar el fix**:

1. Login como **owner** del hogar
2. Ir a `/app/contributions`
3. En la sección "Pre-pagos del Mes", click en "Añadir Pre-pago"
4. Rellenar formulario:
   - Seleccionar miembro (el usuario member)
   - Seleccionar categoría de gasto
   - Ingresar monto (ej: 50)
   - Ingresar descripción (ej: "Compra supermercado")
5. Click en "Guardar"
6. ✅ **VERIFICAR**: Toast de éxito "Pre-pago registrado correctamente"
7. ✅ **VERIFICAR**: Pre-pago aparece en la lista
8. ✅ **VERIFICAR**: Se descuenta de la contribución esperada del miembro

## Archivos Modificados

- ✅ `app/app/contributions/components/PrePaymentsSection.tsx` (1 línea cambiada)

## Commit

```
ac9f28d - fix: use profile_id instead of user_id in pre-payment creation
```

---

**Estado**: ✅ Arreglado  
**Testing**: ⏳ Pendiente de verificación manual
