# Fix: Select.Item Empty Value Error

## Error Original
```
A <Select.Item /> must have a value prop that is not an empty string.
```

## Causa
Radix UI Select (usado por shadcn/ui) no permite `<SelectItem value="">` con string vacío. Esto es por diseño, ya que el valor vacío se reserva para limpiar la selección.

## Solución Aplicada

### 1. AddMovementDialog.tsx
```tsx
// ❌ ANTES (valor vacío no permitido)
<SelectItem value="">Sin categoría</SelectItem>

// ✅ AHORA (usar "none" como valor especial)
<Select name="category_id" defaultValue="none">
  <SelectItem value="none">Sin categoría</SelectItem>
  {categories.map(...)}
</Select>
```

### 2. actions.ts - Schema Zod
```typescript
// Transformar "none" y "" a null automáticamente
const MovementSchema = z.object({
  category_id: z
    .string()
    .transform((val) => (val === '' || val === 'none' ? null : val))
    .pipe(z.string().uuid().nullable()),
  // ... otros campos
});
```

### 3. actions.ts - Insert
```typescript
// El schema ya transforma el valor, usar directamente
.insert({
  category_id: parsed.data.category_id, // null si era "none"
  // ... otros campos
})
```

## Resultado
- ✅ Select funciona correctamente
- ✅ "Sin categoría" se guarda como `null` en la BD
- ✅ Validación Zod maneja la transformación
- ✅ Build exitoso

## Archivos Modificados
- `app/app/expenses/components/AddMovementDialog.tsx`
- `app/app/expenses/actions.ts`
